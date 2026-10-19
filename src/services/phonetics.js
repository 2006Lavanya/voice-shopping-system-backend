/**
 * phonetics.js
 * ------------
 * Tiny helpers that let us match words spoken/typed in ANY Indian script (Tamil,
 * Hindi, Telugu, Kannada, Malayalam) or in loose "Tanglish" spelling against the
 * English product catalog - e.g. "ஐபோன்" -> iPhone, "லேப்டாப்" -> laptop,
 * "सैमसंग" -> Samsung, "samsang" -> Samsung.
 *
 * How: all Brahmic scripts in Unicode share the same internal layout (same offset
 * from the start of their block), so ONE table transliterates all five scripts to
 * Latin. We then reduce a word to a rough consonant "skeleton" (phonetic key) so that
 * spelling differences in vowels / voiced-unvoiced pairs (k/g, t/d, p/b ...) don't matter.
 */

const BLOCKS = [
  { name: "hi", base: 0x0900 }, // Devanagari
  { name: "ta", base: 0x0b80 }, // Tamil
  { name: "te", base: 0x0c00 }, // Telugu
  { name: "kn", base: 0x0c80 }, // Kannada
  { name: "ml", base: 0x0d00 }, // Malayalam
];

const VOWELS = {
  0x05: "a", 0x06: "aa", 0x07: "i", 0x08: "ii", 0x09: "u", 0x0a: "uu", 0x0b: "ri", 0x0c: "li",
  0x0d: "e", 0x0e: "e", 0x0f: "ee", 0x10: "ai", 0x11: "o", 0x12: "o", 0x13: "oo", 0x14: "au",
};

const CONSONANTS = {
  0x15: "k", 0x16: "kh", 0x17: "g", 0x18: "gh", 0x19: "n", 0x1a: "ch", 0x1b: "chh", 0x1c: "j", 0x1d: "jh",
  0x1e: "n", 0x1f: "t", 0x20: "th", 0x21: "d", 0x22: "dh", 0x23: "n", 0x24: "t", 0x25: "th", 0x26: "d",
  0x27: "dh", 0x28: "n", 0x29: "n", 0x2a: "p", 0x2b: "f", 0x2c: "b", 0x2d: "bh", 0x2e: "m", 0x2f: "y",
  0x30: "r", 0x31: "r", 0x32: "l", 0x33: "l", 0x34: "l", 0x35: "v", 0x36: "sh", 0x37: "sh", 0x38: "s",
  0x39: "h", 0x58: "q", 0x59: "kh", 0x5a: "g", 0x5b: "z", 0x5c: "d", 0x5d: "dh", 0x5e: "f", 0x5f: "y",
};

const SIGNS = {
  0x3e: "aa", 0x3f: "i", 0x40: "ii", 0x41: "u", 0x42: "uu", 0x43: "ri", 0x44: "ri", 0x45: "e", 0x46: "e",
  0x47: "ee", 0x48: "ai", 0x49: "o", 0x4a: "o", 0x4b: "oo", 0x4c: "au",
};

const MALAYALAM_CHILLU = { 0x7a: "n", 0x7b: "n", 0x7c: "r", 0x7d: "l", 0x7e: "l", 0x7f: "k" };

const blockOf = (code) => BLOCKS.find((b) => code >= b.base && code < b.base + 0x80);

/** True if the word contains any supported Indic-script character. */
export const hasIndic = (word) => [...word].some((ch) => blockOf(ch.codePointAt(0)));

/** Which language code the message is written in, judged by script (or null for Latin). */
export const detectScriptLang = (text) => {
  const counts = {};
  for (const ch of text) {
    const b = blockOf(ch.codePointAt(0));
    if (b) counts[b.name] = (counts[b.name] || 0) + 1;
  }
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  if (!top) return null;
  return { hi: "hi-IN", ta: "ta-IN", te: "te-IN", kn: "kn-IN", ml: "ml-IN" }[top[0]];
};

/** Rough Latin transliteration of an Indic-script word. Non-Indic characters pass through. */
export const transliterate = (word) => {
  const chars = [...word];
  let out = "";
  for (let i = 0; i < chars.length; i += 1) {
    const code = chars[i].codePointAt(0);
    const block = blockOf(code);
    if (!block) {
      out += chars[i];
      continue;
    }
    const off = code - block.base;
    if (block.name === "ml" && MALAYALAM_CHILLU[off]) {
      out += MALAYALAM_CHILLU[off];
    } else if (VOWELS[off] && off >= 0x05) {
      out += VOWELS[off];
    } else if (CONSONANTS[off]) {
      out += CONSONANTS[off];
      const next = chars[i + 1] ? chars[i + 1].codePointAt(0) - block.base : -1;
      const nextBlock = chars[i + 1] ? blockOf(chars[i + 1].codePointAt(0)) : null;
      if (nextBlock && (SIGNS[next] || next === 0x4d)) {
        if (SIGNS[next]) out += SIGNS[next];
        i += 1; // consume the vowel sign / virama
      } else {
        out += "a"; // inherent vowel
      }
    } else if (off === 0x01 || off === 0x02) {
      out += "n"; // chandrabindu / anusvara
    } else if (off === 0x03) {
      out += "h";
    }
    // anything else (nukta, accents, danda, length marks) is ignored
  }
  return out;
};

/** Consonant "skeleton" used for sound-alike matching. */
export const phoneticKey = (input) => {
  let s = input.toLowerCase().replace(/[^a-z]/g, "");
  s = s
    .replace(/tch/g, "ch")
    .replace(/ck/g, "k")
    .replace(/ng/g, "n")
    .replace(/ph/g, "f")
    .replace(/sh/g, "s")
    .replace(/ch/g, "s")
    .replace(/kh|gh/g, "k")
    .replace(/th|dh/g, "t")
    .replace(/bh/g, "b")
    .replace(/zh/g, "z")
    .replace(/x/g, "ks")
    .replace(/c(?=[eiy])/g, "s")
    .replace(/c/g, "k");
  const map = { k: "K", g: "K", q: "K", t: "T", d: "T", p: "P", b: "P", f: "P", v: "V", w: "V", m: "M", n: "N", l: "L", r: "R", y: "Y", s: "S", z: "S", j: "S" };
  let key = "";
  let first = true;
  for (const ch of s) {
    // "y" after the first letter behaves like a vowel (sony ~ soni, ay ~ ai) so it is skipped.
    const k = ch === "y" && !first ? null : map[ch];
    if (k && key[key.length - 1] !== k) key += k;
    first = false;
  }
  return key;
};

/** Levenshtein edit distance with an early-exit cap. */
export const editDistance = (a, b, cap = 3) => {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > cap) return cap + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      if (cur[j] < rowMin) rowMin = cur[j];
    }
    if (rowMin > cap) return cap + 1;
    prev = cur;
  }
  return prev[b.length];
};
