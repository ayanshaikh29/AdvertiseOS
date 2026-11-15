import React, { useState } from "react";
import type { DeliverableCreatives } from "@/types/chat";
import { Image as ImageIcon, Download, Maximize2, Check, Copy, X, Loader2, RotateCcw, FileImage } from "lucide-react";
import { toast } from "@/components/ui/toast";

function ProviderLabel({ item }: { item: DeliverableCreatives["items"][number] }) {
  if (!item.imageUrl) {
    return <span className="tint-warning rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider">Design brief only — no image generated</span>;
  }
  if (!item.provider || item.provider === "template") {
    return <span className="tint-info rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider">Template render</span>;
  }
  return <span className="tint-success rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider">AI image · {item.provider}</span>;
}

export function CreativesCard({ data, campaignId }: { data: DeliverableCreatives; campaignId?: string }) {
  const [items, setItems] = useState(data.items);
  const [selectedId, setSelectedId] = useState(data.items[0]?.id);
  const [copied, setCopied] = useState(false);
  const [lightbox, setLightbox] = useState(false);
  const [regenId, setRegenId] = useState<string | null>(null);

  if (!items || items.length === 0) return null;
  const selectedItem = items.find((i) => i.id === selectedId) ?? items[0];

  const copyAdCopy = () => {
    if (!selectedItem) return;
    navigator.clipboard.writeText(`Headline: ${selectedItem.headline}\nSubtext: ${selectedItem.subtext}\nFormat: ${selectedItem.format} (${selectedItem.platform})`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  /** Re-render this creative through the real asset pipeline. */
  const regenerate = async (item: DeliverableCreatives["items"][number]) => {
    if (regenId) return;
    setRegenId(item.id);
    try {
      const r = await fetch("/api/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          design: item.design,
          topic: item.topic,
          campaignId: campaignId || undefined,
        }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "render failed");
      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id
            ? { ...i, imageUrl: d.asset?.url || "", provider: d.provider, design: { ...i.design, size: `${d.asset?.width ?? 1080}x${d.asset?.height ?? 1080}` } }
            : i
        )
      );
      toast(`Creative re-rendered (${d.provider || "template"})`);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Re-render failed");
    } finally {
      setRegenId(null);
    }
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-[0_1px_2px_rgba(16,24,40,0.05)]">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle px-5 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f5f3ff] text-[#7C3AED]">
            <ImageIcon size={20} />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-display truncate text-sm font-bold text-ink">Visual ad creatives</h3>
              <span className="shrink-0 rounded-full bg-[#f5f3ff] px-2 py-0.5 text-[10px] font-semibold text-[#6D28D9]">{items.length} designs</span>
            </div>
            <p className="text-xs text-muted">Preview, download or re-render each creative</p>
          </div>
        </div>
        <button
          onClick={copyAdCopy}
          className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs font-medium text-[#334155] transition hover:bg-surface-hover"
        >
          {copied ? <Check size={13} className="text-[#10B981]" /> : <Copy size={13} />}
          {copied ? "Copied" : "Copy ad text"}
        </button>
      </div>

      <div className="grid gap-5 p-5 lg:grid-cols-12">
        {/* Thumbnail gallery */}
        <div className="space-y-2.5 lg:col-span-5">
          {items.map((item) => {
            const isSelected = selectedItem?.id === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setSelectedId(item.id)}
                className={`w-full rounded-2xl border p-3.5 text-left transition ${isSelected ? "border-[#93c5fd] bg-brand-soft ring-1 ring-[#2563EB]/30" : "border-border bg-surface hover:border-[#d4d9e2] hover:bg-surface-hover"}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-md border border-border bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#64748B]">
                    {item.platform} · {item.format}
                  </span>
                  <span className="text-[10px] font-semibold text-[#7C3AED]">{item.templateId}</span>
                </div>
                <h4 className="mt-2 line-clamp-1 text-sm font-bold text-ink">{item.headline}</h4>
                <p className="line-clamp-1 text-xs text-muted">{item.subtext}</p>
              </button>
            );
          })}
        </div>

        {/* Preview */}
        <div className="lg:col-span-7">
          {selectedItem && (
            <div className="w-full">
              <div className="group relative aspect-square w-full overflow-hidden rounded-2xl border border-border bg-[#f1f3f7] shadow-sm">
                {selectedItem.imageUrl ? (
                  <button onClick={() => setLightbox(true)} className="h-full w-full" aria-label="Open full size preview">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={selectedItem.imageUrl} alt={selectedItem.headline} className="h-full w-full object-cover" />
                    <span className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-xl bg-white/90 text-[#334155] opacity-0 shadow transition group-hover:opacity-100">
                      <Maximize2 size={16} />
                    </span>
                  </button>
                ) : (
                  <div className="flex h-full flex-col justify-between bg-white p-7">
                    <span className="self-start rounded-md bg-brand-soft px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-[#1D4ED8]">{selectedItem.platform}</span>
                    <div className="my-auto space-y-3">
                      <h3 className="font-display text-2xl font-black leading-tight tracking-tight text-ink">{selectedItem.headline}</h3>
                      <p className="text-sm font-medium text-[#475569]">{selectedItem.subtext}</p>
                    </div>
                    <div className="rounded-full bg-ink px-5 py-2.5 text-center text-xs font-bold text-white">Learn More</div>
                  </div>
                )}
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 px-1">
                <span className="flex flex-wrap items-center gap-2 font-mono text-xs text-muted">
                  {selectedItem.design?.size || "1080x1080"} · {selectedItem.templateId}
                  <ProviderLabel item={selectedItem} />
                </span>
                <span className="flex items-center gap-2">
                  <button
                    onClick={() => regenerate(selectedItem)}
                    disabled={!!regenId}
                    className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs font-semibold text-[#334155] transition hover:bg-surface-hover disabled:opacity-50"
                    title="Re-render this creative"
                  >
                    {regenId === selectedItem.id ? <Loader2 size={13} className="animate-spin" /> : <RotateCcw size={13} />}
                    Re-render
                  </button>
                  {selectedItem.imageUrl && (
                    <a
                      href={selectedItem.imageUrl}
                      download={`creative_${selectedItem.topic.slice(0, 15)}.png`}
                      className="flex items-center gap-1.5 rounded-xl bg-[#2563EB] px-3 py-1.5 text-xs font-bold text-white transition hover:bg-[#1D4ED8]"
                    >
                      <Download size={13} />
                      PNG
                    </a>
                  )}
                </span>
              </div>

              <div className="mt-3 rounded-xl border border-border-subtle bg-[#fafbfc] p-3.5 text-xs text-[#475569]">
                <span className="mr-1.5 font-semibold text-ink">Design brief:</span>
                {selectedItem.design?.layout}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Lightbox */}
      {lightbox && selectedItem?.imageUrl && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[rgba(11,18,32,0.75)] p-6" onClick={() => setLightbox(false)} role="dialog" aria-label="Creative preview">
          <button className="absolute right-5 top-5 rounded-xl bg-white/10 p-2 text-white" aria-label="Close preview">
            <X size={20} />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={selectedItem.imageUrl} alt={selectedItem.headline} className="max-h-full max-w-full rounded-2xl object-contain shadow-2xl" />
          <span className="absolute bottom-6 flex items-center gap-2 rounded-xl bg-white/10 px-3 py-1.5 text-xs text-white backdrop-blur">
            <FileImage size={13} /> {selectedItem.design?.size}
          </span>
        </div>
      )}
    </div>
  );
}
