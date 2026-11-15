"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { supabaseBrowser, supabaseConfigured } from "@/lib/db/supabaseClient";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const configured = supabaseConfigured();

  async function magicLink() {
    setNote("Sending magic linkâ€¦");
    const sb = supabaseBrowser();
    const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: `${window.location.origin}/dashboard` } });
    setNote(error ? error.message : "Check your inbox for the sign-in link (invite-only).");
  }

  async function google() {
    const sb = supabaseBrowser();
    await sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${window.location.origin}/dashboard` } });
  }

  return (
    <div className="starfield mx-auto flex min-h-[70vh] max-w-md flex-col justify-center">
      <div className="card p-8">
        <p className="eyebrow">AdvertiseOS Â· Private</p>
        <h1 className="font-display mt-2 text-3xl font-bold">
          Welcome <em className="text-[#2563EB]">back</em>
        </h1>
        {!configured ? (
          <>
            <p className="mt-3 text-sm text-muted">
              Auth backend not connected (no Supabase env). Local dev mode signs you in as owner â€” clearly labeled, never for production.
            </p>
            <button onClick={() => router.push("/dashboard")} className="btn-primary mt-6 w-full justify-center">
              Continue in local dev mode <ArrowRight size={18} aria-hidden />
            </button>
          </>
        ) : (
          <>
            <p className="mt-3 text-sm text-muted">Invite-only. First user becomes owner.</p>
            <input
              aria-label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="mt-4 w-full rounded-xl border border-border bg-white px-4 py-3 text-ink outline-none focus:border-[#93C5FD]"
            />
            <button onClick={magicLink} className="btn-primary mt-3 w-full justify-center">Email me a sign-in link</button>
            <button onClick={google} className="btn-secondary mt-2 w-full justify-center">Continue with Google</button>
            {note ? <p className="mt-3 text-sm text-muted">{note}</p> : null}
          </>
        )}
      </div>
    </div>
  );
}
