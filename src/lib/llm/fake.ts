import { createHash } from "crypto";
import { OfflineLLMError, type AudioArgs, type AudioResult, type ImageArgs, type ImageResult, type JsonArgs, type LLMProvider, type TextArgs, type Usage } from "@/lib/llm/types";

function zeroUsage(model: string): Usage {
  return { inputTokens: 0, outputTokens: 0, cachedTokens: 0, costUsd: 0, latencyMs: 0, model, groundingRequests: 0 };
}

/** Deterministic fake provider. Structured/text calls throw OfflineLLMError so the
 * agent runner switches to its labeled deterministic fallback ("Sample data").
 * embed() and image() return deterministic sample outputs for offline pipelines. */
export class FakeLLMProvider implements LLMProvider {
  readonly name = "fake";
  readonly sample = true;

  async json<T>(_args: JsonArgs<T>): Promise<{ data: T; usage: Usage }> {
    throw new OfflineLLMError();
  }

  async text(_args: TextArgs): Promise<{ text: string; usage: Usage }> {
    throw new OfflineLLMError();
  }

  /** Deterministic pseudo-embeddings (seeded by text hash) — stable across runs,
   * NOT semantically meaningful. Sample data only. */
  async embed(texts: string[], dims?: number): Promise<number[][]> {
    const d = dims ?? Number(process.env.GEMINI_EMBED_DIMS ?? 768);
    return texts.map((t) => {
      const seed = createHash("sha256").update(t).digest();
      const vec: number[] = [];
      let x = 1;
      for (let i = 0; i < d; i++) {
        x = (x * 1103515245 + (seed[i % seed.length] ?? 0) + 12345) % 2147483648;
        vec.push((x / 2147483648) * 2 - 1);
      }
      const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
      return vec.map((v) => v / norm);
    });
  }

  /** Sample background art: inline SVG gradient labeled "Sample data". */
  async image(args: ImageArgs): Promise<ImageResult> {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#000000"/><stop offset="1" stop-color="#1d4ed8"/></linearGradient></defs><rect width="1024" height="1024" fill="url(#g)"/><text x="512" y="520" font-family="Inter,Arial" font-size="42" fill="#ffffff" text-anchor="middle">Sample data — background art</text></svg>`;
    return {
      base64: Buffer.from(svg).toString("base64"),
      mimeType: "image/svg+xml",
      prompt: args.prompt,
      model: "fake-image",
      sample: true,
      costUsd: 0,
    };
  }

  async tts(_args: AudioArgs): Promise<AudioResult> {
    return { unsupported: true, reason: "Sample mode: no TTS. Browser speechSynthesis is the fallback." };
  }
}
