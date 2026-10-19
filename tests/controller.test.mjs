// Controller smoke test with in-memory fakes for the Mongoose models (no database needed).
import mongoose from "mongoose";
import Product from "../src/models/Product.js";
import Cart from "../src/models/Cart.js";
import Wishlist from "../src/models/Wishlist.js";
import { products as base } from "../src/seed/baseData.js";
import { buildExtraProducts } from "../src/seed/extraProducts.js";

const catalog = [...base, ...buildExtraProducts()].map((p) => ({ ...p, _id: new mongoose.Types.ObjectId() }));
Product.find = () => ({ lean: async () => catalog });
Product.findById = () => ({ lean: async () => null });
const mkDoc = (init) => {
  const d = { ...init, save: async () => d, populate: async () => d };
  return d;
};
const cart = mkDoc({ items: [] });
const wish = mkDoc({ products: [] });
Cart.findOne = async () => cart;
Wishlist.findOne = async () => wish;

const { handleAssistantMessage } = await import("../src/controllers/assistantController.js");
const call = (message, lang = "en-IN", context = {}, user = { _id: "u1" }) =>
  new Promise((resolve, reject) => {
    handleAssistantMessage({ body: { message, lang, context }, user }, { json: resolve, status() {} }, reject);
  });

let bad = 0;
const check = (label, cond, extra) => { if (!cond) bad += 1; console.log(cond ? "✓" : "✗", label, cond ? "" : JSON.stringify(extra)); };

let r = await call("add iphone 15 to cart");
check("add iphone 15 -> cart", r.changed.includes("cart") && cart.items.length === 1, r);
console.log("   ", r.replyText);
r = await call("iphone 15 cart la add pannu", "ta-IN");
check("tanglish add increments qty", cart.items[0].quantity === 2, cart.items);
r = await call("சாம்சங் போனை விஷ்லிஸ்ட்டில் சேர்", "ta-IN");
check("tamil wishlist add (reply Tamil)", r.changed.includes("wishlist") && /[஀-௿]/.test(r.replyText), r);
console.log("   ", r.replyText);
r = await call("search hp laptops under 60000");
check("search returns products + ids redirect", r.products.length > 0 && r.redirectTo.includes("ids="), r);
r = await call("add 2 sony headphones to cart");
check("qty 2 sony", r.changed.includes("cart") && cart.items.some((i) => i.quantity === 2), cart.items);
r = await call("open my cart");
check("open cart redirect", r.redirectTo === "/cart", r);
r = await call("add iphone 15 to cart", "en-IN", {}, null);
check("guest -> login", r.needsLogin && r.redirectTo === "/login", r);
r = await call("clear my cart");
check("clear cart", cart.items.length === 0, r);
r = await call("stop listening");
check("stop flag", r.stopListening === true, r);
r = await call("add xyzzyfoo to cart");
check("unknown product handled", !r.changed.length, r);
process.exit(bad ? 1 : 0);
