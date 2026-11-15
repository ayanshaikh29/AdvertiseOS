import { z } from "zod";
import { getLLM, type Usage } from "@/lib/llm";
import { getPrompt } from "@/lib/prompts";
import type { BrandProfile } from "@/lib/brand";
import { getModelRouter } from "@/lib/modelRouter";

export type AgentName =
  | "ceo"
  | "strategist"
  | "researcher"
  | "brand_voice"
  | "performance"
  | "seo"
  | "creative"
  | "critic"
  | "content"
  | "reviewer";

export type RunRecord = {
  agent: AgentName;
  input: unknown;
  output: unknown;
  tokens: { input: number; output: number };
  costUsd: number;
  latencyMs: number;
  status: "ok" | "fallback" | "failed";
  model: string;
  provider?: string;
  fallback?: boolean;
  error?: string;
};

export class AgentExecutionError extends Error {
  run: RunRecord;
  constructor(message: string, run: RunRecord) {
    super(message);
    this.name = "AgentExecutionError";
    this.run = run;
  }
}

/** Check if strict AI mode is active (default false unless explicitly set to ADVOS_STRICT_AI=true). */
export function isStrictAiMode(): boolean {
  if (process.env.DEMO_MODE === "true" || process.env.ADVOS_DEMO_MODE === "true") {
    return false;
  }
  if (process.env.ADVOS_STRICT_AI === "true") {
    return true;
  }
  return false;
}

/** Shared runner: prompt -> LLM provider (Gemini by default; see LLM_PROVIDER) -> zod
 * structured output (the provider validates and retries 2x with the error fed back) ->
 * deterministic labeled fallback when the provider is offline/unavailable. */
export async function runAgent<T>({
  agent,
  brand,
  task,
  schema,
  system,
  promptKey,
  fallback,
  taskType,
  grounding,
}: {
  agent: AgentName;
  brand: BrandProfile;
  task: string;
  schema: z.ZodType<T>;
  system: string;
  /** Versioned prompt key — human-approved overrides win over the built-in default. */
  promptKey?: string;
  fallback: () => T;
  /** Task type for model routing (e.g., "plan", "review", "write", "calendar") */
  taskType?: string;
  grounding?: boolean;
}): Promise<{ data: T; run: RunRecord }> {
  const started = Date.now();
  const resolvedSystem = await getPrompt(promptKey ?? agent, system);
  const brandCtx = `Brand: ${brand.name}. Tone: ${brand.tone}. Languages: ${brand.languages.join(", ")}. Audience: ${brand.audience}. Products: ${brand.products}. USP: ${brand.usp}. DO: ${brand.dos.join("; ")}. DON'T: ${brand.donts.join("; ")}. Compliance: ${brand.compliance_notes}. Never invent statistics, client names, awards, testimonials, or results. If a fact is missing, say it is missing.`;
  const fullSystem = `${resolvedSystem}\n${brandCtx}`;

  const llm = getLLM();
  const router = getModelRouter();
  try {
    const result = await router.execute<T>(agent, taskType ?? "write", {
      system: fullSystem,
      user: task,
      schema,
      cacheKey: promptKey ?? agent,
      temperature: 0.2,
      grounding,
    });
    return {
      data: result.data,
      run: {
        agent,
        input: task,
        output: result.data,
        tokens: { input: result.usage.inputTokens, output: result.usage.outputTokens },
        costUsd: result.usage.costUsd,
        latencyMs: result.usage.latencyMs,
        status: "ok",
        model: result.usage.model,
        provider: llm.name,
        fallback: false,
      },
    };
  } catch (e) {
    const error1 = e instanceof Error ? e.message : String(e);
    // Model router failed (quota, auth, etc.) - fall back to direct LLM call
    try {
      const { data, usage } = await llm.json({
        system: fullSystem,
        user: task,
        schema,
        cacheKey: promptKey ?? agent,
        grounding,
      });
      return {
        data,
        run: {
          agent,
          input: task,
          output: data,
          tokens: { input: usage.inputTokens, output: usage.outputTokens },
          costUsd: usage.costUsd,
          latencyMs: usage.latencyMs,
          status: "ok",
          model: usage.model,
          provider: llm.name,
          fallback: false,
        },
      };
    } catch (e2) {
      const error2 = e2 instanceof Error ? e2.message : String(e2);
      const lastError = error2 || error1;

      // In strict AI mode: NEVER generate silent template content on AI code/schema crash.
      // But if upstream provider has an error (quota, 404, rate limit, network), gracefully fall back to domain template
      // so the campaign generation never crashes for the user.
      const isUpstreamError = /RESOURCE_EXHAUSTED|quota|rate limit|429|404|not found|unavailable|fetch failed|ECONNREFUSED|ENOTFOUND|timeout/i.test(lastError);
      if (isStrictAiMode() && !isUpstreamError) {
        const failedRun: RunRecord = {
          agent,
          input: task,
          output: null,
          tokens: { input: 0, output: 0 },
          costUsd: 0,
          latencyMs: Date.now() - started,
          status: "failed",
          model: llm.name,
          provider: llm.name,
          fallback: false,
          error: lastError,
        };
        throw new AgentExecutionError(
          `Agent '${agent}' failed: ${lastError}. Click Retry to run again.`,
          failedRun
        );
      }
    }
  }

  const data = fallback();
  const checked = schema.safeParse(data);
  if (!checked.success) throw new Error(`Fallback failed validation: ${checked.error.message}`);
  return {
    data: checked.data,
    run: {
      agent,
      input: task,
      output: checked.data,
      tokens: { input: 0, output: 0 },
      costUsd: 0,
      latencyMs: Date.now() - started,
      status: "fallback",
      model: llm.sample ? `${llm.name}-sample` : llm.name,
      provider: llm.name,
      fallback: true,
    },
  };
}

/** Sum of usage across a batch of runs (for cost dashboards). */
export function totalCost(runs: Array<{ costUsd: number }>): number {
  return Number(runs.reduce((s, r) => s + r.costUsd, 0).toFixed(6));
}

export function mergeUsage(a: Usage, b: Usage): Usage {
  return {
    inputTokens: a.inputTokens + b.inputTokens,
    outputTokens: a.outputTokens + b.outputTokens,
    cachedTokens: a.cachedTokens + b.cachedTokens,
    costUsd: Number((a.costUsd + b.costUsd).toFixed(6)),
    latencyMs: a.latencyMs + b.latencyMs,
    model: a.model,
    groundingRequests: a.groundingRequests + b.groundingRequests,
  };
}
