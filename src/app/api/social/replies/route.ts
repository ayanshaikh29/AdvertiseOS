import { NextResponse } from "next/server";
import { z } from "zod";
import { replyDraftsRun, socialPlanRun } from "@/lib/agents";
import { getBrandProfile } from "@/lib/db/brands";
import { getRepo } from "@/lib/db/fileRepo";

const commentsSchema = z.object({
  comments: z.array(z.object({ id: z.string(), text: z.string().min(1).max(1000), author: z.string().min(1).max(80) })).min(1).max(20),
});

/** Draft replies. Complaints/legal/pricing are flagged needs_human — never auto-sent. */
export async function POST(req: Request) {
  const parsed = commentsSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const repo = await getRepo();
  const brands = await repo.listBrands();
  const brandId = brands[0]?.id;
  if (!brandId) return NextResponse.json({ error: "Add a brand first (or load sample data)." }, { status: 400 });
  const { data, run } = await replyDraftsRun(await getBrandProfile(brandId), parsed.data.comments);
  await repo.addRun({ agent: "social", costUsd: run.costUsd, latencyMs: run.latencyMs, status: run.status, model: run.model, inputTokens: run.tokens.input, outputTokens: run.tokens.output, created_at: new Date().toISOString() });
  return NextResponse.json({ drafts: data, escalated: data.filter((d) => d.needs_human).length });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const repo = await getRepo();
  const campaigns = await repo.listCampaigns();
  const campaignId = searchParams.get("campaignId") ?? campaigns[campaigns.length - 1]?.id;
  const campaign = campaignId ? await repo.getCampaign(campaignId) : undefined;
  if (!campaign) return NextResponse.json({ error: "No campaign yet." }, { status: 404 });
  const dates = campaign.calendar.slice(0, 10).map((c) => c.date);
  const { data } = await socialPlanRun(await getBrandProfile(campaign.brandId), dates);
  return NextResponse.json({ campaignId, ...data });
}
