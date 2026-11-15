# AdvertiseOS — V5 White "Animated Dashboard" Redesign & Product Cleanup

**Decisions locked with user:** light/white theme · electric-blue accent (#2563EB) · subtle/premium motion (framer-motion, already a dependency) · sidebar: merge "Campaigns" into "Projects" · CRM: build real leads persistence.

**Baseline (verified):** `tsc --noEmit` clean · `vitest run` 103 passed / 5 skipped · lint: 1 pre-existing warning · e2e: smoke (2) + phase6 (6). Preserve all of these.

**Hard constraints:** no data loss (never touch existing records in `data/*.json`, `supabase/` tables, `.env`), no static mockups, every status/metric truthful, human approval gate stays server-side, repo already dirty with prior uncommitted work (do NOT revert it).

---

## Phase 0 — Safety net

1. Snapshot `git status` (baseline: 28 modified + ~15 untracked from prior work — leave untouched).
2. Record baseline: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`.
3. Start dev server; verify `/dashboard`, `/briefs/new`, `/approvals` render (e2e anchors).

## Phase 1 — Design system: light theme foundation

Files: `src/app/globals.css`, `tailwind.config.js`, `src/components/ui/*`

1. Rewrite `globals.css` light tokens: `--bg:#F6F7F9` `--surface:#FFFFFF` `--surface-2:#F3F4F6` `--border:#E7E9EE` `--primary:#2563EB` `--text-main:#0B1220` `--text-muted:#64748B` + status vars. **Define every var `tailwind.config.js` already references** (`--surface-2`, `--border`, `--blue`, `--blue-soft`, `--indigo`, `--success`, `--warning`, `--danger`) so token classes stop resolving to nothing; fix `fontFamily.display` → Plus Jakarta Sans.
2. Restyle shared classes for light: `.card` (white, 1px border, rounded-2xl, soft shadow `0 1px 2px rgba(16,24,40,.04), 0 12px 32px -20px rgba(16,24,40,.18)`), `.luxury-card`, `.btn-*` variants, light scrollbar, `.eyebrow`; remove dark `.mesh-bg` gradients per brief (flat surfaces, no glass).
3. Expand UI kit: `button.tsx` light variants (primary/dark/secondary/ghost/danger, sm/md/icon); `badge.tsx` + shared `StatusBadge` (draft / running / ready-for-review / needs-changes / approved / scheduled / published / failed / rejected); new `card.tsx`, `tabs.tsx`, `table.tsx`, `select.tsx`, `empty-state.tsx`, `skeleton.tsx` (extract from badge.tsx), `page-header.tsx`; light restyle `dialog.tsx`, `input.tsx`, `toast.tsx`.
4. Motion helper `src/components/ui/motion.tsx`: `fadeInUp`, `staggerContainer`, `hoverLift(y:-5)` from framer-motion with `useReducedMotion()` respect. Use sparingly: page enter, card hover, list stagger, streaming pulse.

Verify: typecheck + lint + tests green; build compiles.

## Phase 2 — Application shell

Files: `src/components/shell/*`, `src/app/layout.tsx`

1. `layout.tsx`: drop `dark` class, body light bg.
2. `Sidebar.tsx` — final 11-item nav:
   - WORKSPACE: AI Workspace `/dashboard` · Clients `/clients` · Projects `/campaigns`
   - MARKETING: Content Studio `/briefs` (rebuilt in Phase 5) · Calendar `/calendar` · Approvals `/approvals`
   - CUSTOMER MANAGEMENT: CRM & Leads `/crm` · Inbox `/inbox` (new, Phase 6 — real social reply drafts, labeled "Draft replies — not sent")
   - INSIGHTS: Analytics `/analytics`
   - SETTINGS: Integrations `/integrations` · Settings `/settings`
   - Light rail, collapsible with tooltips, active = soft-blue + indicator, real approvals badge + real cost guardrail. Remove duplicate `/campaigns` entries. Secondary pages (`/assets /brand /catalog /autopilot /team /voice /briefs/new`) leave the sidebar but stay reachable via Command Palette + contextual links.
3. `Topbar.tsx`: client/workspace selector (brand picker moves here from sidebar), page title + contextual subtitle, `⌘K` search trigger, notifications bell (real pending count), profile menu (Settings, Sign out).
4. `CommandPalette.tsx`: light restyle, add Inbox + Content Studio.
5. `MobileTabs.tsx` light; `AppShell.tsx` white content area + subtle page enter.

Verify: all routes reachable, no duplicate hrefs, e2e smoke passes (keep "AdvertiseOS AI Workspace" string in `/dashboard` empty state).

## Phase 3 — AI Workspace (primary experience)

Files: `src/components/chat/*`, `src/app/dashboard/page.tsx`

1. 3-column layout per `docs/CONVERSATIONAL_WORKSPACE_ARCHITECTURE.md`: left = persistent conversation history (new/rename/delete, brand-scoped; replaces unused `ChatSidebar.tsx`), center = messages + composer, right = collapsible team activity panel rendered only when real `agentActivities` exist (name/status/task/latency/cost from SSE — no simulated progress; mobile: bottom sheet).
2. `AgencyChatWorkspace.tsx`: cancellation via AbortController + Stop button; retry resends last message; fix `loadConversations` lint warning; empty state keeps heading + example prompt cards + context selectors.
3. `ChatComposer.tsx`: large light composer — auto-grow textarea, real attachments (name+size, removable), client selector + project selector (existing campaigns, optional), example prompt chips, Enter/Shift+Enter, disabled+spinner states.
4. `ChatMessageItem.tsx`: light bubbles, readable markdown blocks (`FormattedMarkdown`), error + Retry, streaming caret.
5. `AgentCollaborationStatus.tsx`: light expandable strip, honest statuses only.

Verify: typecheck; manual run of `/api/chat/stream` — streaming, cancel, retry, history ops, attachments, brand+project context.

## Phase 4 — Redesigned AI result views (critical)

Files: `src/components/chat/deliverables/*`, `src/types/chat.ts`, `src/lib/schemas.ts`, `src/lib/agents/*`

**4a. Schema/orchestrator extensions (additive zod-optional fields — existing tests stay green):**
- `contentItemSchema` += optional `hook`, `objective`, `audience`, `carousel_slides[{heading,body}]`, `reel_script`, `ad_copy{primary_text,headline,cta}` (docs/AGENTS.md already promises reel_script/ad_copy — fix code drift).
- `strategySchema` += optional `executive_summary`, `audience_segments[{name,insight,channel}]`, `funnel_stages[{stage,goal,content}]`.
- contentRun prompt: require hook/objective; carousel → slide-by-slide; reel → full script; ad → primary text/headline/CTA; reject repeated topics + generic filler.
- `orchestrator.ts`: populate new strategy fields; map `cal.hook/goal` into `Item` (add optional `hook`/`objective` to `repo.ts` Item type).

**4b. Card redesigns (light white cards, no glow blobs):**
- **StrategyCard** — Executive summary · Business & audience understanding · Objectives · Audience segments table · Positioning & messaging · Channels + rationale · Pillars & funnel · Campaign plan & budget assumptions · KPIs / Risks / Next actions. Fact/Assumption/Recommendation badges. Copy-as-Markdown.
- **ContentPostsCard** — per-post card: platform+format badges, objective+audience, hook, full caption (variant switcher, expandable), CTA + hashtags, design brief line, StatusBadge; actions: Edit (inline → `PATCH /api/campaigns/[id]`, fixing today's 405), Copy, Regenerate (4c), Approve (real `POST /api/approvals` — fixing today's fake local-state approve), Reject with reason. Carousel → slides; Reel → script/scenes; Ad → primary/headline/CTA.
- **CreativesCard** — large click-to-lightbox preview + thumbnail gallery, dimension label from `design.size`, concept + copy, explicit "Template render" vs "AI image" vs "Design brief only — no image generated" labels from `renderCreative().provider` (never claim an image exists when `imageUrl` is empty), regenerate via `POST /api/assets`, asset id + status.
- **VideosCard** — concept/objective/duration/aspect/CTA header; scene-by-scene timeline (visual, shot type, VO, on-screen text, durations); "Script/Storyboard — not a rendered video" label (renders `<video>` only if an asset ever exists); download `.md` wired to orphan `GET /api/video/export`.
- **CalendarCard** — month mini-grid + list toggle, platform/status filters, CSV export, link to `/calendar`.
- **AuditCard / ClarificationsCard / SummaryCard / CrmLeadsCard** — light restyle; keep truthful flags (`limitedData`, `hasLiveData:false`); Summary gets next-step buttons.

**4c. Regenerate:** new `POST /api/content/regenerate` `{itemId | {topic,platform,format}, brandId}` → existing `contentRun` + `ceoReview`, `repo.updateItem`, bounded single call via runner's retry/timeout.

Verify: extend `schemas.test.ts` + `orchestrator.test.ts` (executive_summary present; carousel slides; ad_copy; no duplicate topics); manual full_campaign chat review.

## Phase 5 — Page-by-page light redesign + cleanup

Every page: light tokens, PageHeader (title+subtitle+actions), skeletons, real empty states, error+retry, page enter animation. Audit before deleting; label incomplete features.

| Page | Changes |
|---|---|
| `/briefs` stub | Rebuild as Content Studio: recent content items from `/api/campaigns`, platform/status filters, "New brief" CTA, links to Calendar/Assets (no new backend) |
| `/briefs/new` | Light restyle; keep SSE progress + "Tell the AI team" heading (e2e) |
| `/campaigns` | Light cards; real stats only; empty state |
| `/campaigns/[id]` | Fix PATCH 405 (`updateItem` → `PATCH /api/campaigns/[id]`); StatusBadge everywhere; edit caption + approve/reject work end-to-end |
| `/calendar` | Month + Week toggle, client/platform/status filters, content previews, open/edit/approve per item, CSV kept. Drag-drop skipped (spec: only if correct) — date edit dialog instead |
| `/approvals` | Light restyle + StatusBadge (already react-query, working) |
| `/analytics` | Light cards + charts; weekly report as readable document; genuine client-side Download .json/.csv of the real report only |
| `/integrations`, `/settings` | Light; fix `NEXT_PUBLIC_COST_LIMIT` client read → `/api/status`; sample connectors labeled |
| `/clients /brand /catalog /autopilot /team /voice /assets /login` | Light restyle + skeleton/empty/error; remove dead buttons (grep handlers) |
| `/crm` | Phase 6 backend + pipeline board, add/edit dialog, brand-scoped |
| `/inbox` (new) | Social reply drafts from `GET /api/social/replies`, `needs_human` grouped, "Draft only — never auto-sent" |

Cleanup checklist (verify before removal): drop `Placeholder.tsx`; replace `ChatSidebar.tsx`; remove dark CSS after grep confirms no consumers; wire orphan routes (`/api/video/export` → VideosCard, `/api/publish` → Calendar schedule action, `/api/onboarding` → Settings checklist or drop); remove `react-markdown` only if `npm ls` shows zero imports; grep hardcoded sample arrays in pages → replaced or labeled.

## Phase 6 — Real leads persistence (CRM)

Files: `src/lib/db/{repo,fileRepo,supabaseRepo}.ts`, `src/app/api/leads/route.ts`, `src/app/api/leads/[id]/route.ts`, `src/app/crm/page.tsx`

1. `Lead` type mirroring `0002_phase5a.sql` `leads` columns: `{id, brandId, name, company?, channel, status: new|contacted|qualified|won|lost, value?, notes, followUpAt?, source, created_at, updated_at}`; additive migration only if columns missing.
2. Repo methods `listLeads/saveLead/updateLead` in **both** fileRepo (new additive collection key in `data/advertiseos.json` — never rewrite existing collections wholesale) and supabaseRepo (tenant-scoped, RLS respected).
3. API `GET/POST /api/leads` (brandId filter) + `GET/PATCH/DELETE /api/leads/[id]` with `requireRole` on mutations, audit entries.
4. `/crm` page: brand-scoped pipeline board, add/edit dialog, status transitions, follow-up tasks, honest empty state ("No leads yet — add one or connect a lead source").

## Phase 7 — Agent execution & backend integrity

Files: `src/lib/agents/{orchestrator,runner,pipeline}.ts`, `src/app/api/chat/stream/route.ts`

1. Keep existing architecture; ensure orchestration: classify → missing-facts gate → plan → concurrent specialists (`mapLimit` CONCURRENCY=4) → validate/review → persist → package. Add missing pieces only: **task-plan persistence** (emit plan as a `plan` event + store on the message) and **post-validation dedupe** (drop duplicate-topic deliverables before emit).
2. Provider timeouts + bounded retries already in `runner.ts` — verify a timeout config exists; add `AbortSignal` propagation from the SSE route so client Stop actually cancels in-flight LLM calls.
3. Never substitute generic content silently: fake/fallback responses already labeled "fallback"/"Sample data" — surface that label in the UI (agent chip note + deliverable "Sample data" badge).
4. Idempotency: regeneration endpoint keyed by itemId so double-clicks don't double-bill (guard with in-flight set).

## Phase 8 — Performance, accessibility, responsiveness

1. Dedupe fetches: Sidebar + Topbar both call `/api/approvals` and `/api/team/scores` → single react-query `useQuery` with shared keys in QueryProvider (already mounted).
2. Pagination: campaigns list, assets, CRM leads, approvals (>20 items) — "Load more" or simple page controls.
3. A11y: all interactive controls keyboard-reachable, visible focus rings (2px blue), dialogs trap focus (radix does), tables have headers, charts have text summaries, contrast ≥ 4.5:1 (light theme helps), `prefers-reduced-motion` disables framer transforms.
4. Test widths: 1440 / 1024 / 768 / 390 — sidebar collapse, chat 3-column → stacked, calendar grid, tables scroll.
5. Auth unchanged: middleware + `requireRole` untouched; verify mutations still gated.

## Phase 9 — Verification (report actual results)

1. `npm run lint` · `npm run typecheck` · `npm test` (must be ≥ 103 passed) · `npm run build`.
2. `npm run test:e2e` (dev server on :3000) — smoke + phase6; update spec expectations only where UI text intentionally changed (document each change).
3. Workflow tests end-to-end (real clicks, record outcomes):
   - Login → AI Workspace → send prompt (fallback mode fine) → streaming + agent chips → deliverables render → Edit caption (PATCH works, was 405) → Approve (real API) → item appears in Approvals with status → Calendar shows it.
   - CRM: create lead → move status → persists after reload.
   - Content Studio shows real campaigns; `/briefs/new` run still works (SSE).
   - Cancel mid-stream; retry after forced error; rename/delete/new conversation.
   - Mobile 390px: sidebar → tabs, chat usable, cards stack.
4. Latency: note chat stream time-to-first-event before/after (baseline from `dev-server.log` if present).
5. Final report: what changed per phase, test results verbatim, known gaps honestly labeled.

**Do not:** replace app with mockup, delete data, weaken approval gate, claim untested features work.
