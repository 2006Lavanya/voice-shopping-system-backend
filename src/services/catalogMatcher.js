/**
 * catalogMatcher.js
 * -----------------
 * Finds products in the REAL catalog that match what the shopper said, instead of
 * relying on a hard-coded list of nouns. It scores every product against the
 * content words of the request using:
 *   - exact / prefix / substring token matches (name, brand, category, tags)
 *   - small typo tolerance (edit distance)
 *   - sound-alike matching (phonetic skeleton) for Indic-script / Tanglish spellings
 * so "ஐபோன் 15", "iphone 15", "ayphone 15" and "i phone 15" all find the iPhone 15,
 * and "hp laptop" only returns HP laptops (every word has to line up, best match wins).
 */
import { phoneticKey, editDistance, transliterate, hasIndic } from "./phonetics.js";

const FIELD_WEIGHT = { brand: 3, name: 3, category: 2.5, tag: 2 };

export const SYNONYMS = {
  phone: ["mobile", "smartphone"],
  mobile: ["phone", "smartphone"],
  smartphone: ["mobile", "phone"],
  cellphone: ["mobile", "phone"],
  fridge: ["refrigerator"],
  refrigerator: ["fridge"],
  earphone: ["headphone", "earbud"],
  earbud: ["headphone", "earphone"],
  headset: ["headphone"],
  headphone: ["earphone", "headset"],
  tv: ["television"],
  television: ["tv"],
  pc: ["laptop"],
  notebook: ["laptop"],
  trouser: ["pant"],
  pant: ["trouser"],
  sneaker: ["shoe"],
  slipper: ["sandal"],
  tshirt: ["tee", "shirt"],
  tee: ["tshirt"],
  kurta: ["kurti"],
  smartwatch: ["watch"],
  powerbank: ["power", "bank"],
  charger: ["adapter", "charging"],
  perfume: ["fragrance", "deodorant"],
  bag: ["backpack", "handbag"],
  cooler: ["ac"],
  aircon: ["ac"],
  console: ["playstation", "xbox", "gaming"],
  ps5: ["playstation"],
  playstation: ["ps5"],
  book: ["novel"],
  ipad: ["tablet"],
  tab: ["tablet"],
};

export const singular = (t) => {
  if (t.length > 3 && t.endsWith("ies")) return `${t.slice(0, -3)}y`;
  if (t.length > 3 && /(ch|sh|s|x)es$/.test(t)) return t.slice(0, -2);
  if (t.length > 3 && t.endsWith("s") && !t.endsWith("ss")) return t.slice(0, -1);
  return t;
};

const tokenize = (s) =>
  String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .map(singular);

const mkTokens = (arr) => arr.map((t) => ({ t, key: /\d/.test(t) ? "" : phoneticKey(t) }));

export const effectivePrice = (p) => (p.discountPrice && p.discountPrice > 0 ? p.discountPrice : p.price);

/** Pre-computes searchable tokens for each product (cache the result between requests). */
export const buildIndex = (products) =>
  products.map((p) => ({
    p,
    brand: mkTokens(tokenize(p.brand)),
    name: mkTokens(tokenize(p.name)),
    category: mkTokens(tokenize(p.category)),
    tag: mkTokens([...new Set((p.tags || []).flatMap(tokenize))]),
    nameText: String(p.name || "").toLowerCase(),
  }));

// Common case-endings glued onto words in Indic languages ("ஐபோனை", "ஐபோனுக்கு", "आईफोन को" ...).
const INDIC_SUFFIXES = ["ுக்கு", "க்கு", "ிலிருந்து", "ிலும்", "ில்", "ைய", "ை", "ஐ", "ல்", "ல", "ோட", "ஓட", "யை", "ஆ", "ோடு",
  "ని", "ను", "కి", "లో", "ల్లో", "తో", "ಅನ್ನು", "ಗೆ", "ನಲ್ಲಿ", "ಯನ್ನು", "ಇಂದ", "ിനെ", "ിൽ", "ിലേക്ക്", "യെ", "ക്ക്", "ോട്", "ഉം", "ें", "ों"];

