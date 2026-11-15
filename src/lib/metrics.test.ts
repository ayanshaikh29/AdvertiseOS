import { describe, expect, it } from "vitest";
import { computeTotals, parseCsv } from "@/lib/metrics";
import { metricRowSchema } from "@/lib/schemas";

const csv = `platform,date,impressions,reach,clicks,leads,spend,revenue
instagram,2026-11-01,1000,800,50,5,500,2000
facebook,2026-11-01,2000,1500,30,2,700,0`;

describe("metrics CSV", () => {
  it("parses Meta-style exports", () => {
    const { rows, errors } = parseCsv(csv);
    expect(errors).toEqual([]);
    expect(rows.length).toBe(2);
    expect(rows[0]?.source).toBe("csv");
  });

  it("rejects CSV without platform/date", () => {
    expect(parseCsv("foo,bar\n1,2").rows).toEqual([]);
  });

  it("totals aggregate by platform with real numbers", () => {
    const { rows } = parseCsv(csv);
    const t = computeTotals(rows);
    expect(t.rows).toBe(2);
    expect(t.byPlatform.instagram?.leads).toBe(5);
    expect(t.byPlatform.facebook?.spend).toBe(700);
  });

  it("rejects negative spend", () => {
    expect(metricRowSchema.safeParse({ platform: "x", date: "2026-11-01", spend: -5 }).success).toBe(false);
  });
});
