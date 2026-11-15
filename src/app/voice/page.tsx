"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, Send, Volume2, Square } from "lucide-react";
import { cn } from "@/lib/cn";

type Reply = { reply: string; intent: string; source: string; data: unknown };

export default function VoicePage() {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [input, setInput] = useState("");
  const [last, setLast] = useState<Reply | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [geminiVoice, setGeminiVoice] = useState(false);
  const [voiceError, setVoiceError] = useState("");
  const [browserSR, setBrowserSR] = useState(true);
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const w = window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike };
    const SR = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!SR) {
      setBrowserSR(false);
      return;
    }
    const rec = new SR();
    rec.lang = "en-IN";
    rec.interimResults = true;
    rec.continuous = false;
    rec.onresult = (e: SpeechRecognitionEventLike) => {
      const text = Array.from(e.results).map((r) => r[0]?.transcript ?? "").join("");
      setTranscript(text);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => { setListening(false); setVoiceError("Mic error â€” check browser mic permission."); };
    recRef.current = rec;
    return () => rec.abort();
  }, []);

  function toggleMic() {
    if (!recRef.current) return;
    if (listening) {
      recRef.current.stop();
      setListening(false);
    } else {
      setTranscript("");
      setVoiceError("");
      recRef.current.start();
      setListening(true);
    }
  }

  async function ask(text: string) {
    const q = text.trim();
    if (q.length < 2) return;
    setInput(q);
    setTranscript("");
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: q }),
      });
      const out = (await res.json()) as Reply & { error?: string };
      if (!res.ok) throw new Error(out.error ?? "Assistant failed");
      setLast(out);
      speak(out.reply);
    } catch (e) {
      setVoiceError(e instanceof Error ? e.message : "Assistant failed");
    }
  }

  async function speak(text: string) {
    stopSpeak();
    setSpeaking(true);
    if (geminiVoice) {
      try {
        const res = await fetch("/api/assistant/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        });
        if (res.ok) {
          const url = URL.createObjectURL(await res.blob());
          const audio = new Audio(url);
          audioRef.current = audio;
          audio.onended = () => { setSpeaking(false); URL.revokeObjectURL(url); };
          await audio.play();
          return;
        }
      } catch {
        /* fall through to browser voice */
      }
    }
    if ("speechSynthesis" in window) {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "en-IN";
      u.rate = 1.05;
      u.onend = () => setSpeaking(false);
      window.speechSynthesis.speak(u);
    } else {
      setSpeaking(false);
    }
  }

  function stopSpeak() {
    audioRef.current?.pause();
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    setSpeaking(false);
  }

  return (
    <div className="grid gap-4">
      <div className="card p-6 sm:p-8">
        <p className="eyebrow">Voice assistant Â· read-only</p>
        <h1 className="font-display mt-2 text-3xl font-bold">
          Ask your <em className="text-[#2563EB]">OS</em>
        </h1>
        <p className="mt-2 text-sm text-muted">
          Push the mic and speak (browser speech recognition, en-IN). Replies are spoken back â€” Gemini studio voice (verified live) or the free browser voice. The assistant only reads data; it never edits, publishes, or spends.
        </p>
        {voiceError ? <p className="mt-2 text-sm text-[#EF4444]">{voiceError}</p> : null}

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            onClick={toggleMic}
            disabled={!browserSR}
            aria-label={listening ? "Stop listening" : "Start listening"}
            className={cn(
              "inline-flex h-16 w-16 items-center justify-center rounded-full border transition-colors",
              listening ? "border-[#EF4444] bg-[rgba(239,68,68,.15)] text-[#EF4444]" : "border-border bg-white text-ink hover:border-[#93C5FD]",
              !browserSR && "cursor-not-allowed opacity-50"
            )}
          >
            {listening ? <Square size={22} /> : <Mic size={22} />}
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-xs uppercase tracking-wide text-[#6B7280]">{browserSR ? (listening ? "Listeningâ€¦" : "Tap mic or type below") : "Mic unsupported in this browser â€” type instead"}</p>
            <p className="mt-1 min-h-[1.5em] text-sm">{transcript || (listening ? "â€¦" : "")}</p>
          </div>
          <label className="flex items-center gap-2 text-xs text-muted">
            <input type="checkbox" checked={geminiVoice} onChange={(e) => setGeminiVoice(e.target.checked)} className="accent-[#2563EB]" />
            Gemini studio voice
          </label>
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); ask(transcript || input); }}
          className="mt-4 flex gap-2"
        >
          <input
            value={input || transcript}
            onChange={(e) => { setInput(e.target.value); setTranscript(""); }}
            placeholder="How are my approvals?"
            className="min-w-0 flex-1 rounded-xl border border-border bg-white px-4 py-3 text-ink outline-none focus:border-[#93C5FD]"
          />
          <button type="submit" className="btn-primary inline-flex items-center gap-2"><Send size={16} /> Ask</button>
        </form>
      </div>

      {last ? (
        <div className="card p-6">
          <div className="flex items-center justify-between gap-3">
            <p className="eyebrow">Answer Â· {last.intent} {last.source === "llm" ? "(llm)" : ""}</p>
            <div className="flex gap-2">
              <button onClick={() => speak(last.reply)} className="btn-secondary inline-flex items-center gap-2 text-sm"><Volume2 size={14} /> Replay</button>
              <button onClick={stopSpeak} className="btn-secondary text-sm">Stop</button>
            </div>
          </div>
          <p className="mt-3 text-base">{last.reply}</p>
          {speaking ? <p className="mt-2 text-xs text-[#2563EB]">Speakingâ€¦</p> : null}
        </div>
      ) : null}
    </div>
  );
}
