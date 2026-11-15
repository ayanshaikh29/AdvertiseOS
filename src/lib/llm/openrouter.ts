import type { ZodType } from "zod";
import type {
  AudioArgs,
  AudioResult,
  ImageArgs,
  ImageResult,
  JsonArgs,
  LLMProvider,
  Source,
  TextArgs,
  Usage,
} from "@/lib/llm/types";

/**
 * OpenRouter Provider for AdvertiseOS:
 * Connects to OpenRouter.ai API for unlimited, fast inference
 * using models like google/gemma-4-31b-it:free or any configured model.
 */
export class OpenRouterProvider implements LLMProvider {
  readonly name = "openrouter";
  readonly sample = false;
  private apiKey: string;
  private model: string;
  private baseUrl: string;

  constructor(options?: { apiKey?: string; model?: string; baseUrl?: string }) {
    this.apiKey =
      options?.apiKey ||
      process.env.OPENROUTER_API_KEY ||
      "";
    this.model =
      options?.model ||
      process.env.OPENROUTER_MODEL ||
      "meta-llama/llama-3.3-70b-instruct:free";
    this.baseUrl = options?.baseUrl || "https://openrouter.ai/api/v1";
  }

  private async callChat(messages: Array<{ role: string; content: string }>, jsonMode = false) {
    if (!this.apiKey) {
      throw new Error("OPENROUTER_API_KEY is not configured.");
    }

    const candidateModels = [
      this.model,
      "meta-llama/llama-3.3-70b-instruct:free",
      "google/gemini-2.0-flash-lite-preview-02-05:free",
      "mistralai/mistral-7b-instruct:free",
      "qwen/qwen-2.5-72b-instruct:free",
    ].filter((m, idx, arr) => m && arr.indexOf(m) === idx);

    let lastError = "";
    for (const modelToTry of candidateModels) {
      try {
        const payload: Record<string, unknown> = {
          model: modelToTry,
          messages,
          temperature: 0.3,
        };

        if (jsonMode) {
          payload.response_format = { type: "json_object" };
        }

        const res = await fetch(`${this.baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "http://localhost:3000",
            "X-Title": "AdvertiseOS",
          },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const errText = await res.text();
          lastError = `OpenRouter error (${res.status}) on ${modelToTry}: ${errText}`;
          if (res.status === 404 || res.status === 429 || res.status === 400 || res.status === 503) {
            continue;
          }
          throw new Error(lastError);
        }

        const data = await res.json();
        this.model = modelToTry;
        return data;
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
      }
    }

    throw new Error(lastError || "All OpenRouter candidate models failed.");
  }

  async json<T>(args: JsonArgs<T>): Promise<{ data: T; usage: Usage; sources?: Source[] }> {
    const started = Date.now();
    const systemPrompt = `${args.system}\n\nIMPORTANT: You must respond ONLY with a valid JSON object matching the requested schema. Do not include markdown code fences or conversational text outside the JSON.`;
    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: args.user },
    ];

    let lastError = "";
    for (let attempt = 0; attempt < 3; attempt++) {
      const currentMessages =
        attempt === 0
          ? messages
          : [
              ...messages,
              {
                role: "user",
                content: `Your previous response was invalid JSON or failed schema validation: ${lastError}. Return ONLY valid JSON matching the schema.`,
              },
            ];

      const res = await this.callChat(currentMessages, true);
      const content = res.choices?.[0]?.message?.content || "";
      const latencyMs = Date.now() - started;

      const inputTokens = res.usage?.prompt_tokens ?? 100;
      const outputTokens = res.usage?.completion_tokens ?? 100;
      const costUsd = Number(((inputTokens + outputTokens) * 0.000001).toFixed(6));

      const usage: Usage = {
        inputTokens,
        outputTokens,
        cachedTokens: 0,
        costUsd,
        latencyMs,
        model: this.model,
        groundingRequests: 0,
      };

      try {
        // Strip markdown backticks if returned
        let clean = content.trim();
        if (clean.startsWith("```json")) clean = clean.slice(7);
        if (clean.startsWith("```")) clean = clean.slice(3);
        if (clean.endsWith("```")) clean = clean.slice(0, -3);
        clean = clean.trim();

        const parsedJson = JSON.parse(clean);
        const validated = args.schema.safeParse(parsedJson);
        if (validated.success) {
          return { data: validated.data, usage };
        }
        lastError = validated.error.message;
      } catch (err: unknown) {
        lastError = err instanceof Error ? err.message : String(err);
      }
    }

    throw new Error(`OpenRouter JSON generation failed schema validation: ${lastError}`);
  }

  async text(args: TextArgs): Promise<{ text: string; usage: Usage; sources?: Source[] }> {
    const started = Date.now();
    const messages = [
      { role: "system", content: args.system },
      { role: "user", content: args.user },
    ];

    const res = await this.callChat(messages, false);
    const content = res.choices?.[0]?.message?.content || "";
    const latencyMs = Date.now() - started;

    const inputTokens = res.usage?.prompt_tokens ?? 100;
    const outputTokens = res.usage?.completion_tokens ?? 100;
    const costUsd = Number(((inputTokens + outputTokens) * 0.000001).toFixed(6));

    const usage: Usage = {
      inputTokens,
      outputTokens,
      cachedTokens: 0,
      costUsd,
      latencyMs,
      model: this.model,
      groundingRequests: 0,
    };

    return { text: content, usage };
  }

  async embed(texts: string[], dims = 768): Promise<number[][]> {
    // Deterministic pseudo-embedding fallback when no vector model is configured
    return texts.map((t) => {
      const arr = new Array(dims).fill(0);
      for (let i = 0; i < t.length; i++) {
        arr[i % dims] += t.charCodeAt(i) / 255;
      }
      return arr;
    });
  }

  async image(args: ImageArgs): Promise<ImageResult> {
    return {
      base64: "",
      mimeType: "image/svg+xml",
      prompt: args.prompt,
      model: "openrouter-template",
      sample: true,
      costUsd: 0,
    };
  }

  async tts(args: AudioArgs): Promise<AudioResult> {
    return { unsupported: true, reason: "OpenRouter does not support direct TTS." };
  }
}
