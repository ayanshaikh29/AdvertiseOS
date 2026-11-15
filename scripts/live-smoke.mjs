/* Live smoke checks (owner-run, not part of the test suite):
 *   node --env-file=.env scripts/live-smoke.mjs
 * 1) Gemini: tiny structured-output call (proves key + model + responseJsonSchema).
 * 2) Supabase: lists which app tables exist (proves schema state before enabling the repo).
 * No secrets in this file — everything comes from env. */

const results = { gemini: null, supabase: null };

// ---------- Gemini ----------
async function geminiCheck() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return { ok: false, error: "GEMINI_API_KEY not set" };
  const { GoogleGenAI } = await import("@google/genai");
  const ai = new GoogleGenAI({ apiKey: key });
  const model = process.env.GEMINI_MODEL_TEXT ?? "gemini-flash-latest";
  const started = Date.now();
  const res = await ai.models.generateContent({
    model,
    contents: "Return a JSON object confirming you are online.",
    config: {
      responseMimeType: "application/json",
      responseJsonSchema: {
        type: "object",
        properties: { online: { type: "boolean" }, message: { type: "string" } },
        required: ["online", "message"],
      },
    },
  });
  const parsed = JSON.parse(res.text ?? "{}");
  return {
    ok: true,
    model,
    modelVersion: res.modelVersion,
    parsed,
    tokens: res.usageMetadata?.promptTokenCount,
    latencyMs: Date.now() - started,
  };
}

// ---------- Supabase ----------
async function supabaseCheck() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return { ok: false, error: "Supabase env not set" };
  const { createClient } = await import("@supabase/supabase-js");
  const sb = createClient(url, key);
  const tables = [
    "orgs", "members", "brands", "brand_memory", "briefs", "campaigns", "tasks",
    "content_items", "assets", "metrics", "agent_runs", "agent_scores", "audit_log",
    "prompt_versions", "hr_proposals", "reports", "leads", "integrations",
    "integration_events", "automations", "automation_runs", "notifications",
    "settings", "channel_accounts", "sync_jobs",
  ];
  const present = [];
  const missing = [];
  for (const t of tables) {
    const { error } = await sb.from(t).select("*").limit(1);
    if (error) missing.push(t);
    else present.push(t);
  }
  const { count } = await sb.from("orgs").select("*", { count: "exact", head: true });
  return { ok: true, present, missing, orgs: count ?? 0 };
}

try {
  results.gemini = await geminiCheck();
} catch (e) {
  results.gemini = { ok: false, error: e?.message ?? String(e) };
}
try {
  results.supabase = await supabaseCheck();
} catch (e) {
  results.supabase = { ok: false, error: e?.message ?? String(e) };
}
console.log(JSON.stringify(results, null, 2));
