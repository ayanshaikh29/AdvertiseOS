import React, { useState, useRef, useEffect } from "react";
import { Send, Paperclip, X, FileText, Image as ImageIcon, Square } from "lucide-react";
import type { ChatAttachment } from "@/types/chat";

interface ChatComposerProps {
  onSendMessage: (text: string, attachments: ChatAttachment[], campaignId?: string) => void;
  onStop: () => void;
  isLoading: boolean;
  disabled?: boolean;
}

const PRESET_PROMPTS = [
  "Create a 30-day Instagram marketing strategy for a clothing brand",
  "Analyze my top 5 competitors with source references",
  "Create a Diwali promotional ad campaign with budget allocation",
  "Create an SEO strategy with keyword clusters and on-page checklist",
  "Create 5 high-converting social media creatives",
  "Improve the previous campaign based on performance results",
];

export function ChatComposer({ onSendMessage, onStop, isLoading, disabled }: ChatComposerProps) {
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [input]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!input.trim() && attachments.length === 0) || isLoading || disabled) return;
    onSendMessage(input, attachments);
    setInput("");
    setAttachments([]);
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file) continue;
      const isImg = file.type.startsWith("image/");
      setAttachments((prev) => [
        ...prev,
        {
          name: file.name,
          type: isImg ? "image" : "file",
          size: file.size,
          contentPreview: `Attachment: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`,
        },
      ]);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="mx-auto w-full max-w-4xl">
      {/* Preset prompt chips */}
      <div className="mb-2.5 flex items-center gap-1.5 overflow-x-auto pb-1 text-xs -webkit-overflow-scrolling-touch">
        <span className="mr-1 shrink-0 text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">Suggested:</span>
        {PRESET_PROMPTS.map((preset, i) => (
          <button
            key={i}
            onClick={() => setInput(preset)}
            className="shrink-0 rounded-full border border-border bg-surface px-3 py-1 text-xs text-[#475569] transition hover:border-[#bfdbfe] hover:bg-brand-soft hover:text-[#1D4ED8] active:scale-95"
          >
            {preset.slice(0, 48)}…
          </button>
        ))}
      </div>

      {/* Composer box */}
      <div className="rounded-2xl border border-border bg-surface shadow-[0_1px_3px_rgba(16,24,40,0.06)] transition-all focus-within:border-[#93c5fd] focus-within:ring-2 focus-within:ring-[#2563EB]/15">
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 border-b border-border-subtle p-3">
            {attachments.map((att, idx) => (
              <div key={idx} className="flex items-center gap-2 rounded-lg border border-border bg-surface-2 px-2.5 py-1 text-xs text-[#334155]">
                {att.type === "image" ? <ImageIcon size={14} className="text-[#7C3AED]" /> : <FileText size={14} className="text-[#2563EB]" />}
                <span className="max-w-[160px] truncate">{att.name}</span>
                <span className="font-mono text-[10px] text-muted">{att.size ? `${(att.size / 1024).toFixed(0)} KB` : ""}</span>
                <button onClick={() => setAttachments((prev) => prev.filter((_, i) => i !== idx))} className="text-muted transition hover:text-[#DC2626]" aria-label={`Remove ${att.name}`}>
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-end gap-2.5 p-2.5 sm:p-3">
          <input type="file" ref={fileInputRef} onChange={handleFileChange} multiple className="hidden" />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="Attach brief, guidelines or brand images"
            aria-label="Attach file"
            className="inline-flex h-10 w-10 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-xl text-muted transition hover:bg-surface-hover hover:text-ink active:bg-surface-2"
          >
            <Paperclip size={18} />
          </button>

          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            disabled={disabled}
            placeholder="Instruct your AI Marketing Agency… (Enter to send)"
            aria-label="Message the agency team"
            className="max-h-48 min-h-[40px] sm:min-h-[36px] flex-1 resize-none bg-transparent py-2 text-base sm:text-sm leading-relaxed text-ink placeholder:text-[#94A3B8] focus:outline-none"
          />

          {isLoading ? (
            <button
              type="button"
              onClick={onStop}
              title="Stop generation"
              aria-label="Stop generation"
              className="inline-flex h-10 w-10 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-xl bg-[#EF4444] text-white shadow-sm transition hover:bg-[#DC2626] active:scale-95"
            >
              <Square size={14} className="fill-current" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleSubmit()}
              disabled={disabled || (!input.trim() && attachments.length === 0)}
              title="Send instruction to agency"
              aria-label="Send message"
              className="inline-flex h-10 w-10 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-xl bg-[#2563EB] text-white shadow-[0_4px_12px_-4px_rgba(37,99,235,0.6)] transition hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-muted disabled:shadow-none active:scale-95"
            >
              <Send size={15} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
