"use client";

import React from "react";
import type { DeliverablePerformance } from "@/types/chat";
import { BarChart3, TrendingUp, DollarSign, Target, ShieldCheck, Shuffle } from "lucide-react";

export function PerformanceCard({ data }: { data: DeliverablePerformance }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-[0_1px_3px_rgba(16,24,40,0.05)]">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle bg-[#F8FAFC] px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#059669]/10 text-[#059669]">
            <BarChart3 size={16} />
          </span>
          <div>
            <h4 className="font-display text-sm font-bold text-ink">Paid Advertising & Funnel Strategy</h4>
            <p className="text-[11px] text-muted">
              {data.totalBudget ? `Budget Allocation: ₹${data.totalBudget.toLocaleString("en-IN")}` : "Proportional Funnel Structure"}
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#A7F3D0] bg-[#ECFDF5] px-3 py-1 text-xs font-semibold text-[#047857]">
          <ShieldCheck size={13} /> Spend Authorization Required
        </span>
      </div>

      <div className="space-y-4 p-5 text-xs">
        {/* Campaign Funnel Stages */}
        <div className="grid gap-3 sm:grid-cols-3">
          {data.campaignStructure.map((stage, idx) => (
            <div key={idx} className="rounded-xl border border-border bg-[#F8FAFC] p-4">
              <div className="flex items-center justify-between gap-1">
                <span className="font-bold text-[11px] text-[#059669]">{stage.stage}</span>
                <span className="rounded-md bg-white border border-border px-2 py-0.5 font-mono text-[11px] font-bold text-ink">
                  {stage.budgetSplitPct}%
                </span>
              </div>
              <div className="mt-3 space-y-2 text-[#475569]">
                <div>
                  <span className="font-semibold text-ink">Placements: </span>
                  {stage.recommendedChannels.join(", ")}
                </div>
                <div>
                  <span className="font-semibold text-ink">Audience Targeting: </span>
                  {stage.audienceTargeting.join(", ")}
                </div>
                <div className="rounded-lg bg-white border border-border p-2 mt-2">
                  <span className="font-bold text-[#047857]">Primary KPI: </span>
                  <span className="text-ink">{stage.primaryKpi}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bidding Strategy & A/B Matrix */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-border bg-white p-3.5">
            <p className="font-bold uppercase tracking-wider text-[#94A3B8] text-[10px]">Bidding Strategy</p>
            <p className="mt-1.5 text-xs text-ink leading-relaxed font-medium">{data.biddingStrategy}</p>
          </div>

          <div className="rounded-xl border border-border bg-white p-3.5">
            <div className="flex items-center gap-1 font-bold uppercase tracking-wider text-[#94A3B8] text-[10px]">
              <Shuffle size={12} /> A/B Testing Hypotheses
            </div>
            <ul className="mt-1.5 list-inside list-disc space-y-1 text-xs text-[#334155]">
              {data.abTestMatrix.map((test, idx) => (
                <li key={idx}>{test}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* Guardrail Note */}
        <div className="rounded-xl border border-border-subtle bg-surface-2 p-3 text-[11px] text-muted italic">
          ⚠️ {data.notes}
        </div>
      </div>
    </div>
  );
}

