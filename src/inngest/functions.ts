import { inngest } from "@/inngest/client";
import { ceoPlan, ceoReview, contentRun, designerRun, strategistRun, videoRun } from "@/lib/agents";
import { getBrandProfile } from "@/lib/db/brands";
import { getRepo } from "@/lib/db/fileRepo";
import { toItems } from "@/lib/db/repo";
import { renderCreative } from "@/lib/image/provider";
import { buildCampaignContext, contextToPrompt, type CampaignContext } from "@/lib/campaignContext";
import type { Trend } from "@/lib/db/repo";
import type { CatalogItem } from "@/lib/db/repo";

/**
 * campaign.run: brief.created -> CEO plan -> Strategist -> Content (parallel)
 * -> Designer + Video -> CEO review -> persisted items (resumable per step).
 * Brand comes from the campaign's brandId — never hardcoded.
 */
export const campaignRun = inngest.createFunction(
  { id: "campaign-run", retries: 2 },
  { event: "brief.created" },
  async ({ event, step }) => {
    const { brief, month, campaignId } = event.data as { brief: string; month: string; campaignId: string };
    const repo = await getRepo();
    const existing = await step.run("load", async () => repo.getCampaign(campaignId));
    if (!existing) throw new Error(`Campaign not found: ${campaignId}`);
    const brand = await getBrandProfile(existing.brandId);
    
    // Build context
    const catalog = await repo.listCatalog(existing.brandId);
    const active = catalog.filter((c) => c.status === "active").slice(0, 5);
    const context = buildCampaignContext({
      campaignId,
      brand,
      brief: { goal: brief, month, offers: "", festivals: "", notes: "" },
      catalog: active,
      trends: [],
    });
    const fullContextPrompt = contextToPrompt(context);

    const plan = await step.run("ceo-plan", async () => ceoPlan(brand, fullContextPrompt));
    const strategy = await step.run("strategist", async () => strategistRun(brand, fullContextPrompt, month));
    const slice = strategy.data.calendar.slice(0, 10);
    const contents = await Promise.all(
      slice.map((c, i) =>
        step.run(`content-${i}`, async () => contentRun(brand, fullContextPrompt, c.topic, c.platform, c.format))
      )
    );
    const reviews = await Promise.all(
      contents.map((c, i) =>
        step.run(`review-${i}`, async () => ceoReview(brand, fullContextPrompt, c.data.caption_variants[0] ?? ""))
      )
    );
    const designs = await Promise.all(
      slice.map((c, i) =>
        step.run(`design-${i}`, async () => designerRun(brand, fullContextPrompt, c.topic, c.platform, c.format))
      )
    );
    const reelIdx = slice.map((c, i) => (c.format === "reel" ? i : -1)).filter((i) => i >= 0).slice(0, 2);
    const videos = await Promise.all(
      reelIdx.map((i) =>
        step.run(`video-${i}`, async () => videoRun(brand, fullContextPrompt, slice[i]?.topic ?? ""))
      )
    );
    await step.run("persist", async () => {
      const scores = reviews.map((r) => r.data.score);
      const extras = await Promise.all(
        slice.map(async (c, i) => {
          const raw = designs[i]?.data;
          const d = raw ? { ...raw, subtext: raw.subtext ?? "", size: raw.size ?? "1080x1080", text_overlays: raw.text_overlays ?? [] } : undefined;
          const creative = d
            ? await renderCreative(
                {
                  headline: d.headline,
                  subtext: d.subtext,
                  cta: contents[i]?.data.cta ?? "",
                  brandName: brand.name.replace(" (Sample data)", ""),
                  primary: "#2563EB",
                  template_id: d.template_id,
                  size: d.size,
                },
                d.image_prompt
              )
            : null;
          return { design: d, image_url: creative?.url, video_plan: undefined };
        })
      );
      const items = toItems(strategy.data.calendar, contents.map((c) => c.data), scores, extras);
      const campaign = await repo.getCampaign(campaignId);
      if (!campaign) return;
      campaign.items = items;
      campaign.assets = items.flatMap((item, i) => {
        const d = extras[i]?.design;
        const url = extras[i]?.image_url;
        if (!d || !url) return [];
        return [
          {
            id: `asset-${campaignId}-${i + 1}`,
            campaignId,
            kind: "image" as const,
            url,
            width: Number((d.size ?? "1080x1080").split("x")[0]),
            height: Number((d.size ?? "1080x1080").split("x")[1]),
            template_id: d.template_id,
            headline: d.headline,
            topic: item.topic,
            sample: false,
          },
        ];
      });
      campaign.videoPlans = videos.map((v, k) => ({
        itemId: `item-${(reelIdx[k] ?? 0) + 1}`,
        topic: slice[reelIdx[k] ?? 0]?.topic ?? "",
        plan: v.data,
      }));
      await repo.saveCampaign(campaign);
    });
    return { campaignId, items: slice.length };
  }
);

export const functions = [campaignRun];
