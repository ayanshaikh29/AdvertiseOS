import { z } from "zod";
import { requestIntentSchema, type RequestIntent } from "@/lib/schemas";
import { getLLM } from "@/lib/llm";
import type { BrandProfile } from "@/lib/brand";

/** Classifies one user instruction into a scoped execution plan so the orchestrator
 * only runs the agents the request actually needs. A single caption request must
 * never launch the whole agency (cost + latency).
 *
 * Primary path: LLM structured output (Gemini when configured).
 * Fallback: deterministic keyword heuristics — always returns a valid plan. */

const SYSTEM = `You are the AI Project Manager of a marketing agency. Classify the user's request into a precise execution scope.
Rules:
- kind "single_content": one caption/post/ad copy, no calendar, no strategy.
- kind "content_calendar": multiple posts/captions over days, may include reels count.
- kind "full_campaign": strategy + calendar + content + creatives + (optional) reels + measurement.
- kind "strategy_only": plan/pillars/funnel only, no copywriting.
- kind "creative_only": image ad concepts/design briefs only.
- kind "video_only": reel/video scripts or storyboards only.
- kind "audit_only": account/brand/channel review only.
- kind "crm_only": leads, pipeline, follow-ups only.
- kind "performance_only": metrics, reports, optimization only.
- kind "general_chat": greeting, question, or meta-discussion — no production run.
Extract explicit counts (posts, reels, ads), platforms, duration, budget (null if not stated), industry and topic. Never invent a budget.
Set needs_* flags strictly from what the request requires. For full_campaign set needs_strategy, needs_calendar, needs_content true and needs_design true when visual formats are requested.`;

export function heuristicIntent(instruction: string): RequestIntent {
  const text = instruction.toLowerCase();
  const has = (...keys: string[]) => keys.some((k) => text.includes(k));

  const postMatch = text.match(/(\d+)\s*(?:[a-z]+\s+){0,4}(posts?|captions?|post)\b/i);
  const reelMatch = text.match(/(\d+)\s*(?:[a-z]+\s+){0,4}(reels?|videos?|storyboards?)\b/i);
  const adMatch = text.match(/(\d+)\s*(?:[a-z]+\s+){0,3}(ad\s*concepts?|ads?|creatives?)\b/i);
  const dayMatch = text.match(/(\d+)[\s-]*day/);
  const budgetMatch = text.match(
    /(?:budget|rs\.?|₹|inr)\s*[:\-]?\s*₹?\s*([\d,]+(?:\.\d+)?)\s*(?:k|thousand|lakh|lac)?/i
  );

  const platforms: RequestIntent["platforms"] = [];
  if (has("instagram", "insta", "reel")) platforms.push("instagram");
  if (has("facebook", "meta ads")) platforms.push("facebook");
  if (has("linkedin")) platforms.push("linkedin");
  if (has("blog")) platforms.push("blog");
  if (has("email", "newsletter")) platforms.push("email");
  if (platforms.length === 0) platforms.push("instagram");

  const formats: RequestIntent["formats"] = [];
  if (has("reel", "video", "storyboard", "shorts")) formats.push("reel");
  if (has("carousel")) formats.push("carousel");
  if (has("story", "stories")) formats.push("story");
  if (has("ad concept", "ads", "creative", "ad copy")) formats.push("ad");
  if (formats.length === 0 || (!has("reel", "video") && has("post", "caption", "content"))) formats.push("post");
  if (formats.length === 0) formats.push("post");

  const wantsCalendar = has("calendar", "30-day", "30 day", "monthly", "month", "schedule");
  const wantsCampaign = has("campaign", "strategy", "marketing plan", "growth plan") || ((has("diwali") || has("festive")) && (has("campaign") || has("plan") || has("strategy")));

  const reelCount = reelMatch
    ? Number(reelMatch[1])
    : has("reel", "video", "storyboard")
      ? 3
      : // Full campaign / calendar package includes reels by default (agency standard).
      wantsCampaign || wantsCalendar
      ? 4
      : 0;
  const adCount = adMatch ? Number(adMatch[1]) : 0;
  const wantsAudit = has("audit", "review account", "analyze profile", "analyse account", "account review");
  const wantsResearch = has("competitor", "competitors", "market research", "swot", "audience research", "landscape", "rivals");
  const wantsBrandVoice = has("brand voice", "brand tone", "guidelines", "messaging", "brand identity");
  const wantsSeo = has("seo", "keyword", "keywords", "search engine", "ranking", "search intent");
  const wantsVideo = reelCount > 0 || has("reel script", "storyboard", "video script");
  const wantsCreative = has("creative", "creatives", "design", "ad concept", "banner", "poster", "graphic");
  const wantsCrm = has("crm", "lead", "follow-up", "follow up", "pipeline", "inbox", "sales");
  const wantsPerf = has("performance", "analytics", "report", "metrics", "roas", "optimize campaign", "improve campaign");

  // Default to 12 posts ONLY when a multi-post/schedule intent is present —
  // a single "write a caption" request must never inflate into a calendar run.
  const isExplicitSingle = has("1 caption", "ek caption", "one caption", "single caption", "a caption", "1 post", "ek post", "one post", "caption likho") || (has("caption") && !wantsCalendar && !has("posts", "calendar", "month"));
  const multiPostSignal = !isExplicitSingle && (wantsCalendar || wantsCampaign || /\bposts?\b.*\b(calendar|schedule|month)\b|\b(calendar|schedule)\b.*\bposts?\b/i.test(text));
  const postCount = postMatch ? Number(postMatch[1]) : multiPostSignal ? 12 : 1;

  let kind: RequestIntent["kind"] = "general_chat";
  if (wantsResearch && !wantsCampaign && !wantsCalendar) kind = "research_only";
  else if (wantsBrandVoice && !wantsCampaign && !wantsCalendar) kind = "brand_voice_only";
  else if (wantsSeo && !wantsCampaign && !wantsCalendar) kind = "seo_only";
  else if (wantsCampaign && (wantsCalendar || postCount > 1 || reelCount > 0)) kind = "full_campaign";
  else if (wantsAudit && !wantsCampaign) kind = "audit_only";
  else if (wantsCrm && !wantsCampaign) kind = "crm_only";
  else if (wantsPerf && !wantsCampaign) kind = "performance_only";
  else if (wantsVideo && !wantsCalendar && postCount <= 1) kind = "video_only";
  else if (wantsCreative && !wantsCalendar && postCount <= 1 && reelCount === 0) kind = "creative_only";
  else if (has("strategy", "pillars", "positioning") && !wantsCalendar) kind = "strategy_only";
  else if (wantsCalendar || postCount > 1 || reelCount > 1) kind = "content_calendar";
  else if (has("caption", "post", "write", "copy", "hook", "ad copy")) kind = "single_content";
  else if (wantsCampaign) kind = "full_campaign";

  const needsCalendar = kind === "full_campaign" || kind === "content_calendar";
  const needsContent = kind === "full_campaign" || kind === "content_calendar" || kind === "single_content";
  const needsDesign = kind === "creative_only" || (kind === "full_campaign" && (formats.includes("ad") || formats.includes("post") || formats.includes("carousel")));

  const intentResult = requestIntentSchema.safeParse({
    kind,
    goal: instruction.slice(0, 200),
    platforms,
    formats: [...new Set(formats)],
    post_count: Math.min(31, postCount),
    reel_count: Math.min(12, reelCount),
    ad_count: Math.min(12, adCount || (wantsCreative && postMatch ? Number(postMatch[1]) : 0)),
    duration_days: dayMatch ? Math.min(31, Number(dayMatch[1])) : 30,
    budget: budgetMatch?.[1] ? Number(budgetMatch[1].replace(/,/g, "")) : null,
    industry: "",
    topic: "",
    needs_strategy: kind === "full_campaign" || kind === "strategy_only",
    needs_calendar: needsCalendar,
    needs_content: needsContent,
    needs_design: needsDesign || kind === "content_calendar",
    // Agency package standard: full campaigns include 4 reel scripts unless user said 0 reels.
    needs_video:
      kind === "video_only" ||
      kind === "full_campaign" ||
      kind === "content_calendar"
        ? reelCount > 0 || kind === "video_only" || kind === "full_campaign" || /reel/i.test(text)
        : wantsVideo || reelCount > 0,
    needs_audit: kind === "audit_only" || kind === "full_campaign",
    needs_crm: kind === "crm_only" || kind === "full_campaign",
    needs_performance: kind === "performance_only" || kind === "full_campaign",
    needs_research: kind === "research_only" || kind === "full_campaign" || wantsResearch,
    needs_brand_voice: kind === "brand_voice_only" || kind === "full_campaign" || wantsBrandVoice,
    needs_seo: kind === "seo_only" || kind === "full_campaign" || wantsSeo,
    needs_critic: kind !== "general_chat",
  });
  if (!intentResult.success) {
    // Schema validation failed — fall back to a safe default intent.
    return requestIntentSchema.parse({
      kind: "general_chat",
      goal: instruction.slice(0, 200),
      platforms: ["instagram"],
      formats: ["post"],
      post_count: 1,
      reel_count: 0,
      ad_count: 0,
      duration_days: 30,
      budget: null,
      industry: "",
      topic: "",
      needs_strategy: false,
      needs_calendar: false,
      needs_content: false,
      needs_design: false,
      needs_video: false,
      needs_audit: false,
      needs_crm: false,
      needs_performance: false,
    });
  }
  return intentResult.data;
}

