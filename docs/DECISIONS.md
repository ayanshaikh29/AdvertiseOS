# Decisions (AdvertiseOS)
- `create-next-app` cannot scaffold in a folder with spaces/capitals ("Advertise OS"), so Phase 1 was scaffolded manually with Next 15 + TS strict + Tailwind 3. Keeps identical stack, avoids rename churn.
- Phase 1 ran **offline-safe**: agent runner called Claude when `ANTHROPIC_API_KEY` existed, else deterministic fallback (clearly "Sample data"). Replaced by the Gemini provider in Phase 6A; the offline fallback behavior is unchanged.
- Supabase migration ships full schema + RLS enablement; app uses demo in-memory store until env is configured (documented in README). Persistence swap is Phase 1.1, no route changes needed.
- Inngest function defined + `brief.created` emitted; API route also runs inline so MVP works without an Inngest dev server.
- Cost limit enforced in `/api/briefs` via `MONTHLY_COST_LIMIT_USD` (graceful 402).
- Rejection reason required at route level (schema keeps it optional for approve/edit).

## Phase 2 (Creative)
- `sharp` must be in `serverExternalPackages` — bundling the native module causes
  `__webpack_modules__[moduleId] is not a function` at runtime. SVG fallback remains if PNG fails.
- Text-in-image rule enforced structurally: providers return background art only;
  `renderCreativeSVG` composites the exact headline/subtext/CTA (4 templates, brand colors, XML-escaped).
- Designer runs for all 10 visual items per brief; Video Planner only for first 2 reels (cost/time bound).
- Video export is Markdown download (print to PDF from browser) via `/api/video/export`.
- Asset Library reads the demo store; Supabase Storage persistence queued with Phase 1.1.

## Phase 3 (Distribution + Performance)
- Metrics import accepts raw `text/csv` POST (avoids multipart deps); columns platform,date,impressions,reach,clicks,leads,spend,revenue.
- Performance report cites only uploaded numbers; empty store → "insufficient data" (tested).
- Social replies: keyword escalation (complaint/legal/pricing) in the offline fallback AND the LLM prompt; nothing is ever auto-sent — drafts only.
- `PublisherAdapter` ships Manual (working) + Meta (throws until `FEATURE_META_PUBLISH=true` + app review + tokens). Publish flow: approved → scheduled → published, each step audited.

## Phase 4 (Self-improvement + Polish)
- HR proposals never auto-apply: accept queues intent, exact prompt text is saved versioned via admin `PUT /api/prompts` (role-gated).
- Roles are an `x-role` header dev stand-in (`src/lib/auth.ts`); replace with Supabase Auth session roles in Phase 1.1. Tested: viewer blocked, admin allowed.
- Notifications are a generic `NOTIFY_WEBHOOK_URL` hook (email/WhatsApp via provider); without it, log-only. Never claims delivery.
- Lighthouse mobile not run in this environment (no local Chrome harness); e2e + unit + build verified instead — see report.
- E2E runs on system Chrome (`channel: "chrome"`) because Playwright's chromium download is blocked on this network; 2/2 green.

## Phase 6 (connector framework prereq + 6A Gemini engine)
- **Connector framework was missing** (the 5D/5E work was never done), so it was built first per the Phase 6 prerequisite rule:
  `ChannelConnector` interface + registry + per-provider fake connectors (`FEATURE_FAKE_CONNECTORS`, default true, labeled "Sample data"),
  `UnconfiguredConnector` stubs, completeness score, `channel_accounts`/`sync_jobs`/`settings` tables (migration 0003),
  `POST /api/integrations/test` (owner/admin), Data Health page `/integrations`. Real connectors land in 6B behind
  `FEATURE_META_CONNECTOR` / `FEATURE_WHATSAPP_CONNECTOR` / `FEATURE_GOOGLE_CONNECTOR` / `FEATURE_WEBSITE_CONNECTOR`.
