/**
 * imageGen.js
 * -----------
 * Generates a UNIQUE, good-looking product illustration (SVG data-URI) for every product.
 * Deterministic: the same product name always gives the same image, and two different
 * names never produce the same image (palette + decorations are hashed from the name and
 * the name itself is printed on the artwork). Needs no internet, so cards are never blank.
 *
 * Usage: productImage({ name, brand, category, icon })
 */

const hash = (s) => [...String(s)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
const esc = (t) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Simple vector icons drawn on a 200x200 canvas. `c` = main colour, `d` = dark, `l` = light.
const ICONS = {
  phone: ({ c, d, l }) => `<rect x="62" y="20" width="76" height="160" rx="14" fill="${d}"/><rect x="68" y="30" width="64" height="136" rx="8" fill="${l}"/><circle cx="100" cy="174" r="3" fill="${c}"/><rect x="88" y="24" width="24" height="4" rx="2" fill="${c}"/>`,
  laptop: ({ c, d, l }) => `<rect x="38" y="46" width="124" height="86" rx="7" fill="${d}"/><rect x="45" y="53" width="110" height="72" rx="3" fill="${l}"/><path d="M20 140h160l-12 16H32z" fill="${c}"/>`,
  headphones: ({ c, d, l }) => `<path d="M50 120V100a50 50 0 0 1 100 0v20" fill="none" stroke="${d}" stroke-width="12" stroke-linecap="round"/><rect x="38" y="110" width="26" height="46" rx="12" fill="${c}"/><rect x="136" y="110" width="26" height="46" rx="12" fill="${c}"/><rect x="44" y="120" width="8" height="26" rx="4" fill="${l}"/><rect x="148" y="120" width="8" height="26" rx="4" fill="${l}"/>`,
  speaker: ({ c, d, l }) => `<rect x="55" y="30" width="90" height="140" rx="18" fill="${d}"/><circle cx="100" cy="68" r="14" fill="${l}"/><circle cx="100" cy="120" r="30" fill="${c}"/><circle cx="100" cy="120" r="12" fill="${l}"/>`,
  tv: ({ c, d, l }) => `<rect x="24" y="42" width="152" height="98" rx="8" fill="${d}"/><rect x="31" y="49" width="138" height="84" rx="3" fill="${l}"/><rect x="84" y="140" width="32" height="14" fill="${c}"/><rect x="62" y="154" width="76" height="8" rx="4" fill="${c}"/>`,
  camera: ({ c, d, l }) => `<rect x="28" y="62" width="144" height="94" rx="14" fill="${d}"/><rect x="62" y="48" width="42" height="18" rx="5" fill="${c}"/><circle cx="100" cy="109" r="34" fill="${l}"/><circle cx="100" cy="109" r="22" fill="${c}"/><circle cx="100" cy="109" r="9" fill="${d}"/>`,
  watch: ({ c, d, l }) => `<rect x="76" y="14" width="48" height="44" rx="8" fill="${c}"/><rect x="76" y="142" width="48" height="44" rx="8" fill="${c}"/><rect x="56" y="48" width="88" height="104" rx="22" fill="${d}"/><rect x="64" y="56" width="72" height="88" rx="15" fill="${l}"/><path d="M100 74v28l16 10" stroke="${d}" stroke-width="6" fill="none" stroke-linecap="round"/>`,
  shirt: ({ c, d, l }) => `<path d="M70 28l-48 24 16 34 22-10v90h80V76l22 10 16-34-48-24c-4 14-16 22-30 22S74 42 70 28z" fill="${c}"/><path d="M70 28c4 14 16 22 30 22s26-8 30-22" fill="none" stroke="${d}" stroke-width="5"/><rect x="82" y="100" width="36" height="8" rx="4" fill="${l}"/>`,
  shoe: ({ c, d, l }) => `<path d="M24 120c0-20 10-28 24-30l22-4 16 12 30 8c26 6 40 14 40 28v10H24z" fill="${c}"/><rect x="22" y="134" width="156" height="16" rx="8" fill="${d}"/><path d="M72 96l8 14M88 100l8 14" stroke="${l}" stroke-width="5" stroke-linecap="round"/>`,
  bag: ({ c, d, l }) => `<path d="M72 70V56a28 28 0 0 1 56 0v14" fill="none" stroke="${d}" stroke-width="9" stroke-linecap="round"/><rect x="40" y="70" width="120" height="100" rx="14" fill="${c}"/><rect x="40" y="104" width="120" height="10" fill="${d}" opacity=".35"/><rect x="88" y="98" width="24" height="22" rx="5" fill="${l}"/>`,
  bottle: ({ c, d, l }) => `<rect x="84" y="14" width="32" height="22" rx="5" fill="${d}"/><path d="M80 36h40l10 24v100a18 18 0 0 1-18 18H88a18 18 0 0 1-18-18V60z" fill="${c}"/><rect x="78" y="80" width="44" height="56" rx="6" fill="${l}"/>`,
  jar: ({ c, d, l }) => `<rect x="58" y="28" width="84" height="24" rx="7" fill="${d}"/><rect x="50" y="52" width="100" height="120" rx="16" fill="${c}"/><rect x="62" y="82" width="76" height="60" rx="8" fill="${l}"/>`,
  grocery: ({ c, d, l }) => `<path d="M46 62h108l-10 108H56z" fill="${c}"/><path d="M76 62c0-18 10-30 24-30s24 12 24 30" fill="none" stroke="${d}" stroke-width="8" stroke-linecap="round"/><circle cx="100" cy="112" r="24" fill="${l}"/><path d="M100 96v32M84 112h32" stroke="${d}" stroke-width="6" stroke-linecap="round"/>`,
  pot: ({ c, d, l }) => `<rect x="40" y="62" width="120" height="84" rx="14" fill="${c}"/><rect x="30" y="68" width="14" height="16" rx="5" fill="${d}"/><rect x="156" y="68" width="14" height="16" rx="5" fill="${d}"/><rect x="48" y="50" width="104" height="14" rx="7" fill="${d}"/><circle cx="100" cy="44" r="8" fill="${l}"/><rect x="56" y="150" width="88" height="10" rx="5" fill="${d}" opacity=".5"/>`,
  appliance: ({ c, d, l }) => `<rect x="48" y="24" width="104" height="152" rx="14" fill="${c}"/><rect x="48" y="86" width="104" height="6" fill="${d}"/><rect x="60" y="44" width="8" height="30" rx="4" fill="${l}"/><rect x="60" y="106" width="8" height="40" rx="4" fill="${l}"/>`,
  lipstick: ({ c, d, l }) => `<rect x="76" y="92" width="48" height="84" rx="8" fill="${d}"/><rect x="82" y="64" width="36" height="32" fill="${l}"/><path d="M84 64V40l22-18 12 14v28z" fill="${c}"/>`,
  tube: ({ c, d, l }) => `<path d="M64 28h72l-8 128H72z" fill="${c}"/><rect x="72" y="156" width="56" height="18" rx="4" fill="${d}"/><rect x="76" y="62" width="48" height="50" rx="6" fill="${l}"/>`,
  ball: ({ c, d, l }) => `<circle cx="100" cy="100" r="68" fill="${c}"/><path d="M100 32v136M32 100h136" stroke="${d}" stroke-width="5" fill="none"/><path d="M52 52c28 22 28 74 0 96M148 52c-28 22-28 74 0 96" stroke="${l}" stroke-width="5" fill="none"/>`,
  racquet: ({ c, d, l }) => `<ellipse cx="100" cy="72" rx="42" ry="54" fill="none" stroke="${c}" stroke-width="10"/><path d="M62 54h76M58 72h84M62 90h76M84 22v100M100 18v108M116 22v100" stroke="${l}" stroke-width="2.5"/><rect x="92" y="124" width="16" height="58" rx="7" fill="${d}"/>`,
  dumbbell: ({ c, d, l }) => `<rect x="24" y="76" width="22" height="48" rx="6" fill="${d}"/><rect x="46" y="64" width="18" height="72" rx="6" fill="${c}"/><rect x="64" y="94" width="72" height="12" fill="${l}"/><rect x="136" y="64" width="18" height="72" rx="6" fill="${c}"/><rect x="154" y="76" width="22" height="48" rx="6" fill="${d}"/>`,
  book: ({ c, d, l }) => `<path d="M34 34h62v136H34z" fill="${c}"/><path d="M104 34h62v136h-62z" fill="${d}"/><path d="M96 34c-6 0-12 2-14 6v136c2-4 8-6 14-6zM104 34c6 0 12 2 14 6v136c-2-4-8-6-14-6z" fill="${l}" opacity=".7"/><rect x="46" y="62" width="38" height="6" rx="3" fill="${l}"/><rect x="46" y="78" width="30" height="6" rx="3" fill="${l}"/>`,
  toy: ({ c, d, l }) => `<rect x="38" y="104" width="52" height="52" rx="6" fill="${c}"/><rect x="92" y="104" width="52" height="52" rx="6" fill="${d}"/><rect x="65" y="52" width="52" height="52" rx="6" fill="${l}"/><circle cx="78" cy="130" r="5" fill="${l}"/><circle cx="118" cy="130" r="5" fill="${c}"/><circle cx="91" cy="78" r="5" fill="${d}"/>`,
  teddy: ({ c, d, l }) => `<circle cx="64" cy="52" r="18" fill="${d}"/><circle cx="136" cy="52" r="18" fill="${d}"/><circle cx="100" cy="82" r="42" fill="${c}"/><ellipse cx="100" cy="138" rx="42" ry="40" fill="${c}"/><ellipse cx="100" cy="94" rx="16" ry="12" fill="${l}"/><circle cx="84" cy="74" r="5" fill="${d}"/><circle cx="116" cy="74" r="5" fill="${d}"/><circle cx="100" cy="90" r="5" fill="${d}"/>`,
  car: ({ c, d, l }) => `<path d="M26 114l14-30c3-6 8-10 16-10h60c8 0 14 4 18 10l18 22c10 2 18 6 18 18v10H26z" fill="${c}"/><path d="M58 82h34v22H48zM98 82h20l14 22H98z" fill="${l}"/><circle cx="62" cy="138" r="16" fill="${d}"/><circle cx="142" cy="138" r="16" fill="${d}"/><circle cx="62" cy="138" r="6" fill="${l}"/><circle cx="142" cy="138" r="6" fill="${l}"/>`,
  cable: ({ c, d, l }) => `<rect x="30" y="38" width="30" height="40" rx="6" fill="${d}"/><rect x="38" y="30" width="14" height="12" fill="${l}"/><path d="M45 78c0 60 110 10 110 70" fill="none" stroke="${c}" stroke-width="9" stroke-linecap="round"/><rect x="140" y="140" width="30" height="34" rx="6" fill="${d}"/><rect x="148" y="132" width="14" height="12" fill="${l}"/>`,
  charger: ({ c, d, l }) => `<rect x="58" y="44" width="84" height="100" rx="14" fill="${c}"/><rect x="78" y="22" width="10" height="26" rx="3" fill="${d}"/><rect x="112" y="22" width="10" height="26" rx="3" fill="${d}"/><path d="M106 70l-18 32h14l-6 28 24-38h-15z" fill="${l}"/>`,
  case: ({ c, d, l }) => `<rect x="60" y="18" width="80" height="164" rx="16" fill="${c}"/><rect x="68" y="26" width="64" height="148" rx="10" fill="${l}" opacity=".35"/><rect x="72" y="32" width="34" height="34" rx="9" fill="${d}"/><circle cx="82" cy="42" r="6" fill="${l}"/><circle cx="96" cy="42" r="6" fill="${l}"/><circle cx="89" cy="56" r="6" fill="${l}"/>`,
  mouse: ({ c, d, l }) => `<path d="M100 22c-30 0-46 20-46 50v50c0 30 16 54 46 54s46-24 46-54V72c0-30-16-50-46-50z" fill="${c}"/><path d="M54 84h92M100 22v62" stroke="${d}" stroke-width="5" fill="none"/><rect x="94" y="46" width="12" height="24" rx="6" fill="${l}"/>`,
  keyboard: ({ c, d, l }) => `<rect x="14" y="62" width="172" height="80" rx="10" fill="${d}"/>${[0, 1, 2].map((r) => Array.from({ length: 10 }, (_, k) => `<rect x="${24 + k * 16}" y="${72 + r * 20}" width="12" height="14" rx="3" fill="${r === 1 ? c : l}"/>`).join("")).join("")}<rect x="56" y="124" width="88" height="10" rx="4" fill="${c}"/>`,
  drive: ({ c, d, l }) => `<rect x="40" y="50" width="120" height="100" rx="12" fill="${c}"/><circle cx="100" cy="100" r="30" fill="${d}"/><circle cx="100" cy="100" r="10" fill="${l}"/><circle cx="144" cy="64" r="4" fill="${l}"/>`,
  router: ({ c, d, l }) => `<rect x="30" y="100" width="140" height="44" rx="10" fill="${c}"/><path d="M52 100L38 40M148 100l14-60M100 100V32" stroke="${d}" stroke-width="7" stroke-linecap="round"/><circle cx="56" cy="122" r="5" fill="${l}"/><circle cx="74" cy="122" r="5" fill="${l}"/><circle cx="92" cy="122" r="5" fill="${l}"/>`,
  monitor: ({ c, d, l }) => `<rect x="22" y="30" width="156" height="100" rx="8" fill="${d}"/><rect x="29" y="37" width="142" height="86" rx="3" fill="${l}"/><rect x="90" y="130" width="20" height="24" fill="${c}"/><rect x="64" y="154" width="72" height="9" rx="4" fill="${c}"/>`,
  brush: ({ c, d, l }) => `<rect x="90" y="70" width="20" height="108" rx="10" fill="${c}"/><rect x="76" y="22" width="48" height="52" rx="10" fill="${d}"/>${[84, 94, 104, 114].map((x) => `<rect x="${x}" y="12" width="5" height="14" rx="2" fill="${l}"/>`).join("")}`,
  box: ({ c, d, l }) => `<path d="M100 28l66 28v78l-66 30-66-30V56z" fill="${c}"/><path d="M100 28l66 28-66 28-66-28z" fill="${l}"/><path d="M100 84v80" stroke="${d}" stroke-width="5"/>`,
};

// category -> default icon
const CATEGORY_ICON = {
  Electronics: "speaker", Fashion: "shirt", Grocery: "grocery", "Home & Kitchen": "pot", "Beauty & Personal Care": "tube",
  Sports: "ball", Books: "book", Toys: "toy", "Mobile Accessories": "charger", Computers: "laptop",
  Mobiles: "phone", Laptops: "laptop", Beauty: "tube", "Home Appliances": "appliance", Accessories: "bag", Shoes: "shoe", Watches: "watch",
  Tablets: "phone", Gaming: "keyboard", Kitchen: "pot", "Sports & Fitness": "ball",
};

const HUE_BY_CATEGORY = {
  Electronics: 205, Fashion: 335, Grocery: 100, "Home & Kitchen": 28, "Beauty & Personal Care": 315, Sports: 150,
  Books: 18, Toys: 265, "Mobile Accessories": 185, Computers: 225,
};

const wrap = (text, max = 22, maxLines = 3) => {
  const lines = [];
  let cur = "";
  for (const w of String(text).split(/\s+/)) {
    if ((`${cur} ${w}`).trim().length > max) {
      if (cur) lines.push(cur);
      cur = w;
    } else cur = `${cur} ${w}`.trim();
  }
  if (cur) lines.push(cur);
  if (lines.length > maxLines) {
    lines.length = maxLines;
    lines[maxLines - 1] = `${lines[maxLines - 1].slice(0, max - 1)}…`;
  }
  return lines;
};

export const productImage = ({ name, brand = "", category = "", icon }) => {
  const h = hash(`${brand}|${name}`);
  const base = HUE_BY_CATEGORY[category] ?? h % 360;
  const hue = (base + ((h >>> 4) % 50) - 25 + 360) % 360;
  const hue2 = (hue + 35 + ((h >>> 9) % 40)) % 360;
  const pal = {
    c: `hsl(${hue},62%,52%)`,
    d: `hsl(${hue},55%,26%)`,
    l: `hsl(${hue},80%,92%)`,
  };
  const iconFn = ICONS[icon] || ICONS[CATEGORY_ICON[category]] || ICONS.box;
  const nameLines = wrap(name);
  const tspans = nameLines.map((l, i) => `<tspan x="300" dy="${i === 0 ? 0 : 34}">${esc(l)}</tspan>`).join("");
  // Hash-driven decorative circles make every image visually distinct.
  const deco = [0, 1, 2, 3]
    .map((i) => {
      const x = 40 + ((h >>> (i * 3)) % 520);
      const y = 30 + ((h >>> (i * 2 + 1)) % 330);
      const r = 30 + ((h >>> (i + 2)) % 70);
      return `<circle cx="${x}" cy="${y}" r="${r}" fill="hsl(${hue2},70%,${86 + (i % 3) * 3}%)" opacity=".55"/>`;
    })
    .join("");
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="600" height="600">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${hue},75%,96%)"/><stop offset="1" stop-color="hsl(${hue2},70%,86%)"/></linearGradient>` +
    `<filter id="s" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="8" stdDeviation="8" flood-opacity=".22"/></filter></defs>` +
    `<rect width="600" height="600" fill="url(#g)"/>${deco}` +
    `<g transform="translate(150 60) scale(1.5)" filter="url(#s)">${iconFn(pal)}</g>` +
    `<text x="300" y="418" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="22" font-weight="700" letter-spacing="3" fill="hsl(${hue},45%,35%)">${esc(String(brand).toUpperCase().slice(0, 22))}</text>` +
    `<text x="300" y="462" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="30" font-weight="600" fill="hsl(${hue},55%,16%)">${tspans}</text>` +
    `<text x="300" y="568" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="18" fill="hsl(${hue},35%,38%)">${esc(category)}</text>` +
    `</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

export const ICON_NAMES = Object.keys(ICONS);

// ---------------------------------------------------------------------------------------------
// REAL product photos
// ---------------------------------------------------------------------------------------------
// Each product's photo is looked up by its own name (brand + model), so "Tata Tea Gold 500g" shows a real
// photo of that pack and "Logitech MX Master 3S" shows that mouse. Different names -> different photos.
// The browser loads the photo directly (the shopper needs internet, same as the original Unsplash photos).
// If a photo ever fails to load, the app's existing onImgError fallback shows a neutral tile.
const PHOTO_HOSTS = ["tse1", "tse2", "tse3", "tse4"]; // spreading across hosts lets browsers load more photos in parallel

const photoUrl = (query) => {
  const host = PHOTO_HOSTS[hash(query) % PHOTO_HOSTS.length];
  return `https://${host}.mm.bing.net/th?q=${encodeURIComponent(query)}&w=600&h=600&c=7&rs=1&p=0`;
};

