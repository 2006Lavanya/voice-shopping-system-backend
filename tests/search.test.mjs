// Fuzzy / multi-language search + suggestions + recommendation helpers (in-memory fakes, no database).
import mongoose from "mongoose";
import Product from "../src/models/Product.js";
import SearchHistory from "../src/models/SearchHistory.js";
import { products as base } from "../src/seed/baseData.js";
import { buildExtraProducts } from "../src/seed/extraProducts.js";
import { buildMoreProducts } from "../src/seed/moreProducts.js";
import { ensureUniqueImages } from "../src/seed/imageGen.js";

const catalog = [...base, ...buildExtraProducts(), ...buildMoreProducts()].map((p) => ({ ...p, _id: new mongoose.Types.ObjectId() }));
// Literal matcher that mimics the original regex query: every keyword word must appear in name/brand/tags/category.
const literal = (q) => {
  const ands = q.$and || [];
  return catalog.filter((p) => ands.every((c) => c.$or.some((f) => { const [k, v] = Object.entries(f)[0]; const hay = Array.isArray(p[k]) ? p[k].join(" ") : String(p[k] || ""); return new RegExp(v.$regex, "i").test(hay); })));
};
Product.find = (q = {}) => {
  const hits = literal(q);
  const chain = { sort: () => chain, skip: () => chain, limit: () => Promise.resolve(hits.slice(0, 12)), lean: async () => catalog, select: () => chain };
  return chain;
};
Product.countDocuments = async (q) => literal(q).length;
SearchHistory.create = async () => ({});

const { getProducts, getSearchSuggestions } = await import("../src/controllers/productController.js");
const call = (fn, query) => new Promise((resolve, reject) => fn({ query, user: null }, { json: resolve, status() {} }, reject));

let bad = 0;
const check = (label, cond, extra) => { if (!cond) bad += 1; console.log(cond ? "✓" : "✗", label, cond ? "" : JSON.stringify(extra)?.slice(0, 300)); };

let r = await call(getProducts, { keyword: "iphone" });
check("literal search unchanged (iphone)", r.products.length > 0 && !r.fuzzy, r.total);
r = await call(getProducts, { keyword: "samsng galxy" });
check("typo search falls back to fuzzy", r.fuzzy === true && /samsung|galaxy/i.test(r.products[0].name), r.products?.[0]?.name);
r = await call(getProducts, { keyword: "ஐபோன்" });
check("Tamil script 'ஐபோன்' finds iPhone", r.fuzzy && r.products.some((p) => /iphone/i.test(p.name)), r.total);
r = await call(getProducts, { keyword: "தேநீர்" });
check("Tamil 'தேநீர்' (tea) finds tea", r.products.some((p) => /tea/i.test(p.name)), r.products.map((p) => p.name));
r = await call(getProducts, { keyword: "arisi" });
check("Tanglish 'arisi' finds rice", r.products.some((p) => /rice/i.test(p.name)), r.products.map((p) => p.name));
r = await call(getProducts, { keyword: "paal" });
check("Tanglish 'paal' finds milk", r.products.some((p) => /milk/i.test(p.name)), r.products.map((p) => p.name));
r = await call(getProducts, { keyword: "gorcery" });
check("typo 'gorcery' finds Grocery category", r.products.length > 5 && r.products.some((p) => p.category === "Grocery"), r.total);
r = await call(getProducts, { keyword: "laptops under 50000" });
check("'laptops under 50000' respects price", r.products.length > 0 && r.products.every((p) => (p.discountPrice || p.price) <= 50000), r.products.map((p) => p.discountPrice || p.price));
r = await call(getProducts, { keyword: "toys" });
check("category keyword 'toys'", r.products.length > 0 && r.products.every((p) => p.category === "Toys"), r.products.map((p) => p.category));
r = await call(getProducts, { keyword: "zzzzqq" });
check("nonsense still returns nothing", r.products.length === 0, r.total);

r = await call(getSearchSuggestions, { q: "samsng" });
check("suggestions for typo", r.suggestions.length > 0 && r.suggestions.length <= 6, r);
r = await call(getSearchSuggestions, { q: "அரிசி" });
check("suggestions in Tamil", r.suggestions.some((s) => /rice/i.test(s.name)), r.suggestions.map((s) => s.name));
r = await call(getSearchSuggestions, { q: "a" });
check("1-char query returns empty", r.suggestions.length === 0);

// ----- catalogue requirements
const need = ["Electronics", "Fashion", "Grocery", "Home & Kitchen", "Beauty & Personal Care", "Sports", "Books", "Toys", "Mobile Accessories", "Computers"];
for (const c of need) check(`category ${c} has products`, catalog.filter((p) => p.category === c).length >= 7, catalog.filter((p) => p.category === c).length);
const bad1 = catalog.filter((p) => !p.name || !p.description || !p.price || !p.category || typeof p.stock !== "number" || !(p.rating >= 0 && p.rating <= 5) || !p.images?.[0]);
check("every product has name/description/price/category/stock/rating/image", bad1.length === 0, bad1.map((p) => p.name));
const mine = buildMoreProducts();

check("new products ratings sane (3.8 - 4.8)", mine.every((p) => p.rating >= 3.8 && p.rating <= 4.8), mine.filter((p) => p.rating < 3.8 || p.rating > 4.8).map((p) => p.rating));
check("catalogue size >= 400", catalog.length >= 400, catalog.length);
const finalList = ensureUniqueImages([...base, ...buildExtraProducts(), ...buildMoreProducts()]);
check("EVERY seeded product has a unique image", new Set(finalList.map((p) => p.images[0])).size === finalList.length, { products: finalList.length, unique: new Set(finalList.map((p) => p.images[0])).size });
check("every product image is a REAL photo URL (no drawn data-URI tiles)", finalList.every((p) => /^https:\/\//.test(p.images[0])), finalList.filter((p) => !/^https:\/\//.test(p.images[0])).map((p) => p.name));
const sample = finalList.find((p) => p.name === "Tata Tea Gold 500g");
check("photo is looked up by the product's own name", /q=Tata%20Tea%20Gold%20500g/.test(sample.images[0]), sample.images[0]);
console.log("total products:", catalog.length);
process.exit(bad ? 1 : 0);