- **Anthropic SDK removed entirely.** `src/lib/llm.ts` (claudeJson/extractJson) deleted; replaced by `src/lib/llm/` with an
  `LLMProvider` interface, `GeminiProvider` (`@google/genai` v2.30), and `FakeLLMProvider`. No regex JSON extraction anywhere:
  structured output uses `responseMimeType: application/json` + `responseJsonSchema` generated from the zod schema
  (`zod-to-json-schema` with `$refStrategy:"none"`, `$schema` stripped — verified against the SDK's supported subset).
  The provider zod-validates and retries 2x with the validation error fed back (`LLMValidationError` -> runner fallback).
- **Model names come from env** (`GEMINI_MODEL_TEXT/FAST/IMAGE/EMBED/TTS`), defaulting to the `*-latest` aliases which Google
  hot-swaps to current stable (Oct 2026 docs: `gemini-flash-latest`, `gemini-flash-lite-latest`, `gemini-3.1-flash-image`
  Nano Banana 2, `gemini-embedding-001`, `gemini-2.5-flash-preview-tts`). Pin dated ids in env for reproducibility.
- **Prices are a configured table** (`src/lib/llm/pricing.ts`, overridable via `LLM_PRICES_JSON`) sourced from
  ai.google.dev/gemini-api/docs/pricing (flash-latest $0.75/$3.75 per 1M, lite $0.30/$2.50, cached input discount applied).
  Unknown models are flagged `estimated`. Grounding requests are counted (first ~5k/month free, then $14/1k — per-request
  price defaults to 0 to avoid overcharging the estimate). Cost per run lands in `agent_runs` (now with model + token counts).
- **Google Search grounding** is wired via `tools: [{ googleSearch: {} }]` and source URLs are extracted from
  `groundingMetadata.groundingChunks[].web` (for 6C Trend Radar). Not enabled by default on ordinary agent calls.
- **Context caching**: static system prompts (>=300 chars) with a `cacheKey` are cached via `ai.caches.create` (TTL 600s,
  in-process name memo); failures silently degrade to uncached. Env `GEMINI_CONTEXT_CACHE=false` disables.
- **Rate limits**: 429/5xx retried with exponential backoff (500ms * 3^n + jitter, 3 attempts); quota errors throw
  `LLMQuotaError` and auth errors `LLMAuthError` (no retry) so the UI can surface them clearly.
- **Fake provider**: json/text throw `OfflineLLMError` -> runner uses its existing deterministic fallbacks (status "fallback",
  model labeled `fake-sample`). `embed()` returns deterministic seeded unit vectors (labeled sample, not semantic);
  `image()` returns a labeled SVG gradient. `LLM_PROVIDER=fake` makes tests/offline mode deterministic.
- **TTS**: `GeminiProvider.tts()` generates audio/L16 PCM via the TTS model (voice `GEMINI_VOICE`, default "Kore"); 6E falls
  back to browser `speechSynthesis` when unsupported. **Image references**: `generateImages` has no reference-image input;
  `ImageArgs.references` is accepted but ignored until an edit-image API is wired (documented, not silently pretended).
- Token encryption for connector tokens: AES-256-GCM (`src/lib/crypto.ts`), key = `CONNECTOR_TOKEN_KEY` (64 hex chars).
- RLS: enabled on all new tables; policies follow the 0002 `using (true)` pattern (service-role app access). True org-scoped
  policies need JWT org claims and are tracked as hardening for 6F.
- E2E: `webServer` block added to playwright.config.ts (starts `npm run dev`, reuses an existing server). First cold run can
  exceed the 30s goto timeout while Next compiles pages; the warm run is green (5/5).

## Phase 6 — live verification with owner credentials (2026-10-17)
- **Gemini key verified live** (`scripts/live-smoke.mjs` + `src/lib/llm/live.test.ts`, gated `LIVE_LLM=true`):
  `gemini-flash-latest` resolves to `gemini-3.8-flash`; structured JSON output + zod validation works; embeddings return
  768-dim vectors; **TTS works** with `gemini-2.5-flash-preview-tts` (audio/L16 PCM). json/embed/tts paths are live-proven.
- **Free-tier limits hit (documented platform limits, not bugs):** (a) Google Search grounding returns 429
  RESOURCE_EXHAUSTED — grounding requires a billing-enabled project; (b) image models (`gemini-3.1-flash-image`,
  `gemini-2.5-flash-image`) have free-tier limit 0 — image generation also needs billing. Both now surface as typed
  `LLMQuotaError` with the provider's message. Until billing is enabled, creatives use the deterministic template
  background (`IMAGE_PROVIDER=template`) and Trend Radar will run ungrounded / report the quota honestly.
- **SDK corrections from live testing:** `models.generateImages` and `imageConfig.personGeneration` are
  Vertex/Enterprise-only — the Gemini Developer API path is `generateContent` with `responseModalities:["IMAGE"]` +
  `imageConfig.aspectRatio` (no-people rule enforced in the prompt). `image()` and `embed()` now go through the same
  quota/auth error mapping as text calls.
- **Supabase project `lndayywchpopikcnjrto`**: reachable with the service key, but **zero tables exist**. One-paste
  schema file added: `supabase/apply_all.sql` (0001+0002+0003+seed). `NEXT_PUBLIC_SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY`
  are staged commented-out in `.env` and get uncommented after the schema is applied (file store stays active until then).
- **`.env` holds the real keys (gitignored, verified `git check-ignore`).** `NEXT_PUBLIC_SUPABASE_ANON_KEY` deliberately
  left commented: setting it flips auth from local-owner to real Supabase Auth, and without a `members` row + sign-in
  method every session becomes `viewer` (locked out of approvals). Uncomment after signing up and inserting a members row.
- `LIVE_LLM=true npx vitest run src/lib/llm/live.test.ts` re-runs the live checks (a few cents of quota).

## Phase 6B — Connected business data: catalog (2026-10-17)
- **Structured catalog** replaces the free-text `Brand.products` string as the source of truth (string kept for back-compat):
  `CatalogItem` (kind product|service, price, tags, features, status, source manual|connector, externalId for sync dedupe) in
  `src/lib/catalog/types.ts` + repo entity. Storage: file store key `catalog` + `catalog_items` table
  (`supabase/migrations/0004_catalog.sql`, appended to `apply_all.sql`). Supabase save upserts a brand stub first (FK-safe).
- **API:** `GET/POST /api/catalog` (list + health scores / create), `GET/PUT/DELETE /api/catalog/[id]`,
  `POST /api/catalog/sync` (pull from a connector, dedupe by externalId, records a `sync_jobs` row). Mutations are
  `requireRole(["owner","admin"])` — one of the first routes beyond prompts/integrations-test to gate writes.
- **Data-health scoring** (`src/lib/catalog/health.ts`): per-item field weights (description 25, price 20, tags 15,
  features 15 + required name 25); brand score = average of **active** items; gaps carry actionable hints, shown on `/catalog`
  and returned by the API. Unit-tested (5 tests).
- **Connector catalog sync:** `pullCatalog` capability + `PulledCatalogItem` added to the connector framework;
  `FakeConnector` returns 3 clearly-labeled sample services (website + meta providers). `/catalog` page has
  "Sync from website" (sample until the real crawl connector lands) and manual add/delete with health badges.
  Nav: Sidebar (Create group) + CommandPalette.
- Live-smoke verified on the file store: create → sync (3 sample rows) → list (health 100%) → delete, all OK via `npm run dev`.

## Phase 6C — Trend Radar + Autopilot (2026-10-17)
- **Trend Radar** (`src/lib/trends/rss.ts`): real headlines from Google News RSS (`/rss/search`, en-IN) — no API key, no
  grounding quota (which needs billing on free tier). Zero new deps: regex XML parse, entity unescape, dedupe by URL,
  max 3 brand/catalog-derived queries. Items keep source + link + fetchedAt — presented as **angles**, never unsourced facts.
  Storage: file `trends[]` + `trends` table (`0005_trends.sql`, appended to `apply_all.sql`). API: `GET /api/trends`
  (staleness flag), `POST /api/trends/refresh` (owner/admin). **Live-verified: 24 real headlines fetched.**
- **Shared pipeline extracted**: briefs route body moved to `src/lib/agents/pipeline.ts#runCampaignPipeline` (briefs route
  is now a thin wrapper; autopilot reuses it with `source: "autopilot"` + trend headlines appended to the strategist goal).
  Items still land `pending_human` — approval gate untouched.
- **Autopilot run** (`POST /api/autopilot/run`, owner/admin, `FEATURE_AUTOPILOT=false` disables): builds a goal from the
  brand + **active catalog items** (real names/prices) + top 3 trend headlines, runs the pipeline, returns campaign + cost +
  trendsUsed. Cost-limit check preserved (402).
- **Publish tick** (`src/lib/publish/tick.ts` + `POST /api/autopilot/tick`): publishes **scheduled** items whose
  `scheduled_for` has passed, via the existing publisher adapter (manual export until Meta review). Auth: owner/admin session
  or `x-cron-secret` header matching `CRON_SECRET` (for external cron). Pure `findDueItems` is unit-tested; approval itself
  is never automated.
- UI `/autopilot` (Sidebar Grow + CommandPalette): trends list + refresh, run-week button (links to Approvals), tick button.

## Phase 6D — Voice assistant (2026-10-17)
- **Read-only by design**: the assistant answers from the repo; it never mutates data, publishes, or spends budget.
  Intents: status / approvals / trends / catalog / cost / help (`src/lib/assistant/intent.ts`).
- **Two-stage routing**: deterministic keyword router first (free, instant, covers the 6 intents — unit-tested), LLM
  classification (`flash`, cached `assistant-intent`) only when keywords miss; provider-sample mode falls back to `help`.
  Replies are written for speech (`src/lib/assistant/execute.ts`).
- **API**: `POST /api/assistant` {text} → {reply, intent, source, data}; `POST /api/assistant/tts` {text} → playable
  **WAV** (Gemini TTS returns raw PCM L16/24kHz — wrapped in a 44-byte RIFF header, `src/lib/assistant/wav.ts`), 503+reason
  on unsupported so the UI falls back to browser `speechSynthesis`.
- **UI `/voice`** (Sidebar Workspace + CommandPalette): push-to-talk via Web Speech API (en-IN; typed fallback where
  unsupported), spoken replies via free browser voice or the **Gemini studio voice toggle** (verified live: 140KB RIFF WAV).
  Web Speech types added in `src/types/speech.d.ts` (not in TS DOM lib).
- Live smoke: keyword intent "approvals" → correct reply from real repo data; TTS endpoint returned valid WAV.

## Phase 6E — connected-data wiring + honest surfaces (2026-10-17)
- **Catalog into every agent run**: `runCampaignPipeline` now appends active catalog items (real names/prices) to the
  goal alongside trend headlines — briefs *and* autopilot runs see real sellable items; never invent other prices.
- **`/api/status` + Settings page** now report: autopilot flag, voice availability, catalog item count, Trend Radar last
  fetch, `CRON_SECRET` presence (booleans/counts only, no secrets).
- **Onboarding checklist** gained "Add products & services" → `/catalog`.

## Phase 6F — hardening + e2e (2026-10-17)
- **E2E**: `e2e/phase6.spec.ts` extended with catalog, autopilot, and voice coverage (voice test asserts a real
  read-only answer end-to-end). **8/8 passing.**
- **Playwright stability**: `navigationTimeout: 60s`, `actionTimeout: 20s`, `timeout: 90s`, `workers: 1` — cold Next.js
  dev compiles exceed the 30s defaults under parallel load (reproduced, then fixed; warm single-worker runs are green).
- Auth review: assistant/TTS routes session-gated; trends refresh, catalog mutations, autopilot run are owner/admin;
  publish tick accepts owner/admin **or** `x-cron-secret`=`CRON_SECRET`. Voice + tick + assistant are read-only/safe.
- Phase 6 complete: 6A LLM engine (Gemini, live-verified) · 6B catalog + connector sync + health · 6C Trend Radar +
  autopilot + publish tick · 6D voice assistant · 6E wiring/surfaces · 6F hardening/e2e.
  Commits: 783ad6b → eb54e65 → 2c7b867 → 308f413 → be85a3d → (6E/6F final).
  Outstanding (user): paste `supabase/apply_all.sql` (0001–0005) in Supabase SQL Editor, then uncomment the 2 env lines;
  optionally enable Gemini billing for search grounding + AI image generation.

## 2026-11-15 — Final Fix Architectural Decisions (Steps 0–8 Implementation)

### 1. Strict AI Mode & Zero Silent Fallback (`ADVOS_STRICT_AI=true`)
- **Decision:** In standard and production operation, the system will never silently substitute hardcoded fallback templates when an AI model or quota fails.
- **Implementation:** `isStrictAiMode()` throws an `AgentExecutionError` that marks the active task failed with the exact error cause and presents an actionable Retry button in the UI. Template samples are restricted to explicit demo/sample modes and carry a permanent `provenance: "template"` badge.
- **QA Gate Status:** Deliverables scoring below threshold after revision rounds receive `status: "needs_rewrite"` and are moved to a dedicated Needs Rewrite queue, completely excluding them from live human approval.

### 2. Agency Hierarchy: CEO → 3 Domain Managers → Specialist Squads
- **Decision:** Replace flat agent execution with a structured 3-tier hierarchy:
  - **Executive & Quality:** CEO sets objectives/KPIs and signs off on final packages. HR/Quality Officer audits truthfulness and compliance.
  - **Digital Marketing Manager:** Coordinates Strategist, Market Researcher, and SEO/SEM Specialists.
  - **Content & Creative Manager:** Oversees Copywriter, Visual Designer, and Video Scriptwriter. Runs domain rubric reviews and feeds revisions back to writers.
  - **Performance Manager:** Oversees Paid Media Specialist and ad funnel architectures.
- **UI Reflection:** The `/team` page visualizes the real org chart with live agent stats (runs, spend, latency, fallback rate). Deliverable cards show the reviewer provenance chain (`Reviewed by Content Manager → Signed off by CEO`).

### 3. High-Throughput Model Routing & Progressive Delivery
- **Decision:** Assign `GEMINI_MODEL_FAST` (`gemini-2.5-flash-lite`, ~680ms latency) to copywriting, video scripting, and manager reviews. Reserve `GEMINI_MODEL_TEXT` (`gemini-2.5-flash`) for high-level CEO plans, positioning strategy, and mandatory QA evaluation.
- **Progressive Delivery:** Deliver days 1–7 (Week 1) to the UI immediately upon drafting so users have immediate access within ~15–20s, while remaining calendar days process in the background.

### 4. Code Quality Validators & Brand Memory
- **Decision:** Implement deterministic code validators alongside prompt instructions:
  - Banned generic filler phrases (`practical tip`, `reply to learn more`, `unlock your potential`, `game changer`).
  - Near-duplicate topic detector (`Jaccard similarity > 0.6`).
  - Unverified claims and superlative validator.
  - Brand memory rejection feed-forward: Human rejections feed directly into `contextToPrompt`, preventing past mistakes from recurring.

