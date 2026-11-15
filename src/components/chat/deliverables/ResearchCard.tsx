"use client";

import React, { useState } from "react";
import type { DeliverableResearch } from "@/types/chat";
import { Search, ExternalLink, ShieldCheck, TrendingUp, Users, Target, CheckCircle2, CalendarClock, BarChart3, Newspaper } from "lucide-react";

type Tab = "market" | "competitors" | "personas" | "opportunities";

export function ResearchCard({ data }: { data: DeliverableResearch }) {
  const [activeTab, setActiveTab] = useState<Tab>("market");
  const hasTrends = (data.trends?.length ?? 0) > 0;
  const hasEvents = (data.seasonalEvents?.length ?? 0) > 0;
  const hasBenchmarks = (data.benchmarks?.length ?? 0) > 0;

  const tabs: Array<{ id: Tab; label: string; count?: number }> = [
    { id: "market", label: "2026 Market" },
    { id: "competitors", label: "Competitors", count: data.competitors.length },
    { id: "personas", label: "Customers", count: data.targetPersonas.length },
    { id: "opportunities", label: "Opportunities", count: data.marketOpportunities.length },
  ];

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-[0_1px_3px_rgba(16,24,40,0.05)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle bg-[#F8FAFC] px-5 py-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#2563EB]/10 text-[#2563EB]">
            <Search size={17} />
          </span>
          <div>
            <h4 className="font-display text-sm font-bold text-ink">Market Research & 2026 Trends</h4>
            <p className="text-xs text-muted">
              {data.industry} · Researched {data.researchDate}
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#bfdbfe] bg-brand-soft px-3 py-1 text-xs font-semibold text-[#1D4ED8]">
          <ShieldCheck size={13} /> Live sources
        </span>
      </div>

      <div className="flex overflow-x-auto border-b border-border-subtle px-4 pt-2 text-sm font-semibold">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`shrink-0 border-b-2 px-3.5 pb-2.5 transition ${
              activeTab === t.id
                ? "border-[#2563EB] text-[#2563EB]"
                : "border-transparent text-muted hover:text-ink"
            }`}
          >
            {t.label}
            {typeof t.count === "number" ? ` (${t.count})` : ""}
          </button>
        ))}
      </div>

      <div className="p-5">
        {activeTab === "market" && (
          <div className="space-y-5">
            {hasBenchmarks && (
              <section>
                <h5 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted">
                  <BarChart3 size={13} className="text-[#2563EB]" /> Industry benchmarks (planning ranges)
                </h5>
                <p className="mt-1 text-xs text-muted">Reference bands for planning — not your results.</p>
                <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
                  {(data.benchmarks ?? []).map((b, i) => (
                    <div key={i} className="rounded-xl border border-border bg-[#FAFCFF] p-3.5">
                      <p className="text-sm font-semibold text-ink">{b.metric}</p>
                      <p className="mt-1 font-display text-lg font-bold text-[#2563EB]">{b.rangeLabel}</p>
                      <p className="mt-0.5 text-xs text-muted">{b.note}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {hasEvents && (
              <section>
                <h5 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted">
                  <CalendarClock size={13} className="text-amber-600" /> Seasonal moments near this campaign
                </h5>
                <div className="mt-2.5 space-y-2">
                  {(data.seasonalEvents ?? []).map((e, i) => (
                    <div key={i} className="flex items-start gap-3 rounded-xl border border-border bg-amber-50/40 p-3">
                      <span className="shrink-0 rounded-lg border border-amber-200 bg-white px-2 py-1 text-[11px] font-bold text-amber-800">
                        {e.date.slice(5)}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-ink">{e.name}</p>
                        <p className="text-xs text-muted">{e.angle}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {hasTrends ? (
              <section>
                <h5 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted">
                  <Newspaper size={13} className="text-emerald-600" /> Live headlines
                </h5>
                <ul className="mt-2.5 space-y-2">
                  {(data.trends ?? []).map((t, i) => (
                    <li key={i} className="flex items-start gap-2.5 rounded-xl border border-border bg-[#F8FAFC] p-3">
                      <TrendingUp size={14} className="mt-0.5 shrink-0 text-emerald-600" />
                      <div className="min-w-0 flex-1">
                        <a
                          href={t.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm font-medium text-ink hover:text-[#2563EB] hover:underline"
                        >
                          {t.title}
                        </a>
                        <p className="mt-0.5 text-[11px] text-muted">
                          {t.source}
                          {t.publishedAt ? ` · ${t.publishedAt.slice(0, 16)}` : ""}
                        </p>
                      </div>
                      <ExternalLink size={12} className="mt-1 shrink-0 text-[#94A3B8]" />
                    </li>
                  ))}
                </ul>
              </section>
            ) : (
              !hasBenchmarks &&
              !hasEvents && (
                <p className="text-sm text-muted">Market intelligence will appear here once trends are collected.</p>
              )
            )}
          </div>
        )}

        {activeTab === "competitors" && (
          <div className="grid gap-3.5 sm:grid-cols-2">
            {data.competitors.map((comp, idx) => (
              <div key={idx} className="rounded-xl border border-border bg-[#FAFCFF] p-4">
                <div className="flex items-center justify-between gap-2">
                  <h5 className="font-display text-sm font-bold text-ink">{comp.name}</h5>
                  {comp.sourceUrl && (
                    <a
                      href={comp.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-[#2563EB] hover:underline"
                    >
                      Source <ExternalLink size={10} />
                    </a>
                  )}
                </div>
                <div className="mt-3 space-y-2 text-sm">
                  <div>
                    <span className="font-semibold text-emerald-700">Strengths: </span>
                    <span className="text-[#334155]">{comp.strengths.join(", ") || "Established player"}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-red-600">Weaknesses: </span>
                    <span className="text-[#475569]">{comp.weaknesses.join(", ") || "Standard execution"}</span>
                  </div>
                  <div className="rounded-lg border border-[#bfdbfe]/60 bg-white p-2.5">
                    <span className="font-bold text-[#1D4ED8]">Opportunity for you: </span>
                    <span className="text-[#1E293B]">{comp.marketGap}</span>
                  </div>
                </div>
              </div>
            ))}
            {data.competitors.length === 0 && (
              <p className="text-sm text-muted sm:col-span-2">No competitors listed — research may still be running.</p>
            )}
          </div>
        )}

        {activeTab === "personas" && (
          <div className="grid gap-3.5 sm:grid-cols-2">
            {data.targetPersonas.map((persona, idx) => (
              <div key={idx} className="rounded-xl border border-border bg-surface p-4">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#2563EB]/10 text-[#2563EB]">
                    <Users size={14} />
                  </span>
                  <h5 className="font-display text-sm font-bold text-ink">{persona.name}</h5>
                </div>
                <div className="mt-3 space-y-2.5 text-sm">
                  <div>
                    <p className="font-semibold text-ink">What frustrates them</p>
                    <ul className="mt-1 list-inside list-disc space-y-0.5 text-[#475569]">
                      {persona.painPoints.map((pt, pIdx) => (
                        <li key={pIdx}>{pt}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="font-semibold text-ink">What motivates them</p>
                    <p className="mt-0.5 text-[#334155]">{persona.motivations.join("; ")}</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {persona.preferredChannels.map((ch, cIdx) => (
                      <span key={cIdx} className="rounded-md bg-surface-2 px-2 py-0.5 text-[11px] font-medium text-muted">
                        {ch}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "opportunities" && (
          <div className="space-y-2.5">
            {data.marketOpportunities.map((opp, idx) => (
              <div key={idx} className="flex items-start gap-3 rounded-xl border border-border bg-[#F8FAFC] p-3.5 text-sm">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[11px] font-bold text-[#1D4ED8]">
                  {idx + 1}
                </span>
                <p className="text-ink leading-relaxed font-medium">{opp}</p>
              </div>
            ))}
            {data.marketOpportunities.length === 0 && (
              <p className="text-sm text-muted">Opportunities will appear after research completes.</p>
            )}
          </div>
        )}

        {(data.sources?.length ?? 0) > 0 || (data.dataSources?.length ?? 0) > 0 && (
          <div className="mt-5 border-t border-border-subtle pt-3.5">
            <p className="text-[11px] font-bold uppercase tracking-wide text-muted">Data sources</p>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              {(data.dataSources ?? []).map((src, idx) => (
                <span
                  key={`ds-${idx}`}
                  className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface-2 px-2.5 py-1 text-muted"
                >
                  <CheckCircle2 size={11} className="text-emerald-500" />
                  {src}
                </span>
              ))}
              {(data.sources ?? []).slice(0, 8).map((src, idx) => (
                <a
                  key={`s-${idx}`}
                  href={src.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface px-2.5 py-1 text-muted hover:text-[#2563EB]"
                >
                  <Target size={11} className="text-[#2563EB]" />
                  {src.title}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
