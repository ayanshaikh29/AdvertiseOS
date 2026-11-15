# AUDIT — AdvertiseOS before Phase 5 (verified against the repo, Oct 2026)

All 10 claims in the upgrade prompt were checked. **All 10 are correct.** No corrections.

1. **No app shell — CONFIRMED.** `src/app/layout.tsx` renders a floating `PillNav` on every page. No sidebar, workspace switcher, search, notifications, or user menu.
2. **Data is in memory — CONFIRMED.** `src/lib/store.ts` `demoStore` is imported by 12 route/function files (96 grep hits). Lost on restart; broken on serverless. `supabase/migrations/0001_init.sql` exists but nothing queries it.
3. **Brand is hardcoded — CONFIRMED.** `SAMPLE_BRAND` imported in briefs/assets/reports/social routes + Inngest fn. `/brand` is read-only. No wizard, no brand CRUD.
4. **Auth is spoofable — CONFIRMED.** `src/lib/auth.ts` reads `x-role` header, defaults `viewer`. Any client can claim admin.
5. **Inline workflow — CONFIRMED.** `POST /api/briefs` runs CEO→Strategist→10×Content→10×Review→Designer→Video inline (~1–2 min, Vercel timeout risk). Inngest `campaign.run` duplicates the same logic.
6. **Quality gaps — CONFIRMED.** (a) CEO review scores only `caption_variants[0]`. (b) `brand_memory` table exists but **nothing ever reads it** — `runner.ts` builds context from the profile only; rejection reasons are audit-logged, never injected. (c) `extractJson` regex-parses free text. (d) Prices hardcoded in `llm.ts` (`0.003`/`0.015`).
7. **Thin pages — CONFIRMED.** No briefs list, calendar is a flat list, approvals has no edit/preview/filters/bulk, campaign page is static.
8. **No integrations — CONFIRMED.** `ManualAdapter` works; `MetaAdapter.publish()` always throws. No website connector, webhooks, or API keys.
9. **Spec drift (shadcn) — CONFIRMED.** No `@radix-ui/*`, no `@tanstack/*`, no `components/ui` in the repo.
10. **Repo hygiene — CONFIRMED (fixed).** `.gitignore` covers `node_modules/`, `.next/`, `.env*`, Supabase temp dirs (verified in repo). If a distributed zip contained build artifacts, regenerate it from a clean checkout.

## Phase 5 plan
5A (this phase): app shell + minimal shadcn-style system + repository layer (Supabase, file fallback for local) + Supabase Auth + onboarding. Then 5B–5F per prompt, one sub-phase per turn.
