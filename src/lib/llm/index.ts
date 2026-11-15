import { FakeLLMProvider } from "@/lib/llm/fake";
import { GeminiProvider } from "@/lib/llm/gemini";
import { OpenRouterProvider } from "@/lib/llm/openrouter";
import type { LLMProvider } from "@/lib/llm/types";

export * from "@/lib/llm/types";
export { estimateUsageCost, estimateImageCost, priceFor, priceTable, resetPriceCache } from "@/lib/llm/pricing";
export { toGeminiJsonSchema, mapSizeToAspectRatio } from "@/lib/llm/jsonSchema";
export { classifyGeminiError, extractSources, GeminiProvider } from "@/lib/llm/gemini";
export { FakeLLMProvider } from "@/lib/llm/fake";
export { OpenRouterProvider } from "@/lib/llm/openrouter";

/** LLM_PROVIDER=openrouter|gemini|fake. Priority: explicit provider, or OPENROUTER_API_KEY, or GEMINI_API_KEY. */
export function getLLM(): LLMProvider {
  const provider = (process.env.LLM_PROVIDER ?? "").toLowerCase();
  if (provider === "fake" || provider === "sample") return new FakeLLMProvider();
  if (provider === "openrouter") return new OpenRouterProvider();
  if (provider === "gemini") return new GeminiProvider();
  if (process.env.OPENROUTER_API_KEY) return new OpenRouterProvider();
  if (process.env.GEMINI_API_KEY) return new GeminiProvider();
  return new FakeLLMProvider();
}

export function llmMode(): "gemini" | "openrouter" | "sample" {
  const provider = (process.env.LLM_PROVIDER ?? "").toLowerCase();
  if (provider === "fake" || provider === "sample") return "sample";
  if (provider === "openrouter") return "openrouter";
  if (provider === "gemini") return "gemini";
  if (process.env.OPENROUTER_API_KEY) return "openrouter";
  if (process.env.GEMINI_API_KEY) return "gemini";
  return "sample";
}
