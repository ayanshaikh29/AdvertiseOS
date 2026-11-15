"use client";

import React, { useState } from "react";
import type { DeliverableSeo } from "@/types/chat";
import { Rocket, Search, CheckCircle2, FileText, Globe, Layers } from "lucide-react";

export function SeoCard({ data }: { data: DeliverableSeo }) {
  const [activeTab, setActiveTab] = useState<"clusters" | "checklist" | "meta">("clusters");

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-[0_1px_3px_rgba(16,24,40,0.05)]">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle bg-[#F8FAFC] px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#0284C7]/10 text-[#0284C7]">
            <Rocket size={16} />
          </span>
          <div>
            <h4 className="font-display text-sm font-bold text-ink">SEO / SEM Keyword Architecture</h4>
            <p className="text-[11px] text-muted">{data.targetFocus}</p>
          </div>
        </div>
        <span className="rounded-full bg-[#E0F2FE] px-3 py-1 text-xs font-bold text-[#0369A1]">
          {data.keywordClusters.reduce((s, c) => s + c.keywords.length, 0)} Targeted Keywords
        </span>
      </div>

      {/* Navigation */}
      <div className="flex border-b border-border-subtle px-5 pt-2 text-xs font-semibold">
        <button
          onClick={() => setActiveTab("clusters")}
          className={`border-b-2 px-3 pb-2 transition ${
            activeTab === "clusters" ? "border-[#0284C7] text-[#0284C7]" : "border-transparent text-muted hover:text-ink"
          }`}
        >
          Keyword Clusters
        </button>
        <button
          onClick={() => setActiveTab("checklist")}
          className={`border-b-2 px-3 pb-2 transition ${
            activeTab === "checklist" ? "border-[#0284C7] text-[#0284C7]" : "border-transparent text-muted hover:text-ink"
          }`}
        >
          Technical Checklist ({data.onPageChecklist.length})
        </button>
        <button
          onClick={() => setActiveTab("meta")}
          className={`border-b-2 px-3 pb-2 transition ${
            activeTab === "meta" ? "border-[#0284C7] text-[#0284C7]" : "border-transparent text-muted hover:text-ink"
          }`}
        >
          Meta Tag Directives
        </button>
      </div>

      <div className="p-5 text-xs">
        {activeTab === "clusters" && (
          <div className="space-y-4">
            {data.keywordClusters.map((cluster, cIdx) => (
              <div key={cIdx} className="rounded-xl border border-border bg-[#F8FAFC] p-4">
                <div className="flex items-center gap-2">
                  <Layers size={14} className="text-[#0284C7]" />
                  <h5 className="font-display text-xs font-bold text-ink">{cluster.topic}</h5>
                </div>
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-border-subtle text-[10px] uppercase tracking-wider text-muted">
                        <th className="pb-1.5 font-bold">Keyword</th>
                        <th className="pb-1.5 font-bold">Search Intent</th>
                        <th className="pb-1.5 font-bold">Priority</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-subtle">
                      {cluster.keywords.map((kw, kIdx) => (
                        <tr key={kIdx} className="hover:bg-white/60">
                          <td className="py-2 font-mono font-medium text-ink">{kw.keyword}</td>
                          <td className="py-2">
                            <span className="rounded-md bg-white border border-border px-2 py-0.5 text-[10px] font-semibold text-[#475569]">
                              {kw.intent}
                            </span>
                          </td>
                          <td className="py-2">
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                kw.priority === "high"
                                  ? "bg-[#DCFCE7] text-[#15803D]"
                                  : "bg-surface-2 text-muted"
                              }`}
                            >
                              {kw.priority}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "checklist" && (
          <div className="space-y-2">
            {data.onPageChecklist.map((item, idx) => (
              <div key={idx} className="flex items-start gap-2.5 rounded-xl border border-border bg-white p-3">
                <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-[#0284C7]" />
                <p className="text-ink leading-relaxed font-medium">{item}</p>
              </div>
            ))}
          </div>
        )}

        {activeTab === "meta" && (
          <div className="space-y-3">
            {data.metaRecommendations.map((meta, idx) => (
              <div key={idx} className="rounded-xl border border-border bg-[#F8FAFC] p-4">
                <div className="flex items-center gap-1.5 font-bold text-[#0284C7] text-xs">
                  <Globe size={13} /> {meta.page}
                </div>
                <div className="mt-2.5 space-y-1.5">
                  <div>
                    <span className="font-semibold text-muted text-[10px] uppercase">Meta Title:</span>
                    <p className="font-mono text-xs font-semibold text-[#0369A1]">{meta.metaTitle}</p>
                  </div>
                  <div>
                    <span className="font-semibold text-muted text-[10px] uppercase">Meta Description:</span>
                    <p className="text-xs text-[#334155] leading-relaxed">{meta.metaDescription}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

