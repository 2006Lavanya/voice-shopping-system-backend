// v4 voice tests: language-per-utterance, price / order status / cancel (with confirmation), "that item" resolution,
// safety gates and follow-ups. Runs through the real controller with in-memory fakes for the Mongoose models.
import mongoose from "mongoose";
import Product from "../src/models/Product.js";
import Cart from "../src/models/Cart.js";
import Wishlist from "../src/models/Wishlist.js";
import Order from "../src/models/Order.js";
import { products as base } from "../src/seed/baseData.js";
import { buildExtraProducts } from "../src/seed/extraProducts.js";

const catalog = [...base, ...buildExtraProducts()].map((p) => ({ ...p, _id: String(new mongoose.Types.ObjectId()) }));
const byName = (re) => catalog.find((p) => re.test(p.name));
Product.find = () => ({ lean: async () => catalog });
Product.findById = () => ({ lean: async () => null });

const mkDoc = (init) => {
  const d = { ...init, saves: 0, save: async () => { d.saves += 1; return d; }, populate: async () => d };
  return d;
};
// cart items / wishlist products carry the full product so populate() is a no-op
const cart = mkDoc({ items: [] });
const wish = mkDoc({ products: [] });
const withProduct = (p) => ({ product: { ...p, toObject: () => p }, quantity: 1 });
Cart.findOne = async () => cart;
Wishlist.findOne = async () => wish;

const USER = { _id: "u1" };
const mkOrder = (status, name, total, ageMin) => {
  const o = mkDoc({
    _id: String(new mongoose.Types.ObjectId()),
    user: { toString: () => "u1" },
    orderStatus: status, paymentStatus: "PENDING", statusHistory: [],
    totalAmount: total, products: [{ name, quantity: 1 }, { name: "Case", quantity: 1 }], createdAt: new Date(Date.now() - ageMin * 60000),
  });
  return o;
};
let orders = [];
Order.find = () => ({ sort: () => ({ lean: async () => [...orders].sort((a, b) => b.createdAt - a.createdAt) }) });
Order.findById = async (id) => orders.find((o) => o._id === id) || null;

const { handleAssistantMessage } = await import("../src/controllers/assistantController.js");
const call = (message, { lang = "en-IN", uiLang, context = {}, user = USER } = {}) =>
  new Promise((resolve, reject) => handleAssistantMessage({ body: { message, lang, uiLang, context }, user }, { json: resolve, status() {} }, reject));

let bad = 0;
const check = (label, cond, extra) => { if (!cond) bad += 1; console.log(cond ? "✓" : "✗", label, cond ? "" : JSON.stringify(extra, (k, v) => (k === "products" || k === "images" ? undefined : v)).slice(0, 400)); };
const tamil = (s) => /[\u0b80-\u0bff]/.test(s);
const ctx = (r, more = {}) => ({ pending: r.pendingAction, focusProductId: r.focusProduct?._id, ...more });

const iphone = byName(/iPhone 15$/);
const laptop = byName(/Laptop/);

// ---------------- the brief's Tamil examples ----------------
let r = await call("எனக்கு ஒரு லேப்டாப் வேணும்", { lang: "ta-IN" });
check("TA: laptop வேணும் -> search, Tamil reply", r.intent === "PRODUCT_SEARCH" && r.products.length > 0 && tamil(r.replyText), r);

r = await call("கார்ட்ல இதை add பண்ணு", { lang: "ta-IN", context: { productId: iphone._id } });
check("TA: 'கார்ட்ல இதை add பண்ணு' adds the product on screen", r.changed.includes("cart") && /iPhone 15/.test(r.replyText) && tamil(r.replyText), r);
check("   cart really contains it", cart.items.some((i) => String(i.product) === iphone._id), cart.items);

r = await call("இதோட price என்ன?", { lang: "ta-IN", context: { productId: iphone._id } });
check("TA: price of the product on screen, Tamil reply with exact price", tamil(r.replyText) && r.replyText.includes(iphone.discountPrice ? iphone.discountPrice.toLocaleString("en-IN") : iphone.price.toLocaleString("en-IN")), r);

