import { getPublisher } from "@/lib/publish/adapter";
import { audit, getRepo } from "@/lib/db/fileRepo";
import type { Item } from "@/lib/db/repo";

/** Autopilot tick (Phase 6C): publishes scheduled items whose time has come.
 * Approval is always human — this only executes items already approved+scheduled. */

export function findDueItems(items: Item[], now: Date): Item[] {
  return items.filter((i) => {
    if (i.status !== "scheduled" || !i.scheduled_for) return false;
    const t = Date.parse(i.scheduled_for);
    return Number.isFinite(t) && t <= now.getTime();
  });
}

export async function runPublishTick(now = new Date()): Promise<{ published: number; failed: Array<{ id: string; error: string }>; due: number }> {
  const repo = await getRepo();
  const all = await repo.listItems();
  const due = findDueItems(all, now);
  const adapter = getPublisher();
  let published = 0;
  const failed: Array<{ id: string; error: string }> = [];
  for (const item of due) {
    try {
      const res = await adapter.publish(item);
      await repo.updateItem(item.id, { status: "published" });
      await audit("item.published", "content_item", item.id, { adapter: adapter.name, externalId: res.externalId, by: "autopilot-tick" });
      published += 1;
    } catch (e) {
      failed.push({ id: item.id, error: e instanceof Error ? e.message : String(e) });
    }
  }
  await audit("autopilot.tick", "autopilot", "tick", { due: due.length, published, failed: failed.length });
  return { published, failed, due: due.length };
}
