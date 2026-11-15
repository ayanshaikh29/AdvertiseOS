import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { getRepo } from "@/lib/db/fileRepo";
import { getBrandProfile } from "@/lib/db/brands";
import { optimizeItemWithHermes } from "@/lib/agents/hermesOptimizer";

const requestSchema = z.object({
  itemId: z.string().min(1).optional(),
  campaignId: z.string().min(1).optional(),
});

export async function POST(req: Request) {
  const auth = await requireRole(["owner", "admin"]);
  if (auth instanceof NextResponse) return auth;

  const body = await req.json().catch(() => ({}));
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success || (!parsed.data.itemId && !parsed.data.campaignId)) {
    return NextResponse.json({ error: "Either itemId or campaignId is required" }, { status: 400 });
  }

  const { itemId, campaignId } = parsed.data;
  const repo = await getRepo();

  try {
    // 1. Single item optimization
    if (itemId) {
      const found = await repo.findItem(itemId);
      if (!found) {
        return NextResponse.json({ error: "Item not found" }, { status: 404 });
      }

      const campaign = await repo.getCampaign(found.campaignId);
      const brandId = campaign?.brandId || "default";
      const brand = await getBrandProfile(brandId);
      const campaignGoal = campaign?.brief?.goal || "Maximize qualified leads and conversions";

      const { result, updatedItem } = await optimizeItemWithHermes(found.item, brand, campaignGoal);

      await repo.updateItem(itemId, updatedItem);

      return NextResponse.json({
        success: true,
        item: updatedItem,
        audit: result.audit,
        summary: result.improvement_summary,
      });
    }

    // 2. Batch campaign optimization
    if (campaignId) {
      const campaign = await repo.getCampaign(campaignId);
      if (!campaign) {
        return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
      }

      const brand = await getBrandProfile(campaign.brandId);
      const campaignGoal = campaign.brief?.goal || "Maximize qualified leads and conversions";

      const items = campaign.items || [];
      const optimizedItems = [];

      for (const it of items) {
        try {
          const { updatedItem } = await optimizeItemWithHermes(it, brand, campaignGoal);
          await repo.updateItem(it.id, updatedItem);
          optimizedItems.push(updatedItem);
        } catch {
          optimizedItems.push(it);
        }
      }

      return NextResponse.json({
        success: true,
        count: optimizedItems.length,
        items: optimizedItems,
      });
    }

    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal optimization error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
