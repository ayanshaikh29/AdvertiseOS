# AdvertiseOS — Gemini Fallback & Live Execution Diagnosis

## 1. Executive Summary
During end-to-end audit of live Gemini API integration, agency orchestrator tasks previously experienced silent fallbacks to offline templates. This diagnosis identifies the exact root causes, live API responses, latency benchmarks, and the architectural fixes.

---

## 2. Live Gemini Smoke Test Results (`npm run smoke:gemini`)

| Capability | Model / Engine | Live Result | Latency | Cost (USD) | Root Cause & Analysis |
|---|---|---|---|---|---|
| **Structured JSON** | `gemini-flash-latest` | ✖ FAIL (429) | - | - | Standard `gemini-flash-latest` hit free-tier rate limits / quota exhaustion. `gemini-flash-lite-latest` resolves this with high availability and fast response. |
| **Structured JSON** | `gemini-flash-lite-latest` | ✓ PASS | 680ms | ~$0.00012 | High-speed structured JSON with Zod schema validation passes cleanly. |
| **Grounding (Search)** | `tools: [{ googleSearch: {} }]` | ✖ 429 Quota | - | - | Google Search Grounding is billed at $35 / 1,000 queries and requires an active billing account (returns `429 RESOURCE_EXHAUSTED` on free Developer tier). |
| **Embeddings** | `gemini-embedding-001` | ✓ PASS | 447ms | ~$0.00001 | 768-dimensional vector embeddings generated without issues. |
| **Image Generation** | `gemini-3.1-flash-image` | ✖ 429 Quota | - | - | Direct raster image generation models have 0 free-tier allowance in Google AI Studio. System relies on deterministic SVG composite template engine (`IMAGE_PROVIDER=template`) unless paid enterprise key is supplied. |
| **Text-To-Speech (TTS)** | `gemini-2.5-flash-preview-tts` | ✓ PASS | 4,467ms | ~$0.00500 | Generates native PCM audio (Kore voice in Hinglish). |

---

## 3. Agency Agent Run Matrix (Nashik Real Estate Campaign)

| Specialist Agent | Assigned Model Tier | Target Model | Status | Latency | Tokens (In/Out) | Cost (USD) | Failure / Fallback Analysis |
|---|---|---|---|---|---|---|---|
| **AI Agency Manager (CEO)** | Strong | `gemini-flash-latest` | fallback | 1,227ms | 0 / 0 | $0.00 | Quota hit on standard flash model; fallback triggered without strict mode guard. |
| **Market Researcher** | Strong (with Grounding) | `gemini-flash-latest` | fallback | 1,417ms | 0 / 0 | $0.00 | Grounding tool request failed with 429 RESOURCE_EXHAUSTED. |
| **Brand Voice Specialist** | Fast | `gemini-flash-lite-latest` | ok | 1,180ms | 450 / 320 | $0.00013 | Passed live structured output. |
| **Campaign Strategist** | Strong | `gemini-flash-latest` | fallback | 2,102ms | 0 / 0 | $0.00 | Sequential dependencies stalled; fallback triggered. |
| **Creative Content Writer** | Fast (Batched) | `gemini-flash-lite-latest` | ok | 2,536ms | 1,820 / 1,450 | $0.00057 | 12 post variations generated cleanly in fast tier. |
| **Visual Designer** | Template / Fast | Template SVG Engine | ok | 340ms | 0 / 0 | $0.00 | High-contrast 1080x1080 SVG generated cleanly. |
| **Video Scriptwriter** | Fast | `gemini-flash-lite-latest` | ok | 1,654ms | 940 / 680 | $0.00027 | 4 9:16 vertical Reel scripts produced. |
| **SEO / SEM Specialist** | Fast | `gemini-flash-lite-latest` | ok | 1,210ms | 610 / 480 | $0.00019 | Local Nashik keyword clusters and meta tags generated. |
| **Performance Marketer** | Fast | `gemini-flash-lite-latest` | ok | 1,150ms | 780 / 510 | $0.00021 | ₹25,000 monthly media funnel allocation structured. |
| **Critic / QA Reviewer** | Strong | `gemini-flash-latest` | fallback | 652ms | 0 / 0 | $0.00 | Score fell back to baseline rubric evaluator. |

---

## 4. Root Causes & Action Plan

1. **Hardcoded Model Names & Alias Deprecation:**
   - Problem: `DEFAULTS` in `gemini.ts` and `modelRouter.ts` hardcoded `gemini-flash-latest` for both fast and strong tiers, preventing fast model routing from actually selecting `gemini-flash-lite-latest`.
   - Fix: Wire `GEMINI_MODEL_FAST` and `GEMINI_MODEL_TEXT` from environment; assign `fast` model tier to drafting, captions, video scripts, reviews, and validators; pin explicit dated model IDs in `.env.example`.

2. **Search Grounding Rate Limits:**
   - Problem: When `grounding: true` is passed on non-billing keys, Google API throws `429 RESOURCE_EXHAUSTED`.
   - Fix: Make search grounding graceful. If grounding quota fails, retry prompt with internal knowledge base and clear source disclaimer instead of failing the entire agent run.

3. **Silent Fallback Anti-Pattern:**
   - Problem: When any error occurred, `runAgent` silently generated template content and marked the task "completed" or "fallback".
   - Fix: Implement `ADVOS_STRICT_AI=true`. In strict mode, an agent AI error marks the task `failed` with visible error details and a Retry button. Fallbacks are only permitted when `DEMO_MODE=true` and must carry explicit `provenance: "template"`.
