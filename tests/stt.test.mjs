// STT endpoint tests with a mocked provider (no network, no real key).
import { transcribe, getCapabilities, isSttConfigured } from "../src/controllers/assistantStt.js";
let bad = 0;
const check = (l, c, e) => { if (!c) bad += 1; console.log(c ? "✓" : "✗", l, c ? "" : JSON.stringify(e)); };
const mkRes = () => { const r = { code: 200, body: null, status(c) { r.code = c; return r; }, json(b) { r.body = b; return r; } }; return r; };
const req = (body, extra = {}) => ({ body, headers: { "content-type": "audio/webm;codecs=opus" }, query: {}, ip: Math.random().toString(), ...extra });
const audio = Buffer.alloc(4000, 1);

delete process.env.STT_API_KEY;
let res = mkRes(); getCapabilities({}, res);
check("capabilities: off without key", res.body.serverStt === false && !isSttConfigured(), res.body);
res = mkRes(); await transcribe(req(audio), res);
check("transcribe: 503 when not configured", res.code === 503 && res.body.code === "STT_NOT_CONFIGURED", res);

process.env.STT_API_KEY = "test-key-not-real";
res = mkRes(); getCapabilities({}, res);
check("capabilities: on with key, key never exposed", res.body.serverStt === true && !JSON.stringify(res.body).includes("test-key"), res.body);
res = mkRes(); await transcribe(req(Buffer.alloc(10)), res);
check("empty / tiny audio rejected", res.code === 400, res);

let seen;
globalThis.fetch = async (url, opts) => { seen = { url, opts }; return { ok: true, json: async () => ({ text: " எனக்கு ஒரு laptop வேணும் ", language: "tamil", segments: [{ avg_logprob: -0.1 }] }) }; };
res = mkRes(); await transcribe(req(audio), res);
check("Tamil detected, text trimmed, language ta-IN", res.body.language === "ta-IN" && res.body.text.startsWith("எனக்கு") && res.body.confidence > 0.8, res.body);
check("provider got bearer key + no forced language (auto-detect)", seen.opts.headers.Authorization === "Bearer test-key-not-real" && !seen.opts.body.has("language") && seen.opts.body.get("response_format") === "verbose_json", seen.opts.headers);

globalThis.fetch = async () => ({ ok: true, json: async () => ({ text: "where is my order", language: "english" }) });
res = mkRes(); await transcribe(req(audio), res);
check("English detected -> en-IN", res.body.language === "en-IN", res.body);

globalThis.fetch = async () => ({ ok: false, status: 500, json: async () => ({}) });
res = mkRes(); await transcribe(req(audio), res);
check("provider failure -> 502, generic message (no provider details)", res.code === 502 && !/500/.test(res.body.message), res);
globalThis.fetch = async () => { throw new Error("ENOTFOUND"); };
res = mkRes(); await transcribe(req(audio), res);
check("network failure -> 502 handled", res.code === 502, res);

globalThis.fetch = async () => ({ ok: true, json: async () => ({ text: "   " }) });
res = mkRes(); await transcribe(req(audio), res);
check("silence -> empty transcript, not an error", res.code === 200 && res.body.text === "", res);

const same = { ...req(audio), ip: "1.1.1.1" };
globalThis.fetch = async () => ({ ok: true, json: async () => ({ text: "hi", language: "english" }) });
let last; for (let i = 0; i < 22; i += 1) { last = mkRes(); await transcribe(same, last); }
check("rate limit kicks in", last.code === 429, last);
console.log(bad ? `\n${bad} FAILED` : "\nAll STT checks passed"); process.exit(bad ? 1 : 0);
