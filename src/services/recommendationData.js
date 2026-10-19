/**
 * recommendationData.js
 * ---------------------
 * Small DB helpers shared by the REST recommendation endpoints and the voice assistant.
 * Everything is wrapped so a missing/empty collection never breaks the caller.
 */
import User from "../models/User.js";
import Wishlist from "../models/Wishlist.js";
import Order from "../models/Order.js";

/** What this shopper viewed / wishlisted / bought (arrays of product id strings, newest first). */
export const getUserSignals = async (userId) => {
  const out = { viewedIds: [], wishlistIds: [], orderedIds: [] };
  if (!userId) return out;
  try {
    const user = await User.findById(userId).select("browsingHistory").lean();
    out.viewedIds = (user?.browsingHistory || []).map(String);
  } catch { /* ignore */ }
  try {
    const wl = await Wishlist.findOne({ user: userId }).lean();
    out.wishlistIds = (wl?.products || []).map(String);
  } catch { /* ignore */ }
  try {
    const orders = await Order.find({ user: userId }).sort({ createdAt: -1 }).limit(10).lean();
    out.orderedIds = orders.flatMap((o) => (o.products || []).map((p) => String(p.product)));
  } catch { /* ignore */ }
  return out;
};

/** Map<productId, timesBoughtTogether> from past orders that contained `productId`. */
export const getCoPurchase = async (productId) => {
  const counts = new Map();
  try {
    const orders = await Order.find({ "products.product": productId }).limit(300).lean();
    for (const o of orders) {
      for (const line of o.products || []) {
        const pid = String(line.product);
        if (pid !== String(productId)) counts.set(pid, (counts.get(pid) || 0) + 1);
      }
    }
  } catch { /* ignore */ }
  return counts;
};

/** Units sold per product across all orders (used to boost "trending"). */
export const getSalesCounts = async () => {
  const counts = new Map();
  try {
    const orders = await Order.find({}).sort({ createdAt: -1 }).limit(500).lean();
    for (const o of orders) for (const line of o.products || []) counts.set(String(line.product), (counts.get(String(line.product)) || 0) + (line.quantity || 1));
  } catch { /* ignore */ }
  return counts;
};