/** Turns a raw query word into comparable alternatives (handles Indic script + suffixes). */
export const prepareTerm = (raw) => {
  const word = String(raw).toLowerCase();
  if (hasIndic(word)) {
    const forms = new Set([word]);
    for (const suf of INDIC_SUFFIXES) {
      if (word.endsWith(suf) && [...word].length - [...suf].length >= 2) forms.add(word.slice(0, word.length - suf.length));
    }
    return [...forms].map((w) => {
      const latin = transliterate(w);
      return { text: latin, key: phoneticKey(latin), fromIndic: true };
    });
  }
  const clean = singular(word.replace(/[^a-z0-9]/g, ""));
  return [{ text: clean, key: /\d/.test(clean) ? "" : phoneticKey(clean), fromIndic: false }];
};

// How well does one query term match one catalog token? (0 = not at all, 1 = exact)
const tokenQuality = (term, tok) => {
  const { text: t, key: tk, fromIndic } = term;
  if (!t || !tok.t) return 0;
  if (t === tok.t) return 1;
  const isNumeric = /\d/.test(t) || /\d/.test(tok.t);
  if (isNumeric) return 0; // model numbers (14, s23, m2) must match exactly
  if (t.length >= 4 && tok.t.length >= 3 && (tok.t.startsWith(t) || (t.startsWith(tok.t) && tok.t.length >= 4))) return 0.9;
  if (t.length >= 4 && tok.t.includes(t)) return 0.8;
  if (t.length >= 5 && editDistance(t, tok.t, 2) <= (t.length >= 8 ? 2 : 1)) return 0.7;
  if (tk && tok.key) {
    if (tk.length >= 2 && tk === tok.key && (fromIndic || t.length >= 4) && tok.t.length >= 3) return fromIndic ? 0.65 : 0.55;
    if (tk.length >= 4 && tok.key.length >= 4 && editDistance(tk, tok.key, 1) <= 1) return fromIndic ? 0.55 : 0.45;
  }
  return 0;
};

const variantsOf = (alts) => {
  const list = [...alts];
  for (const alt of alts) {
    for (const syn of SYNONYMS[alt.text] || []) list.push({ text: syn, key: phoneticKey(syn), fromIndic: false, synonym: true });
  }
  return list;
};

const scoreTerm = (variants, entry) => {
  let best = 0;
  for (const v of variants) {
    for (const field of ["brand", "name", "category", "tag"]) {
      for (const tok of entry[field]) {
        const q = tokenQuality(v, tok);
        if (q > 0) best = Math.max(best, q * FIELD_WEIGHT[field] * (v.synonym ? 0.9 : 1));
      }
    }
  }
  return best;
};

/**
 * @param entries  result of buildIndex()
 * @param rawTerms content words from the request (Latin or Indic script)
 * @param opts     { maxPrice, minPrice, sort, limit }
 * @returns products sorted best-first. Empty array when nothing sensible matches.
 */