export const realPhotoUrl = ({ name, brand = "" }) => {
  const q = brand && !String(name).toLowerCase().includes(String(brand).toLowerCase()) ? `${brand} ${name}` : name;
  return photoUrl(`${q} product`);
};

const CATEGORY_QUERY = {
  Grocery: "indian grocery items rice dal oil",
  Toys: "kids toys collection",
  "Mobile Accessories": "mobile phone accessories chargers cases",
  Computers: "computer accessories keyboard mouse",
  "Home & Kitchen": "home kitchen appliances cookware",
  "Beauty & Personal Care": "beauty personal care products",
  Sports: "sports equipment cricket badminton football",
  Tablets: "tablet computer ipad",
  Gaming: "gaming console controller",
  Kitchen: "kitchen appliances",
  "Sports & Fitness": "fitness gym equipment",
};
export const categoryPhotoUrl = (name) => photoUrl(CATEGORY_QUERY[name] || `${name} products`);

const isRealPhoto = (u) => /^https?:\/\//i.test(u || "");

/**
 * Makes sure every product shows a REAL photo of its own.
 *  - the original catalogue's real (Unsplash) photos are kept for the first product that uses them
 *  - everything else (the old drawn tiles, repeated photos, new products) gets a real photo found by product name
 * Env switches (backend/.env):
 *   IMAGE_SOURCE=generated   -> use the offline drawn illustrations instead (no internet needed)
 *   UNIQUE_IMAGES=false      -> leave the original catalogue images exactly as they were
 */
export const ensureUniqueImages = (list) => {
  if (String(process.env.UNIQUE_IMAGES).toLowerCase() === "false") return list;
  const generated = String(process.env.IMAGE_SOURCE).toLowerCase() === "generated";
  const seen = new Set();
  return list.map((p) => {
    const first = p.images?.[0];
    if (isRealPhoto(first) && !seen.has(first)) {
      seen.add(first);
      return p;
    }
    const url = generated ? productImage({ name: p.name, brand: p.brand, category: p.category }) : realPhotoUrl(p);
    seen.add(url);
    return { ...p, images: [url, ...(p.images || []).slice(1).filter(isRealPhoto)] };
  });
};
