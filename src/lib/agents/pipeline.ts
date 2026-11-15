import { type BriefInput } from "@/lib/schemas";
import { audit, getRepo } from "@/lib/db/fileRepo";
import { toItems, type Asset, type Campaign } from "@/lib/db/repo";
import type { BrandProfile } from "@/lib/brand";
import { ceoPlan, ceoReview, contentRun, designerRun, strategistRun, videoRun } from "@/lib/agents";
import { renderCreative } from "@/lib/image/provider";
import { notify } from "@/lib/notify";
import type { Trend } from "@/lib/db/repo";
import type { CatalogItem } from "@/lib/db/repo";
import { buildCampaignContext, contextToPrompt, type CampaignContext } from "@/lib/campaignContext";
import { validateContent, validateDesign, validateVideo, validateReview, buildRegenerationPrompt, type ValidationIssue, type ContentValidationInput, type DesignValidationInput, type VideoValidationInput, type ReviewValidationInput } from "@/lib/validation";

const LIMIT = Number(process.env.MONTHLY_COST_LIMIT_USD ?? 50);
const VISUAL = new Set(["post", "carousel", "reel", "ad", "story"]);
const MAX_REGENERATION_ATTEMPTS = 2;

/** One agent stage starting — emitted to the UI as a live SSE event. */
export type PipelineProgress = { step: string; label: string };

/** Shared campaign pipeline (Phase 5 briefs + Phase 6C autopilot).
 * Every generated item lands `pending_human` — nothing publishes without approval. */
