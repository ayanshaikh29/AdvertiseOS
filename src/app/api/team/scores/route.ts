import { NextResponse } from "next/server";
import { z } from "zod";
import { hrRun } from "@/lib/agents";
import { audit, getRepo } from "@/lib/db/fileRepo";
import { notify } from "@/lib/notify";

/** HR scorecards from real run stats + approval outcomes. POST runs the weekly HR review. */
export async function GET() {
  const repo = await getRepo();
  const items = await repo.listItems();
  const runs = await repo.listRuns();
  const decided = items.filter((i) => i.status === "approved" || i.status === "rejected");
  const scores = items.map((i) => i.ceo_score).filter((s) => s > 0);
  const byAgent = new Map<string, { runs: number; cost: number; latency: number; fallbacks: number }>();
  for (const r of runs) {
    const e = byAgent.get(r.agent) ?? { runs: 0, cost: 0, latency: 0, fallbacks: 0 };
    e.runs += 1;
    e.cost += r.costUsd;
    e.latency += r.latencyMs;
    if (r.status === "fallback" || (r as { fallback?: boolean }).fallback) e.fallbacks += 1;
    byAgent.set(r.agent, e);
  }
  return NextResponse.json({
    agents: [...byAgent.entries()].map(([agent, e]) => ({
      agent,
      runs: e.runs,
      total_cost_usd: Number(e.cost.toFixed(6)),
      avg_latency_ms: e.runs ? Math.round(e.latency / e.runs) : 0,
      fallback_rate: e.runs ? Number(((e.fallbacks / e.runs) * 100).toFixed(1)) : 0,
    })),
    avg_ceo_score: scores.length ? Number((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)) : null,
    approval_rate: decided.length ? Number((decided.filter((i) => i.status === "approved").length / decided.length).toFixed(2)) : null,
    rejections: items.filter((i) => i.status === "rejected").length,
    proposals: await repo.listProposals(),
  });
}

export async function POST() {
  const repo = await getRepo();
  const items = await repo.listItems();
  const runs = await repo.listRuns();
  const decided = items.filter((i) => i.status === "approved" || i.status === "rejected");
  const scores = items.map((i) => i.ceo_score).filter((s) => s > 0);
  const { data, run } = await hrRun({
    runs,
    avgCeoScore: scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null,
    approvalRate: decided.length ? decided.filter((i) => i.status === "approved").length / decided.length : null,
    rejections: items.filter((i) => i.status === "rejected").length,
  });
  await repo.addRun({ agent: "hr", costUsd: run.costUsd, latencyMs: run.latencyMs, status: run.status, model: run.model, inputTokens: run.tokens.input, outputTokens: run.tokens.output, created_at: new Date().toISOString() });
  const existing = await repo.listProposals();
  const fresh = (data.proposed_prompt_changes ?? [])
    .filter((p) => !existing.some((q) => q.status === "pending" && q.agent === p.agent && q.change === p.change))
    .map((p) => ({ id: `prop-${Date.now()}-${Math.floor(Math.random() * 1e6)}`, ...p, status: "pending" as const }));
  await repo.saveProposals(fresh);
  await audit("hr.reviewed", "hr", `proposals-${fresh.length}`, { scorecards: data.agent_scorecards.length });
  await notify("AdvertiseOS HR review ready", `${data.agent_scorecards.length} scorecards, ${fresh.length} new prompt proposal(s).`);
  return NextResponse.json({ scorecards: data.agent_scorecards, issues: data.recurring_issues, newProposals: fresh });
}

export async function PUT(req: Request) {
  const parsed = z.object({ id: z.string(), action: z.enum(["accept", "reject"]) }).safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const repo = await getRepo();
  const prop = await repo.updateProposal(parsed.data.id, parsed.data.action === "accept" ? "accepted" : "rejected");
  if (!prop) return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
  await audit(`hr.proposal_${prop.status}`, "proposal", prop.id, { agent: prop.agent });
  return NextResponse.json({ ok: true, proposal: prop });
}
