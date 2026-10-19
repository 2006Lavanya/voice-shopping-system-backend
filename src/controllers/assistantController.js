import mongoose from "mongoose";
import asyncHandler from "../middleware/asyncHandler.js";
import Product from "../models/Product.js";
import Cart from "../models/Cart.js";
import Wishlist from "../models/Wishlist.js";
import { understandMessage, translate } from "../services/assistantEngine.js";
import { buildIndex, findProducts, findProductsSmart, matchQuality } from "../services/catalogMatcher.js";
import { detectExtraIntent, TL_LEGACY } from "../services/commandExtras.js";
import { detectUtteranceLanguage } from "../services/languageDetect.js";
import { detectVoiceIntent, pendingIsFresh, sayVoice, newPending } from "../services/voiceIntents.js";
import { handleExtraIntent } from "./assistantExtras.js";
import { createVoiceHandlers, STATE_CHANGING, IMPORTANT_EXTRA, isLowConfidence } from "./assistantVoice.js";

// ---------------------------------------------------------------------------
// Catalog index cache (rebuilt every 60s so admin edits show up quickly)
// ---------------------------------------------------------------------------
let cache = { at: 0, entries: [], byId: new Map() };
const getCatalog = async () => {
  if (Date.now() - cache.at < 60_000 && cache.entries.length) return cache;
  const products = await Product.find({}).lean();
  const entries = buildIndex(products);
  cache = { at: Date.now(), entries, byId: new Map(products.map((p) => [String(p._id), p])) };
  return cache;
};

const brief = (p) => ({
  _id: p._id,
  name: p.name,
  brand: p.brand,
  category: p.category,
  price: p.price,
  discountPrice: p.discountPrice,
  images: p.images?.slice(0, 1),
  rating: p.rating,
  reviewCount: p.reviewCount,
  stock: p.stock,
  colors: p.colors,
  sizes: p.sizes,
});

const isId = (v) => typeof v === "string" && mongoose.isValidObjectId(v);

/** Works out WHICH product the shopper means: ordinal ("the second one"), "this", or spoken words. */
const resolveProduct = async (understood, ctx, { poolEntries = null } = {}) => {
  const catalog = await getCatalog();
  const lastIds = Array.isArray(ctx.lastProductIds) ? ctx.lastProductIds.filter(isId) : [];

  // "add the second one" -> position in the list currently on screen
  if (understood.ordinal && lastIds.length >= understood.ordinal) {
    const p = catalog.byId.get(lastIds[understood.ordinal - 1]);
    if (p) return { product: p, qty: understood.qty };
  }

  if (understood.terms.length) {
    const entries = poolEntries || catalog.entries;
    const { products, droppedQty } = findProductsSmart(entries, understood.terms, { maxPrice: understood.maxPrice, minPrice: understood.minPrice, sort: understood.sort, limit: 5 });
    if (products[0]) return { product: products[0], qty: understood.qty === 1 && droppedQty ? droppedQty : understood.qty, matches: products };
    return { product: null, qty: understood.qty };
  }

  // "add this to cart" / no product named -> the product page the shopper is on
  if (isId(ctx.productId)) {
    const p = catalog.byId.get(ctx.productId) || (await Product.findById(ctx.productId).lean());
    if (p) return { product: p, qty: understood.qty };
  }
  // ... else the product we were just talking about ("this" after "how much is it?"), or the only one on screen
  if (isId(ctx.focusProductId)) {
    const p = catalog.byId.get(ctx.focusProductId);
    if (p) return { product: p, qty: understood.qty };
  }
  if (!poolEntries && lastIds.length === 1) {
    const p = catalog.byId.get(lastIds[0]);
    if (p) return { product: p, qty: understood.qty };
  }
  if (poolEntries && poolEntries.length === 1) return { product: poolEntries[0].p, qty: understood.qty };
  return { product: null, qty: understood.qty, needsName: true };
};

