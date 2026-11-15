"use client";

import React from "react";
import type { DeliverableBrandVoice } from "@/types/chat";
import { Mic, Check, X, ShieldAlert, Sparkles, BookOpen } from "lucide-react";

export function BrandVoiceCard({ data }: { data: DeliverableBrandVoice }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-[0_1px_3px_rgba(16,24,40,0.05)]">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle bg-[#F8FAFC] px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#7C3AED]/10 text-[#7C3AED]">
            <Mic size={16} />
          </span>
          <div>
            <h4 className="font-display text-sm font-bold text-ink">Brand Voice & Guidelines</h4>
            <p className="text-[11px] text-muted">{data.brandName} Linguistic Standards</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-1">
          {data.toneDescriptors.map((t, idx) => (
            <span key={idx} className="rounded-full bg-[#EDE9FE] px-2.5 py-0.5 text-[10px] font-bold text-[#6D28D9]">
              {t}
            </span>
          ))}
        </div>
      </div>

      <div className="space-y-4 p-5 text-xs">
        {/* Core Pillars */}
        <div>
          <p className="font-bold uppercase tracking-wider text-[#94A3B8] text-[10px]">Core Messaging Pillars</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            {data.coreMessagingPillars.map((pillar, idx) => (
              <div key={idx} className="rounded-xl border border-border bg-[#FAF5FF] p-3">
                <span className="font-bold text-[#7C3AED]">Pillar {idx + 1}:</span>
                <p className="mt-1 text-ink font-medium">{pillar}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Vocabulary Dos and Don'ts */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-[#A7F3D0] bg-[#ECFDF5] p-3.5">
            <div className="flex items-center gap-1.5 font-bold text-[#047857]">
              <Check size={14} /> Approved Vocabulary (Dos)
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {data.vocabularyDos.map((w, idx) => (
                <span key={idx} className="rounded-md border border-[#A7F3D0] bg-white px-2 py-0.5 text-xs font-medium text-[#065F46]">
                  &ldquo;{w}&rdquo;
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] p-3.5">
            <div className="flex items-center gap-1.5 font-bold text-[#B91C1C]">
              <X size={14} /> Forbidden &amp; Unverified (Don&apos;ts)
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {data.vocabularyDonts.map((w, idx) => (
                <span key={idx} className="rounded-md border border-[#FECACA] bg-white px-2 py-0.5 text-xs font-medium text-[#991B1B] line-through">
                  &ldquo;{w}&rdquo;
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Voice Comparison */}
        {data.sampleVoiceComparison && (
          <div className="rounded-xl border border-border bg-[#F8FAFC] p-3.5">
            <p className="font-bold uppercase tracking-wider text-[#94A3B8] text-[10px]">Brand Persona Contrast</p>
            <div className="mt-2 grid gap-2.5 sm:grid-cols-2">
              <div className="rounded-lg bg-white p-3 border border-border">
                <span className="font-bold text-[#047857]">✅ In-Character Example:</span>
                <p className="mt-1 text-ink leading-relaxed italic">&ldquo;{data.sampleVoiceComparison.inCharacter}&rdquo;</p>
              </div>
              <div className="rounded-lg bg-white p-3 border border-border">
                <span className="font-bold text-[#B91C1C]">❌ Out-Of-Character Example:</span>
                <p className="mt-1 text-muted leading-relaxed italic">&ldquo;{data.sampleVoiceComparison.outOfCharacter}&rdquo;</p>
              </div>
            </div>
          </div>
        )}

        {/* Compliance Notes */}
        {data.complianceRules.length > 0 && (
          <div className="flex items-start gap-2 rounded-xl border border-[#FDE68A] bg-[#FFFBEB] p-3 text-[11px] text-[#92400E]">
            <ShieldAlert size={14} className="mt-0.5 shrink-0" />
            <div>
              <span className="font-bold">Compliance Guardrails: </span>
              {data.complianceRules.join(" ")}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

