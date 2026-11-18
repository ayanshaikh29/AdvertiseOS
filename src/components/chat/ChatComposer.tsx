"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  ArrowUp,
  Paperclip,
  X,
  FileText,
  Image as ImageIcon,
  Square,
  Sparkles,
  SlidersHorizontal,
  Mic,
  Zap,
} from "lucide-react";
import type { ChatAttachment } from "@/types/chat";
import { cn } from "@/lib/cn";

interface ChatComposerProps {
  onSendMessage: (text: string, attachments: ChatAttachment[], campaignId?: string) => void;
  onStop: () => void;
  isLoading: boolean;
  disabled?: boolean;
  initialValue?: string;
}

const PRESET_PROMPTS = [
  "Create a 30-day Instagram marketing strategy for a clothing brand",
  "Create a 30-day lead generation campaign for IronCore Fitness Mumbai",
  "Analyze my top 5 competitors with source references",
  "Create 4 viral Reels concepts with shot-by-shot visual breakdown",
  "Create an SEO strategy with keyword clusters and on-page checklist",
];

export function ChatComposer({
  onSendMessage,
  onStop,
  isLoading,
  disabled,
  initialValue = "",
}: ChatComposerProps) {
  const [input, setInput] = useState(initialValue);
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [showOptions, setShowOptions] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialValue) {
      setInput(initialValue);
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }
  }, [initialValue]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
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
    <div className="mx-auto w-full max-w-3xl">
      {/* Optional Preset Prompts Drawer / Pills */}
      {showOptions && (
        <div className="mb-3 flex items-center gap-1.5 overflow-x-auto pb-1 text-xs smooth-scroll animate-in fade-in slide-in-from-bottom-2 duration-200">
          <span className="mr-1 shrink-0 text-[10px] font-bold uppercase tracking-wider text-[#A1A1AA]">
            Templates:
          </span>
          {PRESET_PROMPTS.map((preset, i) => (
            <button
              key={i}
              onClick={() => {
                setInput(preset);
                setShowOptions(false);
              }}
              className="shrink-0 rounded-full border border-black/[0.08] bg-white px-3 py-1.5 text-xs text-[#27272A] shadow-xs transition hover:border-[#18181B] hover:bg-[#F5F2EF] active:scale-95"
            >
              {preset.slice(0, 44)}…
            </button>
          ))}
        </div>
      )}

      {/* Floating Pill Composer Box (Image 1 Style) */}
      <div className="rounded-[28px] border border-black/[0.08] bg-[#FAF8F5]/90 p-3 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-xl transition-all focus-within:border-black/25 focus-within:bg-white focus-within:shadow-[0_12px_40px_rgb(0,0,0,0.08)]">
        {attachments.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2 border-b border-black/[0.05] pb-2.5">
            {attachments.map((att, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 rounded-xl border border-black/[0.06] bg-white px-3 py-1 text-xs text-[#27272A] shadow-xs"
              >
                {att.type === "image" ? (
                  <ImageIcon size={13} className="text-[#8B5CF6]" />
                ) : (
                  <FileText size={13} className="text-[#F97316]" />
                )}
                <span className="max-w-[150px] truncate font-medium">{att.name}</span>
                <button
                  onClick={() => setAttachments((prev) => prev.filter((_, i) => i !== idx))}
                  className="text-[#A1A1AA] transition hover:text-red-600"
                  aria-label={`Remove ${att.name}`}
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Input Textarea */}
        <div className="px-2 pt-1">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            disabled={disabled}
            placeholder="+ Initiate a query or send a command to the AI..."
            aria-label="Message the agency team"
            className="max-h-40 min-h-[36px] w-full resize-none bg-transparent text-sm sm:text-base leading-relaxed text-[#18181B] placeholder:text-[#A1A1AA] focus:outline-none"
          />
        </div>

        {/* Bottom Actions Row (Matching Image 1) */}
        <div className="mt-2 flex items-center justify-between gap-2 pt-1">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            multiple
            className="hidden"
          />

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="Attach media or brief"
              className="inline-flex items-center gap-1.5 rounded-full border border-black/[0.06] bg-white px-3 py-1.5 text-xs font-semibold text-[#52525B] shadow-2xs transition hover:bg-[#F5F2EF] hover:text-[#18181B] active:scale-95"
            >
              <Paperclip size={13} />
              <span>Attach</span>
            </button>

            <button
              type="button"
              onClick={() => setShowOptions((v) => !v)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border border-black/[0.06] px-3 py-1.5 text-xs font-semibold shadow-2xs transition active:scale-95",
                showOptions
                  ? "bg-[#18181B] text-white border-black"
                  : "bg-white text-[#52525B] hover:bg-[#F5F2EF] hover:text-[#18181B]"
              )}
            >
              <SlidersHorizontal size={12} />
              <span>Options</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const sample =
                  'Create a 30-day lead generation campaign for "IronCore Fitness", a premium gym in Mumbai (Andheri & Bandra). Details: - Campaign: 30-Day Monsoon Shred Challenge with certified trainers and customized nutrition plan - Target: Working professionals aged 24-45 looking for weight loss and functional strength - Goal: Generate 100+ inquiries for a 2-day free trial pass - Budget: ₹30,000 across Instagram & Facebook ads - Tone: Motivational, authoritative, no fake guarantees Required: 1. 12 Instagram feed posts with educational carousels 2. 4 viral Reels concepts with shot-by-shot visual breakdown 3. Full 30-day calendar 4. High-CTR Meta ad copies with audience targeting recommendations';
                setInput(sample);
              }}
              title="Quick sample brief"
              className="hidden sm:inline-flex items-center gap-1 rounded-full border border-black/[0.06] bg-white px-3 py-1.5 text-xs font-semibold text-[#52525B] shadow-2xs transition hover:bg-[#F5F2EF] hover:text-[#18181B]"
            >
              <Sparkles size={12} className="text-[#8B5CF6]" />
              <span>Sample brief</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {isLoading ? (
              <button
                type="button"
                onClick={onStop}
                title="Stop generation"
                aria-label="Stop generation"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EF4444] text-white shadow-md transition hover:bg-[#DC2626] active:scale-95"
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
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#18181B] text-white shadow-[0_4px_12px_-2px_rgba(24,24,27,0.35)] transition-all hover:bg-black hover:scale-105 disabled:cursor-not-allowed disabled:bg-[#E4E4E7] disabled:text-[#A1A1AA] disabled:shadow-none active:scale-95"
              >
                <ArrowUp size={16} strokeWidth={2.5} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
