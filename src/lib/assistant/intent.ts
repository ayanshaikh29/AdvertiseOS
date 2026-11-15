import { z } from "zod";
import { getLLM } from "@/lib/llm";

/** Voice assistant intents (Phase 6D). Keyword router first (free, instant),
 * LLM only when keywords don't match. Everything is read-only — the voice
 * assistant never mutates data or spends budget. */

export const INTENTS = ["status", "approvals", "trends", "catalog", "cost", "help"] as const;
export type AssistantIntent = (typeof INTENTS)[number];

export const intentSchema = z.object({ intent: z.enum(INTENTS) });

const KEYWORDS: Array<{ intent: AssistantIntent; words: RegExp }> = [
  { intent: "approvals", words: /approv|pending|waiting|inbox/i },
  { intent: "trends", words: /trend|headline|news|radar/i },
  { intent: "catalog", words: /catalog|product|service|price|pricing|sell/i },
  { intent: "cost", words: /cost|spend|usage|budget|spend/i },
  { intent: "status", words: /status|dashboard|summary|overview|report|how( is| are|'s)?/i },
  { intent: "help", words: /help|what can you|capabilit|how do/i },
];

export function keywordIntent(text: string): AssistantIntent | null {
  for (const k of KEYWORDS) if (k.words.test(text)) return k.intent;
  return null;
}

export async function parseIntent(text: string): Promise<{ intent: AssistantIntent; source: "keywords" | "llm" }> {
  const kw = keywordIntent(text);
  if (kw) return { intent: kw, source: "keywords" };
  try {
    const llm = getLLM();
    if (!llm.sample) {
      const { data } = await llm.json({
        system: "Classify the user's voice command into exactly one intent. status=overall picture, approvals=review queue, trends=news/headlines, catalog=products/pricing, cost=AI spend, help=capabilities.",
        user: text.slice(0, 300),
        schema: intentSchema,
        cacheKey: "assistant-intent",
      });
      return { intent: data.intent, source: "llm" };
    }
  } catch {
    /* fall through to help */
  }
  return { intent: "help", source: "keywords" };
}
