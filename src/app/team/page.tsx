"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Crown,
  Lightbulb,
  Palette,
  PenLine,
  ShieldCheck,
  TrendingUp,
  XCircle,
  Search,
  Sparkles,
  Volume2,
  Layers,
  ArrowRight,
} from "lucide-react";
import { AGENCY_ORG_CHART, OrgRole } from "@/lib/agents/org";

type AgentScore = {
  agent: string;
  runs: number;
  total_cost_usd: number;
  avg_latency_ms?: number;
  fallback_rate?: number;
};

type Scores = {
  agents: AgentScore[];
  avg_ceo_score: number | null;
  approval_rate: number | null;
  rejections: number;
  proposals: Array<{ id: string; agent: string; change: string; reason: string; status: string }>;
};

export default function TeamPage() {
  const [scores, setScores] = useState<Scores | null>(null);
  const [note, setNote] = useState("");
  const [issues, setIssues] = useState<string[]>([]);
  const [runningHr, setRunningHr] = useState(false);

  async function load() {
    const s = await fetch("/api/team/scores").then((r) => r.json());
    setScores(s);
  }

  useEffect(() => {
    load().catch(() => {});
  }, []);

  async function runHr() {
    setRunningHr(true);
    setNote("");
    try {
      const res = await fetch("/api/team/scores", { method: "POST" });
      const data = await res.json();
      setIssues(data.issues ?? []);
      setNote(`HR review done — ${data.newProposals?.length ?? 0} new proposal(s). Proposals never auto-apply.`);
      await load();
    } finally {
      setRunningHr(false);
    }
  }

  async function decide(id: string, action: "accept" | "reject") {
    await fetch("/api/team/scores", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action }),
    });
    setNote(action === "accept" ? "Proposal accepted — updated in prompt memory." : "Proposal rejected.");
    await load();
  }

  const getAgentMetric = (id: string): AgentScore => {
    return (
      scores?.agents.find((a) => a.agent === id) || {
        agent: id,
        runs: 0,
        total_cost_usd: 0,
        avg_latency_ms: 0,
        fallback_rate: 0,
      }
    );
  };

  const renderAgentCard = (roleKey: OrgRole, isManager: boolean = false) => {
    const member = AGENCY_ORG_CHART[roleKey];
    if (!member) return null;
    const metric = getAgentMetric(roleKey);

    return (
      <div
        key={roleKey}
        className={`rounded-2xl border p-4 transition ${
          isManager
            ? "border-[#bfdbfe] bg-[#f8faff] shadow-sm"
            : "border-border bg-white hover:border-[#cbd5e1]"
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xl" role="img" aria-label={member.displayName}>
              {member.avatar}
            </span>
            <div>
              <h4 className="text-sm font-bold text-ink">{member.displayName}</h4>
              <p className="text-[11px] font-medium text-muted">{member.title}</p>
            </div>
          </div>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
              member.modelTier === "strong"
                ? "border border-[#c4b5fd] bg-[#f5f3ff] text-[#6d28d9]"
                : "border border-[#a7f3d0] bg-[#ecfdf5] text-[#047857]"
            }`}
          >
            {member.modelTier} model
          </span>
        </div>

        <p className="mt-2 text-xs leading-relaxed text-[#475569]">{member.description}</p>

        {/* Live Metrics */}
        <div className="mt-3 grid grid-cols-4 gap-1.5 rounded-xl border border-border bg-surface-2 p-2 text-center">
          <div>
            <p className="text-[10px] uppercase text-muted">Runs</p>
            <p className="font-mono text-xs font-bold text-ink">{metric.runs}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase text-muted">Spent</p>
            <p className="font-mono text-xs font-bold text-ink">${metric.total_cost_usd.toFixed(4)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase text-muted">Avg Latency</p>
            <p className="font-mono text-xs font-bold text-ink">
              {metric.avg_latency_ms ? `${(metric.avg_latency_ms / 1000).toFixed(1)}s` : "—"}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase text-muted">Fallback</p>
            <p className="font-mono text-xs font-bold text-ink">{metric.fallback_rate ?? 0}%</p>
          </div>
        </div>

        {/* Domain Rubric */}
        <div className="mt-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted">Quality Rubric</p>
          <ul className="mt-1 space-y-0.5">
            {member.rubric.slice(0, 3).map((r, i) => (
              <li key={i} className="flex items-center gap-1.5 text-[11px] text-[#334155]">
                <span className="h-1 w-1 rounded-full bg-[#2563EB]" />
                <span className="truncate">{r}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Quality Summary */}
      <div className="card p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="eyebrow">Agency Governance & Organization</p>
            <h1 className="font-display mt-1 text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
              AI Marketing Agency Hierarchy
            </h1>
            <p className="mt-1.5 text-sm text-muted">
              Structured reporting lines: CEO sets strategy & issues directives → 3 Domain Managers coordinate & review → Specialist squads execute in parallel.
            </p>
          </div>
          <button onClick={runHr} disabled={runningHr} className="btn-primary shrink-0">
            <ShieldCheck size={16} />
            {runningHr ? "Evaluating Quality..." : "Run Quality & HR Audit"}
          </button>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-border bg-surface-2 p-3">
            <p className="text-xs text-muted">Average Quality Score</p>
            <p className="mt-1 font-mono text-xl font-bold text-ink">
              {scores?.avg_ceo_score ? `${scores.avg_ceo_score}/100` : "—"}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-surface-2 p-3">
            <p className="text-xs text-muted">Human Approval Rate</p>
            <p className="mt-1 font-mono text-xl font-bold text-emerald-600">
              {scores?.approval_rate ? `${(scores.approval_rate * 100).toFixed(0)}%` : "—"}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-surface-2 p-3">
            <p className="text-xs text-muted">Total Rejections</p>
            <p className="mt-1 font-mono text-xl font-bold text-amber-600">
              {scores?.rejections ?? 0}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-surface-2 p-3">
            <p className="text-xs text-muted">Active Hierarchy Specialists</p>
            <p className="mt-1 font-mono text-xl font-bold text-ink">
              11 Specialists · 3 Managers
            </p>
          </div>
        </div>

        {note && <p className="mt-4 rounded-xl bg-emerald-50 p-3 text-xs font-semibold text-emerald-700">{note}</p>}
        {issues.length > 0 && (
          <ul className="mt-3 list-disc pl-5 text-xs text-amber-700">
            {issues.map((x, i) => (
              <li key={i}>{x}</li>
            ))}
          </ul>
        )}
      </div>

      {/* ── LEVEL 1: Executive & Governance ───────────────────────────────── */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <Crown size={18} className="text-[#2563EB]" />
          <h2 className="text-base font-bold text-ink">Executive & Quality Gate</h2>
          <span className="text-xs text-muted">— Final Sign-off & Truthfulness Guardrails</span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {renderAgentCard("ceo", true)}
          {renderAgentCard("hr_quality", true)}
        </div>
      </div>

      {/* ── LEVEL 2 & 3: Department Pillars ───────────────────────────────── */}
      <div className="space-y-6">
        {/* Marketing Department */}
        <div className="rounded-2xl border border-border bg-surface p-5">
          <div className="mb-4 flex items-center justify-between border-b border-border-subtle pb-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">🎯</span>
              <div>
                <h3 className="text-sm font-bold text-ink">Digital Marketing Department</h3>
                <p className="text-xs text-muted">Market Research, Positioning, 30-Day Strategy & Search Authority</p>
              </div>
            </div>
            <span className="text-xs font-semibold text-[#2563EB]">Reports to CEO</span>
          </div>

          <div className="space-y-4">
            {renderAgentCard("marketing_manager", true)}
            <div className="grid gap-3 sm:grid-cols-3">
              {renderAgentCard("strategist")}
              {renderAgentCard("researcher")}
              {renderAgentCard("seo_sem")}
            </div>
          </div>
        </div>

        {/* Creative Department */}
        <div className="rounded-2xl border border-border bg-surface p-5">
          <div className="mb-4 flex items-center justify-between border-b border-border-subtle pb-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">✍️</span>
              <div>
                <h3 className="text-sm font-bold text-ink">Creative & Content Production Department</h3>
                <p className="text-xs text-muted">Copywriting, 1080x1080 Visual Cards, Reel Scripts & Revision Loops</p>
              </div>
            </div>
            <span className="text-xs font-semibold text-[#2563EB]">Reports to CEO</span>
          </div>

          <div className="space-y-4">
            {renderAgentCard("content_manager", true)}
            <div className="grid gap-3 sm:grid-cols-3">
              {renderAgentCard("creative")}
              {renderAgentCard("designer")}
              {renderAgentCard("video")}
            </div>
          </div>
        </div>

        {/* Performance Department */}
        <div className="rounded-2xl border border-border bg-surface p-5">
          <div className="mb-4 flex items-center justify-between border-b border-border-subtle pb-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">📈</span>
              <div>
                <h3 className="text-sm font-bold text-ink">Performance & Growth Ads Department</h3>
                <p className="text-xs text-muted">Paid Media Funnels, Meta/Google Ad Sets & Budget Governance</p>
              </div>
            </div>
            <span className="text-xs font-semibold text-[#2563EB]">Reports to CEO</span>
          </div>

          <div className="space-y-4">
            {renderAgentCard("performance_manager", true)}
            <div className="grid gap-3 sm:grid-cols-2">
              {renderAgentCard("performance")}
              {renderAgentCard("brand_voice")}
            </div>
          </div>
        </div>
      </div>

      {/* Prompt Proposals (Human Gate) */}
      <div className="card p-6 sm:p-8">
        <p className="eyebrow">Prompt Evolution · Human Approval Required</p>
        <h3 className="font-display mt-1 text-lg font-bold text-ink">Brand Memory Proposals</h3>
        <p className="mt-1 text-xs text-muted">
          When rejections happen, the Quality Officer drafts prompt updates. They are never auto-applied without your explicit approval.
        </p>

        <div className="mt-4 grid gap-3">
          {(scores?.proposals ?? []).map((p) => (
            <div key={p.id} className="rounded-xl border border-border bg-white p-4 text-sm">
              <p className="font-semibold text-ink">
                {p.agent}: {p.change}
              </p>
              <p className="mt-1 text-xs text-muted">
                {p.reason} · Status: <span className="font-bold uppercase text-ink">{p.status}</span>
              </p>
              {p.status === "pending" && (
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => decide(p.id, "accept")}
                    className="btn-primary min-h-[38px] text-xs"
                  >
                    <CheckCircle2 size={14} /> Accept Proposal
                  </button>
                  <button
                    onClick={() => decide(p.id, "reject")}
                    className="btn-secondary min-h-[38px] text-xs"
                  >
                    <XCircle size={14} /> Reject
                  </button>
                </div>
              )}
            </div>
          ))}
          {(scores?.proposals ?? []).length === 0 && (
            <p className="text-xs text-muted">No pending prompt proposals. Run a quality audit to analyze recent runs.</p>
          )}
        </div>
      </div>
    </div>
  );
}
