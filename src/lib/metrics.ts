import { metricRowSchema, type MetricRow } from "@/lib/schemas";
import type { MetricTotals } from "@/lib/agents";

const COLS = ["platform", "date", "impressions", "reach", "clicks", "leads", "spend", "revenue", "content_item_id"] as const;

export function parseCsv(text: string): { rows: MetricRow[]; errors: string[] } {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return { rows: [], errors: ["CSV needs a header row + at least 1 data row"] };
  const header = (lines[0] ?? "").split(",").map((h) => h.trim().toLowerCase());
  const idx = (c: string) => header.indexOf(c);
  if (idx("platform") < 0 || idx("date") < 0) {
    return { rows: [], errors: ["CSV must include 'platform' and 'date' columns"] };
  }
  const rows: MetricRow[] = [];
  const errors: string[] = [];
  lines.slice(1).forEach((line, n) => {
    const cells = line.split(",").map((c) => c.trim());
    const get = (c: string) => {
      const i = idx(c);
      return i >= 0 ? (cells[i] ?? "") : "";
    };
    const num = (c: string) => {
      const v = get(c).replace(/[₹$,]/g, "");
      return v === "" ? 0 : Number(v);
    };
    const parsed = metricRowSchema.safeParse({
      platform: get("platform"),
      date: get("date"),
      impressions: num("impressions"),
      reach: num("reach"),
      clicks: num("clicks"),
      leads: num("leads"),
      spend: num("spend"),
      revenue: num("revenue"),
      content_item_id: get("content_item_id") || undefined,
      source: "csv" as const,
    });
    if (!parsed.success) errors.push(`Row ${n + 2}: ${parsed.error.issues.map((i) => i.message).join("; ")}`);
    else rows.push(parsed.data);
  });
  void COLS;
  return { rows, errors };
}

export function computeTotals(rows: MetricRow[]): MetricTotals {
  const byPlatform: MetricTotals["byPlatform"] = {};
  for (const r of rows) {
    const e = byPlatform[r.platform] ?? { impressions: 0, reach: 0, clicks: 0, leads: 0, spend: 0, revenue: 0 };
    e.impressions += r.impressions;
    e.reach += r.reach;
    e.clicks += r.clicks;
    e.leads += r.leads;
    e.spend += r.spend;
    e.revenue += r.revenue;
    byPlatform[r.platform] = e;
  }
  return { rows: rows.length, byPlatform };
}
