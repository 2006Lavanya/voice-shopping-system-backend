/**
 * recommender.js
 * --------------
 * Pure, dependency-free recommendation helpers (work on plain product objects, so they are
 * unit-testable without a database). Used by the REST API and by the voice assistant.
 *
 *   trending()                 - what is hot right now (best sellers + rating x popularity)
 *   similar()                  - products like this one (category, tags, brand, price band)
 *   frequentlyBoughtTogether() - complementary products (co-purchase data first, then rules)
 *   personalized()             - picks based on viewed / wishlist / ordered products
 */

const price = (p) => (p.discountPrice && p.discountPrice > 0 ? p.discountPrice : p.price) || 0;
const id = (p) => String(p._id);
const popularity = (p) => (p.rating || 0) * Math.log10(10 + (p.reviewCount || 0));
const inStock = (p) => (p.stock ?? 1) > 0;

export const trending = (products, { category = null, limit = 8, exclude = [] } = {}) => {
  const skip = new Set(exclude.map(String));
  return products
    .filter((p) => inStock(p) && !skip.has(id(p)) && (!category || String(p.category).toLowerCase() === String(category).toLowerCase()))
    .map((p) => ({ p, s: popularity(p) + (p.bestSeller ? 2 : 0) + (p.featured ? 1 : 0) }))
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map((x) => x.p);
};

const GENERIC_TAGS = new Set(["budget", "best", "new", "pro"]);

export const similar = (product, products, { limit = 8 } = {}) => {
  if (!product) return [];
  const tags = new Set((product.tags || []).map((t) => String(t).toLowerCase()).filter((t) => !GENERIC_TAGS.has(t)));
  const base = price(product) || 1;
  return products
    .filter((p) => id(p) !== id(product) && inStock(p))
    .map((p) => {
      let s = 0;
      if (p.category === product.category) s += 3;
      if (p.brand && p.brand === product.brand) s += 1;
      for (const t of p.tags || []) if (tags.has(String(t).toLowerCase())) s += 1.2;
      const ratio = price(p) / base;
      if (ratio > 0.6 && ratio < 1.6) s += 1;
      s += popularity(p) / 20;
      return { p, s };
    })
    .filter((x) => x.s >= 4)
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map((x) => x.p);
};

// "People who buy X usually also buy ..." - category/tag rules used when there is no order history yet.
const COMPLEMENTS = [
  { when: { cat: ["Mobiles"], tag: ["smartphone", "iphone"] }, take: [{ cat: "Mobile Accessories", tags: ["case", "charger", "screen guard", "cable"] }, { cat: "Electronics", tags: ["earbuds"] }] },
  { when: { cat: ["Laptops", "Computers"] }, take: [{ cat: "Computers", tags: ["mouse", "keyboard", "laptop bag", "backpack", "pen drive", "ssd"] }, { cat: "Accessories", tags: ["backpack"] }] },
  { when: { cat: ["Tablets"] }, take: [{ cat: "Mobile Accessories", tags: ["case", "charger", "cable"] }, { cat: "Electronics", tags: ["earbuds", "headphones"] }] },
  { when: { cat: ["Gaming"] }, take: [{ cat: "Computers", tags: ["mouse", "keyboard", "monitor"] }, { cat: "Electronics", tags: ["headphones"] }] },
  { when: { cat: ["Electronics"], tag: ["tv"] }, take: [{ cat: "Electronics", tags: ["soundbar", "tv stick", "fire tv"] }] },
  { when: { cat: ["Electronics"], tag: ["earbuds", "headphones"] }, take: [{ cat: "Mobile Accessories", tags: ["charger", "cable", "case"] }] },
  { when: { cat: ["Grocery"] }, take: [{ cat: "Grocery", tags: [] }, { cat: "Home & Kitchen", tags: ["cookware", "container"] }] },
  { when: { cat: ["Home & Kitchen", "Kitchen", "Home Appliances"] }, take: [{ cat: "Home & Kitchen", tags: [] }, { cat: "Grocery", tags: [] }] },
  { when: { cat: ["Sports", "Sports & Fitness"] }, take: [{ cat: "Sports", tags: [] }, { cat: "Sports & Fitness", tags: [] }] },
  { when: { cat: ["Fashion", "Shoes", "Watches", "Accessories"] }, take: [{ cat: "Fashion", tags: [] }, { cat: "Accessories", tags: [] }, { cat: "Shoes", tags: [] }, { cat: "Watches", tags: [] }] },
  { when: { cat: ["Beauty", "Beauty & Personal Care"] }, take: [{ cat: "Beauty & Personal Care", tags: [] }, { cat: "Beauty", tags: [] }] },
  { when: { cat: ["Toys"] }, take: [{ cat: "Toys", tags: [] }, { cat: "Books", tags: [] }] },
  { when: { cat: ["Books"] }, take: [{ cat: "Books", tags: [] }] },
];

