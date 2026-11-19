import React, { useState } from "react";
import Image from "next/image";
import type { ChatMessage as ChatMessageType } from "@/types/chat";
import { AgentCollaborationStatus } from "./AgentCollaborationStatus";
import { FormattedMarkdown } from "./FormattedMarkdown";
import { AuditCard } from "./deliverables/AuditCard";
import { OverviewCard } from "./deliverables/OverviewCard";
import { ClarificationsCard } from "./deliverables/ClarificationsCard";
import { StrategyCard } from "./deliverables/StrategyCard";
import { CalendarCard } from "./deliverables/CalendarCard";
import { CreativesCard } from "./deliverables/CreativesCard";
import { VideosCard } from "./deliverables/VideosCard";
import { ContentPostsCard } from "./deliverables/ContentPostsCard";
import { CrmLeadsCard } from "./deliverables/CrmLeadsCard";
import { SummaryCard } from "./deliverables/SummaryCard";
import { ResearchCard } from "./deliverables/ResearchCard";
import { BrandVoiceCard } from "./deliverables/BrandVoiceCard";
import { SeoCard } from "./deliverables/SeoCard";
import { PerformanceCard } from "./deliverables/PerformanceCard";
import { CriticCard } from "./deliverables/CriticCard";
import { User, Sparkles, FileText, Image as ImageIcon, RotateCcw, AlertTriangle } from "lucide-react";

export function ChatMessageItem({
  message,
  onRetry,
}: {
  message: ChatMessageType;
  onRetry?: (m: ChatMessageType) => void;
}) {
  const isUser = message.role === "user";
  const [drawerOpen, setDrawerOpen] = useState(false);
  const isStreaming = message.status === "streaming";

  if (isUser) {
    return (
      <div className="flex justify-end gap-3 py-2">
        <div className="max-w-2xl rounded-2xl rounded-tr-xs border border-black/[0.06] bg-white px-4 py-3 text-sm leading-relaxed text-[#18181B] shadow-2xs">
          {message.attachments && message.attachments.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {message.attachments.map((att, i) => (
                <span key={i} className="flex items-center gap-1.5 rounded-lg border border-black/[0.06] bg-[#F5F2EF] px-2 py-0.5 text-xs text-[#52525B]">
                  {att.type === "image" ? <ImageIcon size={12} className="text-[#8B5CF6]" /> : <FileText size={12} className="text-[#F97316]" />}
                  <span className="max-w-[140px] truncate font-medium">{att.name}</span>
                </span>
              ))}
            </div>
          )}
          <p className="whitespace-pre-wrap">{message.content}</p>
        </div>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#18181B] font-bold text-white shadow-2xs">
          <User size={15} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3.5 py-2">
      <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-black/[0.06] bg-gradient-to-tr from-[#FFF7ED] via-[#FDF2F8] to-[#F5F3FF] p-1 shadow-2xs">
        <Image
          src="/logo-emblem-transparent.png"
          alt="AdvertiseOS Agent"
          width={22}
          height={22}
          className="object-contain"
        />
      </div>

      <div className="min-w-0 flex-1 space-y-3.5 overflow-hidden">
        {message.agentActivities && message.agentActivities.length > 0 && (
          <AgentCollaborationStatus
            activities={message.agentActivities}
            isOpen={drawerOpen}
            onToggle={() => setDrawerOpen(!drawerOpen)}
          />
        )}

        {message.content && (
          <div className="rounded-2xl border border-border bg-surface px-4 py-3.5 text-sm leading-relaxed text-[#0b1220] shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
            <FormattedMarkdown content={message.content} />
            {isStreaming && (
              <span className="ml-0.5 inline-block h-4 w-0.5 translate-y-0.5 animate-pulse bg-[#18181B]" aria-label="Streaming" />
            )}
          </div>
        )}

        {message.error && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#fecaca] bg-[#fef2f2] px-3.5 py-2.5 text-xs text-[#b91c1c]">
            <span className="flex items-center gap-2">
              <AlertTriangle size={14} className="shrink-0" />
              {message.error}
            </span>
            {onRetry && (
              <button
                onClick={() => onRetry(message)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#fecaca] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#b91c1c] transition hover:bg-[#fef2f2]"
              >
                <RotateCcw size={12} />
                Retry
              </button>
            )}
          </div>
        )}

        {message.deliverables && message.deliverables.length > 0 && (
          <div className="space-y-3.5 pt-1">
            {message.deliverables.map((del, idx) => {
              switch (del.kind) {
                case "overview":
                  return <OverviewCard key={idx} data={del} />;
                case "research":
                  return <ResearchCard key={idx} data={del} />;
                case "brand_voice":
                  return <BrandVoiceCard key={idx} data={del} />;
                case "seo":
                  return <SeoCard key={idx} data={del} />;
                case "performance":
                  return <PerformanceCard key={idx} data={del} />;
                case "critic":
                  return <CriticCard key={idx} data={del} />;
                case "audit":
                  return <AuditCard key={idx} data={del} />;
                case "clarifications":
                  return <ClarificationsCard key={idx} data={del} />;
                case "strategy":
                  return <StrategyCard key={idx} data={del} />;
                case "calendar":
                  return <CalendarCard key={idx} data={del} />;
                case "creatives":
                  return <CreativesCard key={idx} data={del} campaignId={message.campaignId} />;
                case "videos":
                  return <VideosCard key={idx} data={del} />;
                case "content_posts":
                  return <ContentPostsCard key={idx} data={del} campaignId={message.campaignId} />;
                case "crm_leads":
                  return <CrmLeadsCard key={idx} data={del} />;
                case "summary":
                  return <SummaryCard key={idx} data={del} campaignId={message.campaignId} />;
                default:
                  return null;
              }
            })}
          </div>
        )}
      </div>
    </div>
  );
}
