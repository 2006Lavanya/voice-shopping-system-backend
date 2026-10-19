import asyncHandler from "../middleware/asyncHandler.js";
import Product from "../models/Product.js";
import SearchHistory from "../models/SearchHistory.js";
import { buildIndex, effectivePrice } from "../services/catalogMatcher.js";
import { smartSearch } from "../services/searchService.js";

// ---------------------------------------------------------------------------
// Fuzzy / multi-language fallback (additive): runs ONLY when the normal keyword query finds nothing,
// so existing search results are never changed. Handles typos ("samsng"), Tamil script ("ஐபோன்"),
// Tanglish ("arisi", "paal") and phrases like "laptops under 50000".
// ---------------------------------------------------------------------------
const fuzzyProducts = async ({ keyword, category, brand, minPrice, maxPrice, minRating, sort, pageNum, limitNum }) => {
  const base = {};
  if (category) base.category = { $regex: `^${String(category).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" };
  if (brand) base.brand = { $regex: `^${String(brand).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" };
  if (minRating) base.rating = { $gte: Number(minRating) };
  const all = await Product.find(base).lean();
  const { products: hits } = smartSearch(buildIndex(all), keyword, {
    limit: 400,
    minPrice: minPrice ? Number(minPrice) : null,
    maxPrice: maxPrice ? Number(maxPrice) : null,
  });
  if (!hits.length) return null;
  const sorted = [...hits];
  if (sort === "price_low") sorted.sort((a, b) => effectivePrice(a) - effectivePrice(b));
  else if (sort === "price_high") sorted.sort((a, b) => effectivePrice(b) - effectivePrice(a));
  else if (sort === "rating") sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  else if (sort === "popularity") sorted.sort((a, b) => (b.reviewCount || 0) - (a.reviewCount || 0));
  return { products: sorted.slice((pageNum - 1) * limitNum, pageNum * limitNum), total: sorted.length };
};

let suggestCache = { at: 0, entries: [] };
const getSuggestIndex = async () => {
  if (Date.now() - suggestCache.at < 60_000 && suggestCache.entries.length) return suggestCache.entries;
  suggestCache = { at: Date.now(), entries: buildIndex(await Product.find({}).select("name brand category tags price discountPrice images rating stock").lean()) };
  return suggestCache.entries;
};


// @route GET /api/products
// Supports text search, category/brand/price/rating filters, sorting and pagination.
// This single endpoint powers both the normal search bar AND voice search results.
export const getProducts = asyncHandler(async (req, res) => {
  const {
    keyword,
    category,
    brand,
    minPrice,
    maxPrice,
    minRating,
    sort,
    page = 1,
    limit = 12,
    featured,
    bestSeller,
    ids,
  } = req.query;

  const query = {};

  // Exact list of products (used by voice search results): /products?ids=a,b,c
  let idOrder = null;
  if (ids) {
    idOrder = String(ids).split(",").map((x) => x.trim()).filter((x) => /^[a-f0-9]{24}$/i.test(x));
    query._id = { $in: idOrder };
  }

  // Every word of the keyword must match somewhere (name/brand/tags/category) -> "hp laptop" works.
  if (keyword) {
    const words = String(keyword).trim().split(/\s+/).filter(Boolean).map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    query.$and = words.map((w) => ({
      $or: [
        { name: { $regex: w, $options: "i" } },
        { brand: { $regex: w, $options: "i" } },
        { tags: { $regex: w, $options: "i" } },
        { category: { $regex: w, $options: "i" } },
      ],
    }));
  }
  if (category) query.category = { $regex: `^${category}$`, $options: "i" };
  if (brand) query.brand = { $regex: `^${brand}$`, $options: "i" };
  if (minPrice || maxPrice) {
    query.price = {};
    if (minPrice) query.price.$gte = Number(minPrice);
    if (maxPrice) query.price.$lte = Number(maxPrice);
  }
  if (minRating) query.rating = { $gte: Number(minRating) };
  if (featured) query.featured = featured === "true";
  if (bestSeller) query.bestSeller = bestSeller === "true";

  let sortOption = { createdAt: -1 };
  if (sort === "price_low") sortOption = { price: 1 };
  else if (sort === "price_high") sortOption = { price: -1 };
  else if (sort === "rating") sortOption = { rating: -1 };
  else if (sort === "popularity") sortOption = { reviewCount: -1 };
  else if (sort === "newest") sortOption = { createdAt: -1 };

  const pageNum = Math.max(1, Number(page));
  const limitNum = Math.max(1, Number(limit));

  let [products, total] = await Promise.all([
    Product.find(query)
      .sort(sortOption)
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    Product.countDocuments(query),
  ]);
  // keep the assistant's best-match-first order for voice results (unless a sort was chosen)
  if (idOrder && (!sort || sort === "newest")) {
    const rank = new Map(idOrder.map((id, i) => [id, i]));
    products = [...products].sort((a, b) => rank.get(String(a._id)) - rank.get(String(b._id)));
  }

  // Nothing matched literally? Try fuzzy / Tamil / Tanglish matching before giving up.
  let fuzzy = false;
  if (keyword && total === 0 && !ids) {
    const fz = await fuzzyProducts({ keyword, category, brand, minPrice, maxPrice, minRating, sort, pageNum, limitNum });
    if (fz) {
      products = fz.products;
      total = fz.total;
      fuzzy = true;
    }
  }

  // Log search history for logged-in users (used later by the recommendation engine)
  if (keyword) {
    await SearchHistory.create({
      user: req.user?._id,
      query: keyword,
      source: req.query.source === "VOICE" ? "VOICE" : "TEXT",
    });
  }

  res.json({
    success: true,
    products,
    page: pageNum,
    pages: Math.ceil(total / limitNum),
    total,
    ...(fuzzy ? { fuzzy: true } : {}),
  });
});

// @route GET /api/products/:id
export const getProductById = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }
  res.json({ success: true, product });
});

// @route GET /api/products/:id/related
export const getRelatedProducts = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }
  const related = await Product.find({
    _id: { $ne: product._id },
    category: product.category,
  }).limit(8);
  res.json({ success: true, products: related });
});

// @route POST /api/products (admin)
export const createProduct = asyncHandler(async (req, res) => {
  const product = await Product.create(req.body);
  res.status(201).json({ success: true, product });
});

// @route PUT /api/products/:id (admin)
export const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }
  res.json({ success: true, product });
});

// @route DELETE /api/products/:id (admin)
export const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndDelete(req.params.id);
  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }
  res.json({ success: true, message: "Product deleted successfully" });
});

// @route GET /api/products/meta/brands
export const getBrands = asyncHandler(async (req, res) => {
  const brands = await Product.distinct("brand");
  res.json({ success: true, brands });
});

// @route GET /api/products/meta/suggest?q=samsng
// Type-ahead suggestions: fuzzy, multi-language (English / Tamil / Tanglish).
export const getSearchSuggestions = asyncHandler(async (req, res) => {
  const q = String(req.query.q || "").trim();
  if (q.length < 2) return res.json({ success: true, suggestions: [], categories: [] });
  const { products } = smartSearch(await getSuggestIndex(), q, { limit: 6 });
  const categories = [...new Set(products.map((p) => p.category))].slice(0, 3);
  res.json({
    success: true,
    suggestions: products.map((p) => ({
      _id: p._id,
      name: p.name,
      category: p.category,
      brand: p.brand,
      price: p.price,
      discountPrice: p.discountPrice,
      image: p.images?.[0],
    })),
    categories,
  });
});
