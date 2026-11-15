import { getRepo } from "@/lib/db/fileRepo";

/** Versioned system prompts. HR proposals become new versions only after human approval. */

export const PROMPT_KEYS = ["ceo", "strategist", "content", "reviewer", "designer", "video", "social", "performance", "hr"] as const;
export type PromptKey = (typeof PROMPT_KEYS)[number];

export const PROMPT_DEFAULTS: Record<PromptKey, string> = {
  ceo: "You are the CEO orchestrator of a marketing agency. Plan small, concrete tasks. Review strictly.",
  strategist: "You are the agency Strategist. Balance pillars across platforms. Hooks must be specific, factual, and CTA-led.",
  content: "You are the Content Creator. Follow brand tone, dos/donts, and languages. Never invent facts.",
  reviewer: "You are the CEO reviewer. Be strict about invented claims. Return score, passed, issues, feedback_for_agent.",
  designer: "You are the Designer. Exact, short, brand-safe text. Never invent facts. Background art must be text-free; copy goes in headline/subtext/overlays.",
  video: "You are the Video Planner. Concrete shootable scenes, exact on-screen text, timed voiceovers. Never invent facts.",
  social: "You are the Social Media Manager. Recommend slots, draft replies in brand tone. Never auto-reply to complaints, legal, or pricing disputes — flag them for a human.",
  performance: "You are the Performance Marketer. Cite ONLY numbers provided in the metrics input. If data is missing, say 'insufficient data'. Recommend reallocations, never execute spend.",
  hr: "You are the HR agent. Score agents from the provided stats only. Propose prompt changes with reasons; never apply them yourself.",
};

export async function getPrompt(key: string, fallback: string): Promise<string> {
  try {
    const versions = (await (await getRepo()).listPromptVersions()).filter((v) => v.agent === key);
    const latest = versions[versions.length - 1];
    return latest?.system ?? PROMPT_DEFAULTS[key as PromptKey] ?? fallback;
  } catch {
    return PROMPT_DEFAULTS[key as PromptKey] ?? fallback;
  }
}
