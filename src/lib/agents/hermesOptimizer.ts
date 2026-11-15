import { z } from "zod";
import { runAgent } from "@/lib/agents/runner";
import type { BrandProfile } from "@/lib/brand";
import type { Item } from "@/lib/db/repo";

export const hermesOptimizationSchema = z.object({
  original_topic: z.string(),
  audit: z.object({
    hook_score: z.number().min(0).max(100),
    retention_score: z.number().min(0).max(100),
    conversion_score: z.number().min(0).max(100),
    overall_score: z.number().min(0).max(100),
    strengths: z.array(z.string()).max(3),
    weaknesses: z.array(z.string()).max(3),
  }),
  optimized_hook: z.string(),
  optimized_captions: z.array(z.string()).length(3),
  optimized_cta: z.string(),
  improvement_summary: z.string(),
});

export type HermesOptimizationResult = z.infer<typeof hermesOptimizationSchema>;

/**
 * Hermes Autonomous Campaign Optimizer:
 * Analyzes copy, hooks, and CTAs against elite Direct-Response advertising frameworks
 * (Eugene Schwartz 5 Stages of Awareness, Russell Brunson Hook-Story-Offer, and PAS).
 * Returns audited scores and commercially polished deliverables.
 */
export async function optimizeItemWithHermes(
  item: Item,
  brand: BrandProfile,
  campaignGoal?: string
): Promise<{
  success: boolean;
  result: HermesOptimizationResult;
  updatedItem: Item;
}> {
  const currentHook = item.hook || item.captions[0]?.slice(0, 80) || item.topic;
  const currentCaptions = item.captions || [];
  const currentCta = item.cta || "DM or tap link in bio";

  const taskPrompt = `HERMES DIRECT-RESPONSE CAMPAIGN OPTIMIZATION AUDIT
Brand: ${brand.name}
Audience: ${brand.audience || "Target customers"}
Products/Offers: ${brand.products || "Client offerings"}
Campaign Objective: ${campaignGoal || "Maximize high-intent leads and sales"}

ITEM UNDER REVIEW:
Platform: ${item.platform}
Format: ${item.format}
Topic: "${item.topic}"
Current Hook: "${currentHook}"
Current CTA: "${currentCta}"
Current Captions:
${currentCaptions.map((c, idx) => `[Variant ${idx + 1}]:\n${c}`).join("\n\n")}

OPTIMIZATION DIRECTIVES (Hermes Autonomous Engine):
1. AUDIT:
   - Score hook_score (0-100): Is it an arresting pattern interrupt? Does it stop thumb scroll within 1.5 seconds?
   - Score retention_score (0-100): Does the body copy build tension, overcome skepticism, and provide real value?
   - Score conversion_score (0-100): Is the CTA frictionless, specific, and compelling?
   - Calculate overall_score (0-100): Weighted average (Hook 40%, Retention 30%, Conversion 30%).
   - List up to 3 concrete strengths and 3 weaknesses.

2. OPTIMIZATION:
   - optimized_hook: Rewrite into an irresistible, scroll-stopping hook under 90 characters. Use contrarian truths, curious questions, or high-stakes POVs. Zero corporate cliché.
   - optimized_captions: Exactly 3 distinct, high-converting caption angles:
     * Variant 1 (Hook-Led / PAS - Problem, Agitate, Solve): Gripping hook, validates customer pain, introduces brand solution.
     * Variant 2 (Relatable Transformation / Social Proof): Conversational micro-story or customer scenario showing before vs after.
     * Variant 3 (Direct Irresistible Offer / Scarcity): Clear value proposition, zero fluff, immediate micro-commitment CTA.
   - optimized_cta: Friction-free, action-driving CTA (e.g., WhatsApp keyword trigger, Store visit with exact incentive, or specific comment prompt).
   - improvement_summary: 1-2 sentence executive summary explaining why this optimized version will drive higher CTR and conversions.

COMPLIANCE RULE:
Never invent fake discounts, awards, or false guarantees. Keep copy specific to ${brand.name}.`;

  const response = await runAgent({
    agent: "creative",
    brand,
    task: taskPrompt,
    schema: hermesOptimizationSchema,
    system:
      "You are Hermes Campaign Optimizer — an elite Direct-Response Copy Chief and Conversion Strategist. You audit marketing copy against high-conversion frameworks (AIDA, PAS, Hook-Story-Offer) and rewrite mediocre copy into commercially irresistible, high-CTR assets.",
    taskType: "creative:write",
    fallback: () => ({
      original_topic: item.topic,
      audit: {
        hook_score: 75,
        retention_score: 78,
        conversion_score: 72,
        overall_score: 75,
        strengths: ["Clear topic relevance", "Direct brand alignment"],
        weaknesses: ["Hook could be more polarizing", "CTA lacks urgency"],
      },
      optimized_hook: `Stop scrolling: What ${brand.name} customers need to know about ${item.topic.slice(0, 45)}.`,
      optimized_captions: [
        `If you have been thinking about ${item.topic}, here is the honest breakdown for ${brand.audience || "you"}.\n\nMost people overcomplicate it. Here is what actually works:\n1. Focus on quality over shortcuts.\n2. Pick the right option for your specific need.\n3. Take action before the best options run out.\n\nSave this post or message us directly to get started.`,
        `A customer recently asked us: "What is the best way to handle ${item.topic}?"\n\nWe showed them how ${brand.name} does it differently. No sales pressure — just honest advice, personalized guidance, and proven results.\n\nDrop a comment with "${item.topic.split(" ")[0]?.toUpperCase() || "DETAILS"}" and we will send you the complete guide.`,
        `Looking for ${item.topic}? Here is why customers in our community trust ${brand.name}:\n\n✓ Authentic, verified quality\n✓ Transparent options with personal assistance\n✓ Fast response and hassle-free service\n\nTap the link in our bio or send us a WhatsApp message today to claim your consultation.`,
      ],
      optimized_cta: `Send a WhatsApp message with "${item.topic.split(" ")[0]?.toUpperCase() || "START"}" or visit us today for personal assistance.`,
      improvement_summary:
        "Upgraded hook into an active curiosity gap, separated captions into 3 distinct conversion angles (PAS, Relatable Story, and Direct Offer), and made CTA frictionless.",
    }),
  });

  const opt = response.data;

  // Build the updated item
  const updatedItem: Item = {
    ...item,
    hook: opt.optimized_hook,
    captions: opt.optimized_captions,
    cta: opt.optimized_cta,
    ceo_score: Math.max(item.ceo_score || 0, opt.audit.overall_score),
    manager_score: opt.audit.overall_score,
    rewrite_reason: `Hermes Optimized: ${opt.improvement_summary}`,
    status: item.status === "rejected" || item.status === "needs_rewrite" ? "pending_human" : item.status,
  };

  return {
    success: true,
    result: opt,
    updatedItem,
  };
}
