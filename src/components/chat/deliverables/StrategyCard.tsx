import React, { useState } from "react";
import type { DeliverableStrategy } from "@/types/chat";
import { Compass, Target, BarChart2, Layers, Check, Copy, Radio, AlertTriangle, Coins, Users2, Filter, StickyNote } from "lucide-react";

/** Claim-type badges: what's a hard fact, what's an assumption, what's advice. */
function ClaimBadge({ type }: { type: "fact" | "assumption" | "recommendation" }) {
  const map = {
    fact: { label: "Fact", cls: "tint-success" },
    assumption: { label: "Assumption", cls: "tint-warning" },
    recommendation: { label: "Recommendation", cls: "tint-info" },
  } as const;
  const m = map[type];
  return <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${m.cls}`}>{m.label}</span>;
}

export function StrategyCard({ data }: { data: DeliverableStrategy }) {
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState<"framework" | "audience" | "channels" | "governance">("framework");

  const copyStrategy = () => {
    const md = [
      `# Marketing Strategy (${data.month})`,
      data.executiveSummary ? `\n## Executive summary\n${data.executiveSummary}` : "",
      `\n## Objectives`, ...data.objectives.map((o) => `- ${o}`),
      `\n## KPIs`, ...data.kpis.map((k) => `- ${k}`),
      `\n## Content pillars`, ...data.pillars.map((p) => `- ${p}`),
      data.audienceSegments?.length ? [`\n## Audience segments`, ...data.audienceSegments.map((s) => `- **${s.name}** (${s.channel}): ${s.insight}`)].join("\n") : "",
      data.funnelStages?.length ? [`\n## Funnel`, ...data.funnelStages.map((f) => `- **${f.stage}** — ${f.goal}: ${f.content}`)].join("\n") : "",
      `\n## Positioning`, data.positioning || "n/a",
      data.recommendedChannels?.length ? [`\n## Channels`, ...data.recommendedChannels.map((c) => `- ${c.channel}: ${c.rationale}`)].join("\n") : "",
      data.budgetAssumptions ? `\n## Budget assumptions\n${data.budgetAssumptions}` : "",
      data.risks?.length ? [`\n## Risks`, ...data.risks.map((r) => `- ${r}`)].join("\n") : "",
    ].filter(Boolean).join("\n");
    navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const tabs = [
    { id: "framework", label: "Framework" },
    { id: "audience", label: "Audience" },
    { id: "channels", label: "Channels" },
    { id: "governance", label: "Risks" },
  ] as const;

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-[0_1px_2px_rgba(16,24,40,0.05)]">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle px-5 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#eef2ff] text-[#4F46E5]">
            <Compass size={20} />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-display truncate text-sm font-bold text-ink">Marketing strategy & execution plan</h3>
              <span className="shrink-0 rounded-full border border-[#c4b5fd] bg-[#f5f3ff] px-2 py-0.5 text-[10px] font-semibold text-[#6D28D9]">Plan</span>
            </div>
            <p className="text-xs text-muted">Target period: {data.month}</p>
          </div>
        </div>
        <button
          onClick={copyStrategy}
          className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs font-medium text-[#334155] transition hover:bg-surface-hover"
        >
          {copied ? <Check size={13} className="text-[#10B981]" /> : <Copy size={13} />}
          {copied ? "Copied as Markdown" : "Copy as Markdown"}
        </button>
      </div>

      {/* Executive summary */}
      {data.executiveSummary && (
        <div className="border-b border-border-subtle bg-[#fafbfc] px-5 py-4">
          <div className="flex items-center gap-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">Executive summary</p>
            <ClaimBadge type="recommendation" />
          </div>
          <p className="mt-1.5 text-sm leading-relaxed text-[#334155]">{data.executiveSummary}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-1 border-b border-border-subtle px-4 py-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${tab === t.id ? "bg-[#18181B] text-white shadow-2xs font-semibold" : "text-muted hover:text-ink"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-5">
        {tab === "framework" && (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-border bg-[#fafbfc] p-4">
              <div className="flex items-center gap-2 text-[#8B5CF6]">
                <Target size={15} />
                <h4 className="text-xs font-bold uppercase tracking-wider">Objectives</h4>
                <ClaimBadge type="recommendation" />
              </div>
              <ul className="mt-3 space-y-2 text-xs text-[#334155]">
                {data.objectives.map((obj, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#18181B] text-[10px] font-bold text-white">{i + 1}</span>
                    <span className="leading-relaxed">{obj}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-5 flex items-center gap-2 text-[#8B5CF6]">
                <BarChart2 size={15} />
                <h4 className="text-xs font-bold uppercase tracking-wider">KPIs</h4>
                <ClaimBadge type="recommendation" />
              </div>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {data.kpis.map((kpi, i) => (
                  <span key={i} className="rounded-lg border border-border bg-white px-2.5 py-1 text-[11px] font-medium text-[#475569]">{kpi}</span>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-border bg-[#fafbfc] p-4">
              <div className="flex items-center gap-2 text-[#8B5CF6]">
                <Layers size={15} />
                <h4 className="text-xs font-bold uppercase tracking-wider">Content pillars</h4>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {data.pillars.map((pillar, i) => (
                  <div key={i} className="rounded-xl border border-border bg-white p-2.5 text-center text-xs font-semibold text-ink">{pillar}</div>
                ))}
              </div>

              <div className="mt-5 flex items-center gap-2 text-[#8B5CF6]">
                <StickyNote size={15} />
                <h4 className="text-xs font-bold uppercase tracking-wider">Audience insights</h4>
                <ClaimBadge type="fact" />
              </div>
              <ul className="mt-2.5 space-y-2 text-xs text-[#334155]">
                {data.audienceInsights.map((ins, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="font-bold text-[#8B5CF6]">→</span>
                    <span className="leading-relaxed">{ins}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Funnel */}
            {data.funnelStages && data.funnelStages.length > 0 && (
              <div className="rounded-xl border border-border bg-[#fafbfc] p-4 md:col-span-2">
                <div className="flex items-center gap-2 text-[#8B5CF6]">
                  <Filter size={15} />
                  <h4 className="text-xs font-bold uppercase tracking-wider">Funnel stages</h4>
                  <ClaimBadge type="recommendation" />
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  {data.funnelStages.map((f, i) => (
                    <div key={i} className="rounded-xl border border-border bg-white p-3">
                      <p className="text-xs font-bold text-ink">{f.stage}</p>
                      <p className="mt-1 text-[11px] font-medium text-[#8B5CF6]">{f.goal}</p>
                      <p className="mt-1 text-[11px] leading-relaxed text-muted">{f.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "audience" && (
          <div className="space-y-4">
            {data.audienceSegments && data.audienceSegments.length > 0 ? (
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="bg-[#fafbfc]">
                      <th className="border-b border-border px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">Segment</th>
                      <th className="border-b border-border px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">Insight</th>
                      <th className="border-b border-border px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">Best channel</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.audienceSegments.map((s, i) => (
                      <tr key={i}>
                        <td className="border-b border-border-subtle px-4 py-3 font-semibold text-ink">{s.name}</td>
                        <td className="border-b border-border-subtle px-4 py-3 text-[#475569]">{s.insight}</td>
                        <td className="border-b border-border-subtle px-4 py-3">
                          <span className="rounded-full bg-[#F5F2EF] px-2 py-0.5 text-[10px] font-semibold text-[#18181B]">{s.channel}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex items-start gap-2 rounded-xl border border-border bg-[#fafbfc] p-4 text-xs text-muted">
                <Users2 size={15} className="mt-0.5 shrink-0 text-[#94A3B8]" />
                No named segments in this run — audience insights are in the Framework tab.
              </div>
            )}
          </div>
        )}

        {tab === "channels" && (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              {data.recommendedChannels?.map((ch, idx) => (
                <div key={idx} className="rounded-xl border border-border bg-[#fafbfc] p-3.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#8B5CF6]">
                    <Radio size={14} /> {ch.channel}
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-[#475569]">{ch.rationale}</p>
                </div>
              ))}
            </div>

            {data.budgetAssumptions && (
              <div className="rounded-xl border border-border bg-[#fafbfc] p-4">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#059669]">
                  <Coins size={15} /> Budget assumptions
                  <ClaimBadge type="assumption" />
                </div>
                <p className="mt-2 text-xs leading-relaxed text-[#334155]">{data.budgetAssumptions}</p>
              </div>
            )}
          </div>
        )}

        {tab === "governance" && (
          <div className="rounded-xl border border-border bg-[#fafbfc] p-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#B45309]">
              <AlertTriangle size={15} /> Risks & guardrails
            </div>
            <ul className="mt-3 space-y-2 text-xs text-[#334155]">
              {data.risks?.map((risk, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="font-bold text-[#F59E0B]">!</span>
                  <span className="leading-relaxed">{risk}</span>
                </li>
              ))}
              {!data.risks?.length && <li className="text-muted">No risks flagged in this run.</li>}
            </ul>
          </div>
        )}

        {/* Positioning */}
        {data.positioning && (
          <div className="mt-4 rounded-xl border border-black/[0.08] bg-[#F5F2EF] px-4 py-3 text-xs text-[#18181B]">
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#18181B]">Positioning & core message</span>
            {data.positioning}
          </div>
        )}

        {/* Tactics */}
        {data.tactics.length > 0 && (
          <div className="mt-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">Task plan (tactics)</p>
            <ul className="mt-1.5 space-y-1">
              {data.tactics.map((t, i) => (
                <li key={i} className="rounded-lg bg-surface-2 px-3 py-1.5 font-mono text-[11px] text-[#475569]">{t}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
