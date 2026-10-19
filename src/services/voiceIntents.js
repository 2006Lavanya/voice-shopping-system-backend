/**
 * voiceIntents.js
 * ---------------
 * Extra "meaning" layer for the voice assistant, layered IN FRONT of the original engine
 * (same pattern as commandExtras.js). detectVoiceIntent() returns null for everything the
 * original engine already handles correctly, so existing behaviour is untouched.
 *
 * It adds the intents the original engine confused or did not have:
 *   PRICE_QUERY      "இதோட price என்ன?"  /  "How much does this cost?"
 *   ORDER_STATUS     "என்னோட order எங்க இருக்கு?"  /  "Where is my order?"
 *   ORDER_CANCEL     "Cancel my order"   (always asks for a spoken confirmation first)
 *   CONFIRM_YES / CONFIRM_NO / CONFIRM_UNCLEAR   answers to a pending question
 *
 * How it understands (instead of exact string matching):
 *   - several independent cues are combined (an order word + a status cue, a cancel cue + an order word ...)
 *   - Tamil / Tanglish / English vocabularies side by side, so code-switching works in one sentence
 *   - fuzzy token matching tolerates speech-recognition slips ("ordar", "cancle", "statuss")
 *   - "how do I cancel an order?" is recognised as a QUESTION and left to the FAQ, never executed
 */
import { editDistance } from "./phonetics.js";

