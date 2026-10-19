/**
 * commandExtras.js
 * ----------------
 * Extra voice/chat intents layered IN FRONT of the original assistantEngine. If nothing here
 * matches, detectExtraIntent() returns null and the original engine runs exactly as before.
 *
 * Understands English, Tamil (script) and Tanglish (Tamil in English letters) for:
 *   - quantity:  "increase quantity", "iphone quantity kuraichu", "set quantity to 3"
 *   - cart info: "how many items are in cart", "cart total evlo"
 *   - checkout:  "continue", "next", "confirm address", "express delivery", "UPI payment",
 *                "cash on delivery", "place order", "confirm order", "check out pannu"
 *   - AI helper: recommend / trending / similar / frequently bought together / recently viewed
 *   - UI:        "dark mode", "change theme to blue", "switch to Tamil", "list view"
 *
 * Also exports the reply text (en / ta / tl) and style helpers used by the controller.
 */
import { understandMessage } from "./assistantEngine.js";
import { detectUtteranceLanguage, looksTanglish as detectTanglish } from "./languageDetect.js";

// ---------------------------------------------------------------------------
// Normalisation + matching helpers
// ---------------------------------------------------------------------------
const norm = (s) =>
  String(s || "")
    .normalize("NFC")
    .replace(/[​-‍⁠﻿]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

const isIndic = (w) => /[\u0900-\u0dff]/.test(w);
const makeMatcher = (text) => {
  const padded = ` ${text} `;
  return (list) => list.some((w) => (isIndic(w) ? text.includes(w) : padded.includes(` ${w} `)));
};

const NUM_WORDS = {
  one: 1, oru: 1, onnu: 1, ondru: 1, ஒன்று: 1, ஒரு: 1, ஒண்ணு: 1,
  two: 2, rendu: 2, rendhu: 2, இரண்டு: 2, ரெண்டு: 2,
  three: 3, moonu: 3, munu: 3, மூன்று: 3, மூணு: 3,
  four: 4, naalu: 4, nalu: 4, நான்கு: 4, நாலு: 4,
  five: 5, anju: 5, ainthu: 5, ஐந்து: 5, அஞ்சு: 5,
  six: 6, aaru: 6, ஆறு: 6,
  seven: 7, ezhu: 7, ஏழு: 7,
  eight: 8, ettu: 8, எட்டு: 8,
  nine: 9, onbadhu: 9, ஒன்பது: 9,
  ten: 10, pathu: 10, paththu: 10, பத்து: 10,
};

const extractAmount = (text) => {
  const d = text.match(/(?:^|\s)(\d{1,2})(?=\s|$)/);
  if (d) return Math.min(Math.max(parseInt(d[1], 10), 0), 99);
  for (const w of text.split(" ")) if (NUM_WORDS[w] !== undefined) return NUM_WORDS[w];
  return null;
};

// Tanglish markers (distinctive words only, so plain English is never mistaken for Tanglish).
const TANGLISH_MARKERS = [
  "pannu", "panni", "pannunga", "panunga", "pannidu", "pannitten", "podu", "podunga", "poduga", "venum", "vendum", "venam",
  "irukku", "iruku", "irukka", "iruka", "evlo", "evvalavu", "kaattu", "kaatu", "kaamichu", "neekku", "neekkunga", "vaangu",
  "vaanga", "enakku", "enaku", "sollu", "solunga", "kuraichu", "kuraiyunga", "koottu", "kootunga", "serthu", "serunga",
  "thodarunga", "thodaru", "vegama", "aduthu", "seiyyunga", "pesu", "pesunga", "maathu", "maathunga", "kaali",
  "kootu", "kootudunga", "kurai", "kuraikka", "maathiri", "mathiri", "pannalam", "vendaam", "irundhu", "vera", "veru", "kaattunga", "adhigam", "aakku", "aaku",
];

// ---------------------------------------------------------------------------
// Vocabulary
// ---------------------------------------------------------------------------
const V = {
  CART: ["cart", "kart", "basket", "கார்ட்", "கார்ட்டில்", "கார்ட்ல", "கார்ட்டை", "கார்ட்டு"],
  INC: ["increase", "increment", "raise", "plus", "koottu", "koottunga", "kootu", "kootunga", "kootudunga", "koodu", "adhigam", "athigam", "adhigapaduthu", "athigapaduthu", "அதிகரி", "அதிகப்படுத்து", "அதிகம்", "கூட்டு", "கூட்டுங்க", "கூடு"],
  INC_PHRASE: ["one more", "another one", "1 more", "add one more", "onnu more", "innum onnu", "mela onnu", "இன்னும் ஒன்று", "இன்னொன்று", "இன்னும் ஒண்ணு"],
  DEC: ["decrease", "reduce", "decrement", "minus", "lower", "kuraichu", "kuraichudu", "kuraiyunga", "kurai", "kuraikka", "குறை", "குறைக்க", "குறைத்து", "குறைச்சு", "கம்மி"],
  DEC_PHRASE: ["one less", "1 less", "remove one", "take one", "onnu kuraichu", "ஒன்று குறை", "ஒண்ணு குறை"],
  QTY: ["quantity", "qty", "count", "number", "piece", "pieces", "ennikkai", "ennikai", "எண்ணிக்கை", "அளவு"],
  SET: ["set", "make", "change", "update", "aakku", "aaku", "maathu", "maatru", "மாத்து", "மாற்று", "ஆக்கு"],
  COUNT_Q: ["how many", "number of", "cart count", "count of", "evlo items", "evlo item", "evvalavu items", "ethanai", "எத்தனை", "kitne"],
  ITEMS: ["items", "item", "products", "product", "things", "porul", "porutkal", "பொருள்", "பொருட்கள்", "பொருட்கள"],
  TOTAL: ["total", "amount", "bill", "worth", "motham", "மொத்தம்", "எவ்வளவு", "evlo", "evvalavu", "how much", "price", "cost", "subtotal"],

  NEXT: ["continue", "next", "proceed", "go ahead", "move on", "go forward", "next step", "thodarunga", "thodaru", "thodar", "adutha step", "aduthu", "தொடர்", "தொடரவும்", "தொடருங்கள்", "தொடருங்க", "அடுத்து", "அடுத்த படி", "அடுத்தது"],
  BACK: ["back", "previous", "go back", "previous step", "munnadi", "munnaadi", "pinnadi", "pin sellu", "பின்", "பின்னால்", "முந்தைய", "திரும்பு", "பின்னாடி"],
  YES: ["yes", "yeah", "yep", "sure", "okay", "ok", "correct", "right", "aama", "aamam", "ama", "seri", "sari", "ஆம்", "ஆமாம்", "சரி"],
  ADDRESS: ["address", "addresses", "முகவரி", "அட்ரஸ்", "அட்ரெஸ்"],
  CONFIRM: ["confirm", "confirmed", "use", "select", "choose", "deliver here", "deliver", "uruthi", "uruthippaduthu", "உறுதி", "உறுதிப்படுத்து", "உறுதிசெய்", "தேர்வு"],
  NEW: ["new", "add", "another", "enter", "puthu", "pudhu", "புதிய", "புது"],
  EXPRESS: ["express", "fast", "quick", "fastest", "one day", "1 day", "next day", "vegama", "veegama", "விரைவு", "எக்ஸ்பிரஸ்", "வேகமா"],
  STANDARD: ["standard", "normal", "regular", "free delivery", "sadharana", "சாதாரண", "ஸ்டாண்டர்ட்"],
  DELIVERY: ["delivery", "shipping", "டெலிவரி", "ஷிப்பிங்"],
  COD: ["cod", "cash on delivery", "pay on delivery", "cash payment", "pay cash", "cash", "கேஷ் ஆன் டெலிவரி", "கேஷ்", "பணம் கொடுத்து", "பணமாக"],
  UPI: ["upi", "gpay", "google pay", "phonepe", "phone pe", "paytm", "bhim", "யுபிஐ", "யூபிஐ", "ஜிபே", "கூகுள் பே"],
  CARD: ["credit card", "debit card", "card payment", "pay by card", "pay with card", "card", "cards", "கிரெடிட் கார்டு", "டெபிட் கார்டு", "கிரெடிட்", "டெபிட்", "க்ரெடிட்"],
  ONLINE: ["net banking", "netbanking", "internet banking", "online payment", "online pay", "wallet", "நெட் பேங்கிங்", "ஆன்லைன் பேமெண்ட்", "ஆன்லைன் பேமன்ட்"],
  PAYWORD: ["pay", "payment", "paying", "pannu", "pannunga", "செலுத்து", "பேமெண்ட்", "பணம்"],
  PLACE: ["place order", "place the order", "place my order", "order now", "order pannu", "order pannunga", "order podu", "order podunga", "complete order", "finish order", "submit order", "pay now", "ஆர்டர் செய்", "ஆர்டர் போடு", "ஆர்டர் பண்ணு", "ஆர்டர் பண்ணுங்க", "ஆர்டரை போடு"],
  CONFIRM_ORDER: ["confirm order", "confirm the order", "confirm my order", "order confirm", "confirm and place", "final confirm", "order uruthi", "ஆர்டர் உறுதி", "ஆர்டரை உறுதி"],
  COUPON: ["coupon", "promo", "voucher", "கூப்பன்"],

  RECO: ["recommend", "recommendation", "recommendations", "recommended", "suggest", "suggestion", "suggestions", "what should i buy", "what to buy", "parinthurai", "parindhurai", "பரிந்துரை", "பரிந்துரைக்க", "பரிந்துரைங்க"],
  TREND: ["trending", "trend", "best sellers", "best seller", "bestsellers", "best selling", "top selling", "popular products", "whats popular", "what is popular", "hot products", "ட்ரெண்டிங்", "பிரபலமான", "அதிகம் விற்கும்", "டாப் செல்லிங்"],
  SIMILAR: ["similar", "alternatives", "alternative", "alternate", "related", "like this", "same type", "more like", "maathiri", "mathiri", "மாதிரி", "ithu maathiri", "idhu maathiri", "ithu mathiri", "idhu mathiri", "ithe maathiri", "idhe maathiri", "இது மாதிரி", "இதே மாதிரி", "ஒத்த", "இது போல"],
  RECENT_W: ["recently", "recent", "last", "previous"],
  VIEWED: ["viewed", "seen", "browsed", "looked", "checked", "paartha", "பார்த்த", "பார்த்தது"],
  FBT: ["frequently bought", "bought together", "buy together", "goes with", "go with", "goes well", "pair with", "add ons", "add on", "accessories for", "saerthu vaanga", "serthu vaanga", "சேர்த்து வாங்க", "ஒன்றாக வாங்க", "இதோட என்ன"],

  DARK: ["dark mode", "dark theme", "night mode", "night theme", "dark", "iruttu mode", "டார்க் மோட்", "டார்க் தீம்", "இருண்ட", "இரவு முறை"],
  LIGHT: ["light mode", "light theme", "day mode", "day theme", "bright mode", "லைட் மோட்", "லைட் தீம்", "வெளிச்ச முறை"],
  THEME: ["theme", "தீம்", "themes"],
  COLOR: ["color", "colour", "colors", "colours", "நிறம்", "கலர்", "வண்ணம்"],
  SITE: ["website", "site", "app", "page", "ui", "screen", "வலைத்தளம்"],
  CHANGE: ["change", "set", "make", "switch", "apply", "use", "select", "turn", "maathu", "maathunga", "மாத்து", "மாற்று", "மாத்துங்க"],
  SETTINGS: ["settings", "panel", "options", "customize", "customise", "customization", "customisation", "personalize", "personalise", "அமைப்புகள்"],
  LANGUAGE: ["language", "languages", "mozhi", "மொழி", "bhasha"],
  LANG_VERB: ["switch", "change", "set", "use", "select", "speak", "talk", "pesu", "pesunga", "maathu", "maathunga", "மாத்து", "மாற்று", "பேசு", "பேசுங்க", "language", "மொழி", "mozhi"],
  TAMIL: ["tamil", "தமிழ்", "thamizh", "tamizh"],
  TANGLISH: ["tanglish", "thanglish", "தங்கிலிஷ்", "tamil in english"],
  ENGLISH: ["english", "இங்கிலீஷ்", "ஆங்கிலம்"],
  GRID: ["grid view", "grid layout", "grid", "கிரிட்"],
  LISTV: ["list view", "list layout", "லிஸ்ட் வியூ"],
};

const COLORS = {
  pink: ["pink", "rose", "பிங்க்", "இளஞ்சிவப்பு"],
  blue: ["blue", "neelam", "ப்ளூ", "நீலம்", "நீல"],
  green: ["green", "pachai", "பச்சை", "கிரீன்"],
  red: ["red", "sivappu", "சிவப்பு", "ரெட்"],
  orange: ["orange", "ஆரஞ்சு"],
  purple: ["purple", "violet", "oodha", "ஊதா", "பர்பிள்"],
  teal: ["teal", "cyan", "டீல்"],
  amber: ["yellow", "amber", "gold", "manjal", "மஞ்சள்", "எல்லோ"],
  slate: ["grey", "gray", "slate", "black", "சாம்பல்", "கருப்பு"],
};

const ORDINALS = {
  1: ["first", "1st", "default", "mudhal", "muthal", "mudhalavadhu", "முதல்", "முதலாவது"],
  2: ["second", "2nd", "rendavadhu", "rendavathu", "இரண்டாவது", "ரெண்டாவது"],
  3: ["third", "3rd", "moonravadhu", "moonravathu", "மூன்றாவது", "மூணாவது"],
  4: ["fourth", "4th", "naalavadhu", "நான்காவது"],
};

// Words stripped before handing a sentence to the original NLU to find the product being talked about.
const STRIP_FOR_PRODUCT = [
  ...V.INC, ...V.DEC, ...V.QTY, ...V.SET, ...V.CART, ...V.RECO, ...V.TREND, ...V.SIMILAR, ...V.FBT,
  "by", "to", "more", "less", "of", "the", "my", "for", "me", "show", "give", "tell", "some", "like", "frequently", "bought", "together", "viewed", "recently",
  "pannu", "panni", "pannunga", "panunga", "vera", "veru", "kaattu", "kaatu", "kaattunga", "kaamichu", "காட்டு", "la", "ku", "kku", "ah", "oda", "ithoda", "idhoda", "this", "that", "item", "items", "product", "products", "please", "pls",
  "குறை", "கூட்டு", "எண்ணிக்கை", "இந்த", "இதை", "செய்", "பண்ணு", "பண்ணுங்க",
];

const termsFrom = (text) => {
  let t = ` ${text} `;
  t = t.replace(/\s(by|to)\s\d{1,2}(?=\s)/g, " ").replace(/\s\d{1,2}\s(more|less|items?|pieces?|pcs|quantity)(?=\s)/g, " ");
  for (const w of STRIP_FOR_PRODUCT) {
    if (isIndic(w)) t = t.split(w).join(" ");
    else t = t.replace(new RegExp(`\\s${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?=\\s)`, "g"), " ");
  }
  t = t.replace(/\s+/g, " ").trim();
  if (!t) return [];
  return understandMessage(t, "en-IN").terms.filter(Boolean);
};

// ---------------------------------------------------------------------------
// Intent detection
// ---------------------------------------------------------------------------
/**
 * @returns {null | { intent: string, ... }}  null => let the original engine handle the sentence
 * @param ctx { path?: string }
 */
export const detectExtraIntent = (message, ctx = {}) => {
  const t = norm(message);
  if (!t) return null;
  const any = makeMatcher(t);
  const words = t.split(" ");
  const path = String(ctx.path || "");
  const onCheckout = path.startsWith("/checkout");
  const onCart = path.startsWith("/cart");
  const hasCartWord = any(V.CART);
  const hasProductWords = (list) => any(list);

  // ---- UI: language / theme / view --------------------------------------
  const wantsLang = any(V.TANGLISH) || any(V.TAMIL) || any(V.ENGLISH);
  if (wantsLang && (any(V.LANG_VERB) || any(V.LANGUAGE))) {
    const value = any(V.TANGLISH) ? "tl" : any(V.TAMIL) ? "ta" : "en";
    // "tamil la pesu" / "switch to english" / "change language to tamil"; ignore plain product searches ("tamil books")
    return { intent: "UI_LANGUAGE", value };
  }
  if (any(V.GRID) && !hasCartWord) return { intent: "UI_VIEW", value: "grid" };
  if (any(V.LISTV)) return { intent: "UI_VIEW", value: "list" };

  const colorFound = Object.entries(COLORS).find(([, list]) => any(list));
  if (any(V.THEME) && any(V.SETTINGS)) return { intent: "UI_THEME_PANEL" };
  if (colorFound && ((any(V.THEME)) || (any(V.CHANGE) && (any(V.COLOR) || any(V.SITE)) && !hasCartWord))) {
    return { intent: "UI_THEME_ACCENT", value: colorFound[0] };
  }
  if (any(["light mode", "light theme", "day mode", "day theme", "bright mode", "லைட் மோட்", "லைட் தீம்", "வெளிச்ச முறை"])) return { intent: "UI_THEME_MODE", value: "light" };
  if (any(["dark mode", "dark theme", "night mode", "night theme", "iruttu mode", "டார்க் மோட்", "டார்க் தீம்", "இருண்ட", "இரவு முறை"])) return { intent: "UI_THEME_MODE", value: "dark" };
  if (any(V.THEME) && any(["dark", "டார்க்"])) return { intent: "UI_THEME_MODE", value: "dark" };
  if (any(V.THEME) && any(["light", "லைட்"])) return { intent: "UI_THEME_MODE", value: "light" };

  // ---- Cart info -----------------------------------------------------------
  if (hasCartWord || onCart) {
    const isCount = any(["how many", "number of", "cart count", "count of", "ethanai", "எத்தனை", "kitne"]) || (any(["evlo", "evvalavu"]) && any(V.ITEMS));
    if (isCount && (hasCartWord || any(V.ITEMS))) return { intent: "CART_COUNT" };
    if (hasCartWord && any(V.TOTAL) && !any(V.INC) && !any(V.DEC) && !any(["add", "remove", "delete", "clear", "empty"])) return { intent: "CART_TOTAL" };
  }

  // ---- Quantity ----------------------------------------------------------------
  const noPrice = !any(["price", "discount", "volume", "brightness", "விலை"]);
  const wantsInc = (any(V.INC) && noPrice) || any(V.INC_PHRASE);
  const wantsDec = (any(V.DEC) && noPrice && !any(["less than", "below", "under"])) || any(V.DEC_PHRASE);
  const setQty = any(V.SET) && any(V.QTY) && extractAmount(t) !== null && !wantsInc && !wantsDec;
  if (wantsInc || wantsDec || setQty) {
    const amount = extractAmount(t);
    // avoid treating "increase" inside unrelated sentences with no cart/quantity cue
    const cue = any(V.QTY) || hasCartWord || any(V.INC_PHRASE) || any(V.DEC_PHRASE) || onCart || ctx.productId || words.length <= 5;
    if (cue) {
      const terms = termsFrom(t);
      if (setQty) return { intent: "CART_QTY_SET", amount: amount ?? 1, terms };
      return { intent: wantsInc ? "CART_QTY_INCREASE" : "CART_QTY_DECREASE", amount: amount && amount > 0 ? amount : 1, terms };
    }
  }

  // ---- Checkout / payment flow ---------------------------------------------
  const hasAddr = any(V.ADDRESS);
  const ordinal = Object.entries(ORDINALS).find(([, l]) => any(l));
  const place = any(V.PLACE);
  const confirmOrder = any(V.CONFIRM_ORDER);
  const payWord = any(V.PAYWORD);
  let pay = null;
  if (any(V.UPI)) pay = "UPI";
  else if (any(V.ONLINE)) pay = "ONLINE";
  else if (any(V.CARD) && !any(["கார்ட்", "கார்ட்டில்", "கார்ட்டை", "கார்ட்ல"])) pay = "CARD";
  else if (any(V.COD)) pay = "COD";
  const delivery = any(V.EXPRESS) && (onCheckout || any(V.DELIVERY)) ? "express" : any(V.STANDARD) && (onCheckout || any(V.DELIVERY)) ? "standard" : null;
  const couponMatch = any(V.COUPON) ? t.match(/(?:coupon|promo|voucher|code|கூப்பன்)\s+(?:code\s+)?([a-z0-9]{4,15})\b/) : null;

  const checkoutIntent = (() => {
    if (confirmOrder) return { intent: "CHECKOUT_CONFIRM_ORDER" };
    if (place) return { intent: "CHECKOUT_PLACE_ORDER" };
    if (couponMatch && couponMatch[1] !== "code") return { intent: "CHECKOUT_COUPON", code: couponMatch[1].toUpperCase() };
    if (hasAddr && any(V.NEW) && !ordinal && !any(V.CONFIRM)) return { intent: "CHECKOUT_NEW_ADDRESS" };
    if (hasAddr && ordinal) return { intent: "CHECKOUT_SELECT_ADDRESS", ordinal: Number(ordinal[0]), confirm: any(V.CONFIRM) };
    if (hasAddr && (any(V.CONFIRM) || any(V.YES) || any(["this", "ok", "okay", "correct", "idhu", "ithu", "இது", "சரி"]))) return { intent: "CHECKOUT_CONFIRM_ADDRESS" };
    if (pay && (onCheckout || payWord || any(["cash on delivery", "cod"]) && payWord)) return { intent: "CHECKOUT_SET_PAYMENT", value: pay };
    if (delivery) return { intent: "CHECKOUT_SET_DELIVERY", value: delivery };
    return null;
  })();

  if (onCheckout) {
    if (checkoutIntent) return checkoutIntent;
    if (any(V.BACK) && words.length <= 4) return { intent: "CHECKOUT_BACK" };
    if (any(V.NEXT) && words.length <= 6) return { intent: "CHECKOUT_NEXT" };
    if (any(["confirm", "confirmed", "uruthi", "உறுதி"]) && words.length <= 3) return { intent: "CHECKOUT_CONFIRM" };
    if (any(V.YES) && words.length <= 3) return { intent: "CHECKOUT_CONFIRM" };
  } else {
    if (any(["continue shopping", "keep shopping", "shopping continue", "ஷாப்பிங் தொடர்"])) return { intent: "GO_PRODUCTS" };
    if (onCart && any(V.NEXT) && words.length <= 4 && !any(["checkout", "check out", "செக்அவுட்"])) return { intent: "CHECKOUT_START" };
    // "place order" / "confirm order" / "UPI payment" said on another page -> take them to checkout first
    if (checkoutIntent && ["CHECKOUT_PLACE_ORDER", "CHECKOUT_CONFIRM_ORDER", "CHECKOUT_SET_PAYMENT", "CHECKOUT_SET_DELIVERY"].includes(checkoutIntent.intent)) {
      if (checkoutIntent.intent === "CHECKOUT_SET_PAYMENT" && !payWord) return null; // "cash on delivery?" stays a normal FAQ question
      return { ...checkoutIntent, outsideCheckout: true };
    }
  }

  // ---- AI shopping helper ---------------------------------------------------------
  if (any(V.FBT)) return { intent: "FREQUENTLY_BOUGHT", terms: termsFrom(t) };
  if (any(V.RECENT_W) && any(V.VIEWED)) return { intent: "RECENTLY_VIEWED" };
  if (any(["paartha", "பார்த்த"]) && any(V.ITEMS)) return { intent: "RECENTLY_VIEWED" };
  if (any(["recently viewed", "recent products", "viewed history", "browsing history", "சமீபத்தில் பார்த்த", "நான் பார்த்த"])) return { intent: "RECENTLY_VIEWED" };
  if (any(V.SIMILAR)) return { intent: "SIMILAR", terms: termsFrom(t) };
  if (any(V.TREND)) return { intent: "TRENDING", terms: termsFrom(t) };
  if (any(V.RECO)) return { intent: "RECOMMEND", terms: termsFrom(t) };

  return null;
};

// ---------------------------------------------------------------------------
// Reply language
// ---------------------------------------------------------------------------
export const looksTanglish = (message) => {
  const w = new Set(norm(message).split(" "));
  return TANGLISH_MARKERS.some((m) => w.has(m)) || detectTanglish(message);
};

/**
 * "en" | "ta" | "tl" (Tanglish) | "other"
 * The language of the CURRENT utterance decides (see languageDetect.js):
 *  - Tamil script (also Tamil + English mixed) -> ta
 *  - Latin letters with Tamil words            -> tl
 *  - Latin letters that read as English        -> en   (even if the site is set to Tamil)
 *  - Hindi/Telugu/Malayalam/Kannada            -> other
 * The site language / speech language is only a tie-breaker for one- or two-word Latin input.
 */
export const chooseStyle = ({ message, uiLang, lang, lastStyle }) =>
  detectUtteranceLanguage({ message, uiLang, lang, lastStyle }).style;

const fmt = (n) => `₹${Math.round(n).toLocaleString("en-IN")}`;
export { fmt as formatINR };

// ---------------------------------------------------------------------------
// Reply text for the NEW intents
// ---------------------------------------------------------------------------
const X = {
  en: {
    qtyChanged: (n, q) => `Done! ${n} quantity is now ${q}.`,
    qtyMax: (n, max) => `Only ${max} of ${n} available, so I set the quantity to ${max}.`,
    cartEmpty: "Your cart is empty.",
    cartCount: (lines, units) => `You have ${units} ${units === 1 ? "item" : "items"} in your cart${lines !== units ? ` (${lines} ${lines === 1 ? "product" : "products"})` : ""}.`,
    cartTotal: (total, units) => `Your cart total is ${total} for ${units} ${units === 1 ? "item" : "items"}.`,
    whichItem: "Which item in your cart do you mean? Say the product name.",
    checkoutFirst: "Let's go to checkout first.",
    ok: "Okay.",
    recoFound: (n) => `Here are ${n} picks I recommend for you.`,
    recoNone: "I couldn't find recommendations right now.",
    trendFound: (n) => `Here are ${n} trending products.`,
    similarFound: (name, n) => `Here are ${n} products similar to ${name}.`,
    similarNone: "I couldn't find similar products. Open a product or say its name first.",
    fbtFound: (name, n) => `People often buy these together with ${name}: ${n} suggestions.`,
    recentFound: (n) => `Here are your ${n} recently viewed products.`,
    recentNone: "You haven't viewed any products yet.",
    themeDark: "Dark mode is on.",
    themeLight: "Light mode is on.",
    themeAccent: (c) => `Theme colour changed to ${c}.`,
    themePanel: "Opening theme settings.",
    langSet: { en: "Language changed to English.", ta: "Language changed to Tamil.", tl: "Language changed to Tanglish." },
    viewSet: (v) => `Showing products in ${v} view.`,
    productsPage: "Taking you to the products.",
  },
  ta: {
    qtyChanged: (n, q) => `சரி! ${n} அளவு இப்போது ${q}.`,
    qtyMax: (n, max) => `${n} இல் ${max} மட்டுமே உள்ளது, அதனால் அளவு ${max} ஆக மாற்றினேன்.`,
    cartEmpty: "உங்கள் கார்ட் காலியாக உள்ளது.",
    cartCount: (lines, units) => `உங்கள் கார்ட்டில் ${units} பொருட்கள் உள்ளன.`,
    cartTotal: (total, units) => `உங்கள் கார்ட் மொத்தம் ${total} (${units} பொருட்கள்).`,
    whichItem: "கார்ட்டில் எந்த பொருள்? பொருளின் பெயரைச் சொல்லுங்கள்.",
    checkoutFirst: "முதலில் செக்அவுட்டுக்கு செல்லலாம்.",
    ok: "சரி.",
    recoFound: (n) => `உங்களுக்காக ${n} பொருட்களை பரிந்துரைக்கிறேன்.`,
    recoNone: "இப்போது பரிந்துரைகள் கிடைக்கவில்லை.",
    trendFound: (n) => `இதோ ${n} டிரெண்டிங் பொருட்கள்.`,
    similarFound: (name, n) => `${name} போன்ற ${n} பொருட்கள் இதோ.`,
    similarNone: "ஒத்த பொருட்கள் கிடைக்கவில்லை. முதலில் ஒரு பொருளைத் திறக்கவும் அல்லது பெயரைச் சொல்லவும்.",
    fbtFound: (name, n) => `${name} உடன் பலரும் சேர்த்து வாங்குபவை: ${n} பரிந்துரைகள்.`,
    recentFound: (n) => `நீங்கள் சமீபத்தில் பார்த்த ${n} பொருட்கள் இதோ.`,
    recentNone: "நீங்கள் இன்னும் எந்த பொருளையும் பார்க்கவில்லை.",
    themeDark: "டார்க் மோட் இயக்கப்பட்டது.",
    themeLight: "லைட் மோட் இயக்கப்பட்டது.",
    themeAccent: (c) => `தீம் நிறம் ${c} ஆக மாற்றப்பட்டது.`,
    themePanel: "தீம் அமைப்புகளை திறக்கிறேன்.",
    langSet: { en: "மொழி ஆங்கிலமாக மாற்றப்பட்டது.", ta: "மொழி தமிழாக மாற்றப்பட்டது.", tl: "மொழி தங்கிலிஷாக மாற்றப்பட்டது." },
    viewSet: (v) => `பொருட்களை ${v === "grid" ? "கிரிட்" : "லிஸ்ட்"} காட்சியில் காட்டுகிறேன்.`,
    productsPage: "பொருட்கள் பக்கத்திற்கு செல்கிறேன்.",
  },
  tl: {
    qtyChanged: (n, q) => `Seri! ${n} quantity ippo ${q}.`,
    qtyMax: (n, max) => `${n} ${max} mattum thaan irukku, so quantity-a ${max} nu vachuten.`,
    cartEmpty: "Ungal cart kaaliya irukku.",
    cartCount: (lines, units) => `Ungal cart-la ${units} item irukku.`,
    cartTotal: (total, units) => `Ungal cart total ${total} (${units} items).`,
    whichItem: "Cart-la entha product? Product peyar sollunga.",
    checkoutFirst: "Mudhalla checkout-ku poyidalam.",
    ok: "Seri.",
    recoFound: (n) => `Ungalukku ${n} products recommend pannirukken.`,
    recoNone: "Ippo recommendations kidaikkala.",
    trendFound: (n) => `Ithoo ${n} trending products.`,
    similarFound: (name, n) => `${name} maathiri ${n} products ithoo.`,
    similarNone: "Similar products kidaikkala. Mudhalla oru product open pannunga illa peyar sollunga.",
    fbtFound: (name, n) => `${name} kooda serthu vaanguravanga: ${n} suggestions.`,
    recentFound: (n) => `Neenga sammandhama paartha ${n} products ithoo.`,
    recentNone: "Neenga innum entha product-um paakala.",
    themeDark: "Dark mode on aayiduchu.",
    themeLight: "Light mode on aayiduchu.",
    themeAccent: (c) => `Theme colour ${c} ah maaridichu.`,
    themePanel: "Theme settings open pannuren.",
    langSet: { en: "Language English-ku maaridichu.", ta: "Language Tamil-ku maaridichu.", tl: "Language Tanglish-ku maaridichu." },
    viewSet: (v) => `Products-a ${v} view-la kaatturen.`,
    productsPage: "Products page-ku kootitu pogiren.",
  },
};

export const sayExtra = (style, key, ...args) => {
  const table = X[style] || X.en;
  const entry = table[key] ?? X.en[key];
  return typeof entry === "function" ? entry(...args) : entry;
};

/** Tanglish versions of the ORIGINAL reply keys, used when the shopper chats in Tanglish. */
export const TL_LEGACY = {
  greeting: "Vanakkam! Naan ungal VoiceShop assistant. Products search pannalam, cart-la add pannalam, orders paakalam.",
  thanks: "Magizhchi! Shopping continue pannunga.",
  searchFound: (n, subject) => `${subject} ku ${n} results kidaichuduchu.`,
  searchNone: (subject) => `Sorry, ${subject} ku edhuvum kidaikkala. Vera word try pannunga.`,
  addedToCart: (name, qty) => `Seri! ${qty > 1 ? `${qty} × ` : ""}${name} ungal cart-la add aayiduchu.`,
  addedToWishlist: (name) => `Seri! ${name} wishlist-la add aayiduchu.`,
  alreadyWishlist: (name) => `${name} already wishlist-la irukku.`,
  removedFromCart: (name) => `${name} cart-la irundhu remove aayiduchu.`,
  removedFromWishlist: (name) => `${name} wishlist-la irundhu remove aayiduchu.`,
  notInCart: "Andha item ungal cart-la illa.",
  notInWishlist: "Andha item ungal wishlist-la illa.",
  notFoundProduct: "Andha product kidaikkala. Peyar thirumba sollunga.",
  askProduct: "Entha product? Product peyar sollunga, example iPhone 15.",
  outOfStock: (name) => `Sorry, ${name} ippo stock-la illa.`,
  cartCleared: "Ungal cart ippo kaali.",
  wishlistCleared: "Ungal wishlist ippo kaali.",
  openCart: "Ungal cart open pannuren.",
  openWishlist: "Ungal wishlist open pannuren.",
  checkout: "Checkout page-ku kootitu pogiren.",
  buyNow: (name) => `${name} add aayiduchu. Checkout-ku pogalaam.`,
  myOrders: "Ithoo ungal orders.",
  cancelHelp: "Orders page-la order open panni Cancel Order button-a amukkunga.",
  goHome: "Home page-ku pogiren.",
  openProfile: "Ungal profile open pannuren.",
  loginRequired: "Mudhalla login pannunga, appuram naan senjudren.",
  stopListening: "Seri, hands-free mode off. Venumna mic-a tap pannunga.",
  fallback: "Sorry, puriyala. Try pannunga: laptop 60000 kulla kaattu, iPhone 15 cart la podu, illa cart open pannu.",
};
