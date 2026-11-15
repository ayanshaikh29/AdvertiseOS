import type { ZodType } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

/** Convert a zod schema to the JSON Schema subset Gemini structured output supports.
 * $refStrategy "none" inlines everything (Gemini allows $ref/$defs but inlining is simpler
 * and avoids model-side resolution issues). $schema is stripped — it is not part of the
 * supported subset. */
export function toGeminiJsonSchema(schema: ZodType): Record<string, unknown> {
  const out = zodToJsonSchema(schema, { $refStrategy: "none" }) as Record<string, unknown>;
  delete out.$schema;
  return out;
}

/** Creative placement size -> aspect ratio supported by Gemini image generation
 * (generateImages supports 1:1, 3:4, 4:3, 9:16, 16:9). */
export function mapSizeToAspectRatio(size: string): string {
  const [w, h] = size.toLowerCase().split(/[x×]/).map((n) => Number(n.trim()));
  if (!w || !h) return "1:1";
  const ratio = w / h;
  if (Math.abs(ratio - 1) < 0.02) return "1:1";
  if (Math.abs(ratio - 9 / 16) < 0.03) return "9:16";
  if (Math.abs(ratio - 16 / 9) < 0.05) return "16:9";
  if (ratio > 1.2) return "16:9";
  if (ratio < 0.9) return "3:4";
  return "3:4";
}
