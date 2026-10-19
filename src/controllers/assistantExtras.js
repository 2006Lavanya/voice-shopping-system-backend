/**
 * assistantExtras.js
 * ------------------
 * Executes the NEW voice intents detected by services/commandExtras.js.
 * Called from assistantController BEFORE the original switch; returns true when it handled the
 * message (the original logic then never runs), false to let the original engine continue.
 *
 * Dependencies of the original controller (catalog cache, product resolver, cart helpers) are passed
 * in via `helpers` so there is no circular import.
 */
import mongoose from "mongoose";
import { buildIndex, findProductsSmart } from "../services/catalogMatcher.js";
import { sayExtra, formatINR } from "../services/commandExtras.js";
import { trending, similar, frequentlyBoughtTogether, personalized } from "../services/recommender.js";
import { getUserSignals, getCoPurchase } from "../services/recommendationData.js";

const isId = (v) => typeof v === "string" && mongoose.isValidObjectId(v);
const plain = (doc) => (doc && typeof doc.toObject === "function" ? doc.toObject() : doc);
const unit = (p) => (p.discountPrice && p.discountPrice > 0 ? p.discountPrice : p.price) || 0;

const CHECKOUT_ACTIONS = {
  CHECKOUT_NEXT: "NEXT",
  CHECKOUT_BACK: "BACK",
  CHECKOUT_CONFIRM: "CONFIRM",
  CHECKOUT_CONFIRM_ADDRESS: "CONFIRM_ADDRESS",
  CHECKOUT_SELECT_ADDRESS: "SELECT_ADDRESS",
  CHECKOUT_NEW_ADDRESS: "NEW_ADDRESS",
  CHECKOUT_SET_DELIVERY: "SET_DELIVERY",
  CHECKOUT_SET_PAYMENT: "SET_PAYMENT",
  CHECKOUT_PLACE_ORDER: "PLACE_ORDER",
  CHECKOUT_CONFIRM_ORDER: "CONFIRM_ORDER",
  CHECKOUT_COUPON: "COUPON",
};

