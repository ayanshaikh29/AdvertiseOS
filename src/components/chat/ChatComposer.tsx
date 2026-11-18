"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import {
  ArrowUp,
  Paperclip,
  X,
  FileText,
  Image as ImageIcon,
  Square,
  Sparkles,
  SlidersHorizontal,
} from "lucide-react";
import type { ChatAttachment } from "@/types/chat";
import { cn } from "@/lib/cn";

interface ChatComposerProps {
  onSendMessage: (text: string, attachments: ChatAttachment[], campaignId?: string) => void;
  onStop: () => void;
  isLoading: boolean;
  disabled?: boolean;
  initialValue?: string;
  className?: string;
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
  className,
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
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
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
    <div className={cn("mx-auto w-full max-w-3xl", className)}>
      {/* Options / Preset Templates Drawer */}
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
                textareaRef.current?.focus();
              }}
              className="shrink-0 rounded-full border border-black/[0.08] bg-white px-3 py-1.5 text-xs text-[#27272A] shadow-xs transition hover:border-[#18181B] hover:bg-[#F5F2EF] active:scale-95"
            >
              {preset.slice(0, 44)}…
            </button>
          ))}
        </div>
      )}

      {/* Attachments preview chips */}
      {attachments.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2 px-3">
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

      {/* ── Exact Pill Design From User Image ─────────────────────────────────── */}
      <div className="group relative flex items-center rounded-full border border-black/[0.06] bg-white px-2.5 py-2 sm:px-3 sm:py-2.5 shadow-[0_12px_36px_-6px_rgba(249,115,22,0.16),0_6px_20px_-4px_rgba(139,92,246,0.12),0_2px_10px_rgba(0,0,0,0.04)] backdrop-blur-xl transition-all duration-300 focus-within:border-black/20 focus-within:shadow-[0_16px_50px_-6px_rgba(249,115,22,0.24),0_8px_24px_-4px_rgba(139,92,246,0.18)]">
        {/* Left Glowing Crystal Star Icon */}
        <div className="relative flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-white to-[#FAF8F5] p-1.5 shadow-[0_2px_8px_rgba(249,115,22,0.15)] ring-1 ring-black/[0.04] transition-transform duration-300 group-hover:scale-105">
          <Image
            src="/logo-emblem-transparent.png"
            alt="Star icon"
            width={30}
            height={30}
            className="object-contain drop-shadow-[0_2px_4px_rgba(249,115,22,0.3)]"
            priority
          />
        </div>

        {/* Vertical Divider */}
        <div className="mx-2 sm:mx-3 h-6 w-px bg-black/[0.08]" aria-hidden="true" />

        {/* Input Textarea (Single line feel, grows on multiline) */}
        <div className="flex flex-1 items-center min-w-0 pr-1">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            disabled={disabled}
            placeholder="Enter your prompt..."
            aria-label="Enter your prompt"
            className="max-h-28 min-h-[24px] sm:min-h-[26px] w-full resize-none bg-transparent text-sm sm:text-base leading-normal text-[#18181B] placeholder:text-[#94A3B8] focus:outline-none"
          />
        </div>

        {/* Right Action Icons & Submit Button */}
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            multiple
            className="hidden"
          />

          {/* Attach Button (Paperclip) */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="Attach file or image"
            aria-label="Attach file"
            className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-[#F4F4F5] text-[#71717A] transition hover:bg-[#E4E4E7] hover:text-[#18181B] active:scale-95"
          >
            <Paperclip size={17} />
          </button>

          {/* Options / Sliders Button */}
          <button
            type="button"
            onClick={() => setShowOptions((v) => !v)}
            title="Prompt options"
            aria-label="Prompt options"
            className={cn(
              "flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full transition active:scale-95",
              showOptions
                ? "bg-[#18181B] text-white"
                : "bg-[#F4F4F5] text-[#71717A] hover:bg-[#E4E4E7] hover:text-[#18181B]"
            )}
          >
            <SlidersHorizontal size={17} />
          </button>

          {/* Vertical Divider */}
          <div className="mx-1 sm:mx-1.5 h-6 w-px bg-black/[0.08]" aria-hidden="true" />

          {/* Submit Button (Dark circular pill with arrow up ↑) */}
          {isLoading ? (
            <button
              type="button"
              onClick={onStop}
              title="Stop generation"
              aria-label="Stop generation"
              className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-full bg-[#EF4444] text-white shadow-md transition hover:bg-[#DC2626] active:scale-95"
            >
              <Square size={14} className="fill-current" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleSubmit()}
              disabled={disabled || (!input.trim() && attachments.length === 0)}
              title="Send prompt"
              aria-label="Send prompt"
              className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-full bg-[#18181B] text-white shadow-[0_4px_14px_rgba(24,24,27,0.35)] transition-all hover:bg-black hover:scale-105 disabled:cursor-not-allowed disabled:bg-[#E4E4E7] disabled:text-[#A1A1AA] disabled:shadow-none active:scale-95"
            >
              <ArrowUp size={18} strokeWidth={2.5} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
