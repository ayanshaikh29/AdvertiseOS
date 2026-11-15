import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { getRepo } from "@/lib/db/fileRepo";
import { getBrandProfile } from "@/lib/db/brands";
import { contentRun, ceoReview } from "@/lib/agents";
import { buildCampaignContext, contextToPrompt } from "@/lib/campaignContext";

const bodySchema = z.object({
  itemId: z.string().min(1),
});

/** Regenerate a single content item's copy (bounded single call, keyed by itemId
 * so double-clicks don't double-bill). */
const inFlight = new Set<string>();

export async function POST(req: Request) {
  const auth = await requireRole(["owner", "admin"]);
  if (auth instanceof NextResponse) return auth;

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "itemId required" }, { status: 400 });
  const { itemId } = parsed.data;

  if (inFlight.has(itemId)) {
    return NextResponse.json({ error: "Regeneration already running for this item" }, { status: 409 });
  }
  inFlight.add(itemId);

  try {
    const repo = await getRepo();
    const found = await repo.findItem(itemId);
    if (!found) return NextResponse.json({ error: "Item not found" }, { status: 404 });

    const campaign = await repo.getCampaign(found.campaignId);
    if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

    const brand = await getBrandProfile(campaign.brandId);
    const activeCatalog = (await repo.listCatalog(brand.id)).filter((c) => c.status === "active").slice(0, 5);
    const brief = campaign.brief;

    const context = buildCampaignContext({
      campaignId: campaign.id,
      brand,
      brief: {
        goal: brief.goal,
        month: brief.month,
        budget: brief.budget,
        offers: brief.offers,
        festivals: brief.festivals,
        notes: brief.notes,
      },
      catalog: activeCatalog,
      previousContent: campaign.items
        .filter((i) => i.id !== itemId)
        .slice(-10)
        .map((i) => ({
          topic: i.topic,
          hook: i.hook ?? "",
          caption: i.captions[0] ?? "",
          platform: i.platform,
          format: i.format,
        })),
    });
    const fullContextPrompt = contextToPrompt(context);

    const item = found.item;
    const content = await contentRun(brand, fullContextPrompt, item.topic, item.platform, item.format);
    const review = await ceoReview(brand, fullContextPrompt, content.data.caption_variants[0] || "");

    const updated = await repo.updateItem(itemId, {
      captions: content.data.caption_variants,
      hashtags: content.data.hashtags,
      cta: content.data.cta,
      hook: content.data.hook,
      objective: content.data.objective,
      audience: content.data.audience,
      carousel_slides: content.data.carousel_slides,
      reel_script: content.data.reel_script,
      ad_copy: content.data.ad_copy,
      ceo_score: review.data.score,
      status: item.status === "approved" || item.status === "rejected" ? "pending_human" : item.status,
    });

    await repo.addRun({
      agent: "content",
      costUsd: content.run.costUsd,
      latencyMs: content.run.latencyMs,
      status: content.run.status,
      model: content.run.model,
      inputTokens: content.run.tokens.input,
      outputTokens: content.run.tokens.output,
      created_at: new Date().toISOString(),
    });

    if (!updated) return NextResponse.json({ error: "Failed to persist update" }, { status: 500 });
    return NextResponse.json({
      item: updated,
      review: { score: review.data.score, passed: review.data.passed },
      note: review.data.passed ? undefined : review.data.feedback_for_agent,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Regeneration failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  } finally {
    inFlight.delete(itemId);
  }
}
