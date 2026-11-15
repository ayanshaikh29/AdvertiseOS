# AdvertiseOS

Your entire marketing team. One command center. Nothing is published or spent without human approval.

## Run
1. Copy `.env.example` to `.env` (all keys server-side only).
2. `npm install`
3. `npm run dev` -> http://localhost:3000
4. Flow: `/brand` (sample) -> `/briefs/new` -> Run AI team -> `/campaigns/[id]` -> `/approvals` -> Manual export (JSON) -> `/assets` -> `/analytics` (upload CSV, weekly report) -> `/team` (HR review).

Without `GEMINI_API_KEY` (or with `LLM_PROVIDER=fake`), agents use deterministic offline fallbacks labeled "Sample data".
With the key, they call Google Gemini through the provider interface (`src/lib/llm/`) with structured JSON output
(zod-validated, 2 retries), Google Search grounding for trends, and cost tracking per run in `agent_runs`.
Model names come from `GEMINI_MODEL_*` env vars; prices from `src/lib/llm/pricing.ts` (override: `LLM_PRICES_JSON`).

## Checks
- `npm run typecheck`, `npm run lint`, `npm test`, `npm run test:e2e` (needs dev server on :3000)
- Inngest dev: `npx inngest-cli@latest dev` (serves `/api/inngest`)
- Seed: `npm run seed` prints the sample-brand SQL; apply with `psql $DATABASE_URL -f supabase/seed.sql`

## Deploy (Vercel + Supabase)
1. `supabase db push` (applies `supabase/migrations/0001_init.sql`), then `supabase/seed.sql` for the labeled demo brand.
2. Vercel: import repo, set env vars from `.env.example` (`GEMINI_API_KEY`, `LLM_PROVIDER`, `GEMINI_MODEL_*`, Supabase keys, `INNGEST_*`, `MONTHLY_COST_LIMIT_USD`, `CONNECTOR_TOKEN_KEY`).
3. DNS: CNAME `os.digitaladvertise.in` -> `cname.vercel-dns.com`. The existing static site stays untouched; add a "Login / Dashboard" link to the app URL.
4. Swap the demo store for Supabase queries in `src/lib/store.ts` call sites (documented `DemoCampaign` shape mirrors the tables 1:1).

## Meta publishing (behind flag)
1. Create a Meta app, add Instagram/Facebook products, request `pages_manage_posts` + `instagram_content_publish`, complete app review.
2. Generate a Page token + IG user id; set `FEATURE_META_PUBLISH=true`, `META_PAGE_TOKEN`, `META_IG_USER_ID`.
3. The `MetaAdapter` then replaces `ManualAdapter` via `getPublisher()`. Until then, publishing is manual export + mark-as-posted.

## Phase 6 (done: 6A–6F)
Gemini LLM engine (live-verified structured output/embeddings/TTS) · structured catalog + connector sync + health scoring · Trend Radar (real Google News RSS) + autopilot week + publish tick (human approval always) · voice assistant (read-only) · connected-data wiring into agents · e2e 8/8. Grounding + AI image need Gemini billing on the free tier (typed quota errors otherwise; template backgrounds used).

## Voice assistant
`/voice` — push-to-talk (browser speech recognition, en-IN) or type. Answers status, approvals, trends, catalog, and AI cost — strictly read-only. Spoken replies: free browser voice, or toggle Gemini studio voice (WAV via `/api/assistant/tts`).

## Autopilot & Trend Radar
`/autopilot` — Trend Radar pulls real headlines (Google News RSS, source-linked). "Run autopilot week" drafts content from your catalog + trends into the approval inbox (human gate). "Run publish tick" publishes approved+scheduled items due now (external cron: send `x-cron-secret` = `CRON_SECRET` to `/api/autopilot/tick`).

## Catalog (your real products & services)
`/catalog` — structured items every agent reads before writing offers. Add manually or "Sync from website" (fake connector = labeled sample data until the real crawl lands). Health score flags missing description/price/tags/features.

## Connect your Supabase project (persistence)
1. Supabase Dashboard → SQL Editor → New query → paste `supabase/apply_all.sql` → Run (creates all tables + RLS + sample brand).
2. In `.env`, uncomment `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` → the app switches from the local file store to Supabase.
3. (Later, for real sign-in) create a user, insert a `members` row (role `owner`), then uncomment `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

## Live LLM checks (costs a few cents)
`LIVE_LLM=true` with `GEMINI_API_KEY` set: `npx vitest run src/lib/llm/live.test.ts` — proves structured output, embeddings, TTS, and the quota-error paths for grounding/images on free tier.

## Docs
- `docs/AGENTS.md` - agent prompts + output schemas.
- `docs/INTEGRATIONS.md` - connector framework, flags, credentials, Data Health.
- `docs/CLIENT_GUIDE.md` - simple user guide for the CEO/approver.
- `docs/DECISIONS.md` - build decisions and known limitations.
