import { videoPlanToMarkdown } from "@/lib/video";
import { getRepo } from "@/lib/db/fileRepo";

/** Export a campaign's video plans as one Markdown file (print to PDF from the browser). */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const repo = await getRepo();
  const campaigns = await repo.listCampaigns();
  const campaignId = searchParams.get("campaignId") ?? campaigns[campaigns.length - 1]?.id;
  const campaign = campaignId ? await repo.getCampaign(campaignId) : undefined;
  if (!campaign || campaign.videoPlans.length === 0) {
    return Response.json({ error: "No video plans for this campaign yet." }, { status: 404 });
  }
  const md = campaign.videoPlans.map((v) => videoPlanToMarkdown(v.plan, v.topic)).join("\n---\n\n");
  return new Response(md, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="advertiseos-${campaignId}-video-plans.md"`,
    },
  });
}