export const handleExtraIntent = async ({ extra, req, response, say, style, context, helpers }) => {
  const x = (key, ...args) => sayExtra(style, key, ...args);
  const { getCatalog, resolveProduct, getCart, brief } = helpers;

  const needLogin = () => {
    response.replyText = say("loginRequired");
    response.redirectTo = "/login";
    response.needsLogin = true;
    return true;
  };

  const showProducts = (products, label, text) => {
    response.products = products.slice(0, 8).map(brief);
    response.replyText = text;
    const qs = new URLSearchParams();
    qs.set("ids", products.map((p) => p._id).join(","));
    qs.set("q", label);
    response.redirectTo = `/products?${qs.toString()}`;
    return true;
  };

  const intent = extra.intent;

  // ===================================================================== UI (handled by the browser)
  if (intent === "UI_THEME_MODE") {
    response.uiAction = { type: "SET_THEME_MODE", value: extra.value };
    response.replyText = x(extra.value === "dark" ? "themeDark" : "themeLight");
    return true;
  }
  if (intent === "UI_THEME_ACCENT") {
    response.uiAction = { type: "SET_THEME_ACCENT", value: extra.value };
    response.replyText = x("themeAccent", extra.value);
    return true;
  }
  if (intent === "UI_THEME_PANEL") {
    response.uiAction = { type: "OPEN_THEME_PANEL" };
    response.replyText = x("themePanel");
    return true;
  }
  if (intent === "UI_LANGUAGE") {
    response.uiAction = { type: "SET_LANGUAGE", value: extra.value };
    // confirm in the language that was just chosen
    response.replyText = sayExtra(extra.value, "langSet")[extra.value];
    response.lang = extra.value === "ta" ? "ta-IN" : "en-IN";
    return true;
  }
  if (intent === "UI_VIEW") {
    response.uiAction = { type: "SET_VIEW", value: extra.value };
    response.replyText = x("viewSet", extra.value);
    if (!String(context.path || "").startsWith("/products")) response.redirectTo = "/products";
    return true;
  }

  // ===================================================================== navigation helpers
  if (intent === "GO_PRODUCTS") {
    response.replyText = x("productsPage");
    response.redirectTo = "/products";
    return true;
  }
  if (intent === "CHECKOUT_START") {
    if (!req.user) return needLogin();
    response.replyText = say("checkout");
    response.redirectTo = "/checkout";
    return true;
  }

  // ===================================================================== cart info
  if (intent === "CART_COUNT" || intent === "CART_TOTAL") {
    if (!req.user) return needLogin();
    const cart = await getCart(req.user._id);
    await cart.populate("items.product");
    const live = cart.items.filter((i) => i.product);
    if (!live.length) {
      response.replyText = x("cartEmpty");
      return true;
    }
    const units = live.reduce((n, i) => n + i.quantity, 0);
    if (intent === "CART_COUNT") response.replyText = x("cartCount", live.length, units);
    else response.replyText = x("cartTotal", formatINR(live.reduce((n, i) => n + unit(i.product) * i.quantity, 0)), units);
    return true;
  }

  // ===================================================================== quantity
  if (intent === "CART_QTY_INCREASE" || intent === "CART_QTY_DECREASE" || intent === "CART_QTY_SET") {
    if (!req.user) return needLogin();
    const cart = await getCart(req.user._id);
    await cart.populate("items.product");
    const live = cart.items.filter((i) => i.product);
    if (!live.length) {
      response.replyText = x("cartEmpty");
      return true;
    }

    let item = null;
    if (extra.terms?.length) {
      const pool = buildIndex(live.map((i) => plain(i.product)));
      const { products } = findProductsSmart(pool, extra.terms, { limit: 3 });
      item = products[0] ? live.find((i) => String(i.product._id) === String(products[0]._id)) : null;
      if (!item) {
        response.replyText = say("notInCart");
        return true;
      }
    } else if (isId(context.productId)) {
      item = live.find((i) => String(i.product._id) === context.productId) || null;
    }
    // No product named: a one-item cart is unambiguous; otherwise use the item added most recently.
    if (!item) item = live.length === 1 ? live[0] : live[live.length - 1];

    const p = item.product;
    const current = item.quantity;
    const wanted = intent === "CART_QTY_SET" ? extra.amount : intent === "CART_QTY_INCREASE" ? current + extra.amount : current - extra.amount;

    if (wanted <= 0) {
      cart.items = cart.items.filter((i) => i !== item);
      await cart.save();
      response.changed.push("cart");
      response.replyText = say("removedFromCart", p.name);
      response.affectedProduct = brief(p);
      return true;
    }
    const stock = typeof p.stock === "number" ? Math.max(p.stock, 1) : 99;
    const finalQty = Math.min(wanted, stock);
    item.quantity = finalQty;
    await cart.save();
    response.changed.push("cart");
    response.affectedProduct = brief(p);
    response.replyText = finalQty < wanted ? x("qtyMax", p.name, finalQty) : x("qtyChanged", p.name, finalQty);
    return true;
  }

  // ===================================================================== checkout / payment flow
  if (CHECKOUT_ACTIONS[intent]) {
    if (!req.user) return needLogin();
    const onCheckout = String(context.path || "").startsWith("/checkout");
    const action = {
      type: "CHECKOUT",
      action: CHECKOUT_ACTIONS[intent],
      value: extra.value,
      ordinal: extra.ordinal,
      code: extra.code,
      confirm: extra.confirm,
    };
    if (!onCheckout) {
      const cart = await getCart(req.user._id);
      await cart.populate("items.product");
      if (!cart.items.filter((i) => i.product).length) {
        response.replyText = x("cartEmpty");
        return true;
      }
      response.replyText = x("checkoutFirst");
      response.redirectTo = "/checkout";
      // payment / delivery choices are remembered and applied when the checkout page opens
      if (["SET_PAYMENT", "SET_DELIVERY"].includes(action.action)) response.uiAction = { ...action, pending: true };
      return true;
    }
    response.replyText = x("ok"); // the checkout page replaces this with step-by-step guidance
    response.uiAction = action;
    return true;
  }

  // ===================================================================== AI shopping helper
  if (["RECOMMEND", "TRENDING", "SIMILAR", "FREQUENTLY_BOUGHT", "RECENTLY_VIEWED"].includes(intent)) {
    const catalog = await getCatalog();
    const all = [...catalog.byId.values()];

    if (intent === "RECOMMEND") {
      let picks;
      if (extra.terms?.length) {
        picks = findProductsSmart(catalog.entries, extra.terms, { sort: "rating", limit: 8 }).products;
      } else {
        picks = personalized(all, { ...(await getUserSignals(req.user?._id)), limit: 8 });
      }
      if (!picks.length) {
        response.replyText = x("recoNone");
        return true;
      }
      return showProducts(picks, "Recommended for you", x("recoFound", Math.min(picks.length, 8)));
    }

    if (intent === "TRENDING") {
      let picks;
      if (extra.terms?.length) {
        const pool = findProductsSmart(catalog.entries, extra.terms, { limit: 40 }).products;
        picks = trending(pool, { limit: 8 });
      } else picks = trending(all, { limit: 8 });
      if (!picks.length) {
        response.replyText = x("recoNone");
        return true;
      }
      return showProducts(picks, "Trending", x("trendFound", picks.length));
    }

    if (intent === "RECENTLY_VIEWED") {
      if (!req.user) return needLogin();
      const { viewedIds } = await getUserSignals(req.user._id);
      const picks = viewedIds.map((id) => catalog.byId.get(id)).filter(Boolean).slice(0, 12);
      if (!picks.length) {
        response.replyText = x("recentNone");
        return true;
      }
      return showProducts(picks, "Recently viewed", x("recentFound", picks.length));
    }

    // SIMILAR / FREQUENTLY_BOUGHT need a target product: named, or the one on screen.
    const { product } = await resolveProduct({ terms: extra.terms || [], qty: 1, ordinal: null }, context);
    if (!product) {
      response.replyText = x("similarNone");
      return true;
    }
    if (intent === "SIMILAR") {
      const picks = similar(product, all, { limit: 8 });
      if (!picks.length) {
        response.replyText = x("similarNone");
        return true;
      }
      return showProducts(picks, `Similar to ${product.name}`, x("similarFound", product.name, picks.length));
    }
    const co = await getCoPurchase(product._id);
    const picks = frequentlyBoughtTogether(product, all, { coPurchase: co, limit: 6 });
    if (!picks.length) {
      response.replyText = x("similarNone");
      return true;
    }
    return showProducts(picks, `Bought with ${product.name}`, x("fbtFound", product.name, picks.length));
  }

  return false;
};
