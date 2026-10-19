/**
 * assistantVoice.js
 * -----------------
 * Executes the voice intents detected by services/voiceIntents.js and holds the safety rules that stop the
 * assistant from doing something important on a guess. Called from assistantController (same pattern as
 * assistantExtras.js); every handler fills `response` and returns true when it handled the message.
 *
 * Rules enforced here:
 *   - Cancelling an order ALWAYS asks first ("Cancel order #ABC? yes / no") and only says "cancelled"
 *     after the order was really saved as cancelled.
 *   - Cart / wishlist changes and "place order" are not executed when speech recognition was unsure
 *     (low confidence) or the product name was only a sounds-like guess: the assistant asks first.
 *   - "this" / "that item" is resolved from the conversation (page, last product discussed, the single
 *     item in the cart ...). If it is genuinely ambiguous the assistant asks a short question instead.
 *   - Only a state the backend really saved is reported as done.
 */
import mongoose from "mongoose";
import Order from "../models/Order.js";
import { buildIndex, findProductsSmart, matchQuality } from "../services/catalogMatcher.js";
import { formatINR } from "../services/commandExtras.js";
import { shortOrderId, newPending } from "../services/voiceIntents.js";
import { CANCEL_BLOCKED_STATUSES } from "./orderController.js";

export const STATE_CHANGING = new Set(["ADD_TO_CART", "ADD_TO_WISHLIST", "REMOVE_FROM_CART", "REMOVE_FROM_WISHLIST", "CLEAR_CART", "CLEAR_WISHLIST"]);
export const IMPORTANT_EXTRA = new Set(["CHECKOUT_PLACE_ORDER", "CHECKOUT_CONFIRM_ORDER"]);
export const LOW_CONFIDENCE = 0.55;

const isId = (v) => typeof v === "string" && mongoose.isValidObjectId(v);
const unitPrice = (p) => (p.discountPrice && p.discountPrice > 0 ? p.discountPrice : p.price) || 0;
const plain = (doc) => (doc && typeof doc.toObject === "function" ? doc.toObject() : doc);

/** Speech recognisers report 0 / undefined when they don't know; only a real low score counts. */
export const isLowConfidence = (ctx = {}) => {
  const c = Number(ctx.sttConfidence);
  return Number.isFinite(c) && c > 0 && c < LOW_CONFIDENCE;
};

