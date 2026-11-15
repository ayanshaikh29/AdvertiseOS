import { NextResponse } from "next/server";
import { z } from "zod";
import { getPublisher } from "@/lib/publish/adapter";
import { audit, getRepo } from "@/lib/db/fileRepo";

const bodySchema = z.object({ itemId: z.string().min(1), action: z.enum(["schedule", "mark-posted"]) });

/**
 * Manual publish flow (MVP): approved -> scheduled -> published.
 * Meta adapter (flagged) throws until app review + credentials are configured.
 */
export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { itemId, action } = parsed.data;
  const repo = await getRepo();
  const found = await repo.findItem(itemId);
  if (!found) return NextResponse.json({ error: "Item not found" }, { status: 404 });
  const adapter = getPublisher();
  if (action === "schedule") {
    if (found.item.status !== "approved") return NextResponse.json({ error: "Only approved items can be scheduled." }, { status: 400 });
    const item = await repo.updateItem(itemId, { status: "scheduled" });
    await audit("item.scheduled", "content_item", itemId, { adapter: adapter.name });
    return NextResponse.json({ ok: true, item, exportPackage: adapter.exportPackage(item ?? found.item) });
  }
  if (found.item.status !== "scheduled") return NextResponse.json({ error: "Schedule the item first." }, { status: 400 });
  try {
    const res = await adapter.publish(found.item);
    const item = await repo.updateItem(itemId, { status: "published" });
    await audit("item.published", "content_item", itemId, { adapter: adapter.name, externalId: res.externalId });
    return NextResponse.json({ ok: true, item, result: res, exportPackage: adapter.exportPackage(item ?? found.item) });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Publish failed", exportPackage: adapter.exportPackage(found.item) }, { status: 400 });
  }
}
