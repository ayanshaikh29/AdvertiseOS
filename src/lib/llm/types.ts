import type { ZodType } from "zod";

/** Provider-agnostic LLM contract (Phase 6A). Gemini is the default implementation;
 * the fake provider keeps tests and offline mode working with labeled sample data. */

export type Usage = {
  inputTokens: number;
  outputTokens: number;
  cachedTokens: number;
  costUsd: number;
  latencyMs: number;
  model: string;
  groundingRequests: number;
};

export type Source = { uri: string; title?: string };

export type JsonArgs<T> = {
  system: string;
  user: string;
  schema: ZodType<T>;
  /** Google Search grounding (Trend Radar). Sources are returned when set. */
  grounding?: boolean;
  /** Stable key for context caching of the static system prompt. */
  cacheKey?: string;
  maxOutputTokens?: number;
  temperature?: number;
  /** cheaper/faster model selection where supported */
  fast?: boolean;
};

export type TextArgs = {
  system: string;
  user: string;
  grounding?: boolean;
  cacheKey?: string;
  maxOutputTokens?: number;
  temperature?: number;
  fast?: boolean;
};

export type ImageArgs = {
  prompt: string;
  /** e.g. "1080x1080", "1080x1350", "1080x1920", "1200x628" */
  size: string;
  /** Reference images (data URLs). Optional; current image model ignores them (documented). */
  references?: string[];
  negative?: string;
};

export type ImageResult = {
  base64: string;
  mimeType: string;
  prompt: string;
  model: string;
  sample: boolean;
  costUsd: number;
};

export type AudioArgs = { text: string; voice?: string; language?: string };

export type AudioResult =
  | { unsupported: true; reason: string }
  | { unsupported: false; base64: string; mimeType: string; model: string; sample: boolean };

export interface LLMProvider {
  readonly name: string;
  /** True when this provider returns labeled sample data (no real model calls). */
  readonly sample: boolean;
  json<T>(args: JsonArgs<T>): Promise<{ data: T; usage: Usage; sources?: Source[] }>;
  text(args: TextArgs): Promise<{ text: string; usage: Usage; sources?: Source[] }>;
  embed(texts: string[], dims?: number): Promise<number[][]>;
  image(args: ImageArgs): Promise<ImageResult>;
  tts?(args: AudioArgs): Promise<AudioResult>;
}

/** Quota/billing exhausted — surface clearly in the UI ("Gemini quota reached"). */
export class LLMQuotaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LLMQuotaError";
  }
}

/** Bad API key / unauthorized. */
export class LLMAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LLMAuthError";
  }
}

/** Structured output still invalid after the provider's retries — caller should use its fallback. */
export class LLMValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LLMValidationError";
  }
}

/** Fake provider / offline mode — caller uses its deterministic fallback. */
export class OfflineLLMError extends Error {
  constructor(message = "Sample data mode — no live model calls (LLM_PROVIDER=fake or GEMINI_API_KEY missing).") {
    super(message);
    this.name = "OfflineLLMError";
  }
}
