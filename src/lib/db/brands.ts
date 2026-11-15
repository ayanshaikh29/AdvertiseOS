import { getRepo } from "@/lib/db/fileRepo";
import type { BrandProfile } from "@/lib/brand";

/** Load a brand profile from the repository (Supabase or local file). No hardcoded brands in routes. */
export async function getBrandProfile(brandId: string): Promise<BrandProfile> {
  const repo = await getRepo();
  const b = await repo.getBrand(brandId);
  if (!b) {
    throw new Error(`Brand not found: ${brandId} — add a brand in Brand settings or load sample data first.`);
  }
  return {
    id: b.id,
    name: b.name,
    tone: b.tone,
    languages: b.languages,
    audience: b.audience,
    products: b.products,
    usp: b.usp,
    dos: b.dos,
    donts: b.donts,
    compliance_notes: b.compliance_notes,
  };
}