export async function runCampaignPipeline({
  brand,
  brief,
  trends = [],
  source = "brief",
  onProgress,
}: {
  brand: BrandProfile;
  brief: BriefInput;
  trends?: Trend[];
  source?: "brief" | "autopilot";
  /** Called when each agent stage starts (used for live progress streaming). */
  onProgress?: (e: PipelineProgress) => void;
}): Promise<{ campaignId: string; items: number; images: number; videoPlans: number; costUsd: number; plan: import("@/lib/schemas").CeoPlan }> {
  const progress = onProgress ?? (() => {});
  const repo = await getRepo();
  const campaignId = `cmp-${Date.now()}`;
  const catalog = await repo.listCatalog(brief.brandId);
  const active = catalog.filter((c) => c.status === "active").slice(0, 5);

  // Build canonical campaign context
  const context = buildCampaignContext({
    campaignId,
    brand,
    brief: {
      goal: brief.goal,
      month: brief.month,
      budget: brief.budget,
      offers: brief.offers,
      festivals: brief.festivals,
      notes: brief.notes,
    },
    catalog: active,
    trends,
    constraints: {
      channels: ["instagram", "facebook", "linkedin"],
      formats: ["post", "carousel", "reel", "story", "ad"],
      minPosts: 10,
      maxPosts: 30,
    },
  });

  const fullContextPrompt = contextToPrompt(context);

  progress({ step: "ceo", label: "CEO is reviewing your brief & building the strategy plan" });
  const plan = await ceoPlan(brand, fullContextPrompt);
  progress({ step: "strategist", label: "Strategist is building the 30-day content calendar" });
  const strategy = await strategistRun(brand, fullContextPrompt, brief.month);
  const slice = strategy.data.calendar.slice(0, 10);
  
  // Content generation with validation and regeneration
  progress({ step: "content", label: `Content Creator is writing ${slice.length} captions, hooks & CTAs` });
  const contents = [];
  for (let idx = 0; idx < slice.length; idx++) {
    const calendarItem = slice[idx];
    if (!calendarItem) continue;
    let result = await contentRun(brand, fullContextPrompt, calendarItem.topic, calendarItem.platform, calendarItem.format);
    let attempts = 0;
    
    // Build existing content for duplicate detection from already completed items
    const existingContent = contents.map((completed) => ({
      topic: completed.calendarItem?.topic ?? "",
      hook: completed.calendarItem?.hook ?? "",
      caption: completed.data?.caption_variants?.[0] ?? "",
    }));

    while (attempts < MAX_REGENERATION_ATTEMPTS) {
      const validation = validateContent({
        content: result.data,
        calendarItem,
        context,
        existingContent,
      } as ContentValidationInput);
      
      if (validation.passed) break;
      
      attempts++;
      progress({ step: `content-retry-${idx}`, label: `Regenerating content for "${calendarItem.topic}" (attempt ${attempts + 1})` });
      
      const retryPrompt = buildRegenerationPrompt(
        `Write content for topic "${calendarItem.topic}" on ${calendarItem.platform} as ${calendarItem.format}. Provide exactly 3 caption variants, up to 10 hashtags, a CTA, and alt text.`,
        validation.issues,
        context
      );
      
      result = await contentRun(brand, retryPrompt, calendarItem.topic, calendarItem.platform, calendarItem.format);
    }
    
    contents.push({ data: result.data, run: result.run, calendarItem });
  }
  
  // Convert to the expected format
  const contentResults = contents.map(c => ({ data: c.data, run: c.run }));
  
  progress({ step: "score", label: "Reviewer is giving every draft an AI quality score" });
  const reviews = await Promise.all(contentResults.map(async (c, idx) => {
    let result = await ceoReview(brand, fullContextPrompt, c.data.caption_variants[0] ?? "");
    let attempts = 0;
    
    while (attempts < MAX_REGENERATION_ATTEMPTS) {
      const validation = validateReview({
        review: result.data,
        content: c.data,
        context,
      });
      
      if (validation.passed) break;
      
      attempts++;
      progress({ step: `review-retry-${idx}`, label: `Regenerating review for item ${idx + 1} (attempt ${attempts + 1})` });
      
      const retryPrompt = buildRegenerationPrompt(
        `Review this copy against brand rules AND campaign relevance. Score 0-100. Copy: """${c.data.caption_variants[0]}"""`,
        validation.issues,
        context
      );
      
      result = await ceoReview(brand, retryPrompt, c.data.caption_variants[0] ?? "");
    }
    
    return result;
  }));

  // Designer with validation
  progress({ step: "designer", label: "Designer is creating post visuals & ad creatives" });
  const designs = await Promise.all(
    slice.map(async (c, idx) => {
      if (!VISUAL.has(c.format)) return null;
      
      let result = await designerRun(brand, fullContextPrompt, c.topic, c.platform, c.format);
      let attempts = 0;
      
      while (attempts < MAX_REGENERATION_ATTEMPTS) {
        const contentItem = contentResults[idx];
        if (!contentItem) break;
        const validation = validateDesign({
          design: result.data as import("@/lib/schemas").DesignBrief,
          calendarItem: c,
          content: contentItem.data,
          context,
        });
        
        if (validation.passed) break;
        
        attempts++;
        progress({ step: `design-retry-${idx}`, label: `Regenerating design for "${c.topic}" (attempt ${attempts + 1})` });
        
        const retryPrompt = buildRegenerationPrompt(
          `Create a design brief for "${c.topic}" (${c.platform} ${c.format}). Headline max 80 chars, subtext max 200, exact text only. Template: bold-center|split|minimal|festival.`,
          validation.issues,
          context
        );
        
        result = await designerRun(brand, retryPrompt, c.topic, c.platform, c.format);
      }
      
      return result;
    })
  );
  
  const creatives = await Promise.all(
    designs.map((d, i) => {
      if (!d) return Promise.resolve(null);
      const c = slice[i];
      if (!c) return Promise.resolve(null);
      return renderCreative(
        {
          headline: d.data.headline,
          subtext: d.data.subtext ?? "",
          cta: contentResults[i]?.data.cta ?? "",
          brandName: brand.name.replace(" (Sample data)", ""),
          primary: "#2563EB",
          template_id: d.data.template_id,
          size: d.data.size ?? "1080x1080",
        },
        d.data.image_prompt
      );
    })
  );

  // Video with validation
  const reelIdx = slice.map((c, i) => (c.format === "reel" ? i : -1)).filter((i) => i >= 0).slice(0, 2);
  if (reelIdx.length) progress({ step: "video", label: `Video Team is writing ${reelIdx.length} reel script(s) & shot plans` });
  const videos = await Promise.all(
    reelIdx.map(async (i) => {
      const calendarItem = slice[i];
      if (!calendarItem) return { i, plan: null as any, cost: 0 };
      let result = await videoRun(brand, fullContextPrompt, calendarItem.topic ?? "");
      let attempts = 0;
      
      while (attempts < MAX_REGENERATION_ATTEMPTS) {
        const validation = validateVideo({
          video: result.data,
          calendarItem,
          context,
        });
        
        if (validation.passed) break;
        
        attempts++;
        progress({ step: `video-retry-${i}`, label: `Regenerating video for "${slice[i]?.topic}" (attempt ${attempts + 1})` });
        
        const retryPrompt = buildRegenerationPrompt(
          `Plan a 30s vertical (9:16) reel for "${slice[i]?.topic}". 3-5 scenes with visual, shot_type, duration_s, on_screen_text (max 80 chars), voiceover. Include music_mood, captions_srt, thumbnail_idea.`,
          validation.issues,
          context
        );
        
        result = await videoRun(brand, retryPrompt, slice[i]?.topic ?? "");
      }
      
      return { i, plan: result.data, cost: result.run.costUsd };
    })
  );
  const videoByIdx = new Map(videos.map((v) => [v.i, v.plan]));

  const runs = [plan, strategy, ...contentResults, ...reviews, ...designs.filter((d) => d !== null)];
  const costUsd = runs.reduce((s, r) => s + r.run.costUsd, 0) + videos.reduce((s, v) => s + v.cost, 0);
  if (costUsd > LIMIT) throw new Error(`Monthly cost limit exceeded ($${LIMIT}). Stopped gracefully.`);
  const now = new Date().toISOString();
  for (const r of runs) {
    await repo.addRun({
      agent: r.run.agent,
      costUsd: r.run.costUsd,
      latencyMs: r.run.latencyMs,
      status: r.run.status,
      model: r.run.model,
      inputTokens: r.run.tokens.input,
      outputTokens: r.run.tokens.output,
      created_at: now,
    });
  }

  const extras = slice.map((c, i) => {
    const d = designs[i]?.data;
    return {
      design: d ? { ...d, subtext: d.subtext ?? "", size: d.size ?? "1080x1080", text_overlays: d.text_overlays ?? [] } : undefined,
      image_url: creatives[i]?.url,
      video_plan: videoByIdx.get(i),
    };
  });
  const items = toItems(strategy.data.calendar, contentResults.map((c) => c.data), reviews.map((r) => r.data.score), extras);
  const assets: Asset[] = items.flatMap((item, i) => {
    const cr = creatives[i];
    const d = designs[i]?.data;
    if (!cr || !d) return [];
    return [
      {
        id: `asset-${campaignId}-${i + 1}`,
        campaignId,
        kind: "image" as const,
        url: cr.url,
        width: cr.width,
        height: cr.height,
        template_id: d.template_id,
        headline: d.headline,
        topic: item.topic,
        sample: false,
      },
    ];
  });

  const campaign: Campaign = {
    id: campaignId,
    brandId: brief.brandId,
    brief,
    plan: plan.data as Campaign["plan"],
    calendar: strategy.data.calendar,
    items,
    assets,
    videoPlans: videos.map((v) => ({ itemId: `item-${v.i + 1}`, topic: slice[v.i]?.topic ?? "", plan: v.plan })),
    costUsd,
    createdAt: now,
  };
  progress({ step: "save", label: `Saving campaign — ${slice.length} posts queued for your approval` });
  await repo.saveCampaign(campaign);
  await audit(`${source}.completed`, "campaign", campaignId, { items: slice.length, costUsd, trendsUsed: trends.length });
  await notify("AdvertiseOS: approvals needed", `${slice.length} items with CEO scores are waiting in the approval inbox.`);
  return { campaignId, items: slice.length, images: assets.length, videoPlans: videos.length, costUsd, plan: plan.data as import("@/lib/schemas").CeoPlan };
}