export const createVoiceHandlers = ({ req, response, say, vsay, style, context, helpers, rerun, understood }) => {
  const { getCatalog, resolveProduct, getCart, getWishlist, brief } = helpers;

  const needLogin = () => {
    response.replyText = say("loginRequired");
    response.redirectTo = "/login";
    response.needsLogin = true;
    return true;
  };

  const ask = (text, pending) => {
    response.replyText = text;
    if (pending) response.pendingAction = newPending(pending);
    return true;
  };

  const focus = (product) => {
    if (product) response.focusProduct = brief(product);
  };

  // -------------------------------------------------------------------------------------------------
  // Orders
  // -------------------------------------------------------------------------------------------------
  const loadOrders = async () => Order.find({ user: req.user._id }).sort({ createdAt: -1 }).lean();
  const orderFromPage = (orders) => {
    const m = String(context.path || "").match(/^\/orders\/([a-f0-9]{24})/i);
    const id = context.orderId || (m && m[1]);
    return id ? orders.find((o) => String(o._id) === String(id)) : null;
  };
  const isActive = (o) => !["Delivered", "Cancelled"].includes(o.orderStatus);

  const orderStatus = async (terms = []) => {
    if (!req.user) return needLogin();
    const orders = await loadOrders();
    if (!orders.length) return ask(vsay("orderStatusNone"));

    let target = orderFromPage(orders);
    if (!target && terms.length) {
      const wanted = terms.map((t) => String(t).toLowerCase());
      target = orders.find((o) => (o.products || []).some((p) => wanted.some((w) => String(p.name).toLowerCase().includes(w)))) || null;
    }
    if (!target) target = orders[0];
    const others = orders.filter((o) => isActive(o) && String(o._id) !== String(target._id)).length;
    response.replyText = vsay("orderStatus", target.orderStatus, shortOrderId(target._id), formatINR(target.totalAmount || 0), others);
    response.focusOrder = { _id: String(target._id), status: target.orderStatus };
    // the existing order-tracking page shows the full timeline
    if (!String(context.path || "").startsWith(`/orders/${target._id}`)) response.redirectTo = `/orders/${target._id}`;
    return true;
  };

  const askCancel = async (terms = []) => {
    if (!req.user) return needLogin();
    const orders = await loadOrders();
    if (!orders.length) return ask(vsay("cancelNone"));

    let target = orderFromPage(orders);
    if (!target && terms.length) {
      const wanted = terms.map((t) => String(t).toLowerCase());
      target = orders.find((o) => (o.products || []).some((p) => wanted.some((w) => String(p.name).toLowerCase().includes(w)))) || null;
    }
    if (!target) target = orders.find((o) => o.orderStatus !== "Cancelled" && !CANCEL_BLOCKED_STATUSES.includes(o.orderStatus)) || null;
    if (!target) return ask(vsay("cancelBlocked", shortOrderId(orders[0]._id), orders[0].orderStatus));
    if (target.orderStatus === "Cancelled" || CANCEL_BLOCKED_STATUSES.includes(target.orderStatus)) {
      return ask(vsay("cancelBlocked", shortOrderId(target._id), target.orderStatus));
    }
    const first = target.products?.[0]?.name || "";
    const more = Math.max((target.products?.length || 1) - 1, 0);
    return ask(vsay("cancelAsk", shortOrderId(target._id), first, more, formatINR(target.totalAmount || 0)), { type: "CANCEL_ORDER", orderId: String(target._id) });
  };

  /** Performs the cancellation with exactly the same rules as PUT /api/orders/:id/cancel. */
  const doCancel = async (orderId) => {
    if (!req.user) return needLogin();
    try {
      const order = isId(String(orderId)) ? await Order.findById(orderId) : null;
      if (!order || order.user.toString() !== req.user._id.toString()) {
        response.replyText = vsay("cancelFailed");
        return true;
      }
      const id = shortOrderId(order._id);
      if (order.orderStatus === "Cancelled" || CANCEL_BLOCKED_STATUSES.includes(order.orderStatus)) {
        response.replyText = vsay("cancelBlocked", id, order.orderStatus);
        return true;
      }
      order.orderStatus = "Cancelled";
      order.paymentStatus = "CANCELLED";
      order.statusHistory.push({ status: "Cancelled" });
      await order.save();
      response.changed.push("orders");
      response.focusOrder = { _id: String(order._id), status: "Cancelled" };
      response.replyText = vsay("cancelDone", id); // only said after the save above succeeded
      response.redirectTo = `/orders/${order._id}`;
      return true;
    } catch {
      response.replyText = vsay("cancelFailed");
      return true;
    }
  };

  // -------------------------------------------------------------------------------------------------
  // Price
  // -------------------------------------------------------------------------------------------------
  const priceQuery = async () => {
    const catalog = await getCatalog();
    const terms = understood.terms || [];
    let product = null;

    if (terms.length) {
      const q = matchQuality(catalog.entries, terms, {});
      if (q.specific && q.top) product = q.top;
      else if (q.count > 0) {
        // "price of laptop": many candidates - show them, the shopper picks
        const { products } = findProductsSmart(catalog.entries, terms, { limit: 24 });
        response.products = products.slice(0, 8).map(brief);
        const qs = new URLSearchParams({ ids: products.map((p) => p._id).join(","), q: terms.join(" ") });
        response.redirectTo = `/products?${qs.toString()}`;
        response.replyText = vsay("priceMany", products.length, terms.join(" "));
        response.pendingAction = newPending({ type: "CHOOSE_PRODUCT", action: "PRICE", options: products.slice(0, 8).map((p) => ({ id: String(p._id), name: p.name })) });
        return true;
      }
    }
    if (!product) {
      const r = await resolveProduct({ ...understood, terms: [] }, context);
      product = r.product;
    }
    if (!product) {
      const options = (Array.isArray(context.lastProductIds) ? context.lastProductIds : []).filter(isId).slice(0, 8).map((id) => ({ id, name: catalog.byId.get(id)?.name || "" }));
      return ask(vsay("priceAskWhich"), options.length ? { type: "CHOOSE_PRODUCT", action: "PRICE", options } : null);
    }
    const price = unitPrice(product);
    const orig = product.discountPrice && product.discountPrice > 0 && product.discountPrice < product.price ? product.price : null;
    response.replyText = vsay("priceOf", product.name, formatINR(price), orig ? formatINR(orig) : null);
    focus(product);
    return true;
  };

  // -------------------------------------------------------------------------------------------------
  // Removing "that item": find the intended cart / wishlist entry, or ask
  // -------------------------------------------------------------------------------------------------
  const removeByReference = async (target /* "cart" | "wishlist" */) => {
    if (!req.user) return needLogin();
    let list;
    let holder;
    if (target === "wishlist") {
      holder = await getWishlist(req.user._id);
      await holder.populate("products");
      list = holder.products.filter(Boolean).map(plain);
    } else {
      holder = await getCart(req.user._id);
      await holder.populate("items.product");
      list = holder.items.filter((i) => i.product).map((i) => plain(i.product));
    }
    if (!list.length) {
      response.replyText = say(target === "wishlist" ? "notInWishlist" : "notInCart");
      return true;
    }
    const byId = (id) => list.find((p) => String(p._id) === String(id));
    const onListPage = String(context.path || "").startsWith(target === "wishlist" ? "/wishlist" : "/cart");

    let product = null;
    if (isId(context.productId)) product = byId(context.productId) || null;
    if (!product && understood.ordinal && onListPage) product = list[understood.ordinal - 1] || null;
    if (!product && isId(context.focusProductId)) product = byId(context.focusProductId) || null;
    if (!product && list.length === 1) product = list[0];

    if (!product) {
      const options = list.slice(0, 4).map((p) => ({ id: String(p._id), name: p.name }));
      return ask(vsay("askWhichRemove", options.map((o) => o.name)), { type: "CHOOSE_PRODUCT", action: target === "wishlist" ? "REMOVE_WISHLIST" : "REMOVE_CART", options });
    }
    if (target === "wishlist") {
      holder.products = holder.products.filter((p) => String(p._id) !== String(product._id));
      await holder.save();
      response.changed.push("wishlist");
      response.replyText = say("removedFromWishlist", product.name);
    } else {
      holder.items = holder.items.filter((i) => !(i.product && String(i.product._id) === String(product._id)));
      await holder.save();
      response.changed.push("cart");
      response.replyText = say("removedFromCart", product.name);
    }
    response.affectedProduct = brief(product);
    focus(product);
    return true;
  };

  // -------------------------------------------------------------------------------------------------
  // Safety gates
  // -------------------------------------------------------------------------------------------------
  const confirmHeard = (text) => ask(vsay("confirmHeard", text), { type: "RERUN", message: text });

  const confirmProduct = (kind, product, text) =>
    ask(vsay(kind, product.name), { type: "RERUN", message: text });

  /** True when a spoken product NAME is only a sounds-like guess (not every word matched clearly). */
  const weakNameMatch = (entries, terms) => {
    // a spoken quantity ("2 sony headphones") is not part of the product name
    const words = terms.filter((t) => !/^\d+$/.test(String(t)));
    if (!words.length) return false;
    const q = matchQuality(entries, words, {});
    return q.count > 0 && !q.strongAll;
  };

  // -------------------------------------------------------------------------------------------------
  // Answers to a pending question
  // -------------------------------------------------------------------------------------------------
  const answerPending = async (kind /* yes | no | unclear */, pending) => {
    if (kind === "unclear" || (kind === "yes" && String(pending.type).startsWith("CHOOSE_"))) {
      response.replyText = vsay(String(pending.type).startsWith("CHOOSE_") ? "askWhichAdd" : "confirmUnclear");
      response.pendingAction = newPending(pending);
      return true;
    }
    if (kind === "no") {
      response.replyText = pending.type === "CANCEL_ORDER" ? vsay("cancelDeclined") : vsay("declined");
      return true;
    }
    if (pending.type === "CANCEL_ORDER") return doCancel(pending.orderId);
    if (pending.type === "RERUN") {
      const out = await rerun({ message: pending.message, context: { ...context, pending: null, sttConfidence: null }, forced: { confirmed: true } });
      Object.assign(response, out); // the re-run produced the real answer
      return true;
    }
    response.replyText = vsay("nothingPending");
    return true;
  };

  /** "the second one" / "the Sony one" after a which-one question. Returns true when handled. */
  const answerChoice = async (pending, text) => {
    const catalog = await getCatalog();
    const options = (pending.options || []).filter((o) => isId(o.id));
    let picked = null;
    if (understood.ordinal && options[understood.ordinal - 1]) picked = options[understood.ordinal - 1].id;
    if (!picked && understood.terms?.length && options.length) {
      const pool = buildIndex(options.map((o) => catalog.byId.get(o.id)).filter(Boolean));
      const hit = findProductsSmart(pool, understood.terms, { limit: 1 }).products[0];
      if (hit) picked = String(hit._id);
    }
    if (!picked) return false;

    const messages = {
      BUY: "buy this now",
      ADD_TO_CART: "add this to my cart",
      ADD_TO_WISHLIST: "add this to my wishlist",
      PRICE: "how much does this cost",
      REMOVE_CART: "remove this from my cart",
      REMOVE_WISHLIST: "remove this from my wishlist",
    };
    const message = messages[pending.action];
    if (!message) return false;
    const out = await rerun({ message, context: { ...context, pending: null, productId: picked, focusProductId: picked, sttConfidence: null }, forced: { confirmed: true, style } });
    Object.assign(response, out);
    return true;
  };

  return { needLogin, ask, orderStatus, askCancel, doCancel, priceQuery, removeByReference, confirmHeard, confirmProduct, weakNameMatch, answerPending, answerChoice, focus };
};