export const frequentlyBoughtTogether = (product, products, { coPurchase = null, limit = 4 } = {}) => {
  if (!product) return [];
  const byId = new Map(products.map((p) => [id(p), p]));
  const picked = [];
  const seen = new Set([id(product)]);
  const push = (p) => {
    if (p && !seen.has(id(p)) && inStock(p)) {
      seen.add(id(p));
      picked.push(p);
    }
  };

  // 1) real co-purchase counts (Map<productId, count>) from past orders
  if (coPurchase) [...coPurchase.entries()].sort((a, b) => b[1] - a[1]).forEach(([pid]) => push(byId.get(String(pid))));

  // 2) complementary rules
  const ptags = new Set((product.tags || []).map((t) => String(t).toLowerCase()));
  const rules = COMPLEMENTS.filter((r) => r.when.cat.includes(product.category) && (!r.when.tag || r.when.tag.some((t) => ptags.has(t)) || r.when.cat.length > 0));
  // tag-specific rules first
  rules.sort((a, b) => Number(Boolean(b.when.tag && b.when.tag.some((t) => ptags.has(t)))) - Number(Boolean(a.when.tag && a.when.tag.some((t) => ptags.has(t)))));
  for (const rule of rules) {
    for (const want of rule.take) {
      const pool = products
        .filter((p) => p.category === want.cat && id(p) !== id(product))
        .map((p) => {
          const tagHit = want.tags.length ? (p.tags || []).some((t) => want.tags.includes(String(t).toLowerCase())) : false;
          return { p, s: (tagHit ? 5 : 0) + popularity(p) / 5 };
        })
        .filter((x) => !want.tags.length || x.s >= 5)
        .sort((a, b) => b.s - a.s);
      pool.slice(0, 2).forEach((x) => push(x.p));
    }
  }

  // 3) fallback: similar items
  if (picked.length < limit) similar(product, products, { limit }).forEach(push);
  return picked.slice(0, limit);
};

export const personalized = (products, { viewedIds = [], wishlistIds = [], orderedIds = [], limit = 10 } = {}) => {
  const byId = new Map(products.map((p) => [id(p), p]));
  const signal = [...viewedIds, ...wishlistIds, ...orderedIds].map(String);
  const exclude = new Set(signal);
  const seeds = signal.map((x) => byId.get(x)).filter(Boolean);
  if (!seeds.length) return trending(products, { limit });
  const catWeight = new Map();
  const tagWeight = new Map();
  seeds.forEach((p, i) => {
    const w = 1 / (1 + i * 0.15); // newest signal first
    catWeight.set(p.category, (catWeight.get(p.category) || 0) + w);
    (p.tags || []).forEach((t) => tagWeight.set(t, (tagWeight.get(t) || 0) + w * 0.4));
  });
  const ranked = products
    .filter((p) => !exclude.has(id(p)) && inStock(p))
    .map((p) => ({ p, s: (catWeight.get(p.category) || 0) * 3 + (p.tags || []).reduce((a, t) => a + (tagWeight.get(t) || 0), 0) + popularity(p) / 6 }))
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map((x) => x.p);
  return ranked.length >= limit ? ranked : [...ranked, ...trending(products, { limit: limit - ranked.length, exclude: [...exclude, ...ranked.map(id)] })];
};
