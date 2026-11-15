import { createHash } from "crypto";
import { GoogleGenAI, type GenerateContentResponse, type Tool } from "@google/genai";
import { mapSizeToAspectRatio, toGeminiJsonSchema } from "@/lib/llm/jsonSchema";
import { estimateImageCost, estimateUsageCost } from "@/lib/llm/pricing";
import {
  LLMAuthError,
  LLMQuotaError,
  LLMValidationError,
  type AudioArgs,
  type AudioResult,
  type ImageArgs,
  type ImageResult,
  type JsonArgs,
  type LLMProvider,
  type Source,
  type TextArgs,
  type Usage,
} from "@/lib/llm/types";

/** Default models (env-overridable; names live in config, never in call sites).
 * Verified against ai.google.dev/gemini-api/docs/models (Oct 2026): "latest" aliases
 * always resolve to the current stable model; pin a dated model id in env for reproducibility. */
const DEFAULTS = {
  text: "gemini-2.5-flash",
  fast: "gemini-2.5-flash-lite",
  image: "gemini-2.5-flash-image",
  embed: "text-embedding-004",
  tts: "gemini-2.5-flash-preview-tts",
  embedDims: 768,
};

const MAX_RETRIES = 3;
const CACHE_MIN_SYSTEM_CHARS = 300;
/** Hard per-attempt timeout so a hung call cannot stall the whole agency run. */
const REQUEST_TIMEOUT_MS = Number(process.env.GEMINI_TIMEOUT_MS ?? 45_000);

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function withAbortTimeout<T>(fn: (signal: AbortSignal) => Promise<T>, ms: number): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error(`LLM request timed out after ${ms}ms`)), ms);
  try {
    // @google/genai may not accept signal on all versions — race still bounds wall time.
    return await Promise.race([
      fn(controller.signal),
      new Promise<never>((_, reject) => {
        const t = setTimeout(() => reject(new Error(`LLM request timed out after ${ms}ms`)), ms);
        controller.signal.addEventListener("abort", () => {
          clearTimeout(t);
          reject(controller.signal.reason instanceof Error ? controller.signal.reason : new Error("aborted"));
        });
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

/** Classify an SDK/API error. Quota and auth errors are not retried. */
export function classifyGeminiError(e: unknown): "quota" | "auth" | "retry" | "fatal" {
  const msg = e instanceof Error ? e.message : String(e);
  const status = (e as { status?: number; statusCode?: number })?.status ?? (e as { statusCode?: number })?.statusCode;
  if (status === 401 || status === 403 || /api key not valid|API_KEY_INVALID|unauthorized/i.test(msg)) return "auth";
  if (status === 429 || /RESOURCE_EXHAUSTED|quota|rate limit|exceeded your current|too many requests/i.test(msg)) return "quota";
  if (status === 500 || status === 502 || status === 503 || status === 504 || /UNAVAILABLE|overloaded|internal error|deadline exceeded/i.test(msg)) return "retry";
  if (status && status >= 500) return "retry";
  return "fatal";
}

/** Extract grounding source URLs (Google Search) from a response. */
export function extractSources(res: GenerateContentResponse): Source[] {
  const chunks = res.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
  const seen = new Set<string>();
  const out: Source[] = [];
  for (const c of chunks) {
    const uri = c.web?.uri;
    if (!uri || seen.has(uri)) continue;
    seen.add(uri);
    out.push({ uri, title: c.web?.title });
  }
  return out;
}

type CacheEntry = { name: string; expiresAt: number };

export class GeminiProvider implements LLMProvider {
  readonly name = "gemini";
  readonly sample = false;
  private ai: GoogleGenAI;
  private textModel: string;
  private fastModel: string;
  private imageModel: string;
  private embedModel: string;
  private ttsModel: string;
  private embedDims: number;
  private caches = new Map<string, CacheEntry>();

  constructor(opts?: { apiKey?: string; textModel?: string; fastModel?: string; imageModel?: string; embedModel?: string; ttsModel?: string; embedDims?: number }) {
    const apiKey = opts?.apiKey ?? process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new LLMAuthError("GEMINI_API_KEY missing — set it or use LLM_PROVIDER=fake for labeled sample mode");
    }
    this.ai = new GoogleGenAI({ apiKey });
    this.textModel = opts?.textModel ?? process.env.GEMINI_MODEL_TEXT ?? DEFAULTS.text;
    this.fastModel = opts?.fastModel ?? process.env.GEMINI_MODEL_FAST ?? DEFAULTS.fast;
    this.imageModel = opts?.imageModel ?? process.env.GEMINI_MODEL_IMAGE ?? DEFAULTS.image;
    this.embedModel = opts?.embedModel ?? process.env.GEMINI_MODEL_EMBED ?? DEFAULTS.embed;
    this.ttsModel = opts?.ttsModel ?? process.env.GEMINI_MODEL_TTS ?? DEFAULTS.tts;
    this.embedDims = opts?.embedDims ?? Number(process.env.GEMINI_EMBED_DIMS ?? DEFAULTS.embedDims);
  }

  private model(fast?: boolean): string {
    return fast ? this.fastModel : this.textModel;
  }

  /** Map fatal (non-retried) API errors to typed errors. Never returns. */
  private mapFatal(e: unknown): never {
    const kind = classifyGeminiError(e);
    const msg = e instanceof Error ? e.message : String(e);
    if (kind === "quota") throw new LLMQuotaError(msg);
    if (kind === "auth") throw new LLMAuthError(msg);
    throw e;
  }

  /** Single generateContent call with retry/backoff on 429/5xx. */
  private async generate(params: {
    model: string;
    system: string;
    user: string;
    jsonSchema?: Record<string, unknown>;
    grounding?: boolean;
    maxOutputTokens?: number;
    temperature?: number;
    cachedContent?: string;
    responseModalities?: string[];
    speechConfig?: unknown;
  }): Promise<{ res: GenerateContentResponse; groundingRequests: number }> {
    let lastErr: unknown;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const tools: Tool[] | undefined = params.grounding ? [{ googleSearch: {} }] : undefined;
        const res = await withAbortTimeout(
          () =>
            this.ai.models.generateContent({
              model: params.model,
              contents: params.user,
              config: {
                ...(params.system ? { systemInstruction: params.system } : {}),
                ...(params.jsonSchema
                  ? { responseMimeType: "application/json", responseJsonSchema: params.jsonSchema }
                  : {}),
                ...(params.maxOutputTokens ? { maxOutputTokens: params.maxOutputTokens } : {}),
                ...(params.temperature !== undefined ? { temperature: params.temperature } : {}),
                ...(tools ? { tools } : {}),
                ...(params.cachedContent ? { cachedContent: params.cachedContent } : {}),
                ...(params.responseModalities ? { responseModalities: params.responseModalities } : {}),
                ...(params.speechConfig ? { speechConfig: params.speechConfig as never } : {}),
              },
            }),
          REQUEST_TIMEOUT_MS
        );
        return { res, groundingRequests: params.grounding ? 1 : 0 };
      } catch (e) {
        lastErr = e;
        const kind = classifyGeminiError(e);
        const isTimeout = e instanceof Error && /timed out/i.test(e.message);
        if (kind === "auth") this.mapFatal(e);
        if (kind === "quota") {
          const msg = e instanceof Error ? e.message : String(e);
          const isPerMinuteBurst = /per_minute|limit: 5|limit: 15|retry in \d+s/i.test(msg);
          if (isPerMinuteBurst && attempt < MAX_RETRIES - 1) {
            await sleep(2000 * (attempt + 1) + Math.floor(Math.random() * 500));
            continue;
          }
          this.mapFatal(e);
        }
        if ((kind === "retry" || isTimeout) && attempt < MAX_RETRIES - 1) {
          await sleep(500 * 3 ** attempt + Math.floor(Math.random() * 200));
          continue;
        }
        throw e;
      }
    }
    throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
  }

  private usageOf(res: GenerateContentResponse, model: string, started: number, groundingRequests: number): Usage {
    const input = res.usageMetadata?.promptTokenCount ?? 0;
    const output = res.usageMetadata?.candidatesTokenCount ?? 0;
    const cached = res.usageMetadata?.cachedContentTokenCount ?? 0;
    const { costUsd } = estimateUsageCost(model, { input, output, cached, groundingRequests });
    return {
      inputTokens: input,
      outputTokens: output,
      cachedTokens: cached,
      costUsd,
      latencyMs: Date.now() - started,
      model,
      groundingRequests,
    };
  }

  /** Resolve (and create once) a context cache for a static system prompt. */
  private async resolveCache(model: string, system: string, cacheKey?: string): Promise<string | undefined> {
    if ((process.env.GEMINI_CONTEXT_CACHE ?? "true") === "false") return undefined;
    if (!cacheKey || system.length < CACHE_MIN_SYSTEM_CHARS) return undefined;
    const key = `${model}:${cacheKey}:${createHash("sha256").update(system).digest("hex").slice(0, 16)}`;
    const hit = this.caches.get(key);
    if (hit && hit.expiresAt > Date.now()) return hit.name;
    try {
      const created = await this.ai.caches.create({
        model,
        config: { systemInstruction: system, ttl: "600s", displayName: key.slice(0, 128) },
      });
      if (!created.name) return undefined;
      this.caches.set(key, { name: created.name, expiresAt: Date.now() + 8 * 60_000 });
      return created.name;
    } catch {
      return undefined; // caching is an optimization; never fail the call
    }
  }

  /** Structured JSON output: JSON mime type + schema from zod, zod validation,
   * and 2 retries that feed the validation error back. No regex extraction. */
  async json<T>(args: JsonArgs<T>): Promise<{ data: T; usage: Usage; sources?: Source[] }> {
    const started = Date.now();
    const model = this.model(args.fast);
    const jsonSchema = toGeminiJsonSchema(args.schema);
    const cachedContent = await this.resolveCache(model, args.system, args.cacheKey);
    let lastError = "";
    let totalUsage: Usage = {
      inputTokens: 0,
      outputTokens: 0,
      cachedTokens: 0,
      costUsd: 0,
      latencyMs: 0,
      model,
      groundingRequests: 0,
    };
    for (let attempt = 0; attempt < 3; attempt++) {
      const user = attempt === 0 ? args.user : `${args.user}\n\nPrevious output failed validation: ${lastError}\nFix it and reply with valid JSON only.`;
      const { res, groundingRequests } = await this.generate({
        model,
        system: args.system,
        user,
        jsonSchema,
        grounding: args.grounding,
        maxOutputTokens: args.maxOutputTokens,
        temperature: args.temperature,
        cachedContent,
      });
      const usage = this.usageOf(res, model, started, groundingRequests);
      totalUsage = {
        ...usage,
        inputTokens: totalUsage.inputTokens + usage.inputTokens,
        outputTokens: totalUsage.outputTokens + usage.outputTokens,
        costUsd: Number((totalUsage.costUsd + usage.costUsd).toFixed(6)),
        groundingRequests: totalUsage.groundingRequests + usage.groundingRequests,
      };
      const text = res.text;
      if (!text) {
        lastError = "Model returned empty output";
        continue;
      }
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        lastError = "Output was not valid JSON";
        continue;
      }
      const checked = args.schema.safeParse(parsed);
      if (!checked.success) {
        lastError = checked.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
        continue;
      }
      const sources = args.grounding ? extractSources(res) : undefined;
      return { data: checked.data, usage: totalUsage, ...(sources && sources.length ? { sources } : {}) };
    }
    throw new LLMValidationError(lastError || "Structured output failed validation after 3 attempts");
  }

  async text(args: TextArgs): Promise<{ text: string; usage: Usage; sources?: Source[] }> {
    const started = Date.now();
    const model = this.model(args.fast);
    const cachedContent = await this.resolveCache(model, args.system, args.cacheKey);
    const { res, groundingRequests } = await this.generate({
      model,
      system: args.system,
      user: args.user,
      grounding: args.grounding,
      maxOutputTokens: args.maxOutputTokens,
      temperature: args.temperature,
      cachedContent,
    });
    const usage = this.usageOf(res, model, started, groundingRequests);
    const sources = args.grounding ? extractSources(res) : undefined;
    return { text: res.text ?? "", usage, ...(sources && sources.length ? { sources } : {}) };
  }

  async embed(texts: string[], dims?: number): Promise<number[][]> {
    if (!texts.length) return [];
    try {
      const res = await this.ai.models.embedContent({
        model: this.embedModel,
        contents: texts,
        config: { outputDimensionality: dims ?? this.embedDims },
      });
      return (res.embeddings ?? []).map((e) => e.values ?? []);
    } catch (e) {
      this.mapFatal(e);
    }
  }

  /** Background art only — exact text/logo is composited by the template renderer.
   * No real-people likenesses or copyrighted characters (prompt rules + negative list).
   * Uses generateContent with responseModalities IMAGE — models.generateImages is
   * Vertex/Enterprise-only and fails on a Gemini Developer API key (verified live). */
  async image(args: ImageArgs): Promise<ImageResult> {
    const aspectRatio = mapSizeToAspectRatio(args.size);
    const avoid = [
      "text, letters, words, watermark, signature",
      "real person, celebrity likeness, recognizable face",
      "copyrighted characters, brand logos",
      args.negative,
    ]
      .filter(Boolean)
      .join(", ");
    let res: GenerateContentResponse;
    try {
      res = await this.ai.models.generateContent({
        model: this.imageModel,
        contents: `${args.prompt}. Background art only — absolutely no text or people. Avoid: ${avoid}.`,
        config: {
          // personGeneration is Vertex/Enterprise-only (verified live) — the
          // "no real people" rule is enforced in the prompt instead.
          responseModalities: ["IMAGE"],
          imageConfig: { aspectRatio },
        },
      });
    } catch (e) {
      this.mapFatal(e);
    }
    const base64 = res.data;
    if (!base64) {
      const why = res.text ?? res.promptFeedback?.blockReasonMessage ?? res.promptFeedback?.blockReason ?? "no inline image data";
      throw new Error(`Image generation returned no image: ${String(why).slice(0, 200)}`);
    }
    const mimeType =
      res.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.mimeType)?.inlineData?.mimeType ?? "image/png";
    return {
      base64,
      mimeType,
      prompt: args.prompt,
      model: this.imageModel,
      sample: false,
      costUsd: estimateImageCost(this.imageModel).costUsd,
    };
  }

  /** Text-to-speech via Gemini TTS (audio/L16;rate=24000 PCM base64). */
  async tts(args: AudioArgs): Promise<AudioResult> {
    const voice = args.voice ?? process.env.GEMINI_VOICE ?? "Kore";
    const { res } = await this.generate({
      model: this.ttsModel,
      system: "",
      user: `Say in ${args.language ?? "Hinglish"}: ${args.text}`,
      responseModalities: ["AUDIO"],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } },
    });
    const data = res.data;
    if (!data) return { unsupported: true, reason: "Gemini TTS returned no audio" };
    return { unsupported: false, base64: data, mimeType: "audio/L16;rate=24000", model: this.ttsModel, sample: false };
  }
}
