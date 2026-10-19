import asyncHandler from "../middleware/asyncHandler.js";
import Order from "../models/Order.js";
import Cart from "../models/Cart.js";
import Product from "../models/Product.js";
import Payment from "../models/Payment.js";

// @route POST /api/orders
// Creates an order from the user's current cart, decrements stock, "processes" payment
// (mock gateway when no live keys are configured) and clears the cart on success.
export const createOrder = asyncHandler(async (req, res) => {
  const { shippingAddress, paymentMethod, couponCode } = req.body;

  const cart = await Cart.findOne({ user: req.user._id }).populate("items.product");
  if (!cart || cart.items.length === 0) {
    res.status(400);
    throw new Error("Your cart is empty");
  }

  let subtotal = 0;
  const products = cart.items.map((item) => {
    const price = item.product.discountPrice || item.product.price;
    subtotal += price * item.quantity;
    return {
      product: item.product._id,
      name: item.product.name,
      image: item.product.images?.[0] || "",
      price,
      quantity: item.quantity,
    };
  });

  const tax = Math.round(subtotal * 0.05);
  const shippingFee = subtotal > 999 ? 0 : 49;
  let discount = 0;
  if (couponCode && couponCode.toUpperCase() === "WELCOME10") {
    discount = Math.round(subtotal * 0.1);
  }
  const totalAmount = subtotal + tax + shippingFee - discount;

  // Mock/sandbox payment processing - always succeeds for COD, simulated for others
  let paymentStatus = "PENDING";
  if (paymentMethod === "COD") {
    paymentStatus = "PENDING";
  } else {
    paymentStatus = "SUCCESS"; // simulated gateway success in dev/sandbox mode
  }

  const order = await Order.create({
    user: req.user._id,
    products,
    shippingAddress,
    paymentMethod,
    paymentStatus,
    orderStatus: "Placed",
    statusHistory: [{ status: "Placed" }],
    subtotal,
    tax,
    shippingFee,
    discount,
    totalAmount,
    couponCode: couponCode || "",
  });

  await Payment.create({
    order: order._id,
    user: req.user._id,
    method: paymentMethod,
    amount: totalAmount,
    status: paymentStatus,
    transactionId: `MOCK-${Date.now()}`,
    isMock: true,
  });

  // decrement stock
  for (const item of cart.items) {
    await Product.findByIdAndUpdate(item.product._id, { $inc: { stock: -item.quantity } });
  }

  // clear cart
  cart.items = [];
  await cart.save();

  res.status(201).json({ success: true, order });
});

// @route GET /api/orders (current user's orders)
export const getMyOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
  res.json({ success: true, orders });
});

// @route GET /api/orders/all (admin)
export const getAllOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find().populate("user", "name email").sort({ createdAt: -1 });
  res.json({ success: true, orders });
});

// @route GET /api/orders/:id
export const getOrderById = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id).populate("user", "name email");
  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }
  if (order.user._id.toString() !== req.user._id.toString() && req.user.role !== "ADMIN") {
    res.status(403);
    throw new Error("Not authorized to view this order");
  }
  res.json({ success: true, order });
});

// @route PUT /api/orders/:id/status (admin)
export const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const order = await Order.findById(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }
  order.orderStatus = status;
  order.statusHistory.push({ status });
  if (status === "Cancelled") order.paymentStatus = "CANCELLED";
  if (status === "Delivered" && order.paymentMethod === "COD") order.paymentStatus = "SUCCESS";
  await order.save();
  res.json({ success: true, order });
});

// Orders in these states can no longer be cancelled (shared with the voice assistant's cancel flow).
export const CANCEL_BLOCKED_STATUSES = ["Shipped", "Out for Delivery", "Delivered"];

// @route PUT /api/orders/:id/cancel (user cancels their own order)
export const cancelOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }
  if (order.user.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("Not authorized");
  }
  if (CANCEL_BLOCKED_STATUSES.includes(order.orderStatus)) {
    res.status(400);
    throw new Error("Order can no longer be cancelled");
  }
  order.orderStatus = "Cancelled";
  order.paymentStatus = "CANCELLED";
  order.statusHistory.push({ status: "Cancelled" });
  await order.save();
  res.json({ success: true, order });
});
