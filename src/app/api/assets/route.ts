import { NextResponse } from "next/server";
import { z } from "zod";
import { designSchema } from "@/lib/schemas";
import { renderCreative } from "@/lib/image/provider";
import { getBrandProfile } from "@/lib/db/brands";
import { getRepo } from "@/lib/db/fileRepo";
import type { Asset } from "@/lib/db/repo";

const bodySchema = z.object({
  design: designSchema,
  cta: z.string().max(60).optional().default(""),
  campaignId: z.string().optional(),
  topic: z.string().max(200).optional().default(""),
  brandId: z.string().optional(),
});

/** Render a single creative on demand (used by Asset Library "new" + retries). */
export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { design, cta, campaignId, topic, brandId } = parsed.data;
  const repo = await getRepo();
  const brands = await repo.listBrands();
  const brand = brandId ? await getBrandProfile(brandId).catch(() => null) : null;
  const brandName = (brand?.name ?? brands[0]?.name ?? "AdvertiseOS").replace(" (Sample data)", "");
  const creative = await renderCreative(
    {
      headline: design.headline,
      subtext: design.subtext ?? "",
      cta,
      brandName,
      primary: "#2563EB",
      template_id: design.template_id,
      size: design.size ?? "1080x1080",
    },
    design.image_prompt
  );
  const asset: Asset = {
    id: `asset-${Date.now()}`,
    campaignId: campaignId ?? "adhoc",
    kind: "image" as const,
    url: creative.url,
    width: creative.width,
    height: creative.height,
    template_id: design.template_id,
    headline: design.headline,
    topic,
    sample: true as const,
  };
  if (campaignId) await repo.addAsset(campaignId, asset);
  return NextResponse.json({ asset, provider: creative.provider });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";
  const assets = await (await getRepo()).listAssets(q);
  return NextResponse.json({ assets, note: "Sample data" });
}
