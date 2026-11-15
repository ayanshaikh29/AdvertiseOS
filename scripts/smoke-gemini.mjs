import { readFileSync, existsSync } from "fs";
import { GoogleGenAI } from "@google/genai";

// Helper to load env from .env.local or .env if not already populated
function loadEnv() {
  const envFiles = [".env.local", ".env"];
  for (const file of envFiles) {
    if (existsSync(file)) {
      const content = readFileSync(file, "utf8");
      for (const line of content.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx > 0) {
          const key = trimmed.slice(0, eqIdx).trim();
          const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      }
    }
  }
}

loadEnv();

const apiKey = process.env.GEMINI_API_KEY;

function redact(text) {
  if (!text) return "";
  let s = String(text);
  if (apiKey) {
    s = s.split(apiKey).join("[REDACTED_API_KEY]");
  }
  return s.replace(/\bAIza[0-9A-Za-z\-_]{35}\b/g, "[REDACTED_KEY]")
          .replace(/\bAQ[0-9A-Za-z\-_]{20,}\b/g, "[REDACTED_TOKEN]");
}

if (!apiKey) {
  console.error("✖ GEMINI_API_KEY missing. Please supply key in .env.local or environment.");
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });

const textModel = process.env.GEMINI_MODEL_TEXT || "gemini-2.5-flash";
const fastModel = process.env.GEMINI_MODEL_FAST || "gemini-2.5-flash-lite";
const embedModel = process.env.GEMINI_MODEL_EMBED || "text-embedding-004";
const imageModel = process.env.GEMINI_MODEL_IMAGE || "gemini-2.5-flash-image";
const ttsModel = process.env.GEMINI_MODEL_TTS || "gemini-2.5-flash-preview-tts";

console.log("=================================================");
console.log(" AdvertiseOS — Gemini Live Smoke Test Suite");
console.log("=================================================");
console.log(`Text Model : ${textModel}`);
console.log(`Fast Model : ${fastModel}`);
console.log(`Embed Model: ${embedModel}`);
console.log(`Image Model: ${imageModel}`);
console.log(`TTS Model  : ${ttsModel}`);
console.log("-------------------------------------------------\n");

const tests = [
  {
    name: "1. Structured JSON",
    run: async () => {
      const start = Date.now();
      const res = await ai.models.generateContent({
        model: textModel,
        contents: "Return a JSON object acknowledging the agency test.",
        config: {
          responseMimeType: "application/json",
          responseJsonSchema: {
            type: "object",
            properties: {
              status: { type: "string" },
              agency: { type: "string" },
            },
            required: ["status", "agency"],
          },
        },
      });
      const latencyMs = Date.now() - start;
      const parsed = JSON.parse(res.text || "{}");
      if (!parsed.status) throw new Error("Missing status property in response");
      const inTokens = res.usageMetadata?.promptTokenCount ?? 0;
      const outTokens = res.usageMetadata?.candidatesTokenCount ?? 0;
      // ~$0.075 / 1M in, $0.30 / 1M out for 2.5-flash
      const costUsd = (inTokens * 0.000000075) + (outTokens * 0.0000003);
      return { latencyMs, costUsd, detail: `in: ${inTokens}, out: ${outTokens}` };
    },
  },
  {
    name: "2. Grounding (Google Search)",
    run: async () => {
      const start = Date.now();
      const res = await ai.models.generateContent({
        model: textModel,
        contents: "What is the official pin code and district of Pathardi Phata, Nashik?",
        config: {
          tools: [{ googleSearch: {} }],
        },
      });
      const latencyMs = Date.now() - start;
      const chunks = res.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
      const inTokens = res.usageMetadata?.promptTokenCount ?? 0;
      const outTokens = res.usageMetadata?.candidatesTokenCount ?? 0;
      const costUsd = (inTokens * 0.000000075) + (outTokens * 0.0000003) + 0.035; // +$0.035 per search
      return {
        latencyMs,
        costUsd,
        detail: `sources: ${chunks.length}, text: ${(res.text || "").slice(0, 40)}...`,
      };
    },
  },
  {
    name: "3. Embeddings",
    run: async () => {
      const start = Date.now();
      const res = await ai.models.embedContent({
        model: embedModel,
        contents: ["Skyline Residency Nashik Luxury 2BHK and 3BHK"],
        config: { outputDimensionality: 768 },
      });
      const latencyMs = Date.now() - start;
      const dims = res.embeddings?.[0]?.values?.length ?? 0;
      if (dims === 0) throw new Error("Embeddings returned empty vector");
      return { latencyMs, costUsd: 0.00001, detail: `dimensions: ${dims}` };
    },
  },
  {
    name: "4. Image Generation",
    run: async () => {
      const start = Date.now();
      // Test either generateContent with IMAGE modality or fallback handling
      const res = await ai.models.generateContent({
        model: imageModel,
        contents: "Modern minimalist residential building architecture exterior dusk lighting. Background art only — no text, no people.",
        config: {
          responseModalities: ["IMAGE"],
          imageConfig: { aspectRatio: "1:1" },
        },
      });
      const latencyMs = Date.now() - start;
      const hasData = Boolean(res.data);
      if (!hasData) throw new Error("No image data returned: " + (res.text || "blocked"));
      return { latencyMs, costUsd: 0.03, detail: `image bytes received` };
    },
  },
  {
    name: "5. Text-To-Speech (TTS)",
    run: async () => {
      const start = Date.now();
      const res = await ai.models.generateContent({
        model: ttsModel,
        contents: "Namaste! Welcome to Skyline Residency Nashik.",
        config: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } },
          },
        },
      });
      const latencyMs = Date.now() - start;
      const hasAudio = Boolean(res.data);
      if (!hasAudio) throw new Error("No audio bytes returned");
      return { latencyMs, costUsd: 0.005, detail: `audio bytes received` };
    },
  },
];

const results = [];

for (const t of tests) {
  process.stdout.write(`Testing ${t.name}... `);
  try {
    const res = await t.run();
    console.log(`✓ PASS (${res.latencyMs}ms, ~$${res.costUsd.toFixed(5)})`);
    results.push({ name: t.name, status: "PASS", latencyMs: res.latencyMs, costUsd: res.costUsd, detail: res.detail });
  } catch (err) {
    const safeMsg = redact(err.message || String(err));
    console.log(`✖ FAIL`);
    console.log(`   Error: ${safeMsg.slice(0, 160)}`);
    results.push({ name: t.name, status: "FAIL", error: safeMsg });
  }
}

console.log("\n=================================================");
console.log(" Summary Table:");
console.log("=================================================");
console.table(
  results.map((r) => ({
    Feature: r.name,
    Status: r.status,
    "Latency (ms)": r.latencyMs ?? "-",
    "Cost (USD)": r.costUsd ? `$${r.costUsd.toFixed(5)}` : "-",
    Detail: r.detail ?? r.error?.slice(0, 50) ?? "-",
  }))
);

const allPassed = results.every((r) => r.status === "PASS");
if (!allPassed) {
  console.log("\n⚠️ Note: Some features failed. Inspect models and quotas in .env.local.");
} else {
  console.log("\n🎉 All 5 Gemini capabilities verified successfully!");
}

process.exit(allPassed ? 0 : 1);
