import asyncHandler from "../middleware/asyncHandler.js";
import Product from "../models/Product.js";
import User from "../models/User.js";
import Order from "../models/Order.js";
import { trending, similar, frequentlyBoughtTogether, personalized } from "../services/recommender.js";
import { getCoPurchase, getSalesCounts, getUserSignals } from "../services/recommendationData.js";

// Lightweight, explainable recommendation engine (no ML dependency needed):
// blends the user's browsing history, wishlist, purchase history and popular items
// so results differ per-user instead of being hard-coded.
export const getRecommendations = asyncHandler(async (req, res) => {
  let categories = new Set();
  let excludeIds = [];

  if (req.user) {
    const user = await User.findById(req.user._id).populate("browsingHistory wishlist");
    (user.browsingHistory || []).forEach((p) => categories.add(p.category));
    (user.wishlist || []).forEach((p) => categories.add(p.category));
    excludeIds = [...(user.browsingHistory || []), ...(user.wishlist || [])].map((p) => p._id);

    const pastOrders = await Order.find({ user: req.user._id }).limit(5);
    pastOrders.forEach((order) => order.products.forEach((p) => excludeIds.push(p.product)));
  }

  let recommended = [];
  if (categories.size > 0) {
    recommended = await Product.find({
      category: { $in: [...categories] },
      _id: { $nin: excludeIds },
    })
      .sort({ rating: -1 })
      .limit(10);
  }

  if (recommended.length < 10) {
    const fallback = await Product.find({ _id: { $nin: [...excludeIds, ...recommended.map((p) => p._id)] } })
      .sort({ bestSeller: -1, rating: -1 })
      .limit(10 - recommended.length);
    recommended = [...recommended, ...fallback];
  }

  res.json({ success: true, products: recommended });
});

// @route POST /api/recommendations/track  { productId }
// Called when a user views a product, to feed the recommendation engine
export const trackView = asyncHandler(async (req, res) => {
  const { productId } = req.body;
  if (req.user) {
    const user = await User.findById(req.user._id);
    user.browsingHistory = user.browsingHistory.filter((id) => id.toString() !== productId);
    user.browsingHistory.unshift(productId);
    user.browsingHistory = user.browsingHistory.slice(0, 20);
    await user.save();
  }
  res.json({ success: true });
});

// @route GET /api/recommendations/frequently-bought/:productId
// Complementary products: real co-purchase data from orders first, then category/tag rules.
export const getFrequentlyBoughtTogether = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.productId).lean();
  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }
  const [all, co] = await Promise.all([Product.find({}).lean(), getCoPurchase(product._id)]);
  res.json({ success: true, products: frequentlyBoughtTogether(product, all, { coPurchase: co, limit: Number(req.query.limit) || 4 }) });
});

// @route GET /api/recommendations/similar/:productId
export const getSimilarProducts = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.productId).lean();
  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }
  const all = await Product.find({}).lean();
  res.json({ success: true, products: similar(product, all, { limit: Number(req.query.limit) || 8 }) });
});

// @route GET /api/recommendations/trending?category=Grocery
// Best sellers + rating x popularity, boosted by what was actually ordered recently.
export const getTrendingProducts = asyncHandler(async (req, res) => {
  const [all, sales] = await Promise.all([Product.find({}).lean(), getSalesCounts()]);
  const boosted = all.map((p) => ({ ...p, reviewCount: (p.reviewCount || 0) + (sales.get(String(p._id)) || 0) * 25 }));
  const picks = trending(boosted, { category: req.query.category || null, limit: Number(req.query.limit) || 8 });
  const byId = new Map(all.map((p) => [String(p._id), p]));
  res.json({ success: true, products: picks.map((p) => byId.get(String(p._id))) });
});

// @route GET /api/recommendations/for-you
// Personalised picks from browsing + wishlist + order history (falls back to trending for new users).
export const getPersonalizedProducts = asyncHandler(async (req, res) => {
  const all = await Product.find({}).lean();
  const signals = await getUserSignals(req.user?._id);
  res.json({ success: true, products: personalized(all, { ...signals, limit: Number(req.query.limit) || 10 }) });
});
