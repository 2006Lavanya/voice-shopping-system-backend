// Offline test for the NEW voice intents (quantity, cart info, checkout/payment flow, AI helper, UI).
// Also checks that the sentences from the original spec still reach the ORIGINAL engine untouched.
import { detectExtraIntent, chooseStyle, sayExtra } from "../src/services/commandExtras.js";
import { understandMessage } from "../src/services/assistantEngine.js";

let bad = 0;
const ok = (label, cond, extra) => {
  if (!cond) bad += 1;
  console.log(cond ? "✓" : "✗", label, cond ? "" : JSON.stringify(extra));
};
const CO = { path: "/checkout" };
const CART = { path: "/cart" };
const HOME = { path: "/" };

// [sentence, ctx, expected intent (or null => original engine), optional extra check]
const cases = [
  // ---- quantity (English / Tamil / Tanglish)
  ["Increase quantity", CART, "CART_QTY_INCREASE", (r) => r.amount === 1],
  ["increase iphone quantity by 2", HOME, "CART_QTY_INCREASE", (r) => r.amount === 2 && r.terms.includes("iphone")],
  ["add one more", CART, "CART_QTY_INCREASE"],
  ["Decrease quantity", CART, "CART_QTY_DECREASE"],
  ["Reduce quantity", CART, "CART_QTY_DECREASE"],
  ["reduce sony headphones quantity", HOME, "CART_QTY_DECREASE", (r) => r.terms.includes("sony")],
  ["quantity kootu", CART, "CART_QTY_INCREASE"],
  ["quantity kuraichu", CART, "CART_QTY_DECREASE"],
  ["iphone quantity koottunga", HOME, "CART_QTY_INCREASE", (r) => r.terms.includes("iphone")],
  ["எண்ணிக்கையை அதிகப்படுத்து", CART, "CART_QTY_INCREASE"],
  ["எண்ணிக்கையை குறை", CART, "CART_QTY_DECREASE"],
  ["set quantity to 3", CART, "CART_QTY_SET", (r) => r.amount === 3],
  // ---- cart info
  ["How many items are in cart?", HOME, "CART_COUNT"],
  ["how many items in my cart", HOME, "CART_COUNT"],
  ["cart la evlo items irukku", HOME, "CART_COUNT"],
  ["கார்ட்டில் எத்தனை பொருட்கள் உள்ளன", HOME, "CART_COUNT"],
  ["what is my cart total", HOME, "CART_TOTAL"],
  ["cart total evlo", HOME, "CART_TOTAL"],
  // ---- checkout flow (on /checkout)
  ["Continue", CO, "CHECKOUT_NEXT"],
  ["Next", CO, "CHECKOUT_NEXT"],
  ["thodarunga", CO, "CHECKOUT_NEXT"],
  ["தொடரவும்", CO, "CHECKOUT_NEXT"],
  ["go back", CO, "CHECKOUT_BACK"],
  ["Confirm address", CO, "CHECKOUT_CONFIRM_ADDRESS"],
  ["address confirm pannu", CO, "CHECKOUT_CONFIRM_ADDRESS"],
  ["முகவரி உறுதி செய்", CO, "CHECKOUT_CONFIRM_ADDRESS"],
  ["use the second address", CO, "CHECKOUT_SELECT_ADDRESS", (r) => r.ordinal === 2],
  ["add new address", CO, "CHECKOUT_NEW_ADDRESS"],
  ["pudhu address add pannu", CO, "CHECKOUT_NEW_ADDRESS"],
  ["express delivery", CO, "CHECKOUT_SET_DELIVERY", (r) => r.value === "express"],
  ["standard delivery", CO, "CHECKOUT_SET_DELIVERY", (r) => r.value === "standard"],
  ["Cash on delivery", CO, "CHECKOUT_SET_PAYMENT", (r) => r.value === "COD"],
  ["cod pannunga", CO, "CHECKOUT_SET_PAYMENT", (r) => r.value === "COD"],
  ["UPI payment", CO, "CHECKOUT_SET_PAYMENT", (r) => r.value === "UPI"],
  ["gpay la pay pannu", CO, "CHECKOUT_SET_PAYMENT", (r) => r.value === "UPI"],
  ["Credit card", CO, "CHECKOUT_SET_PAYMENT", (r) => r.value === "CARD"],
  ["Debit card", CO, "CHECKOUT_SET_PAYMENT", (r) => r.value === "CARD"],
  ["net banking", CO, "CHECKOUT_SET_PAYMENT", (r) => r.value === "ONLINE"],
  ["Place order", CO, "CHECKOUT_PLACE_ORDER"],
  ["order pannu", CO, "CHECKOUT_PLACE_ORDER"],
  ["ஆர்டர் செய்", CO, "CHECKOUT_PLACE_ORDER"],
  ["Confirm order", CO, "CHECKOUT_CONFIRM_ORDER"],
  ["yes", CO, "CHECKOUT_CONFIRM"],
  ["apply coupon WELCOME10", CO, "CHECKOUT_COUPON", (r) => r.code === "WELCOME10"],
  // ---- checkout words on other pages
  ["continue", CART, "CHECKOUT_START"],
  ["place order", HOME, "CHECKOUT_PLACE_ORDER", (r) => r.outsideCheckout],
  ["UPI payment pannu", HOME, "CHECKOUT_SET_PAYMENT", (r) => r.outsideCheckout],
  ["continue shopping", CART, "GO_PRODUCTS"],
  // ---- AI helper
  ["recommend something for me", HOME, "RECOMMEND"],
  ["recommend a laptop", HOME, "RECOMMEND", (r) => r.terms.includes("laptop")],
  ["edhavadhu suggest pannu", HOME, "RECOMMEND"],
  ["பரிந்துரை செய்", HOME, "RECOMMEND"],
  ["show trending products", HOME, "TRENDING"],
  ["best sellers", HOME, "TRENDING"],
  ["trending laptops", HOME, "TRENDING", (r) => r.terms.includes("laptops")],
  ["show similar products", { path: "/products/abc" }, "SIMILAR"],
  ["idhu maathiri vera products kaattu", HOME, "SIMILAR"],
  ["frequently bought together", HOME, "FREQUENTLY_BOUGHT"],
  ["recently viewed products", HOME, "RECENTLY_VIEWED"],
  ["naan paartha products", HOME, "RECENTLY_VIEWED"],
  // ---- UI
  ["dark mode", HOME, "UI_THEME_MODE", (r) => r.value === "dark"],
  ["switch to light mode", HOME, "UI_THEME_MODE", (r) => r.value === "light"],
  ["change theme to blue", HOME, "UI_THEME_ACCENT", (r) => r.value === "blue"],
  ["theme color green aakku", HOME, "UI_THEME_ACCENT", (r) => r.value === "green"],
  ["open theme settings", HOME, "UI_THEME_PANEL"],
  ["switch to Tamil", HOME, "UI_LANGUAGE", (r) => r.value === "ta"],
  ["tamil la pesu", HOME, "UI_LANGUAGE", (r) => r.value === "ta"],
  ["change language to English", HOME, "UI_LANGUAGE", (r) => r.value === "en"],
  ["tanglish mode maathu", HOME, "UI_LANGUAGE", (r) => r.value === "tl"],
  ["list view", HOME, "UI_VIEW", (r) => r.value === "list"],
  ["grid view", HOME, "UI_VIEW", (r) => r.value === "grid"],

  // ---- MUST fall through to the ORIGINAL engine (existing behaviour untouched)
  ["Add iPhone to cart", HOME, null],
  ["iPhone cart la add pannu", HOME, null],
  ["iPhone ah cart la podu", HOME, null],
  ["Add Samsung Galaxy S25 to cart", HOME, null],
  ["Samsung Galaxy S25 cart la add pannu", HOME, null],
  ["Add this product", HOME, null],
  ["Remove product from cart", CART, null],
  ["Show cart", HOME, null],
  ["show my cart", HOME, null],
  ["Empty cart", CART, null],
  ["clear my cart", HOME, null],
  ["Proceed to checkout", CART, null],
  ["Checkout", CART, null],
  ["Check out pannu", CART, null],
  ["search laptops under 60000", HOME, null],
  ["show tamil books", HOME, null],
  ["show blue shirts", HOME, null],
  ["add blue color shirt to cart", HOME, null],
  ["laptops less than 50000", HOME, null],
  ["do you have cash on delivery", HOME, null],
  ["remove iphone from cart", HOME, null],
  ["go to my orders", HOME, null],
  ["show order history", HOME, null],
  ["add 2 boat earbuds to cart", HOME, null],
  ["ஐபோன் 15 ஐ கார்ட்டில் சேர்", HOME, null],
];