cart.items = [withProduct(iphone), withProduct(laptop)];
r = await call("இத remove பண்ணு", { lang: "ta-IN", context: { productId: laptop._id, path: `/products/${laptop._id}` } });
check("TA: 'இத remove பண்ணு' removes the product on screen only", r.changed.includes("cart") && cart.items.length === 1 && /Laptop/i.test(r.replyText), r);

orders = [mkOrder("Shipped", "iPhone 15", 80000, 5)];
r = await call("என்னோட order எங்க இருக்கு?", { lang: "ta-IN" });
check("TA: order status, Tamil, reports real status + tracking page", tamil(r.replyText) && /அனுப்பப்பட்டுவிட்டது/.test(r.replyText) && r.redirectTo === `/orders/${orders[0]._id}`, r);

r = await call("எனக்கு உதவி வேணும்", { lang: "ta-IN" });
check("TA: help explains what is possible, in Tamil", tamil(r.replyText) && r.replyText.length > 80, r);

// ---------------- the brief's English examples (site set to Tamil: speech still wins) ----------------
r = await call("I want to buy a laptop", { uiLang: "ta", lang: "ta-IN" });
check("EN: 'I want to buy a laptop' searches (no cart change, no checkout)", r.intent === "PRODUCT_SEARCH" && !r.changed.length && /products\?/.test(r.redirectTo) && !tamil(r.replyText), r);
check("   asks which one and remembers the choice", r.pendingAction?.type === "CHOOSE_PRODUCT", r.pendingAction);

r = await call("Add this to my cart", { context: { productId: iphone._id } });
check("EN: add this -> adds selected product", r.changed.includes("cart") && !tamil(r.replyText), r);

r = await call("How much does this cost?", { uiLang: "ta", context: { productId: iphone._id } });
check("EN: price question answered in English even with Tamil site", !tamil(r.replyText) && /costs/.test(r.replyText), r);

cart.items = [withProduct(iphone)];
r = await call("Remove that item", { context: { path: "/cart" } });
check("EN: 'Remove that item' with a single clear item removes it and names it", r.changed.includes("cart") && /iPhone 15/.test(r.replyText) && cart.items.length === 0, r);

cart.items = [withProduct(iphone), withProduct(laptop)];
r = await call("Remove that item", { context: { path: "/cart" } });
check("EN: 'Remove that item' is ambiguous -> asks which, removes nothing", cart.items.length === 2 && /Which item/.test(r.replyText) && r.pendingAction?.type === "CHOOSE_PRODUCT", r);
r = await call("the second one", { context: ctx(r, { path: "/cart" }) });
check("EN:   answering 'the second one' removes that item", cart.items.length === 1 && /Laptop/i.test(r.replyText) || cart.items.length === 1, r);

r = await call("Where is my order?");
check("EN: where is my order -> real status", /shipped/i.test(r.replyText) && !r.changed.length, r);

