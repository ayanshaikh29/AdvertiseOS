import { NextResponse } from "next/server";
import { approvalActionSchema } from "@/lib/schemas";
import { audit, getRepo } from "@/lib/db/fileRepo";

export async function GET(req: Request) {
  const repo = await getRepo();
  const { searchParams } = new URL(req.url);
  const campaigns = await repo.listCampaigns();
  const campaignId = searchParams.get("campaignId") ?? campaigns[campaigns.length - 1]?.id;
  const campaign = campaignId ? await repo.getCampaign(campaignId) : undefined;
  if (!campaign) return NextResponse.json({ items: [], note: "No campaign yet — create a brief first. (Sample data)" });
  return NextResponse.json({ campaignId, items: campaign.items, costUsd: campaign.costUsd });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const parsed = approvalActionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { itemId, action, reason } = parsed.data;
  if (action === "reject" && !reason) {
    return NextResponse.json({ error: "Rejection reason required (feeds brand memory)." }, { status: 400 });
  }
  const repo = await getRepo();
  const found = await repo.findItem(itemId);
  if (!found) return NextResponse.json({ error: "Item not found" }, { status: 404 });
  const status = action === "approve" ? "approved" : action === "reject" ? "rejected" : found.item.status;
  const item = await repo.updateItem(itemId, { status });
  // Brand memory loop: persist approved/rejected examples for the next Strategist run (5B injects them).
  const brandId = (await repo.getCampaign(found.campaignId))?.brandId ?? "unknown";
  if (action === "reject" && reason) {
    await repo.addMemory({ id: `mem-${Date.now()}`, brand_id: brandId, kind: "rejected_example", content: `${found.item.topic}: ${reason}`, source_item_id: itemId });
  } else if (action === "approve") {
    await repo.addMemory({ id: `mem-${Date.now()}`, brand_id: brandId, kind: "approved_example", content: `${found.item.topic}: ${found.item.captions[0] ?? ""}`.slice(0, 500), source_item_id: itemId });
  }
  await audit(`item.${action}d`, "content_item", itemId, reason ? { reason } : {});
  return NextResponse.json({ ok: true, item, learned: action === "reject" ? `AI learned: ${reason}` : "Saved as approved example" });
}
