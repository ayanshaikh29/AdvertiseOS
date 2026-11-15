# AGENTS.md — AdvertiseOS agent contracts

Every agent receives: brand profile, brand memory (rules + approved/rejected examples), task input.
Every output is structured JSON validated with zod (`src/lib/schemas.ts`). Raw model text is never trusted.
As of Phase 6A all agents run through the `LLMProvider` interface (`src/lib/llm/`): Gemini structured output
(JSON mime + schema from zod, 2 validation retries with the error fed back, no regex extraction) with a
deterministic labeled fallback (status "fallback") when offline or when `LLM_PROVIDER=fake`.

System prompts are versioned (`src/lib/prompts.ts`, `PROMPT_DEFAULTS`). Overrides apply only via
`PUT /api/prompts` (admin) after a human accepts an HR proposal. The runner resolves them at call time.

## CEO (plan + review)
- Plan in: brief text → out `ceoPlanSchema {objectives[], kpis[], tasks[{agent, description, depends_on, deadline_day}], risks[]}`.
- Review in: copy + brand rules + hallucination-guard flags → out `ceoReviewSchema {score 0-100, passed, issues[], feedback_for_agent}`. Score < 75 fails (max 2 revisions, then human flag).
- Audit in: instruction + brand facts + pre-computed completeness gaps → out `auditReportSchema {score, overview, strengths[], weaknesses[], recommendations[], data_sources[]}`. The fallback score is the deterministic brand-completeness score — never random, never fabricated channel metrics.

## Manager (chat orchestration, `src/lib/agents/orchestrator.ts`)
- Intent in: one user instruction → out `requestIntentSchema` (`src/lib/agents/intent.ts`, LLM with keyword fallback). Scopes which agents run — a single-caption request must NOT launch strategy/calendar/design/video/CRM.
- Missing-facts gate (`src/lib/agents/missingFacts.ts`): production intents check for location, price, configurations, features, budget, CTA destination. Blocking fact missing → the run STOPS and emits a `clarifications` deliverable with real questions. Agents never invent these facts.
- CRM deliverable: with no connected lead source, `pipelineStages` is EMPTY and `hasLiveData=false` — fabricated pipeline counts are forbidden.
- Costs in the chat summary are aggregated from real `RunRecord`s, not hardcoded.

## Strategist → `strategySchema {content_pillars[], audience_insights[], calendar[{date, platform, format, topic, goal, hook, pillar}] (10–31 items), campaign_ideas[], festival_hooks[]}`

## Content → `contentItemSchema {caption_variants[3], hashtags[] (≤15), cta, alt_text, reel_script?, ad_copy?}`

## Designer → `designSchema {layout, headline (≤80), subtext (≤200), color_usage, image_prompt (text-free art), template_id, size WxH, text_overlays[]}`. Text is composited by `src/lib/image/template.ts`, never by the image model.

## Video Planner → `videoPlanSchema {duration_s, aspect, scenes[{n, visual, shot_type, duration_s, on_screen_text, voiceover}], music_mood, captions_srt, thumbnail_idea}`

## Social Manager → `socialPlanSchema {best_times[], posting_plan[]}` + `replyDraftSchema[] {comment_id, reply (≤500), tone, needs_human, escalation_reason?}`. Complaints/legal/pricing always escalate.

## Performance → `performanceReportSchema {summary, what_worked[], what_didnt[], budget_reallocation[] (recommend only), ab_test_ideas[], next_actions[]}`. Cites only uploaded metric numbers; else "insufficient data".

## HR → `hrReportSchema {agent_scorecards[{agent, runs, avg_ceo_score, total_cost_usd, note}], recurring_issues[], proposed_prompt_changes[{agent, change, reason}]}`. Proposals need human accept; accepted text is saved as a new versioned prompt.

## Phase 6 data you must read (truthful inputs)
- **Catalog** (products/services): `repo.listCatalog(brandId)` � active items with real names/prices are injected into every pipeline goal. Never invent prices, features, or offers beyond these + brand profile.
- **Trends** (`src/lib/trends/rss.ts`): real source-linked headlines; use as angles only, never state them as your own statistics.
- **Autopilot/voice are constrained**: voice assistant is read-only; autopilot items all land in approvals; never bypass the human gate.