// ---------------------------------------------------------------------------
// Normalisation + matching
// ---------------------------------------------------------------------------
const norm = (s) =>
  String(s || "")
    .normalize("NFC")
    .replace(/[\u200b-\u200d\u2060\ufeff]/g, "")
    .toLowerCase()
    .replace(/['\u2019`]/g, "") // don't -> dont, what's -> whats
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

const isIndic = (w) => /[\u0900-\u0dff]/.test(w);

/**
 * Builds a matcher over one utterance.
 *  - Indic words: substring match (Tamil is heavily inflected: ஆர்டரை, ஆர்டருக்கு ...)
 *  - multi-word phrases: whole-word phrase match
 *  - Latin single words: exact, or within edit distance 1 (2 for long words) when the word is 6+ letters
 *    (short words such as "order" / "price" would otherwise collide with "border" / "prize")
 */
const makeMatcher = (text) => {
  const padded = ` ${text} `;
  const tokens = text.split(" ").filter(Boolean);
  const latinTokens = tokens.filter((t) => !isIndic(t));
  return (list) =>
    list.some((w) => {
      if (isIndic(w)) return text.includes(w);
      if (w.includes(" ")) return padded.includes(` ${w} `);
      if (tokens.includes(w)) return true;
      if (w.length < 6) return false;
      const cap = w.length >= 9 ? 2 : 1;
      return latinTokens.some((t) => t[0] === w[0] && Math.abs(t.length - w.length) <= cap && editDistance(t, w, cap) <= cap);
    });
};

// ---------------------------------------------------------------------------
// Vocabulary (English | Tanglish | Tamil script). Short words list their usual mis-spellings explicitly.
// ---------------------------------------------------------------------------
const V = {
  ORDER: ["order", "orders", "ordar", "ordars", "ordr", "oder", "aarder", "parcel", "package", "shipment", "ஆர்டர்", "ஆடர்", "ஆர்டர", "பார்சல்"],
  STATUS: [
    "where", "wheres", "whers", "wear is", "status", "statuss", "track", "tracking", "trace", "update", "progress", "reach", "reached", "arrive", "arrived", "arriving", "arrival",
    "when will", "how long", "what happened", "kidaikkum", "enga", "engey", "enge", "engae", "eppo", "eppodhu", "varum", "varuma", "vandhuduma", "vandhucha", "vandhuduchu",
    "எங்க", "எங்கே", "எங்கு", "எப்போ", "எப்பொழுது", "வரும்", "வந்துச்சா", "வந்துருச்சா", "வந்ததா", "நிலை", "ஸ்டேட்டஸ்", "டிராக்", "ட்ராக்",
  ],
  CANCEL: ["cancel", "cancle", "cancell", "canceled", "cancelled", "cancelling", "kancel", "calcel", "ரத்து", "கேன்சல்", "கேன்செல்"],
  CANCEL_DONT_WANT: ["venam", "vendaam", "vendam", "venaam", "வேண்டாம்", "வேணாம்"],
  HOW: ["how to", "how do", "how can", "how should", "can i cancel", "is it possible", "where can i", "where to", "where do i", "eppadi", "எப்படி", "என்னென்ன", "policy", "rules"],
  PLACE: ["place order", "place the order", "place my order", "buy", "purchase", "checkout", "check out", "order pannu", "order pannunga", "order podu", "order podunga", "வாங்கு", "ஆர்டர் பண்ணு", "ஆர்டர் செய்", "ஆர்டர் போடு"],
  PRICE: [
    "price", "prices", "pricing", "pries", "prise", "prce", "cost", "costs", "how much", "whats the price", "what is the price", "how many rupees",
    "vilai", "evlo", "evvalavu", "evlavu", "kitna", "kitne", "ethana rupa", "விலை", "எவ்வளவு", "எவ்ளோ", "ரேட்", "ப்ரைஸ்", "பிரைஸ்", "கோஸ்ட்",
  ],
  BUDGET: ["under", "below", "less than", "within", "above", "over", "more than", "upto", "up to", "around", "kulla", "kila", "keezh", "keel", "குள்ள", "கீழ்", "கீழே", "மேல்", "குறைவாக", "க்குள்"],
  FAQ: ["delivery", "shipping", "deliver", "coupon", "promo", "refund", "return", "payment", "டெலிவரி", "கூப்பன்", "பேமெண்ட்"],
  CART: ["cart", "kart", "basket", "கார்ட்", "கார்ட்டில்", "கார்ட்ல", "கார்ட்டை", "கார்ட்டு"],

  YES: [
    "yes", "yeah", "yep", "yup", "sure", "ok", "okay", "correct", "right", "confirm", "confirmed", "go ahead", "do it", "proceed", "please do", "of course", "definitely",
    "haan", "ha", "aama", "aamam", "aamaam", "ama", "seri", "sari", "sariya", "uruthi", "pannunga", "pannu", "podunga", "cancel pannunga", "cancel pannu",
    "ஆம்", "ஆமாம்", "ஆமா", "சரி", "சரியா", "உறுதி", "பண்ணுங்க", "பண்ணு", "செய்", "செய்யுங்க",
  ],
  NO: [
    "no", "nope", "nah", "dont", "do not", "stop", "wait", "never mind", "nevermind", "leave it", "forget it", "not now", "dont cancel", "do not cancel", "keep it", "hold on",
    "illa", "illai", "illaye", "venam", "vendaam", "vendam", "venaam", "venda", "vendam", "ippo venam", "vidu", "vittudu",
    "இல்ல", "இல்லை", "வேண்டாம்", "வேணாம்", "வேணா", "விடு", "நிறுத்து", "வேண்டாம்ங்க",
  ],
  CANCEL_ONLY: ["cancel", "cancle", "kancel", "ரத்து", "கேன்சல்"],
};

export const shortOrderId = (id) => String(id || "").slice(-8).toUpperCase();
const ORDERISH = /^\/orders\/([a-f0-9]{24})/i;

const PENDING_TTL_MS = 120_000;
export const pendingIsFresh = (pending) => Boolean(pending && pending.type && (!pending.expiresAt || Number(pending.expiresAt) > Date.now()));
export const newPending = (data) => ({ ...data, expiresAt: Date.now() + PENDING_TTL_MS });

/** Classifies a short answer to a pending question. */
export const classifyYesNo = (message) => {
  const t = norm(message);
  if (!t) return "none";
  const words = t.split(" ");
  if (words.length > 7) return "none"; // a long, unrelated sentence is a new command, not an answer
  const any = makeMatcher(t);
  const yes = any(V.YES);
  const no = any(V.NO);
  // "dont cancel" contains "cancel pannu"-like yes cues in no sentence: negation wins
  if (yes && no) return "unclear";
  if (no) return "no";
  if (yes) return "yes";
  // a bare "cancel" while a confirmation is pending is ambiguous: cancel the order, or cancel the cancellation?
  if (any(V.CANCEL_ONLY) && words.length <= 2) return "unclear";
  return "none";
};

// ---------------------------------------------------------------------------
// Intent detection
// ---------------------------------------------------------------------------
/**
 * @returns {null | { intent: string, confidence: number, ... }}
 * @param ctx { pending?, path?, productId?, orderId? }
 */
export const detectVoiceIntent = (message, ctx = {}) => {
  const t = norm(message);
  if (!t) return null;
  const any = makeMatcher(t);
  const words = t.split(" ");
  const path = String(ctx.path || "");

  // ---- answer to a question the assistant just asked -------------------------------------
  if (pendingIsFresh(ctx.pending)) {
    const yn = classifyYesNo(message);
    if (yn === "yes") return { intent: "CONFIRM_YES", confidence: 0.9 };
    if (yn === "no") return { intent: "CONFIRM_NO", confidence: 0.9 };
    if (yn === "unclear") return { intent: "CONFIRM_UNCLEAR", confidence: 0.5 };
    // "none": let the controller try to read it as a choice ("the second one") or treat it as a new command
  }

  const hasOrder = any(V.ORDER);
  const hasCart = any(V.CART);
  const isQuestionAboutRules = any(V.HOW);
  const onOrderPage = ORDERISH.test(path) || Boolean(ctx.orderId);

  // ---- cancel an order ---------------------------------------------------------------------
  if (!isQuestionAboutRules) {
    const cancelCue = any(V.CANCEL);
    if (cancelCue && (hasOrder || (onOrderPage && words.length <= 6))) {
      return { intent: "ORDER_CANCEL", confidence: hasOrder ? 0.92 : 0.7 };
    }
    // "order venam" ("I don't want the order"): only with an explicit order word
    if (hasOrder && any(V.CANCEL_DONT_WANT) && words.length <= 6) return { intent: "ORDER_CANCEL", confidence: 0.7 };
  }

  // ---- order status ------------------------------------------------------------------------
  if (hasOrder && !hasCart && !isQuestionAboutRules && any(V.STATUS) && !any(V.PLACE) && !any(V.CANCEL)) {
    return { intent: "ORDER_STATUS", confidence: 0.9 };
  }

  // ---- price question ---------------------------------------------------------------------
  if (any(V.PRICE) && !hasCart && !hasOrder && !any(V.FAQ) && !any(V.BUDGET)) {
    return { intent: "PRICE_QUERY", confidence: 0.85 };
  }

  return null;
};

// ---------------------------------------------------------------------------
// Reply text (English / Tamil / Tanglish). Other languages fall back to English for these new messages.
// ---------------------------------------------------------------------------
const STATUS_TEXT = {
  en: {
    Placed: (id) => `Your latest order #${id} has been placed and is waiting to be confirmed.`,
    Confirmed: (id) => `Your latest order #${id} is confirmed and will be packed soon.`,
    Packed: (id) => `Your latest order #${id} is packed and will be shipped soon.`,
    Shipped: (id) => `Your latest order #${id} has shipped and is on its way.`,
    "Out for Delivery": (id) => `Your latest order #${id} is out for delivery and should reach you today.`,
    Delivered: (id) => `Your latest order #${id} was delivered.`,
    Cancelled: (id) => `Your latest order #${id} was cancelled.`,
  },
  ta: {
    Placed: (id) => `உங்கள் சமீபத்திய ஆர்டர் #${id} பதிவு செய்யப்பட்டுள்ளது, உறுதிப்படுத்தலுக்காக காத்திருக்கிறது.`,
    Confirmed: (id) => `உங்கள் சமீபத்திய ஆர்டர் #${id} உறுதி செய்யப்பட்டது, விரைவில் பேக் செய்யப்படும்.`,
    Packed: (id) => `உங்கள் சமீபத்திய ஆர்டர் #${id} பேக் செய்யப்பட்டுவிட்டது, விரைவில் அனுப்பப்படும்.`,
    Shipped: (id) => `உங்கள் சமீபத்திய ஆர்டர் #${id} அனுப்பப்பட்டுவிட்டது, வழியில் உள்ளது.`,
    "Out for Delivery": (id) => `உங்கள் சமீபத்திய ஆர்டர் #${id} டெலிவரிக்காக வெளியே சென்றுள்ளது, இன்று வந்து சேரும்.`,
    Delivered: (id) => `உங்கள் சமீபத்திய ஆர்டர் #${id} டெலிவரி செய்யப்பட்டது.`,
    Cancelled: (id) => `உங்கள் சமீபத்திய ஆர்டர் #${id} ரத்து செய்யப்பட்டது.`,
  },
  tl: {
    Placed: (id) => `Ungal latest order #${id} place aayiduchu, confirmation-ku wait pannudhu.`,
    Confirmed: (id) => `Ungal latest order #${id} confirm aayiduchu, seekkiram pack pannuvaanga.`,
    Packed: (id) => `Ungal latest order #${id} pack aayiduchu, seekkiram ship pannuvaanga.`,
    Shipped: (id) => `Ungal latest order #${id} ship aayiduchu, vazhiyila irukku.`,
    "Out for Delivery": (id) => `Ungal latest order #${id} out for delivery, inniki vandhuduum.`,
    Delivered: (id) => `Ungal latest order #${id} deliver aayiduchu.`,
    Cancelled: (id) => `Ungal latest order #${id} cancel aayiduchu.`,
  },
};

const STATUS_WORD = {
  en: { Placed: "placed", Confirmed: "confirmed", Packed: "packed", Shipped: "shipped", "Out for Delivery": "out for delivery", Delivered: "delivered", Cancelled: "cancelled" },
  ta: { Placed: "பதிவு செய்யப்பட்டது", Confirmed: "உறுதி செய்யப்பட்டது", Packed: "பேக் செய்யப்பட்டது", Shipped: "அனுப்பப்பட்டது", "Out for Delivery": "டெலிவரிக்கு வெளியே உள்ளது", Delivered: "டெலிவரி செய்யப்பட்டது", Cancelled: "ரத்து செய்யப்பட்டது" },
  tl: { Placed: "place aayiduchu", Confirmed: "confirm aayiduchu", Packed: "pack aayiduchu", Shipped: "ship aayiduchu", "Out for Delivery": "out for delivery", Delivered: "deliver aayiduchu", Cancelled: "cancel aayiduchu" },
};

const orList = (names, word) => (names.length <= 1 ? names.join("") : `${names.slice(0, -1).join(", ")} ${word} ${names[names.length - 1]}`);

const R = {
  en: {
    priceOf: (name, price, orig) => `${name} costs ${price}${orig ? `, down from ${orig}` : ""}.`,
    priceAskWhich: "Which product's price do you want? Say its name, or say first one, second one.",
    orderStatus: (status, id, total, others) => `${STATUS_TEXT.en[status]?.(id) || `Your latest order #${id} is ${status}.`} Total ${total}.${others ? ` You also have ${others} other active ${others === 1 ? "order" : "orders"}.` : ""}`,
    orderStatusNone: "You haven't placed any orders yet.",
    orderStatusOpen: "I've opened it so you can see the full tracking.",
    cancelAsk: (id, name, more, total) => `Do you want to cancel order #${id}${name ? ` (${name}${more ? ` and ${more} more` : ""})` : ""}, total ${total}? Say yes to cancel it, or no to keep it.`,
    cancelDone: (id) => `Done. Order #${id} has been cancelled.`,
    cancelBlocked: (id, status) => `Sorry, order #${id} is already ${STATUS_WORD.en[status] || status}, so it can no longer be cancelled.`,
    cancelNone: "You don't have any order that can be cancelled right now.",
    cancelDeclined: "Okay, I won't cancel anything.",
    declined: "Okay, I won't do that.",
    priceMany: (n, subject) => `I found ${n} ${n === 1 ? "result" : "results"} for ${subject}, each with a different price. Which one's price do you want? Say its name, or say first one.`,
    cancelFailed: "Sorry, I couldn't cancel that order. Please try again from the My Orders page.",
    confirmUnclear: "Sorry, was that a yes or a no?",
    nothingPending: "Okay.",
    askWhichRemove: (names) => `Which item do you want to remove: ${orList(names, "or")}?`,
    askWhichAdd: "Which product do you mean? Say its name, or say first one, second one.",
    confirmHeard: (text) => `I heard "${text}". Should I go ahead? Say yes or no.`,
    confirmAddCart: (name) => `Did you mean ${name}? Say yes and I'll add it to your cart.`,
    confirmAddWishlist: (name) => `Did you mean ${name}? Say yes and I'll add it to your wishlist.`,
    confirmRemoveCart: (name) => `Did you mean ${name}? Say yes and I'll remove it from your cart.`,
    confirmRemoveWishlist: (name) => `Did you mean ${name}? Say yes and I'll remove it from your wishlist.`,
    buyPickOne: (n, subject) => `I found ${n} ${n === 1 ? "result" : "results"} for ${subject}. Which one would you like to buy? Say its name, or say first one.`,
    help: "I can help you search for products, add or remove items in your cart or wishlist, tell you a price, track or cancel an order, and take you to checkout. Try saying: show laptops under 60000, add this to my cart, or where is my order.",
    unclear: "Sorry, I didn't quite get that. Do you want to search for a product, check your cart, or track an order?",
    heardNothing: "I didn't catch that. Please say it again.",
  },
  ta: {
    priceOf: (name, price, orig) => `${name} விலை ${price}${orig ? `, அசல் விலை ${orig}` : ""}.`,
    priceAskWhich: "எந்த பொருளின் விலை வேண்டும்? பெயரைச் சொல்லுங்கள், அல்லது முதலாவது, இரண்டாவது என்று சொல்லுங்கள்.",
    orderStatus: (status, id, total, others) => `${STATUS_TEXT.ta[status]?.(id) || `உங்கள் சமீபத்திய ஆர்டர் #${id}: ${status}.`} மொத்தம் ${total}.${others ? ` மேலும் ${others} ஆர்டர்கள் நடப்பில் உள்ளன.` : ""}`,
    orderStatusNone: "நீங்கள் இன்னும் எந்த ஆர்டரும் செய்யவில்லை.",
    orderStatusOpen: "முழு டிராக்கிங்கை பார்க்க அதை திறந்து வைத்திருக்கிறேன்.",
    cancelAsk: (id, name, more, total) => `ஆர்டர் #${id}${name ? ` (${name}${more ? ` மற்றும் ${more} பொருட்கள்` : ""})` : ""}, மொத்தம் ${total} ஐ ரத்து செய்யவா? ரத்து செய்ய "ஆமா", வேண்டாம் என்றால் "வேண்டாம்" என்று சொல்லுங்கள்.`,
    cancelDone: (id) => `சரி, ஆர்டர் #${id} ரத்து செய்யப்பட்டது.`,
    cancelBlocked: (id, status) => `மன்னிக்கவும், ஆர்டர் #${id} ஏற்கனவே ${STATUS_WORD.ta[status] || status}, அதனால் ரத்து செய்ய முடியாது.`,
    cancelNone: "இப்போது ரத்து செய்யக்கூடிய ஆர்டர் எதுவும் இல்லை.",
    cancelDeclined: "சரி, எதையும் ரத்து செய்யவில்லை.",
    declined: "சரி, அதைச் செய்யவில்லை.",
    priceMany: (n, subject) => `${subject} க்கு ${n} முடிவுகள் உள்ளன, ஒவ்வொன்றுக்கும் வேறு விலை. எதன் விலை வேண்டும்? பெயரைச் சொல்லுங்கள், அல்லது முதலாவது என்று சொல்லுங்கள்.`,
    cancelFailed: "மன்னிக்கவும், அந்த ஆர்டரை ரத்து செய்ய முடியவில்லை. என் ஆர்டர்கள் பக்கத்தில் இருந்து மீண்டும் முயற்சி செய்யுங்கள்.",
    confirmUnclear: "மன்னிக்கவும், ஆமா என்றா, வேண்டாம் என்றா?",
    nothingPending: "சரி.",
    askWhichRemove: (names) => `எந்த பொருளை நீக்க வேண்டும்: ${orList(names, "அல்லது")}?`,
    askWhichAdd: "எந்த பொருள்? பெயரைச் சொல்லுங்கள், அல்லது முதலாவது, இரண்டாவது என்று சொல்லுங்கள்.",
    confirmHeard: (text) => `நான் கேட்டது "${text}". தொடரலாமா? ஆமா அல்லது வேண்டாம் என்று சொல்லுங்கள்.`,
    confirmAddCart: (name) => `நீங்கள் ${name} என்று சொன்னீர்களா? ஆமா என்றால் கார்ட்டில் சேர்க்கிறேன்.`,
    confirmAddWishlist: (name) => `நீங்கள் ${name} என்று சொன்னீர்களா? ஆமா என்றால் விஷ்லிஸ்ட்டில் சேர்க்கிறேன்.`,
    confirmRemoveCart: (name) => `நீங்கள் ${name} என்று சொன்னீர்களா? ஆமா என்றால் கார்ட்டில் இருந்து நீக்குகிறேன்.`,
    confirmRemoveWishlist: (name) => `நீங்கள் ${name} என்று சொன்னீர்களா? ஆமா என்றால் விஷ்லிஸ்ட்டில் இருந்து நீக்குகிறேன்.`,
    buyPickOne: (n, subject) => `${subject} க்கு ${n} முடிவுகள் உள்ளன. எதை வாங்க வேண்டும்? பெயரைச் சொல்லுங்கள், அல்லது முதலாவது என்று சொல்லுங்கள்.`,
    help: "பொருட்களைத் தேட, கார்ட் அல்லது விஷ்லிஸ்ட்டில் சேர்க்க அல்லது நீக்க, விலை சொல்ல, ஆர்டரை டிராக் செய்ய அல்லது ரத்து செய்ய, செக்அவுட்டுக்கு அழைத்துச் செல்ல நான் உதவுவேன். உதாரணமாக: \"60000 க்கு கீழ் லேப்டாப் காட்டு\", \"இதை கார்ட்ல சேர்\", \"என் ஆர்டர் எங்க இருக்கு\" என்று சொல்லுங்கள்.",
    unclear: "மன்னிக்கவும், சரியாகப் புரியவில்லை. பொருளைத் தேட வேண்டுமா, கார்ட்டைப் பார்க்க வேண்டுமா, அல்லது ஆர்டரை டிராக் செய்ய வேண்டுமா?",
    heardNothing: "எனக்குக் கேட்கவில்லை. தயவுசெய்து மீண்டும் சொல்லுங்கள்.",
  },
  tl: {
    priceOf: (name, price, orig) => `${name} price ${price}${orig ? ` (original ${orig})` : ""}.`,
    priceAskWhich: "Entha product-oda price venum? Peyar sollunga, illa first one, second one nu sollunga.",
    orderStatus: (status, id, total, others) => `${STATUS_TEXT.tl[status]?.(id) || `Ungal latest order #${id}: ${status}.`} Total ${total}.${others ? ` Innum ${others} active orders irukku.` : ""}`,
    orderStatusNone: "Neenga innum entha order-um pannala.",
    orderStatusOpen: "Full tracking paakka adhai open panni vachirukken.",
    cancelAsk: (id, name, more, total) => `Order #${id}${name ? ` (${name}${more ? ` kooda ${more} more` : ""})` : ""}, total ${total} cancel pannidalaama? Cancel panna "aama", venaanu "venam" nu sollunga.`,
    cancelDone: (id) => `Seri, order #${id} cancel aayiduchu.`,
    cancelBlocked: (id, status) => `Sorry, order #${id} already ${STATUS_WORD.tl[status] || status}, so cancel panna mudiyaadhu.`,
    cancelNone: "Ippo cancel panna koodiya order edhuvum illa.",
    cancelDeclined: "Seri, edhayum cancel pannala.",
    declined: "Seri, adhai pannala.",
    priceMany: (n, subject) => `${subject} ku ${n} results irukku, ovvonnukkum vera price. Edhoda price venum? Peyar sollunga, illa first one nu sollunga.`,
    cancelFailed: "Sorry, andha order-a cancel panna mudiyala. My Orders page-la irundhu thirumba try pannunga.",
    confirmUnclear: "Sorry, aama-va illa venam-a?",
    nothingPending: "Seri.",
    askWhichRemove: (names) => `Entha item-a remove pannanum: ${orList(names, "illa")}?`,
    askWhichAdd: "Entha product? Peyar sollunga, illa first one, second one nu sollunga.",
    confirmHeard: (text) => `Naan kettadhu "${text}". Continue pannalaama? Aama illa venam nu sollunga.`,
    confirmAddCart: (name) => `Neenga ${name} nu sonneengala? Aama na cart-la add pannuren.`,
    confirmAddWishlist: (name) => `Neenga ${name} nu sonneengala? Aama na wishlist-la add pannuren.`,
    confirmRemoveCart: (name) => `Neenga ${name} nu sonneengala? Aama na cart-la irundhu remove pannuren.`,
    confirmRemoveWishlist: (name) => `Neenga ${name} nu sonneengala? Aama na wishlist-la irundhu remove pannuren.`,
    buyPickOne: (n, subject) => `${subject} ku ${n} results irukku. Edhai vaanganum? Peyar sollunga, illa first one nu sollunga.`,
    help: "Products search panna, cart / wishlist-la add or remove panna, price solla, order track or cancel panna, checkout-ku kootitu poga naan help pannuven. Example: \"60000 kulla laptop kaattu\", \"idha cart-la podu\", \"en order enga irukku\" nu sollunga.",
    unclear: "Sorry, sariya puriyala. Product search pannanuma, cart paakanuma, illa order track pannanuma?",
    heardNothing: "Enakku kekkala. Dayavu seidhu thirumba sollunga.",
  },
};

/** Reply text for the voice intents above: style is "en" | "ta" | "tl" | "other" (other -> English). */
export const sayVoice = (style, key, ...args) => {
  const table = R[style] || R.en;
  const entry = table[key] ?? R.en[key];
  return typeof entry === "function" ? entry(...args) : entry;
};

export { norm as normalizeVoiceText };
