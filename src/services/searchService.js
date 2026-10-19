/**
 * searchService.js
 * ----------------
 * Fuzzy, multi-language product search used by the REST API (text search bar, suggestions).
 * It reuses the assistant's NLU tokenizer + catalogMatcher, so these all find the same product:
 *   "iphone", "ஐபோன்", "ayphone", "laptops under 50000", "arisi" (rice), "paal" (milk), "gorcery"
 */
import { understandMessage } from "./assistantEngine.js";
import { buildIndex, findProductsSmart, singular } from "./catalogMatcher.js";

const tokens = (s) =>
  String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map(singular);

const exactHit = (p, terms) => {
  const bag = new Set([...tokens(p.name), ...tokens(p.brand), ...tokens(p.category), ...(p.tags || []).flatMap(tokens)]);
  return terms.some((t) => bag.has(singular(String(t).toLowerCase())));
};

const lev = (a, b) => {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++) dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return dp[a.length][b.length];
};

// For Latin-script queries a result must contain a word that is spelled (almost) like a query word,
// so gibberish such as "zzzzqq" does not match random products through phonetic coincidence.
const closeHit = (p, terms) => {
  const bag = [...new Set([...tokens(p.name), ...tokens(p.brand), ...tokens(p.category), ...(p.tags || []).flatMap(tokens)])];
  return terms.some((raw) => {
    const t = singular(String(raw).toLowerCase());
    if (t.length < 3) return bag.some((w) => w === t);
    const allowed = Math.max(1, Math.floor(t.length * 0.34));
    return bag.some((w) => w === t || (t.length >= 4 && (w.startsWith(t) || t.startsWith(w) && w.length >= 4)) || lev(w, t) <= allowed);
  });
};

export const smartSearch = (entries, query, { limit = 50, maxPrice = null, minPrice = null, sort = null } = {}) => {
  const u = understandMessage(String(query || ""), "en-IN");
  const terms = u.terms.filter(Boolean);
  if (!terms.length && !u.maxPrice && !u.minPrice) return { products: [], terms };
  const opts = { maxPrice: maxPrice || u.maxPrice, minPrice: minPrice || u.minPrice, sort: sort || u.sort, limit: 400 };

  const loose = findProductsSmart(entries, terms, opts).products;
  // Strict pass removes weak sound-alike matches ("paal" -> iPhone); exact word hits are always kept.
  const strictIds = new Set(findProductsSmart(entries, terms, { ...opts, minScoreRatio: 0.85 }).products.map((p) => String(p._id)));
  const latin = /^[\x00-\x7f]*$/.test(String(query)); // Tamil-script queries are matched by sound, so skip the spelling guard
  const products = loose
    .filter((p) => strictIds.has(String(p._id)) || exactHit(p, terms))
    .filter((p) => !latin || closeHit(p, terms.filter((t) => !/^\d+$/.test(t))) || terms.every((t) => /^\d+$/.test(t)))
    .slice(0, limit);
  return { products, terms };
};

export { buildIndex };
