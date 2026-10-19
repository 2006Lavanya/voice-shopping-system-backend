/**
 * assistantStt.js
 * ---------------
 * OPTIONAL server-side speech-to-text with real language auto-detection (Tamil / English / Tanglish).
 *
 * Why: the browser's Web Speech API can only listen in ONE fixed language at a time, so it can't detect
 * "is this Tamil or English?" by itself. A Whisper-style service detects the spoken language per utterance.
 *
 * Works with any OpenAI-compatible /audio/transcriptions endpoint (OpenAI, Groq, a self-hosted faster-whisper
 * server ...). The API key lives ONLY in backend environment variables - the browser never sees it.
 *
 *   STT_API_KEY   required to enable the feature (leave blank to keep using the browser's recogniser)
 *   STT_API_URL   default https://api.openai.com/v1/audio/transcriptions
 *   STT_MODEL     default whisper-1
 *
 *   GET  /api/assistant/capabilities   -> { serverStt: boolean }
 *   POST /api/assistant/transcribe     (raw audio body, e.g. audio/webm) -> { text, language: "ta-IN"|"en-IN", confidence }
 */
const DEFAULT_URL = "https://api.openai.com/v1/audio/transcriptions";
const MAX_BYTES = 10 * 1024 * 1024;

// A hint of the shop's vocabulary improves accuracy for brand names and Tamil/English code-switching.
const DOMAIN_PROMPT =
  "VoiceShop shopping assistant. Tamil and English mixed speech. Words: laptop, cart, wishlist, checkout, order, price, remove, add, " +
  "iPhone, Samsung, HP, Dell, Sony, கார்ட், லேப்டாப், விலை, ஆர்டர், சேர், நீக்கு.";

export const isSttConfigured = () => Boolean(process.env.STT_API_KEY);

export const getCapabilities = (req, res) => res.json({ success: true, serverStt: isSttConfigured() });

const LANG_MAP = { tamil: "ta-IN", ta: "ta-IN", english: "en-IN", en: "en-IN", hindi: "hi-IN", hi: "hi-IN", telugu: "te-IN", te: "te-IN", malayalam: "ml-IN", ml: "ml-IN", kannada: "kn-IN", kn: "kn-IN" };

// tiny in-memory limiter (per IP) so an open endpoint can't be used to burn the transcription quota
const hits = new Map();
const rateLimited = (ip) => {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => now - t < 60_000);
  list.push(now);
  hits.set(ip, list);
  return list.length > 20;
};

const confidenceFrom = (segments) => {
  if (!Array.isArray(segments) || !segments.length) return null;
  const lp = segments.map((s) => s.avg_logprob).filter((v) => typeof v === "number");
  if (!lp.length) return null;
  return Math.max(0, Math.min(1, Math.exp(lp.reduce((a, b) => a + b, 0) / lp.length)));
};

export const transcribe = async (req, res) => {
  if (!isSttConfigured()) return res.status(503).json({ success: false, code: "STT_NOT_CONFIGURED", message: "Server speech recognition is not configured." });
  if (rateLimited(req.ip || "x")) return res.status(429).json({ success: false, code: "RATE_LIMITED", message: "Too many voice requests. Please wait a moment." });

  const audio = req.body;
  if (!Buffer.isBuffer(audio) || audio.length < 800) return res.status(400).json({ success: false, code: "EMPTY_AUDIO", message: "No audio received." });
  if (audio.length > MAX_BYTES) return res.status(413).json({ success: false, code: "TOO_LARGE", message: "Audio is too long." });

  const type = String(req.headers["content-type"] || "audio/webm").split(";")[0];
  const ext = type.includes("ogg") ? "ogg" : type.includes("mp4") || type.includes("m4a") ? "m4a" : type.includes("wav") ? "wav" : "webm";
  const hint = String(req.query?.lang || "").toLowerCase(); // optional "ta" / "en" to force a language; omitted = auto-detect

  try {
    const form = new FormData();
    form.append("file", new Blob([audio], { type }), `speech.${ext}`);
    form.append("model", process.env.STT_MODEL || "whisper-1");
    form.append("response_format", "verbose_json");
    form.append("temperature", "0");
    form.append("prompt", DOMAIN_PROMPT);
    if (hint === "ta" || hint === "en") form.append("language", hint);

    const r = await fetch(process.env.STT_API_URL || DEFAULT_URL, { method: "POST", headers: { Authorization: `Bearer ${process.env.STT_API_KEY}` }, body: form });
    if (!r.ok) return res.status(502).json({ success: false, code: "STT_PROVIDER_ERROR", message: "Speech service could not process the audio." });
    const data = await r.json();
    const text = String(data.text || "").trim();
    if (!text) return res.json({ success: true, text: "", language: null, confidence: null });
    const language = LANG_MAP[String(data.language || "").toLowerCase()] || (/[\u0b80-\u0bff]/.test(text) ? "ta-IN" : "en-IN");
    res.json({ success: true, text, language, confidence: confidenceFrom(data.segments) });
  } catch {
    res.status(502).json({ success: false, code: "STT_UNREACHABLE", message: "Speech service is not reachable." });
  }
};
