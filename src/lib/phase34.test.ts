import { describe, expect, it } from "vitest";
import { hrRun, performanceRun, replyDraftsRun } from "@/lib/agents";
import { checkRole, requireRole } from "@/lib/auth";
import { SAMPLE_BRAND } from "@/lib/brand";
import { computeTotals } from "@/lib/metrics";

describe("role gate (Supabase Auth roles; pure logic)", () => {
  it("blocks viewers from admin actions", () => {
    expect(checkRole("viewer", ["owner", "admin"])).toBe(false);
  });
  it("allows admins and owners", () => {
    expect(checkRole("admin", ["owner", "admin"])).toBe(true);
    expect(checkRole("owner", ["owner", "admin"])).toBe(true);
  });
  it("local-dev session is owner (labeled, never production)", async () => {
    const s = await requireRole(["owner", "admin"]);
    if (s instanceof Response) throw new Error("expected session in local-dev");
    expect(s.role).toBe("owner");
  });
});

describe("performance agent honesty", () => {
  it("says insufficient data when empty", async () => {
    const { data } = await performanceRun(SAMPLE_BRAND, [], computeTotals([]));
    expect(data.summary.toLowerCase()).toContain("insufficient data");
  });

  it("cites only uploaded numbers", async () => {
    const rows = [
      { platform: "instagram", date: "2026-11-01", impressions: 1000, reach: 800, clicks: 50, leads: 5, spend: 500, revenue: 2000, source: "csv" as const },
    ];
    const { data } = await performanceRun(SAMPLE_BRAND, rows, computeTotals(rows));
    const blob = JSON.stringify(data);
    expect(blob).toContain("5");
    expect(blob).not.toContain("540%");
  });
});

describe("social replies safety", () => {
  it("escalates complaints and pricing, never auto-sends them", async () => {
    const { data } = await replyDraftsRun(SAMPLE_BRAND, [
      { id: "c1", text: "What are your prices?", author: "a" },
      { id: "c2", text: "You scammed me, refund now", author: "b" },
      { id: "c3", text: "Great tips, thanks!", author: "c" },
    ]);
    expect(data.find((d) => d.comment_id === "c1")?.needs_human).toBe(true);
    expect(data.find((d) => d.comment_id === "c2")?.needs_human).toBe(true);
    expect(data.find((d) => d.comment_id === "c3")?.needs_human).toBe(false);
  });
});

describe("hr agent", () => {
  it("scores from stats and proposes changes only with rejections", async () => {
    const { data } = await hrRun({ runs: [{ agent: "content", costUsd: 0, latencyMs: 1 }], avgCeoScore: 80, approvalRate: 1, rejections: 0 });
    expect(data.agent_scorecards.length).toBe(1);
    expect(data.proposed_prompt_changes).toEqual([]);
  });
});
