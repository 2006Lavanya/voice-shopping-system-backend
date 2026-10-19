/**
 * languageDetect.js
 * -----------------
 * Decides which language the shopper is speaking RIGHT NOW, from the words of the current utterance.
 *
 *   style "ta"    Tamil script (also Tamil + English words mixed in one sentence - the reply is Tamil and
 *                 product names / brands stay in English, exactly as the shopper said them)
 *   style "tl"    Tanglish: Tamil written in English letters ("enakku oru laptop venum")
 *   style "en"    English
 *   style "other" Hindi / Telugu / Malayalam / Kannada script (handled by the original engine)
 *
 * The site language / speech-recognition language that the shopper picked is only used as a TIE-BREAKER
 * for very short Latin-script utterances ("laptop") where the words alone cannot tell English from Tamil.
 * It never overrides a clearly English or clearly Tamil sentence.
 */
import { detectScriptLang } from "./phonetics.js";

const strip = (s) => String(s || "").normalize("NFC").replace(/[\u200b-\u200d\u2060\ufeff]/g, "");

/** Lower-cased word list of a message (Latin letters / digits / Indic marks only). */
const words = (message) =>
  strip(message)
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

/**
 * Distinctive Tamil words as they are usually typed / transcribed in English letters.
 * Only words that are NOT ordinary English words, so plain English is never mistaken for Tanglish.
 */
export const TANGLISH_WORDS = new Set([
  // verbs / commands
  "pannu", "panni", "pannunga", "panunga", "pannidu", "pannidunga", "pannuga", "pannanum", "pannalam", "pannuren", "pannitten", "panra",
  "podu", "podunga", "poduga", "potru", "serthu", "serunga", "serkka", "kaattu", "kaatu", "kaattunga", "kaamichu", "kaami", "paaru", "paarunga",
  "paakanum", "paakalam", "thedu", "thedunga", "thedi", "vaangu", "vaanga", "vaangunga", "vaanganum", "vaangi", "edu", "eduthudu", "neekku", "neekkunga",
  "maathu", "maathunga", "kuraichu", "kootu", "kootunga", "sollu", "solunga", "solren", "thirakku", "thirandhu", "nillu", "nirutthu", "niruthu", "nirutthunga",
  "cancelpannu", "mudichu", "mudinjuchu", "vandhuduchu", "varum", "varuma", "irukku", "iruku", "irukka", "iruka", "irundhu", "irukkunga",
  // wants / questions
  "venum", "vendum", "venam", "vendaam", "vendam", "venaam", "veenam", "enakku", "enaku", "yenakku", "naan", "nan", "neenga", "nenga", "unga", "ungal", "ungalukku", "ungaluku",
  "enna", "yenna", "enga", "engey", "enge", "engae", "eppo", "eppodhu", "eppadi", "evlo", "evvalavu", "evlavu", "yaar", "yaaru", "edhu", "etha", "ethu", "entha", "endha",
  "ennoda", "enoda", "ennudaya", "unnoda", "ungaloda", "avanga", "idhoda", "ithoda", "idhukku", "ithukku", "idhu", "ithu", "adhu", "athu", "indha", "intha", "andha", "antha", "idhai", "ithai", "adhai",
  // answers / particles
  "aama", "aamam", "aamaam", "seri", "illa", "illai", "illaye", "vendaam", "podhum", "pothum", "konjam", "romba", "rombha", "nalla", "nallaa", "vera", "veru",
  "kaali", "kaaliya", "kulla", "kila", "keezha", "mela", "ellam", "ellaam", "ellathayum", "oru", "rendu", "moonu", "naalu", "anju", "onnu", "innum", "innoru",
  "vilai", "vilaiyum", "motham", "pidichirukku", "nandri", "vanakkam", "machan", "macha", "thaan", "dhaan", "kooda", "koodave", "sammandhama",
]);

// A few Tanglish words are also real (rare) English/Latin words; they only count when they appear next to another marker or a Tamil particle.
const WEAK_TANGLISH = new Set(["vera", "veru", "oru", "mela", "kila", "illa", "seri", "naan", "nan", "edu"]);

