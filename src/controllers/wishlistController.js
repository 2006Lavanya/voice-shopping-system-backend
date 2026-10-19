import asyncHandler from "../middleware/asyncHandler.js";
import Wishlist from "../models/Wishlist.js";
import Cart from "../models/Cart.js";
import Product from "../models/Product.js";

const getOrCreateWishlist = async (userId) => {
  let wishlist = await Wishlist.findOne({ user: userId });
  if (!wishlist) wishlist = await Wishlist.create({ user: userId, products: [] });
  return wishlist;
};

// @route GET /api/wishlist
export const getWishlist = asyncHandler(async (req, res) => {
  const wishlist = await (await getOrCreateWishlist(req.user._id)).populate("products");
  res.json({ success: true, wishlist });
});

// @route POST /api/wishlist  { productId }
export const addToWishlist = asyncHandler(async (req, res) => {
  const { productId } = req.body;
  const product = await Product.findById(productId);
  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }

  const wishlist = await getOrCreateWishlist(req.user._id);
  if (!wishlist.products.some((p) => p.toString() === productId)) {
    wishlist.products.push(productId);
    await wishlist.save();
  }
  await wishlist.populate("products");
  res.status(201).json({ success: true, wishlist });
});

// @route DELETE /api/wishlist/:productId
export const removeFromWishlist = asyncHandler(async (req, res) => {
  const wishlist = await getOrCreateWishlist(req.user._id);
  wishlist.products = wishlist.products.filter((p) => p.toString() !== req.params.productId);
  await wishlist.save();
  await wishlist.populate("products");
  res.json({ success: true, wishlist });
});

// @route POST /api/wishlist/:productId/move-to-cart
export const moveToCart = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const wishlist = await getOrCreateWishlist(req.user._id);

  let cart = await Cart.findOne({ user: req.user._id });
  if (!cart) cart = await Cart.create({ user: req.user._id, items: [] });

  const existing = cart.items.find((item) => item.product.toString() === productId);
  if (existing) existing.quantity += 1;
  else cart.items.push({ product: productId, quantity: 1 });

  await cart.save();

  wishlist.products = wishlist.products.filter((p) => p.toString() !== productId);
  await wishlist.save();

  res.json({ success: true, message: "Moved to cart" });
});
