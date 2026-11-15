import { NextResponse } from "next/server";
import { z } from "zod";
import { getRepo } from "@/lib/db/fileRepo";
import { SAMPLE_BRAND } from "@/lib/brand";

const brandSchema = z.object({
  name: z.string().min(2).max(80),
  tone: z.string().min(2).max(200).default("confident, helpful, premium"),
  languages: z.array(z.string()).min(1).max(5).default(["English"]),
  audience: z.string().max(500).default(""),
  products: z.string().max(500).default(""),
  usp: z.string().max(300).default(""),
  dos: z.array(z.string()).max(20).default([]),
  donts: z.array(z.string()).max(20).default([]),
  compliance_notes: z.string().max(500).default("Never invent client names, awards, testimonials, or numbers."),
});

/** List brands (workspace switcher) or create one (the Brand wizard POSTs here). */
export async function GET() {
  return NextResponse.json({ brands: await (await getRepo()).listBrands() });
}

export async function POST(req: Request) {
  const parsed = brandSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const repo = await getRepo();
  const brand = { id: `brand-${Date.now()}`, ...parsed.data, sample: false };
  await repo.saveBrand(brand);
  return NextResponse.json({ brand });
}

/** Explicit opt-in sample brand. Never created automatically. */
export async function PUT() {
  const repo = await getRepo();
  const brand = {
    id: "sample-brand",
    name: SAMPLE_BRAND.name,
    tone: SAMPLE_BRAND.tone,
    languages: SAMPLE_BRAND.languages,
    audience: SAMPLE_BRAND.audience,
    products: SAMPLE_BRAND.products,
    usp: SAMPLE_BRAND.usp,
    dos: SAMPLE_BRAND.dos,
    donts: SAMPLE_BRAND.donts,
    compliance_notes: SAMPLE_BRAND.compliance_notes,
    sample: true,
  };
  await repo.saveBrand(brand);
  return NextResponse.json({ brand, note: "Sample brand loaded — clearly labeled Sample data." });
}