for (const [sentence, ctx, expected, extra] of cases) {
  const r = detectExtraIntent(sentence, ctx);
  const got = r ? r.intent : null;
  ok(`${JSON.stringify(sentence)} -> ${expected ?? "(original engine)"}`, got === expected && (!extra || (r && extra(r))), r);
}

// Original engine must still classify the fall-through sentences as the spec expects.
const eng = (m) => understandMessage(m, "en-IN").intent;
ok("engine: Add iPhone to cart", eng("Add iPhone to cart") === "ADD_TO_CART");
ok("engine: iPhone ah cart la podu", eng("iPhone ah cart la podu") === "ADD_TO_CART");
ok("engine: Remove product from cart", eng("Remove product from cart") === "REMOVE_FROM_CART");
ok("engine: Empty cart", eng("Empty cart") === "CLEAR_CART");
ok("engine: Check out pannu", eng("Check out pannu") === "GO_TO_CHECKOUT");

// Reply style
ok("style: Tamil script", chooseStyle({ message: "கார்ட் காலி", lang: "en-IN" }) === "ta");
ok("style: Tanglish markers", chooseStyle({ message: "cart la podu", lang: "en-IN" }) === "tl");
ok("style: plain English", chooseStyle({ message: "show my cart", lang: "en-IN" }) === "en");
// v4: the language of the CURRENT utterance decides; the UI / speech language is only a tie-breaker for 1-2 word input.
ok("style: clear English beats UI Tanglish", chooseStyle({ message: "show my cart", uiLang: "tl", lang: "en-IN" }) === "en");
ok("style: clear English beats UI Tamil", chooseStyle({ message: "show my cart", uiLang: "ta", lang: "en-IN" }) === "en");
ok("style: one-word Latin follows UI Tanglish", chooseStyle({ message: "laptop", uiLang: "tl", lang: "en-IN" }) === "tl");
ok("style: one-word Latin follows UI Tamil", chooseStyle({ message: "laptop", uiLang: "ta", lang: "en-IN" }) === "ta");
ok("style: one-word Latin follows previous turn", chooseStyle({ message: "laptop", uiLang: "ta", lastStyle: "en" }) === "en");
ok("style: clear English beats Hindi speech setting", chooseStyle({ message: "show cart", lang: "hi-IN", uiLang: undefined }) === "en");
ok("style: Hinglish with Hindi selected -> other", chooseStyle({ message: "mujhe laptop chahiye", lang: "hi-IN" }) === "other");
ok("style: Tamil + English mixed -> ta", chooseStyle({ message: "கார்ட்ல இதை add பண்ணு", lang: "en-IN" }) === "ta");

// Reply text exists in all three styles for every key
const keys = ["qtyChanged", "cartCount", "cartTotal", "recoFound", "trendFound", "similarFound", "themeAccent", "viewSet", "whichItem", "checkoutFirst"];
for (const style of ["en", "ta", "tl"]) ok(`text ${style}`, keys.every((k) => String(sayExtra(style, k, "x", 2, 3)).length > 3));
console.log(sayExtra("tl", "cartCount", 2, 3), "|", sayExtra("ta", "cartTotal", "₹1,000", 2));
process.exit(bad ? 1 : 0);
