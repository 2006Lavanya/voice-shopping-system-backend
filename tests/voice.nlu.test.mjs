// Offline NLU tests (no database): language detection + intent detection + yes/no, incl. recognition slips.
import { detectUtteranceLanguage } from "../src/services/languageDetect.js";
import { detectVoiceIntent, classifyYesNo } from "../src/services/voiceIntents.js";
import { understandMessage } from "../src/services/assistantEngine.js";

let bad = 0;
const ok = (label, cond, extra) => { if (!cond) bad += 1; console.log(cond ? "✓" : "✗", label, cond ? "" : JSON.stringify(extra)); };

// ---- language of the CURRENT utterance
const lang = [
  ["எனக்கு ஒரு லேப்டாப் வேணும்", "ta"], ["கார்ட்ல இதை add பண்ணு", "ta"], ["இதோட price என்ன?", "ta"], ["என்னோட order எங்க இருக்கு?", "ta"],
  ["I want to buy a laptop", "en"], ["Where is my order?", "en"], ["How much does this cost?", "en"], ["Remove that item", "en"],
  ["enakku oru laptop venum", "tl"], ["idhoda price enna", "tl"], ["en order enga irukku", "tl"], ["cart la add pannu", "tl"], ["iphone 15 wishlist la podu", "tl"],
  ["add red sari to cart", "en"], ["show me the cheapest phone", "en"],
];
for (const [m, want] of lang) { const g = detectUtteranceLanguage({ message: m, uiLang: want === "en" ? "ta" : "en", lang: "en-IN" }).style; ok(`lang ${want}: ${m}`, g === want, g); }
ok("one-word 'laptop' follows previous turn (Tamil)", detectUtteranceLanguage({ message: "laptop", lastStyle: "ta" }).style === "ta");
ok("one-word 'laptop' defaults to English", detectUtteranceLanguage({ message: "laptop" }).style === "en");

// ---- intents, with accent / recognition variants
const intents = [
  // order status
  ["Where is my order?", "ORDER_STATUS"], ["where is my ordar", "ORDER_STATUS"], ["wheres my order", "ORDER_STATUS"], ["track my order", "ORDER_STATUS"], ["when will my order arrive", "ORDER_STATUS"],
  ["order status please", "ORDER_STATUS"], ["என்னோட order எங்க இருக்கு?", "ORDER_STATUS"], ["என் ஆர்டர் எங்கே", "ORDER_STATUS"], ["en order enga irukku", "ORDER_STATUS"], ["order eppo varum", "ORDER_STATUS"],
  // cancel
  ["Cancel my order", "ORDER_CANCEL"], ["cancle my ordar", "ORDER_CANCEL"], ["I want to cancel the order", "ORDER_CANCEL"], ["order cancel pannu", "ORDER_CANCEL"], ["என் ஆர்டரை கேன்சல் பண்ணு", "ORDER_CANCEL"], ["ஆர்டர் ரத்து செய்", "ORDER_CANCEL"],
  // price
  ["How much does this cost?", "PRICE_QUERY"], ["what is the price", "PRICE_QUERY"], ["whats the price of this", "PRICE_QUERY"], ["இதோட price என்ன?", "PRICE_QUERY"], ["இதன் விலை என்ன", "PRICE_QUERY"], ["idhoda price enna", "PRICE_QUERY"], ["idhu evlo", "PRICE_QUERY"],
  // must NOT be claimed (left to the original engine / FAQ)
  ["show my orders", null], ["place order", null], ["how do I cancel an order", null], ["where can I order a laptop", null], ["laptops under 50000", null], ["how much is delivery", null],
  ["rate this product", null], ["cart total evlo", null], ["add this to my cart", null], ["I want to buy a laptop", null], ["என் ஆர்டர்கள் காட்டு", null],
];
for (const [m, want] of intents) { const g = detectVoiceIntent(m, {})?.intent ?? null; ok(`intent ${want}: ${m}`, g === want, g); }
ok("cancel on an order page without the word 'order'", detectVoiceIntent("cancel this", { path: "/orders/" + "a".repeat(24) })?.intent === "ORDER_CANCEL");

// ---- answering a pending question
const yn = [["yes", "yes"], ["yeah sure", "yes"], ["ஆமா", "yes"], ["seri", "yes"], ["no", "no"], ["don't cancel", "no"], ["வேண்டாம்", "no"], ["illa venam", "no"], ["cancel", "unclear"], ["yes no", "unclear"], ["add an iphone to my cart please right now", "none"]];
for (const [m, want] of yn) ok(`yes/no ${want}: ${m}`, classifyYesNo(m) === want, classifyYesNo(m));
ok("expired pending ignored", detectVoiceIntent("yes", { pending: { type: "CANCEL_ORDER", expiresAt: Date.now() - 1000 } }) === null);
ok("fresh pending recognised", detectVoiceIntent("yes", { pending: { type: "CANCEL_ORDER", expiresAt: Date.now() + 5000 } })?.intent === "CONFIRM_YES");

// ---- add / remove / wishlist / search / help phrasing variants through the original engine (accents, recognition slips)
const engineRows = [
 ["add this to my kart","ADD_TO_CART"],["ad this to cart","ADD_TO_CART"],["put this in my cart","ADD_TO_CART"],["put it in the basket","ADD_TO_CART"],["add that one to cart","ADD_TO_CART"],
 ["இதை கார்ட்ல போடு","ADD_TO_CART"],["இத கார்ட்ல சேர்த்துடு","ADD_TO_CART"],["இதை கார்ட்டில் சேர்","ADD_TO_CART"],["idha cart la podu","ADD_TO_CART"],["idhai cart-la add pannunga","ADD_TO_CART"],
 ["add this to wishlist","ADD_TO_WISHLIST"],["இதை விஷ்லிஸ்ட்ல போடு","ADD_TO_WISHLIST"],["idha wishlist la podu","ADD_TO_WISHLIST"],["save this for later","?"],
 ["remove this from cart","REMOVE_FROM_CART"],["delete that","REMOVE_FROM_CART"],["take it out","REMOVE_FROM_CART"],["இதை கார்ட்ல இருந்து எடு","REMOVE_FROM_CART"],["idha cart la irundhu edu","REMOVE_FROM_CART"],["இத நீக்கு","REMOVE_FROM_CART"],["remove from wishlist","REMOVE_FROM_WISHLIST"],
 ["clear my cart","CLEAR_CART"],["cart ah kaali pannu","CLEAR_CART"],["கார்ட்டை காலி செய்","CLEAR_CART"],
 ["i want laptop","PRODUCT_SEARCH"],["laptop kaattu","PRODUCT_SEARCH"],["laptop venum","PRODUCT_SEARCH"],["show me phones under 20000","PRODUCT_SEARCH"],["20000 kulla phone venum","PRODUCT_SEARCH"],["சாம்சங் போன் காட்டு","PRODUCT_SEARCH"],
 ["go to checkout","GO_TO_CHECKOUT"],["check out pannu","GO_TO_CHECKOUT"],["செக்அவுட் போ","GO_TO_CHECKOUT"],
 ["show my wishlist","OPEN_WISHLIST"],["what can you do","HELP"],["help me","HELP"],["உதவி","HELP"],["udhavi venum","HELP"],
];
for (const [m, want] of engineRows) { if (want === "?") continue; const g = understandMessage(m, "en-IN", {}).intent; ok(`engine ${want}: ${m}`, g === want, g); }

console.log(bad ? `\n${bad} FAILED` : "\nAll voice NLU checks passed");
process.exit(bad ? 1 : 0);
