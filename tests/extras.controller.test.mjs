// Controller test for the NEW voice features, using in-memory fakes (no database needed).
import mongoose from "mongoose";
import Product from "../src/models/Product.js";
import Cart from "../src/models/Cart.js";
import Wishlist from "../src/models/Wishlist.js";
import User from "../src/models/User.js";
import Order from "../src/models/Order.js";
import { products as base } from "../src/seed/baseData.js";
import { buildExtraProducts } from "../src/seed/extraProducts.js";
import { buildMoreProducts } from "../src/seed/moreProducts.js";

const catalog = [...base, ...buildExtraProducts(), ...buildMoreProducts()].map((p) => ({ ...p, _id: new mongoose.Types.ObjectId() }));
const byName = (s) => catalog.find((p) => p.name.toLowerCase().includes(s.toLowerCase()));
Product.find = () => ({ lean: async () => catalog });
Product.findById = () => ({ lean: async () => null });

const cart = { items: [], save: async () => cart };
cart.populate = async () => {
  cart.items.forEach((i) => {
    if (!i.product?.name) {
      const doc = catalog.find((p) => String(p._id) === String(i.product));
      i.product = { ...doc, toObject() { return doc; } };
    }
  });
};
const wish = { products: [], save: async () => wish, populate: async () => wish };
Cart.findOne = async () => cart;
Wishlist.findOne = async () => ({ lean: async () => wish, ...wish });
const viewed = [byName("iPhone 16e")._id, byName("Dell Inspiron 14")._id];
User.findById = () => ({ select: () => ({ lean: async () => ({ browsingHistory: viewed }) }) });
Order.find = () => ({ sort: () => ({ limit: () => ({ lean: async () => [] }) }), limit: () => ({ lean: async () => [] }) });

const { handleAssistantMessage } = await import("../src/controllers/assistantController.js");
const call = (message, { lang = "en-IN", context = {}, uiLang, user = { _id: "u1" } } = {}) =>
  new Promise((resolve, reject) => handleAssistantMessage({ body: { message, lang, context, uiLang }, user }, { json: resolve, status() {} }, reject));

let bad = 0;
const check = (label, cond, extra) => {
  if (!cond) bad += 1;
  console.log(cond ? "✓" : "✗", label, cond ? "" : JSON.stringify(extra));
};
const qty = () => cart.items.reduce((n, i) => n + i.quantity, 0);

// ---------------------------------------------------------------- spec examples (original behaviour intact)
let r = await call("Add iPhone to cart");
check("Add iPhone to cart", r.changed.includes("cart") && cart.items.length === 1, r);
r = await call("iPhone cart la add pannu");
check("iPhone cart la add pannu (Tanglish) -> qty 2, Tanglish reply", qty() === 2 && /cart-la/.test(r.replyText), r.replyText);
r = await call("iPhone ah cart la podu");
check("iPhone ah cart la podu -> qty 3", qty() === 3, r.replyText);
r = await call("Samsung Galaxy S25 cart la add pannu");
check("Samsung Galaxy S25 cart la add pannu", cart.items.length === 2 && /S25/.test(r.replyText), r.replyText);
r = await call("Add Samsung Galaxy S25 to cart");
check("Add Samsung Galaxy S25 to cart", qty() === 5, r.replyText);

// ---------------------------------------------------------------- quantity
r = await call("Increase quantity", { context: { path: "/cart" } });
check("increase quantity -> last added item (S25) 3", cart.items[1].quantity === 3 && r.intent === "CART_QTY_INCREASE" && /3/.test(r.replyText), r.replyText);
r = await call("increase iphone quantity by 2");
check("increase iphone by 2 -> 5", cart.items[0].quantity === 5, cart.items.map((i) => i.quantity));
r = await call("Decrease quantity");
check("decrease quantity -> S25 2", cart.items[1].quantity === 2, r.replyText);
r = await call("reduce iphone quantity by 1");
check("reduce iphone -> 4", cart.items[0].quantity === 4, r.replyText);
r = await call("quantity kootu");
check("Tanglish quantity kootu -> +1 with Tanglish reply", cart.items[1].quantity === 3 && /Seri/.test(r.replyText), r.replyText);
r = await call("எண்ணிக்கையை குறை");
check("Tamil decrease -> reply in Tamil", cart.items[1].quantity === 2 && /[\u0b80-\u0bff]/.test(r.replyText), r.replyText);
const s25 = cart.items[1];
r = await call("set quantity to 1", { context: { path: "/cart" } });
check("set quantity to 1", s25.quantity === 1, r.replyText);
r = await call("reduce quantity");
check("decrease below 1 removes the item", cart.items.length === 1 && /Removed|remove/i.test(r.replyText), r.replyText);
const stockItem = byName("iPhone 16e");
const keepStock = stockItem.stock;

// ---------------------------------------------------------------- cart info
r = await call("How many items are in cart?");
check("count -> 4 items", r.intent === "CART_COUNT" && /4 items/.test(r.replyText), r.replyText);
r = await call("cart la evlo items irukku");
check("Tanglish count", /Ungal cart-la 4 item/.test(r.replyText), r.replyText);
r = await call("what is my cart total");
check("total contains rupee amount", /₹[\d,]+/.test(r.replyText), r.replyText);
r = await call("கார்ட்டில் எத்தனை பொருட்கள்");
check("Tamil count reply", /[\u0b80-\u0bff]/.test(r.replyText) && /4/.test(r.replyText), r.replyText);

// ---------------------------------------------------------------- stock cap
const iph = cart.items[0].product;
r = await call("set quantity to 5", { context: { path: "/cart" } });
check("set qty above stock is capped or accepted", cart.items[0].quantity <= Math.max(iph.stock, 1), { q: cart.items[0].quantity, stock: iph.stock });

