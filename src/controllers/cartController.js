import asyncHandler from "../middleware/asyncHandler.js";
import Cart from "../models/Cart.js";
import Product from "../models/Product.js";

const getOrCreateCart = async (userId) => {
  let cart = await Cart.findOne({ user: userId });
  if (!cart) cart = await Cart.create({ user: userId, items: [] });
  return cart;
};

// @route GET /api/cart
export const getCart = asyncHandler(async (req, res) => {
  const cart = await (await getOrCreateCart(req.user._id)).populate("items.product");
  res.json({ success: true, cart });
});

// @route POST /api/cart  { productId, quantity, color, size }
export const addToCart = asyncHandler(async (req, res) => {
  const { productId, quantity = 1, color = "", size = "" } = req.body;

  const product = await Product.findById(productId);
  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }
  if (product.stock < quantity) {
    res.status(400);
    throw new Error("Not enough stock available");
  }

  const cart = await getOrCreateCart(req.user._id);
  const existingItem = cart.items.find(
    (item) => item.product.toString() === productId && item.color === color && item.size === size
  );

  if (existingItem) {
    existingItem.quantity += Number(quantity);
  } else {
    cart.items.push({ product: productId, quantity, color, size });
  }

  await cart.save();
  await cart.populate("items.product");
  res.status(201).json({ success: true, cart });
});

// @route PUT /api/cart/:itemId  { quantity }
export const updateCartItem = asyncHandler(async (req, res) => {
  const { quantity } = req.body;
  const cart = await getOrCreateCart(req.user._id);
  const item = cart.items.id(req.params.itemId);
  if (!item) {
    res.status(404);
    throw new Error("Cart item not found");
  }
  if (quantity <= 0) {
    item.deleteOne();
  } else {
    item.quantity = quantity;
  }
  await cart.save();
  await cart.populate("items.product");
  res.json({ success: true, cart });
});

// @route DELETE /api/cart/:itemId
export const removeCartItem = asyncHandler(async (req, res) => {
  const cart = await getOrCreateCart(req.user._id);
  cart.items = cart.items.filter((item) => item._id.toString() !== req.params.itemId);
  await cart.save();
  await cart.populate("items.product");
  res.json({ success: true, cart });
});

// @route DELETE /api/cart  (clear cart)
export const clearCart = asyncHandler(async (req, res) => {
  const cart = await getOrCreateCart(req.user._id);
  cart.items = [];
  await cart.save();
  res.json({ success: true, cart });
});

// Used by voice commands: "remove laptop from cart" - finds by product name match
export const removeFromCartByName = asyncHandler(async (req, res) => {
  const { name } = req.body;
  const cart = await getOrCreateCart(req.user._id);
  await cart.populate("items.product");
  cart.items = cart.items.filter(
    (item) => !item.product.name.toLowerCase().includes(name.toLowerCase())
  );
  await cart.save();
  res.json({ success: true, cart });
});
