import type { CatalogItem } from "@/lib/catalog/types";

/** Data-health scoring for the catalog (Phase 6B).
 * Per-item: field completeness. Per-brand: average of active items + coverage gaps. */

export type FieldGap = { field: string; weight: number; hint: string };

export type ItemHealth = { id: string; score: number; gaps: FieldGap[] };

export type CatalogHealth = {
  score: number;
  itemCount: number;
  activeCount: number;
  gaps: string[];
};

const FIELD_RULES: Array<{ field: keyof CatalogItem; weight: number; hint: string; ok: (item: CatalogItem) => boolean }> = [
  { field: "description", weight: 25, hint: "Add a one-line description agents can quote in copy.", ok: (i) => i.description.trim().length >= 20 },
  { field: "price", weight: 20, hint: "Set a price (or ₹0 for 'contact us') so offers stay honest.", ok: (i) => i.price !== null },
  { field: "tags", weight: 15, hint: "Add 2–5 tags (audience, use-case) for targeting.", ok: (i) => i.tags.length >= 2 },
  { field: "features", weight: 15, hint: "List 2+ concrete features/deliverables.", ok: (i) => i.features.length >= 2 },
];

export function scoreCatalogItem(item: CatalogItem): ItemHealth {
  let score = 25; // name is required at creation
  const gaps: FieldGap[] = [];
  for (const rule of FIELD_RULES) {
    if (rule.ok(item)) score += rule.weight;
    else gaps.push({ field: String(rule.field), weight: rule.weight, hint: rule.hint });
  }
  return { id: item.id, score: Math.min(100, score), gaps };
}

export function scoreCatalog(items: CatalogItem[]): CatalogHealth {
  const active = items.filter((i) => i.status === "active");
  if (!items.length) {
    return {
      score: 0,
      itemCount: 0,
      activeCount: 0,
      gaps: ["No catalog items yet — add products/services or sync from a connector."],
    };
  }
  const scores = active.length ? active : items;
  const avg = Math.round(scores.reduce((s, i) => s + scoreCatalogItem(i).score, 0) / scores.length);
  const gaps: string[] = [];
  if (!active.length) gaps.push("No active items — agents can only sell what is marked active.");
  const thin = FIELD_RULES.filter((r) => scores.filter((i) => r.ok(i)).length < Math.ceil(scores.length / 2));
  for (const r of thin) gaps.push(`${r.field}: ${r.hint}`);
  return { score: avg, itemCount: items.length, activeCount: active.length, gaps };
}