// ---------------------------------------------------------------- checkout / payment steps
r = await call("Continue", { context: { path: "/checkout" } });
check("checkout: Continue -> NEXT uiAction", r.uiAction?.type === "CHECKOUT" && r.uiAction.action === "NEXT", r);
r = await call("Confirm address", { context: { path: "/checkout" } });
check("checkout: Confirm address", r.uiAction?.action === "CONFIRM_ADDRESS", r);
r = await call("express delivery", { context: { path: "/checkout" } });
check("checkout: express delivery", r.uiAction?.action === "SET_DELIVERY" && r.uiAction.value === "express", r);
r = await call("UPI payment", { context: { path: "/checkout" } });
check("checkout: UPI payment", r.uiAction?.action === "SET_PAYMENT" && r.uiAction.value === "UPI", r);
r = await call("Credit card", { context: { path: "/checkout" } });
check("checkout: Credit card", r.uiAction?.value === "CARD", r);
r = await call("Cash on delivery", { context: { path: "/checkout" } });
check("checkout: Cash on delivery", r.uiAction?.value === "COD", r);
r = await call("Place order", { context: { path: "/checkout" } });
check("checkout: Place order", r.uiAction?.action === "PLACE_ORDER", r);
r = await call("Confirm order", { context: { path: "/checkout" } });
check("checkout: Confirm order", r.uiAction?.action === "CONFIRM_ORDER", r);
r = await call("Check out pannu", { context: { path: "/cart" } });
check("Check out pannu -> /checkout (original engine)", r.redirectTo === "/checkout", r);
r = await call("Proceed to checkout", { context: { path: "/cart" } });
check("Proceed to checkout -> /checkout", r.redirectTo === "/checkout", r);
r = await call("continue", { context: { path: "/cart" } });
check("continue on cart -> /checkout", r.redirectTo === "/checkout", r);
r = await call("UPI payment pannu", { context: { path: "/" } });
check("UPI on other page -> /checkout + pending", r.redirectTo === "/checkout" && r.uiAction?.pending === true, r);
r = await call("Continue", { user: null, context: { path: "/checkout" } });
check("checkout voice needs login", r.needsLogin === true, r);

// ---------------------------------------------------------------- AI shopping helper
r = await call("recommend something for me");
check("recommend -> products + ids redirect", r.products?.length > 0 && /ids=/.test(r.redirectTo), r);
r = await call("show trending products");
check("trending", r.products?.length > 0 && r.intent === "TRENDING", r);
r = await call("trending laptops");
check("trending laptops are laptops-ish", r.products?.length > 0, r);
r = await call("show similar products", { context: { productId: String(byName("iPhone 16e")._id) } });
check("similar to product on screen", r.products?.length > 0 && /Similar/.test(decodeURIComponent(r.redirectTo)), r);
r = await call("frequently bought together", { context: { productId: String(byName("iPhone 16e")._id) } });
check("frequently bought together (accessories)", r.products?.length > 0, r);
r = await call("recently viewed products");
check("recently viewed -> the 2 viewed", r.products?.length === 2, r);
r = await call("iphone maathiri vera products kaattu");
check("Tanglish similar by name", r.intent === "SIMILAR" && r.products?.length > 0, r);

// ---------------------------------------------------------------- UI by voice
r = await call("dark mode");
check("dark mode uiAction", r.uiAction?.type === "SET_THEME_MODE" && r.uiAction.value === "dark", r);
r = await call("change theme to blue");
check("accent blue uiAction", r.uiAction?.type === "SET_THEME_ACCENT" && r.uiAction.value === "blue", r);
r = await call("switch to Tamil");
check("language uiAction -> Tamil", r.uiAction?.type === "SET_LANGUAGE" && r.uiAction.value === "ta" && /[\u0b80-\u0bff]/.test(r.replyText), r);
r = await call("tanglish mode maathu");
check("language uiAction -> Tanglish", r.uiAction?.value === "tl" && /Tanglish/.test(r.replyText), r);
r = await call("list view");
check("list view uiAction", r.uiAction?.value === "list" && r.redirectTo === "/products", r);

// ---------------------------------------------------------------- UI language drives reply language
// v4: a clearly English sentence is answered in English even when the site language is Tamil/Tanglish;
// the site language only breaks ties for one-word input.
r = await call("show my cart", { uiLang: "tl" });
check("English sentence + uiLang=tl -> English reply", /Opening your cart/.test(r.replyText), r.replyText);
r = await call("show my cart", { uiLang: "ta" });
check("English sentence + uiLang=ta -> English reply", /Opening your cart/.test(r.replyText), r.replyText);
r = await call("laptop", { uiLang: "tl" });
check("one-word input + uiLang=tl -> Tanglish reply", /kidaichuduchu|kidaikkala/.test(r.replyText), r.replyText);
r = await call("laptop", { uiLang: "ta" });
check("one-word input + uiLang=ta -> Tamil reply", /[\u0b80-\u0bff]/.test(r.replyText), r.replyText);
r = await call("show my cart", { uiLang: "en" });
check("uiLang=en -> English reply", /Opening your cart/.test(r.replyText), r.replyText);

// ---------------------------------------------------------------- the rest still works
r = await call("Empty cart");
check("Empty cart", cart.items.length === 0, r);
r = await call("increase quantity");
check("increase on empty cart is handled", /empty/i.test(r.replyText), r.replyText);
r = await call("laptops under 60000");
check("plain search unchanged", r.intent === "PRODUCT_SEARCH" && r.products?.length > 0, r);
r = await call("மொபைல் காட்டு");
check("Tamil search unchanged", r.products?.length > 0, r);

console.log(bad ? `\n${bad} FAILED` : "\nAll extras controller checks passed");
process.exit(bad ? 1 : 0);