// Shared ranking used by findProducts() (unchanged output) and matchQuality() (new).
const rankEntries = (entries, rawTerms, opts = {}) => {
  const { maxPrice = null, minPrice = null, sort = null, minScoreRatio = null } = opts;
  const terms = rawTerms.map(prepareTerm).filter((alts) => alts[0].text);
  let pool = entries;
  if (maxPrice) pool = pool.filter((e) => effectivePrice(e.p) <= maxPrice);
  if (minPrice) pool = pool.filter((e) => effectivePrice(e.p) >= minPrice);

  let ranked;
  if (terms.length === 0) {
    ranked = pool.map((e) => ({ e, matched: 0, strong: 0, score: 0 }));
  } else {
    const variantList = terms.map(variantsOf);
    const scored = pool.map((e) => {
      let matched = 0;
      let strong = 0;
      let score = 0;
      variantList.forEach((variants) => {
        const s = scoreTerm(variants, e);
        if (s > 0) {
          matched += 1;
          score += s;
          if (s >= 1.6) strong += 1; // clear match on a meaningful field
        }
      });
      const joined = terms.map((alts) => alts[0].text).join(" ");
      if (joined && e.nameText.includes(joined)) score += 2;
      return { e, matched, strong, score };
    });
    const topMatched = Math.max(0, ...scored.map((s) => s.matched));
    if (topMatched === 0) return { ranked: [], termCount: terms.length };
    ranked = scored.filter((s) => s.matched === topMatched);
  }

  ranked.sort((a, b) => {
    if (sort === "price_low") return effectivePrice(a.e.p) - effectivePrice(b.e.p);
    if (sort === "price_high") return effectivePrice(b.e.p) - effectivePrice(a.e.p);
    if (b.strong !== a.strong) return b.strong - a.strong;
    if (Math.abs(b.score - a.score) > 0.01) return b.score - a.score;
    if (sort === "rating") return (b.e.p.rating || 0) - (a.e.p.rating || 0);
    return (b.e.p.rating || 0) * Math.log10(10 + (b.e.p.reviewCount || 0)) - (a.e.p.rating || 0) * Math.log10(10 + (a.e.p.reviewCount || 0));
  });

  // Optional (off by default): drop weak phonetic matches that score far below the best hit.
  if (minScoreRatio && terms.length) {
    const top = Math.max(0, ...ranked.map((r) => r.score));
    if (top > 0) ranked = ranked.filter((r) => r.score >= top * minScoreRatio);
  }
  return { ranked, termCount: terms.length };
};

/**
 * @param entries  result of buildIndex()
 * @param rawTerms content words from the request (Latin or Indic script)
 * @param opts     { maxPrice, minPrice, sort, limit }
 * @returns products sorted best-first. Empty array when nothing sensible matches.
 */
export const findProducts = (entries, rawTerms, opts = {}) => {
  const { limit = 8 } = opts;
  return rankEntries(entries, rawTerms, opts).ranked.slice(0, limit).map((r) => r.e.p);
};

/**
 * How trustworthy is a spoken product reference? Used by the voice assistant to decide whether it may
 * act straight away or must ask first.
 *   count      - how many products tie for the best match ("laptop" -> many, "iphone 15 pro" -> 1-2)
 *   strongAll  - every spoken word matched a brand/name/category clearly (not just a sounds-like guess)
 *   specific   - few candidates AND strong match  => safe to act on without asking
 */
export const matchQuality = (entries, rawTerms, opts = {}) => {
  const { ranked, termCount } = rankEntries(entries, rawTerms, opts);
  if (!ranked.length || !termCount) return { count: ranked.length, strongAll: false, specific: false, termCount, top: null };
  const top = ranked[0];
  const strongAll = top.strong >= termCount;
  const count = ranked.length;
  return { count, strongAll, specific: strongAll && count <= 3, termCount, top: top.e.p };
};

/**
 * Like findProducts, but forgives a stray number: "add 2 laptops" would otherwise treat the
 * "2" as part of a model name. If the best hit doesn't actually contain a numeric term,
 * we drop the number(s) and search again - returning the dropped value as a quantity hint.
 */
export const findProductsSmart = (entries, rawTerms, opts = {}) => {
  let products = findProducts(entries, rawTerms, opts);
  const numeric = rawTerms.filter((t) => /^\d+$/.test(t));
  let droppedQty = null;
  if (numeric.length) {
    const top = products[0];
    const topTokens = top ? new Set(tokenize(top.name)) : new Set();
    const missing = numeric.filter((n) => !topTokens.has(n));
    if (!top || missing.length) {
      const remaining = rawTerms.filter((t) => !missing.includes(t));
      if (remaining.length) {
        const retry = findProducts(entries, remaining, opts);
        if (retry.length) {
          products = retry;
          const q = parseInt(missing[0], 10);
          if (q >= 1 && q <= 10) droppedQty = q;
        }
      }
    }
  }
  return { products, droppedQty };
};