const pickColor = (product, understood) => {
  const wanted = understood.terms.map((t) => String(t).toLowerCase());
  return (product.colors || []).find((c) => wanted.includes(String(c).toLowerCase())) || "";
};

const getCart = async (userId) => (await Cart.findOne({ user: userId })) || (await Cart.create({ user: userId, items: [] }));
const getWishlist = async (userId) => (await Wishlist.findOne({ user: userId })) || (await Wishlist.create({ user: userId, products: [] }));

// @route POST /api/assistant/message
// One endpoint powers the floating assistant, the typed chatbot AND hands-free mode.
// body: { message, lang, uiLang, context: { productId, lastProductIds, focusProductId, lastSearch, pending, sttConfidence, lastStyle, path } }
//
// respond() builds the reply object. It is a function (not inline) so a confirmed action ("yes, cancel it",
// "the second one") can safely re-enter the same pipeline.
const respond = async (req, { message, lang, uiLang, context, forced = {} }) => {
  const text = String(message);
  const depth = forced.depth || 0;

  // The language of THIS utterance decides the reply language (Tamil / Tanglish / English / other Indic).
  const detected = forced.style
    ? { style: forced.style, lang: forced.style === "ta" ? "ta-IN" : "en-IN", reason: "forced" }
    : detectUtteranceLanguage({ message: text, uiLang, lang, lastStyle: context.lastStyle });
  const style = detected.style;
  const L = style === "ta" ? "ta-IN" : style === "tl" || style === "en" ? "en-IN" : detected.lang;
  const understood = understandMessage(text, L, context);

  const say = (key, ...args) => {
    if (style === "tl" && TL_LEGACY[key] !== undefined) return typeof TL_LEGACY[key] === "function" ? TL_LEGACY[key](...args) : TL_LEGACY[key];
    return translate(L, key, ...args);
  };
  const vsay = (key, ...args) => sayVoice(style, key, ...args);

  const response = {
    success: true,
    intent: understood.intent,
    replyText: "",
    lang: L,
    detected: { style, lang: L, reason: detected.reason },
    redirectTo: null,
    products: null,
    changed: [], // "cart", "wishlist" and/or "orders" when the backend modified them
    stopListening: false,
  };

  const needLogin = () => {
    response.replyText = say("loginRequired");
    response.redirectTo = "/login";
    response.needsLogin = true;
  };

  const rerun = (over = {}) =>
    depth >= 2
      ? Promise.resolve({ ...response, replyText: vsay("unclear") })
      : respond(req, { message: over.message ?? text, lang, uiLang, context: over.context ?? context, forced: { ...forced, ...(over.forced || {}), depth: depth + 1 } });

  const handlers = createVoiceHandlers({
    req, response, say, vsay, style, context, understood, rerun,
    helpers: { getCatalog, resolveProduct, getCart, getWishlist, brief },
  });

  // ---- 1) The shopper is answering a question we just asked ("yes" / "no" / "the second one")
  const pending = pendingIsFresh(context.pending) ? context.pending : null;
  const voice = detectVoiceIntent(text, { ...context, pending });
  if (pending) {
    if (voice && voice.intent.startsWith("CONFIRM_")) {
      response.intent = voice.intent;
      await handlers.answerPending(voice.intent === "CONFIRM_YES" ? "yes" : voice.intent === "CONFIRM_NO" ? "no" : "unclear", pending);
      return response;
    }
    if (String(pending.type).startsWith("CHOOSE_") && (await handlers.answerChoice(pending, text))) {
      response.intent = "CHOOSE";
      return response;
    }
    // anything else: the shopper moved on, the old question is simply dropped
  }

  // ---- 2) Order status / cancel / price questions (the original engine confused or lacked these)
  if (voice && !voice.intent.startsWith("CONFIRM_")) {
    response.intent = voice.intent;
    if (voice.intent === "ORDER_STATUS") return await handlers.orderStatus(understood.terms), response;
    if (voice.intent === "ORDER_CANCEL") return await handlers.askCancel(understood.terms), response;
    if (voice.intent === "PRICE_QUERY") return await handlers.priceQuery(), response;
  }

  // ---- 3) quantity, cart info, checkout/payment steps, AI helper, theme/language (see commandExtras.js).
  // Returns null for everything the original engine already handles, so existing behaviour is untouched.
  const extra = detectExtraIntent(text, context);
  if (extra) {
    response.intent = extra.intent;
    response.uiAction = null;
    // placing / confirming an order is never done on a shaky transcript
    if (!forced.confirmed && IMPORTANT_EXTRA.has(extra.intent) && isLowConfidence(context)) return handlers.confirmHeard(text), response;
    const handled = await handleExtraIntent({ extra, req, response, say, style, context, helpers: { getCatalog, resolveProduct, getCart, brief } });
    if (handled) return response;
  }

  // ---- 4) original engine, with the safety rules
  let intent = understood.intent;
  const cues = understood.cues || {};
  let buyGeneric = false;

  // "I want to buy a laptop" is a search, not "put the best-rated laptop in the cart and go to checkout".
  if (intent === "ADD_TO_CART" && understood.buyNow && !forced.confirmed && !cues.cart && !cues.add && understood.terms.length && !understood.useContext) {
    const catalog = await getCatalog();
    const q = matchQuality(catalog.entries, understood.terms, { maxPrice: understood.maxPrice, minPrice: understood.minPrice });
    if (!q.specific) {
      intent = "PRODUCT_SEARCH";
      buyGeneric = true;
    }
  }
  // On the wishlist page "remove that" means the wishlist.
  if (intent === "REMOVE_FROM_CART" && !cues.cart && !cues.wishlist && String(context.path || "").startsWith("/wishlist")) intent = "REMOVE_FROM_WISHLIST";

  // Bare words with no search verb that don't clearly match any product are not a request: ask, don't guess.
  if (intent === "PRODUCT_SEARCH" && !buyGeneric && understood.terms.length && !cues.search && !cues.show && !understood.maxPrice && !understood.minPrice && !understood.sort) {
    const words = understood.terms.filter((t) => !/^\d+$/.test(String(t)));
    if (words.length && !matchQuality((await getCatalog()).entries, words, {}).strongAll) intent = "UNKNOWN";
  }
  response.intent = intent;

  // Cart / wishlist changes are not made on a recognition result the browser itself was unsure about.
  if (!forced.confirmed && STATE_CHANGING.has(intent) && isLowConfidence(context)) return handlers.confirmHeard(text), response;

  switch (intent) {
    case "GREETING":
      response.replyText = say("greeting");
      break;
    case "THANKS":
      response.replyText = say("thanks");
      break;
    case "HELP":
      response.replyText = vsay("help");
      break;
    case "FAQ":
      response.replyText = understood.faqAnswer;
      break;
    case "STOP_LISTENING":
      response.replyText = say("stopListening");
      response.stopListening = true;
      break;
    case "UNKNOWN":
      // genuinely unclear: ask a short question in the same language rather than guessing
      response.replyText = vsay("unclear");
      response.unclear = true;
      break;

    // ------------------------------------------------------------- navigation
    case "OPEN_CART":
      response.replyText = say("openCart");
      response.redirectTo = "/cart";
      break;
    case "OPEN_WISHLIST":
      response.replyText = say("openWishlist");
      response.redirectTo = "/wishlist";
      break;
    case "GO_TO_CHECKOUT":
      response.replyText = say("checkout");
      response.redirectTo = "/checkout";
      break;
    case "SHOW_ORDERS":
      response.replyText = say("myOrders");
      response.redirectTo = "/orders";
      break;
    case "CANCEL_HELP":
      response.replyText = say("cancelHelp");
      response.redirectTo = "/orders";
      break;
    case "GO_HOME":
      response.replyText = say("goHome");
      response.redirectTo = "/";
      break;
    case "OPEN_PROFILE":
      response.replyText = say("openProfile");
      response.redirectTo = "/profile";
      break;

    // ------------------------------------------------------------- search
    case "PRODUCT_SEARCH": {
      const catalog = await getCatalog();
      let { terms, maxPrice, minPrice, sort } = understood;
      // Follow-up such as "under 50000" / "cheaper ones" right after a search keeps the earlier product words.
      const prev = context.lastSearch;
      if (!terms.length && (maxPrice || minPrice || sort) && prev && Array.isArray(prev.terms) && prev.terms.length) {
        terms = prev.terms;
        if (!maxPrice && !minPrice) {
          maxPrice = prev.maxPrice || null;
          minPrice = prev.minPrice || null;
        }
      }
      const { products } = findProductsSmart(catalog.entries, terms, { maxPrice, minPrice, sort, limit: 24 });
      const subject = [terms.join(" ") || null, maxPrice ? `₹${maxPrice.toLocaleString("en-IN")}` : null].filter(Boolean).join(" ") || text;
      response.products = products.slice(0, 8).map(brief);
      response.searchContext = { terms, maxPrice: maxPrice || null, minPrice: minPrice || null, sort: sort || null };
      if (products.length) {
        response.replyText = buyGeneric ? vsay("buyPickOne", products.length, subject) : say("searchFound", products.length, subject);
        if (buyGeneric) response.pendingAction = newPending({ type: "CHOOSE_PRODUCT", action: "BUY", options: products.slice(0, 8).map((p) => ({ id: String(p._id), name: p.name })) });
        if (products.length === 1) handlers.focus(products[0]);
        const qs = new URLSearchParams();
        qs.set("ids", products.map((p) => p._id).join(","));
        qs.set("q", subject);
        response.redirectTo = `/products?${qs.toString()}`;
      } else {
        response.replyText = say("searchNone", subject);
      }
      break;
    }

    // ------------------------------------------------------------- add to cart
    case "ADD_TO_CART": {
      if (!req.user) return needLogin(), response;
      const { product, qty, needsName } = await resolveProduct(understood, context);
      if (!product) {
        response.replyText = say(needsName ? "askProduct" : "notFoundProduct");
        break;
      }
      if (!forced.confirmed && understood.terms.length && !understood.ordinal && handlers.weakNameMatch((await getCatalog()).entries, understood.terms)) {
        return handlers.confirmProduct("confirmAddCart", product, text), response;
      }
      if (product.stock <= 0) {
        response.replyText = say("outOfStock", product.name);
        break;
      }
      const cart = await getCart(req.user._id);
      const color = pickColor(product, understood);
      const existing = cart.items.find((i) => i.product.toString() === String(product._id) && (i.color || "") === color && (i.size || "") === "");
      const already = existing ? existing.quantity : 0;
      const finalQty = Math.min(qty, Math.max(product.stock - already, 1));
      if (existing) existing.quantity += finalQty;
      else cart.items.push({ product: product._id, quantity: finalQty, color, size: "" });
      await cart.save();
      response.changed.push("cart");
      response.affectedProduct = brief(product);
      if (understood.buyNow) {
        response.replyText = say("buyNow", product.name);
        response.redirectTo = "/checkout";
      } else {
        response.replyText = say("addedToCart", product.name, finalQty);
      }
      break;
    }

    // ------------------------------------------------------------- wishlist add
    case "ADD_TO_WISHLIST": {
      if (!req.user) return needLogin(), response;
      const { product, needsName } = await resolveProduct(understood, context);
      if (!product) {
        response.replyText = say(needsName ? "askProduct" : "notFoundProduct");
        break;
      }
      if (!forced.confirmed && understood.terms.length && !understood.ordinal && handlers.weakNameMatch((await getCatalog()).entries, understood.terms)) {
        return handlers.confirmProduct("confirmAddWishlist", product, text), response;
      }
      const wishlist = await getWishlist(req.user._id);
      if (wishlist.products.some((p) => p.toString() === String(product._id))) {
        response.replyText = say("alreadyWishlist", product.name);
      } else {
        wishlist.products.push(product._id);
        await wishlist.save();
        response.changed.push("wishlist");
        response.replyText = say("addedToWishlist", product.name);
      }
      response.affectedProduct = brief(product);
      break;
    }

    // ------------------------------------------------------------- cart remove / clear
    case "REMOVE_FROM_CART": {
      if (!req.user) return needLogin(), response;
      // "remove that item" / "இத remove பண்ணு": work out which one from the conversation, or ask which
      if (!understood.terms.length && !(understood.ordinal && !String(context.path || "").startsWith("/cart"))) {
        await handlers.removeByReference("cart");
        break;
      }
      const cart = await getCart(req.user._id);
      await cart.populate("items.product");
      const live = cart.items.filter((i) => i.product);
      const pool = buildIndex(live.map((i) => i.product.toObject()));
      const { product, needsName } = await resolveProduct(understood, context, { poolEntries: pool });
      if (!product) {
        response.replyText = say(needsName ? "askProduct" : "notInCart");
        break;
      }
      const before = cart.items.length;
      cart.items = cart.items.filter((i) => !(i.product && String(i.product._id) === String(product._id)));
      if (cart.items.length === before) {
        response.replyText = say("notInCart");
        break;
      }
      await cart.save();
      response.changed.push("cart");
      response.affectedProduct = brief(product);
      response.replyText = say("removedFromCart", product.name);
      break;
    }
    case "CLEAR_CART": {
      if (!req.user) return needLogin(), response;
      const cart = await getCart(req.user._id);
      cart.items = [];
      await cart.save();
      response.changed.push("cart");
      response.replyText = say("cartCleared");
      break;
    }

    // ------------------------------------------------------------- wishlist remove / clear
    case "REMOVE_FROM_WISHLIST": {
      if (!req.user) return needLogin(), response;
      if (!understood.terms.length && !(understood.ordinal && !String(context.path || "").startsWith("/wishlist"))) {
        await handlers.removeByReference("wishlist");
        break;
      }
      const wishlist = await getWishlist(req.user._id);
      await wishlist.populate("products");
      const pool = buildIndex(wishlist.products.filter(Boolean).map((p) => p.toObject()));
      const { product, needsName } = await resolveProduct(understood, context, { poolEntries: pool });
      if (!product) {
        response.replyText = say(needsName ? "askProduct" : "notInWishlist");
        break;
      }
      const before = wishlist.products.length;
      wishlist.products = wishlist.products.filter((p) => String(p._id) !== String(product._id));
      if (wishlist.products.length === before) {
        response.replyText = say("notInWishlist");
        break;
      }
      await wishlist.save();
      response.changed.push("wishlist");
      response.affectedProduct = brief(product);
      response.replyText = say("removedFromWishlist", product.name);
      break;
    }
    case "CLEAR_WISHLIST": {
      if (!req.user) return needLogin(), response;
      const wishlist = await getWishlist(req.user._id);
      wishlist.products = [];
      await wishlist.save();
      response.changed.push("wishlist");
      response.replyText = say("wishlistCleared");
      break;
    }

    default:
      response.replyText = vsay("unclear");
      response.unclear = true;
  }

  return response;
};

export const handleAssistantMessage = asyncHandler(async (req, res) => {
  // uiLang ("en" | "ta" | "tl") is the shopper's chosen site language (optional, tie-breaker only).
  const { message, lang = "en-US", context = {}, uiLang } = req.body;

  if (!message || !String(message).trim()) {
    res.status(400);
    throw new Error("Message is required");
  }
  res.json(await respond(req, { message: String(message), lang, uiLang, context: context && typeof context === "object" ? context : {} }));
});

// Used by tests / admin tooling to force a catalog refresh after bulk edits.
export const invalidateCatalogCache = () => {
  cache = { at: 0, entries: [], byId: new Map() };
};

export { findProducts };
