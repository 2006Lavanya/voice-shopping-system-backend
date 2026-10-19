// Offline test: runs the NLU engine + catalog matcher against the real seed catalog (no database needed).
import { understandMessage, translate } from "../src/services/assistantEngine.js";
import { buildIndex, findProductsSmart } from "../src/services/catalogMatcher.js";
import { products as base } from "../src/seed/baseData.js";
import { buildExtraProducts } from "../src/seed/extraProducts.js";

const catalog = buildIndex([...base, ...buildExtraProducts()].map((p, i) => ({ ...p, _id: String(i) })));

const resolve = (u) => {
  if (!u.terms.length) return { top: null, qty: u.qty };
  const { products, droppedQty } = findProductsSmart(catalog, u.terms, { maxPrice: u.maxPrice, minPrice: u.minPrice, sort: u.sort, limit: 5 });
  return { top: products[0], list: products, qty: u.qty === 1 && droppedQty ? droppedQty : u.qty };
};

// [sentence, lang, expected intent, expected top-product substring (or null), extra check]
const cases = [
  // ---- English
  ["add iphone 15 to cart", "en-US", "ADD_TO_CART", "iPhone 15"],
  ["add iPhone 16 Pro Max to my cart", "en-US", "ADD_TO_CART", "iPhone 16 Pro Max"],
  ["add HP laptop to wishlist", "en-IN", "ADD_TO_WISHLIST", "HP"],
  ["add samsung galaxy s25 ultra to cart", "en-US", "ADD_TO_CART", "Galaxy S25 Ultra"],
  ["add 2 boat earbuds to cart", "en-US", "ADD_TO_CART", "boAt", (u, r) => r.qty === 2],
  ["add two sony headphones to cart", "en-US", "ADD_TO_CART", "Sony", (u, r) => r.qty === 2],
  ["remove iphone from cart", "en-US", "REMOVE_FROM_CART", "iPhone"],
  ["remove macbook from wishlist", "en-US", "REMOVE_FROM_WISHLIST", "MacBook"],
  ["clear my cart", "en-US", "CLEAR_CART", null],
  ["empty the wishlist", "en-US", "CLEAR_WISHLIST", null],
  ["open my cart", "en-US", "OPEN_CART", null],
  ["show my cart", "en-US", "OPEN_CART", null],
  ["show wishlist", "en-US", "OPEN_WISHLIST", null],
  ["go to checkout", "en-US", "GO_TO_CHECKOUT", null],
  ["show my orders", "en-US", "SHOW_ORDERS", null],
  ["go home", "en-US", "GO_HOME", null],
  ["search laptops under 60000", "en-US", "PRODUCT_SEARCH", "Laptop", (u) => u.maxPrice === 60000],
  ["show me hp laptops under 50k", "en-US", "PRODUCT_SEARCH", "HP", (u) => u.maxPrice === 50000],
  ["mobiles below 20000", "en-US", "PRODUCT_SEARCH", null, (u, r) => r.list.every((p) => (p.discountPrice || p.price) <= 20000)],
  ["cheapest smartwatch", "en-US", "PRODUCT_SEARCH", null, (u) => u.sort === "price_low"],
  ["add this to cart", "en-US", "ADD_TO_CART", null, (u) => u.useContext],
  ["add the second one to my wishlist", "en-US", "ADD_TO_WISHLIST", null, (u) => u.ordinal === 2],
  ["buy iphone 15 now", "en-US", "ADD_TO_CART", "iPhone 15", (u) => u.buyNow],
  ["what is the delivery time", "en-US", "FAQ", null],
  ["do you have any coupon", "en-US", "FAQ", null],
  ["hello", "en-US", "GREETING", null],
  ["thank you", "en-US", "THANKS", null],
  ["stop listening", "en-US", "STOP_LISTENING", null],
  ["add this shirt to cart", "en-US", "ADD_TO_CART", "hirt"],
  // ---- Tanglish
  ["iphone 15 cart la add pannu", "ta-IN", "ADD_TO_CART", "iPhone 15"],
  ["samsung phone wishlist la podu", "ta-IN", "ADD_TO_WISHLIST", "Samsung"],
  ["hp laptop cart la serthu", "ta-IN", "ADD_TO_CART", "HP"],
  ["cart ah open pannu", "ta-IN", "OPEN_CART", null],
  ["wishlist kaattu", "ta-IN", "OPEN_WISHLIST", null],
  ["laptop thedu 50000 kulla", "ta-IN", "PRODUCT_SEARCH", "aptop", (u) => u.maxPrice === 50000],
  ["iphone cart la irundhu edu", "ta-IN", "REMOVE_FROM_CART", "iPhone"],
  ["cart ah kaali pannu", "ta-IN", "CLEAR_CART", null],
  ["nirutthu", "ta-IN", "STOP_LISTENING", null],
  // ---- Tamil script
  ["ஐபோன் 15 ஐ கார்ட்டில் சேர்", "ta-IN", "ADD_TO_CART", "iPhone 15"],
  ["சாம்சங் போனை விஷ்லிஸ்ட்டில் சேர்", "ta-IN", "ADD_TO_WISHLIST", "Samsung"],
  ["எச்பி லேப்டாப் கார்ட்ல போடு", "ta-IN", "ADD_TO_CART", "HP"],
  ["என் கார்ட்டை திற", "ta-IN", "OPEN_CART", null],
  ["விஷ்லிஸ்ட் காட்டு", "ta-IN", "OPEN_WISHLIST", null],
  ["60000 க்கு கீழ் லேப்டாப் காட்டு", "ta-IN", "PRODUCT_SEARCH", "aptop", (u) => u.maxPrice === 60000],
  ["கார்ட்டில் இருந்து ஐபோனை நீக்கு", "ta-IN", "REMOVE_FROM_CART", "iPhone"],
  ["கார்ட்டை காலி செய்", "ta-IN", "CLEAR_CART", null],
  ["செக்அவுட் போ", "ta-IN", "GO_TO_CHECKOUT", null],
  ["என் ஆர்டர்கள் காட்டு", "ta-IN", "SHOW_ORDERS", null],
  ["வணக்கம்", "ta-IN", "GREETING", null],
  ["இதை கார்ட்டில் சேர்", "ta-IN", "ADD_TO_CART", null, (u) => u.useContext],
  ["ரெண்டு சோனி ஹெட்போன் கார்ட்டில் சேர்", "ta-IN", "ADD_TO_CART", "Sony", (u, r) => r.qty === 2],
  ["டெலிவரி எவ்வளவு நாள்", "ta-IN", "FAQ", null],
  ["ஆட் டு கார்ட் ஆப்பிள் மேக்புக்", "ta-IN", "ADD_TO_CART", "MacBook"],
  // ---- Hindi
  ["आईफोन 15 को कार्ट में जोड़ो", "hi-IN", "ADD_TO_CART", "iPhone 15"],
  ["सैमसंग फोन विशलिस्ट में डालो", "hi-IN", "ADD_TO_WISHLIST", "Samsung"],
  ["मेरा कार्ट खोलो", "hi-IN", "OPEN_CART", null],
  ["कार्ट खाली करो", "hi-IN", "CLEAR_CART", null],
  ["50000 के अंदर लैपटॉप दिखाओ", "hi-IN", "PRODUCT_SEARCH", "aptop", (u) => u.maxPrice === 50000],
  ["कार्ट से आईफोन हटाओ", "hi-IN", "REMOVE_FROM_CART", "iPhone"],
  ["नमस्ते", "hi-IN", "GREETING", null],
  // ---- Telugu / Kannada / Malayalam
  ["ఐఫోన్ 15 కార్ట్‌లో చేర్చు", "te-IN", "ADD_TO_CART", "iPhone 15"],
  ["నా కార్ట్ తెరువు", "te-IN", "OPEN_CART", null],
  ["ಸ್ಯಾಮ್‌ಸಂಗ್ ಫೋನ್ ವಿಶ್‌ಲಿಸ್ಟ್‌ಗೆ ಸೇರಿಸು", "kn-IN", "ADD_TO_WISHLIST", "Samsung"],
  ["ನನ್ನ ಕಾರ್ಟ್ ತೆರೆ", "kn-IN", "OPEN_CART", null],
  ["ഐഫോൺ 15 കാർട്ടിൽ ചേർക്കൂ", "ml-IN", "ADD_TO_CART", "iPhone 15"],
  ["എന്റെ കാർട്ട് തുറക്കൂ", "ml-IN", "OPEN_CART", null],
];

let pass = 0;
const fails = [];
for (const [text, lang, intent, nameHas, extra] of cases) {
  const u = understandMessage(text, lang, {});
  const r = resolve(u);
  let ok = u.intent === intent;
  let note = "";
  if (ok && nameHas) {
    ok = Boolean(r.top && (r.top.name.includes(nameHas) || r.top.brand.includes(nameHas)));
    note = r.top ? r.top.name : "no product";
  }
  if (ok && extra) ok = Boolean(extra(u, r));
  if (ok) pass += 1;
  else fails.push(`✗ [${lang}] "${text}"\n    got intent=${u.intent} terms=${JSON.stringify(u.terms)} price=${u.maxPrice} qty=${u.qty} top=${r.top?.name}  (wanted ${intent}${nameHas ? " / " + nameHas : ""})`);
}
console.log(`${pass}/${cases.length} passed`);
fails.forEach((f) => console.log(f));
// reply language check
console.log(translate("ta-IN", "addedToCart", "iPhone 15", 1));
process.exit(fails.length ? 1 : 0);
