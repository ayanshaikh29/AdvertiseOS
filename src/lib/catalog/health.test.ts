import { describe, expect, it } from "vitest";
import { scoreCatalog, scoreCatalogItem } from "@/lib/catalog/health";
import { catalogItemSchema } from "@/lib/catalog/types";
import type { CatalogItem } from "@/lib/db/repo";

function item(over: Partial<CatalogItem> = {}): CatalogItem {
  return {
    id: "c1",
    brandId: "b1",
    kind: "service",
    name: "Brand Identity Design",
    description: "Logo, colors, typography and a mini brand guide.",
    price: 25000,
    currency: "INR",
    tags: ["branding", "small business"],
    features: ["Logo suite", "Brand guide"],
    status: "active",
    source: "manual",
    externalId: null,
    provider: null,
    created_at: "2026-10-01T00:00:00.000Z",
    updated_at: "2026-10-01T00:00:00.000Z",
    ...over,
  };
}

describe("catalog health", () => {
  it("scores a complete item at 100", () => {
    const h = scoreCatalogItem(item());
    expect(h.score).toBe(100);
    expect(h.gaps).toHaveLength(0);
  });

  it("loses weight per missing field and reports hints", () => {
    const h = scoreCatalogItem(item({ description: "", price: null, tags: [], features: [] }));
    expect(h.score).toBe(25); // only the required name
    expect(h.gaps.map((g) => g.field).sort()).toEqual(["description", "features", "price", "tags"]);
  });

  it("empty catalog scores 0 with an actionable gap", () => {
    const h = scoreCatalog([]);
    expect(h.score).toBe(0);
    expect(h.gaps[0]).toMatch(/No catalog items/);
  });

  it("averages active items and flags half-empty fields", () => {
    const h = scoreCatalog([
      item({ id: "a" }),
      item({ id: "b", description: "", price: null, tags: [], features: [], status: "draft" }),
    ]);
    expect(h.itemCount).toBe(2);
    expect(h.activeCount).toBe(1);
    expect(h.score).toBe(100); // only the active item counts
  });

  it("zod schema defaults kind/status and rejects empty names", () => {
    const ok = catalogItemSchema.safeParse({ brandId: "b1", name: "Website Launch Pack" });
    expect(ok.success).toBe(true);
    if (ok.success) {
      expect(ok.data.kind).toBe("product");
      expect(ok.data.status).toBe("active");
    }
    expect(catalogItemSchema.safeParse({ brandId: "b1", name: "x" }).success).toBe(false);
  });
});