export async function classifyIntent(
  instruction: string,
  brand: BrandProfile,
  attachmentText = ""
): Promise<{ intent: RequestIntent; source: "llm" | "heuristic" }> {
  const heuristic = heuristicIntent(instruction);
  const llm = getLLM();
  if (llm.sample) return { intent: heuristic, source: "heuristic" };

  try {
    const { data } = await llm.json({
      system: SYSTEM,
      user: `Brand: ${brand.name}. Products: ${brand.products}. Audience: ${brand.audience}.\nAttachments: ${attachmentText || "none"}\n\nUser instruction:\n"""${instruction.slice(0, 3000)}"""`,
      schema: requestIntentSchema as z.ZodType<RequestIntent>,
      cacheKey: "intent-classifier",
      temperature: 0,
    });
    const parsed = requestIntentSchema.safeParse(data);
    if (!parsed.success) return { intent: heuristic, source: "heuristic" };
    // Heuristic safety net: never lose explicit counts/budget the user typed.
    // User-typed numbers always win over LLM extraction.
    const merged = { ...parsed.data };
    if (heuristic.budget != null && heuristic.budget > 0) merged.budget = heuristic.budget;
    if (heuristic.post_count && heuristic.post_count > 1) merged.post_count = heuristic.post_count;
    if (heuristic.reel_count && heuristic.reel_count > 0) merged.reel_count = heuristic.reel_count;
    if (heuristic.kind === "general_chat" && merged.kind !== "general_chat") {
      // LLM saw production intent the keyword pass missed — trust LLM.
    }
    return { intent: merged, source: "llm" };
  } catch {
    return { intent: heuristic, source: "heuristic" };
  }
}
