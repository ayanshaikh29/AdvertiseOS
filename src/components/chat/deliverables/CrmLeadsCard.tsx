import React, { useState } from "react";
import type { DeliverableCrmLeads } from "@/types/chat";
import { Users2, MessageSquare, PhoneCall, Mail, Check, Copy, ArrowRight, FileText } from "lucide-react";
import Link from "next/link";

export function CrmLeadsCard({ data }: { data: DeliverableCrmLeads }) {
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const copyMessage = (msg: string, idx: number) => {
    navigator.clipboard.writeText(msg);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const channelIcon = (ch: string) => {
    switch (ch) {
      case "whatsapp":
        return <span className="text-[11px] font-bold text-[#059669]">WA</span>;
      case "instagram_dm":
        return <MessageSquare size={13} className="text-[#DB2777]" />;
      case "call":
        return <PhoneCall size={13} className="text-[#0891B2]" />;
      default:
        return <Mail size={13} className="text-[#7C3AED]" />;
    }
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-[0_1px_2px_rgba(16,24,40,0.05)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle px-5 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#ecfeff] text-[#0891B2]">
            <Users2 size={20} />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-display truncate text-sm font-bold text-ink">CRM & lead pipeline</h3>
              <span className="tint-info rounded-full px-2 py-0.5 text-[10px] font-semibold">
                {data.hasLiveData ? "Live data" : "Drafts"}
              </span>
            </div>
            <p className="truncate text-xs text-muted">
              {data.brandName} · target: {data.leadTargetAudience}
            </p>
          </div>
        </div>

        <Link href="/crm" className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs font-semibold text-[#334155] transition hover:bg-surface-hover">
          Open CRM <ArrowRight size={13} />
        </Link>
      </div>

      <div className="p-5">
        {data.pipelineStages.length > 0 ? (
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {data.pipelineStages.map((st, i) => (
              <div key={i} className="rounded-xl border border-border bg-[#fafbfc] p-3 text-center">
                <span className="text-[10px] font-bold uppercase text-muted">{st.name}</span>
                <p className="mt-1 text-xl font-extrabold text-ink">{st.count}</p>
                {st.valueUsd ? <span className="text-[10px] font-medium text-[#059669]">${st.valueUsd.toLocaleString()} value</span> : null}
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-[#d4d9e2] bg-[#fafbfc] p-4 text-center">
            <p className="flex items-center justify-center gap-1.5 text-xs font-semibold text-[#334155]">
              <FileText size={13} className="text-[#94A3B8]" />
              Awaiting connected lead data
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-muted">
              {data.dataNote || "No lead source is connected, so pipeline counts are intentionally hidden instead of fabricated."}
            </p>
          </div>
        )}

        <div className="mt-5">
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">Follow-up recommendations (drafts)</h4>
          <div className="mt-2.5 space-y-2.5">
            {data.recommendedFollowUps.map((fu, idx) => (
              <div key={idx} className="rounded-xl border border-border bg-[#fafbfc] p-3.5 transition hover:border-[#d4d9e2]">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border-subtle pb-2">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-md bg-white">{channelIcon(fu.channel)}</span>
                    <span className="text-xs font-bold text-ink">{fu.leadName}</span>
                    <span className="rounded bg-surface-2 px-2 py-0.5 text-[10px] uppercase text-muted">Trigger: {fu.trigger}</span>
                  </div>
                  <button
                    onClick={() => copyMessage(fu.suggestedMessage, idx)}
                    className="flex items-center gap-1 rounded-lg border border-border bg-white px-2 py-1 text-[11px] text-[#475569] transition hover:bg-surface-hover"
                  >
                    {copiedIdx === idx ? <Check size={12} className="text-[#10B981]" /> : <Copy size={12} />}
                    {copiedIdx === idx ? "Copied" : "Copy draft"}
                  </button>
                </div>
                <p className="mt-2 text-xs italic leading-relaxed text-[#475569]">“{fu.suggestedMessage}”</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