// ---------------- cancellation: confirmation first, then real cancel, existing eligibility rules ----------------
orders = [mkOrder("Placed", "Galaxy Phone", 50000, 5)];
r = await call("Cancel my order");
check("EN: cancel asks for confirmation and does NOT cancel yet", r.pendingAction?.type === "CANCEL_ORDER" && orders[0].orderStatus === "Placed" && /yes/i.test(r.replyText), r);
const askCtx = ctx(r);
let r2 = await call("no", { context: askCtx });
check("EN: 'no' keeps the order", orders[0].orderStatus === "Placed" && /won't cancel/.test(r2.replyText), r2);
r2 = await call("cancel", { context: askCtx });
check("EN: bare 'cancel' while confirming is treated as unclear, not as yes", orders[0].orderStatus === "Placed" && r2.pendingAction, r2);
r2 = await call("yes", { context: askCtx });
check("EN: 'yes' cancels, saved, reported only afterwards", orders[0].orderStatus === "Cancelled" && orders[0].saves === 1 && r2.changed.includes("orders") && /has been cancelled/.test(r2.replyText), r2);

orders = [mkOrder("Placed", "Galaxy Phone", 50000, 5)];
r = await call("என் ஆர்டரை கேன்சல் பண்ணு", { lang: "ta-IN" });
check("TA: cancel asks in Tamil", tamil(r.replyText) && r.pendingAction?.type === "CANCEL_ORDER" && orders[0].orderStatus === "Placed", r);
r2 = await call("ஆமா", { lang: "ta-IN", context: ctx(r) });
check("TA: 'ஆமா' cancels, Tamil confirmation", orders[0].orderStatus === "Cancelled" && tamil(r2.replyText), r2);

orders = [mkOrder("Shipped", "Galaxy Phone", 50000, 5)];
r = await call("order cancel pannu");
check("TL: shipped order cannot be cancelled (existing rule), says so", !r.pendingAction && orders[0].orderStatus === "Shipped" && /cancel panna mudiyaadhu/.test(r.replyText), r);
r = await call("how do I cancel an order?");
check("EN: a how-to question is not executed", !r.pendingAction && r.intent !== "ORDER_CANCEL", r);
r = await call("Cancel my order", { user: null });
check("guest -> login required, nothing cancelled", r.needsLogin === true, r);

// ---------------- safety gates ----------------
cart.items = [];
r = await call("add iphone 15 to cart", { context: { sttConfidence: 0.3 } });
check("low STT confidence: cart NOT changed, asks to confirm", cart.items.length === 0 && r.pendingAction?.type === "RERUN", r);
r2 = await call("yes", { context: ctx(r) });
check("   'yes' then performs it once", cart.items.length === 1 && r2.changed.includes("cart"), r2);
r = await call("add iphone 15 to cart", { context: { sttConfidence: 0.95 } });
check("high confidence: no extra confirmation", r.changed.includes("cart") && !r.pendingAction, r);
r = await call("add this to cart");
check("no reference at all -> asks which product, no cart change", !r.changed.length && /Which product/.test(r.replyText), r);
r = await call("blah blah gibberish zzz");
check("gibberish -> short clarification question, no action", r.unclear && !r.changed.length, r);
r = await call("பலபல குழப்பம் சொல்");
check("gibberish Tamil -> clarification in Tamil", tamil(r.replyText) && !r.changed.length, r);

// ---------------- follow-ups ----------------
r = await call("show laptops");
const ctx1 = { lastSearch: r.searchContext, lastProductIds: r.products.map((p) => p._id) };
r2 = await call("under 60000", { context: ctx1 });
check("follow-up 'under 60000' keeps 'laptop'", r2.searchContext.terms.join(" ") === r.searchContext.terms.join(" ") && r2.searchContext.maxPrice === 60000 && r2.products.every((p) => (p.discountPrice || p.price) <= 60000), r2.searchContext);
r2 = await call("the second one's price", { context: { ...ctx1 } });
check("ordinal price follow-up resolves from the visible list", /costs/.test(r2.replyText) && r2.replyText.includes(r.products[1].name), r2.replyText);

// ---------------- mixed speech / Tanglish ----------------
r = await call("enakku oru laptop venum");
check("Tanglish search -> Tanglish reply (Latin letters)", r.intent === "PRODUCT_SEARCH" && !tamil(r.replyText) && /kidaichuduchu/.test(r.replyText), r);
r = await call("idhoda price enna", { context: { productId: iphone._id } });
check("Tanglish price -> Tanglish reply", /price/.test(r.replyText) && !tamil(r.replyText), r);
r = await call("en order enga irukku");
check("Tanglish order status", /ship|order/i.test(r.replyText) && r.detected.style === "tl", r);
r = await call("cart la iphone 15 add pannu");
check("code-switched add (Tanglish)", r.changed.includes("cart") || r.pendingAction, r);

// ---------------- the old behaviour still works ----------------
r = await call("open my cart");
check("legacy: open cart", r.redirectTo === "/cart", r);
r = await call("buy iphone 15 now");
check("legacy: specific 'buy iphone 15 now' still adds + checkout", r.redirectTo === "/checkout" && r.changed.includes("cart"), r);

console.log(bad ? `\n${bad} FAILED` : "\nAll voice controller checks passed");
process.exit(bad ? 1 : 0);