export const countTanglish = (message) => {
  const ws = words(message);
  let strong = 0;
  let weak = 0;
  for (const w of ws) {
    if (TANGLISH_WORDS.has(w)) (WEAK_TANGLISH.has(w) ? (weak += 1) : (strong += 1));
  }
  return { strong, weak, total: ws.length };
};

export const looksTanglish = (message) => {
  const { strong, weak } = countTanglish(message);
  return strong >= 1 || weak >= 2;
};

// Common English function words - used to confirm that a Latin sentence really is English.
const ENGLISH_WORDS = new Set([
  "the", "is", "are", "was", "to", "and", "of", "for", "my", "me", "i", "you", "it", "this", "that", "what", "where", "when", "how", "much", "many", "does", "do", "can",
  "could", "would", "please", "want", "need", "buy", "show", "add", "remove", "cancel", "open", "go", "search", "find", "with", "from", "in", "on", "under", "below",
  "above", "cart", "order", "orders", "wishlist", "help", "price", "cost", "status", "track", "item", "items", "one", "all", "yes", "no", "not", "have", "has", "get",
  "give", "tell", "about", "a", "an", "some", "any", "than", "less", "more", "cheap", "best", "new", "now", "pay", "payment", "checkout",
]);

const englishScore = (message) => {
  const ws = words(message);
  if (!ws.length) return 0;
  return ws.filter((w) => ENGLISH_WORDS.has(w)).length / ws.length;
};

const count = (re, s) => (s.match(re) || []).length;

/**
 * @param {object} p
 * @param {string} p.message   what the shopper said / typed
 * @param {string} [p.uiLang]  site language: "en" | "ta" | "tl"
 * @param {string} [p.lang]    speech-recognition language ("en-IN", "ta-IN", "auto" ...)
 * @param {string} [p.lastStyle] style used for the previous reply (conversation continuity for ambiguous one-word input)
 * @returns {{ style: "ta"|"tl"|"en"|"other", lang: string, ambiguous: boolean, reason: string }}
 */
export const detectUtteranceLanguage = ({ message, uiLang, lang, lastStyle } = {}) => {
  const text = strip(message);
  const tamilChars = count(/[\u0b80-\u0bff]/g, text);
  const latinChars = count(/[A-Za-z]/g, text);

  // 1) Script decides first: Tamil letters anywhere => Tamil reply (mixed Tamil + English included).
  if (tamilChars > 0) {
    // Mostly Latin with one stray Tamil word? Still Tamil: the shopper is code-switching, answer in Tamil.
    return { style: "ta", lang: "ta-IN", ambiguous: false, reason: latinChars > tamilChars ? "tamil-mixed" : "tamil-script" };
  }
  const script = detectScriptLang(text);
  if (script && script !== "ta-IN") return { style: "other", lang: script, ambiguous: false, reason: "other-indic-script" };

  // 2) Latin letters: look at the words.
  if (looksTanglish(text)) return { style: "tl", lang: "en-IN", ambiguous: false, reason: "tanglish-words" };

  const ws = words(text);
  const eng = englishScore(text);

  // Hinglish / Tenglish ... : the shopper picked Hindi/Telugu/Malayalam/Kannada and typed it in English letters.
  const selectedOther = /^(hi|te|ml|kn)-/.test(lang || "");
  if (selectedOther && eng < 0.5) return { style: "other", lang, ambiguous: false, reason: "selected-other-indic" };

  const clearlyEnglish = eng >= 0.5 || ws.length >= 3;
  if (clearlyEnglish) return { style: "en", lang: "en-IN", ambiguous: false, reason: "english-words" };

  // 3) One or two Latin words ("laptop", "iphone 15"): the words alone can't tell. Use the conversation.
  const selectedTamil = uiLang === "ta" || lang === "ta-IN";
  const selectedTanglish = uiLang === "tl";
  let style = "en";
  let reason = "default-english";
  if (lastStyle === "ta" || lastStyle === "tl" || lastStyle === "en") {
    style = lastStyle;
    reason = "previous-turn";
  } else if (selectedTamil) {
    style = "ta";
    reason = "selected-tamil";
  } else if (selectedTanglish) {
    style = "tl";
    reason = "selected-tanglish";
  }
  return { style, lang: style === "ta" ? "ta-IN" : "en-IN", ambiguous: true, reason };
};
