import type { Item } from "@/lib/db/repo";

export type CampaignSummary = {
  id: string;
  brandId: string;
  costUsd: number;
  createdAt: string;
  itemCount: number;
  brief?: { goal?: string; month?: string };
};

export type FlatContentItem = Item & {
  campaignId: string;
  brandId: string;
  campaignGoal: string;
};

type CampaignDetail = { id: string; brandId?: string; brief?: { goal?: string }; items?: Item[] };

/**
 * Client helper: aggregates content items across campaigns (newest first).
 * No dedicated backend exists for a cross-campaign feed, so this fans out to
 * the per-campaign detail endpoint for the most recent campaigns.
 */
export async function fetchAllContentItems(limit = 12): Promise<{
  campaigns: CampaignSummary[];
  items: FlatContentItem[];
}> {
  const listRes = await fetch("/api/campaigns");
  if (!listRes.ok) throw new Error(`HTTP ${listRes.status}`);
  const listData = await listRes.json();
  const campaigns: CampaignSummary[] = listData.campaigns ?? [];

  const details = await Promise.all(
    campaigns.slice(0, limit).map(async (c) => {
      try {
        const res = await fetch(`/api/campaigns/${c.id}`);
        if (!res.ok) return null;
        const data = await res.json();
        return (data.campaign as CampaignDetail | undefined) ?? null;
      } catch {
        return null;
      }
    })
  );

  const items: FlatContentItem[] = details
    .filter((c): c is CampaignDetail & { items: Item[] } => Boolean(c && c.items))
    .flatMap((c) =>
      c.items.map((it) => ({
        ...it,
        campaignId: c.id,
        brandId: c.brandId ?? "",
        campaignGoal: c.brief?.goal?.slice(0, 90) ?? c.id,
      }))
    )
    .sort((a, b) => (a.scheduled_for < b.scheduled_for ? 1 : a.scheduled_for > b.scheduled_for ? -1 : 0));

  return { campaigns, items };
}
