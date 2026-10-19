import asyncHandler from "../middleware/asyncHandler.js";
import User from "../models/User.js";
import Order from "../models/Order.js";

// @route GET /api/users/profile
export const getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  res.json({ success: true, user });
});

// @route PUT /api/users/profile
export const updateProfile = asyncHandler(async (req, res) => {
  const { name, phone, profileImage, preferredVoiceLanguage } = req.body;
  const user = await User.findById(req.user._id);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }
  if (name) user.name = name;
  if (phone !== undefined) user.phone = phone;
  if (profileImage) user.profileImage = profileImage;
  if (preferredVoiceLanguage) user.preferredVoiceLanguage = preferredVoiceLanguage;
  await user.save();
  res.json({ success: true, user });
});

// @route GET /api/users/recently-viewed
// Surfaces the "Recently Viewed Products" feature - backed by the same browsingHistory
// array that the recommendation engine already tracks every time a product page loads.
export const getRecentlyViewed = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate({
    path: "browsingHistory",
    options: { limit: 12 },
  });
  res.json({ success: true, products: user.browsingHistory || [] });
});

// @route GET /api/users (admin) - list all users
export const getAllUsers = asyncHandler(async (req, res) => {
  const users = await User.find().sort({ createdAt: -1 });
  res.json({ success: true, users });
});

// @route DELETE /api/users/:id (admin)
export const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }
  res.json({ success: true, message: "User deleted" });
});

// @route GET /api/users/admin/stats (admin dashboard summary)
export const getAdminStats = asyncHandler(async (req, res) => {
  const [totalUsers, totalOrders, revenueAgg, pendingOrders] = await Promise.all([
    User.countDocuments({ role: "USER" }),
    Order.countDocuments(),
    Order.aggregate([
      { $match: { paymentStatus: "SUCCESS" } },
      { $group: { _id: null, revenue: { $sum: "$totalAmount" } } },
    ]),
    Order.countDocuments({ orderStatus: { $in: ["Placed", "Confirmed", "Packed"] } }),
  ]);

  res.json({
    success: true,
    stats: {
      totalUsers,
      totalOrders,
      totalRevenue: revenueAgg[0]?.revenue || 0,
      pendingOrders,
    },
  });
});
