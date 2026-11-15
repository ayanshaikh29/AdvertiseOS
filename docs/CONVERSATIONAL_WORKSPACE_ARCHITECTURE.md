# AdvertiseOS AI — Conversational Marketing Agency Workspace

## Overview & Vision
Transform AdvertiseOS from a dashboard-fragmented interface into a **unified ChatGPT / Claude-style private AI marketing agency workspace**.
The user interacts with a single high-intelligence orchestrator (**Project Head / AI Manager**) through a conversational command center with persistent conversations, client context, and multi-modal attachments. Behind the scenes, a hierarchical specialist agency team collaborates, plans, executes concurrently/sequentially, verifies quality, and delivers actionable, rich deliverables directly inside the conversation stream.

---

## 3-Column Architecture (Matching Notebook Sketch)

```
+-------------------+-------------------------------------------+---------------------------------+
|  1. LEFT SIDEBAR  |              2. MAIN CHAT                 |         3. TEAM & RESULTS       |
|  (Workspace)      |          (Conversational Engine)          |      (Live Collaboration)       |
+-------------------+-------------------------------------------+---------------------------------+
| * Client Switcher | * Thread Messages                         | * AI Team Hierarchy & Status    |
| * Chat History    |   - Natural Language User Prompts         |   - AI Manager / Project Head   |
| * Client Context  |   - Multi-attachment (Files, Briefs, Img) |   - Strategist                  |
| * Quick Workspaces|   - Real-time SSE Agent Activity Stream   |   - Content Writer              |
| * Saved Outputs   |   - Formatted Deliverables                |   - Designer                    |
| * Campaigns/Assets| * Persistent Command Composer             |   - Video Team                  |
| * Settings/Tokens |   - Auto-expanding Input                  |   - Performance Marketer        |
|                   |   - Mode pills (Full Campaign, Audit,     |   - Quality Reviewer            |
|                   |     Content Calendar, Ad Creatives)       | * Real-time Task Breakdown      |
|                   |   - Send & Cancel Controls                | * Deliverable Quick-view/Drawer |
+-------------------+-------------------------------------------+---------------------------------+
```

---

## Key Components to Implement

### 1. Unified Agency Orchestrator (`src/lib/agents/orchestrator.ts`)
- **Intent & Deliverable Classifier**: Deconstructs user prompt into discrete, structured deliverables (Audit, 30-day Calendar, Posts, Ad Creatives, Video Reels, Growth Plan, Lead Strategy).
- **Execution Graph**: Builds a directed dependency graph.
  - Phase 1: Planning (Manager + Strategist)
  - Phase 2: Concurrent Production (Content Writer + Designer + Video Team)
  - Phase 3: Review & Scoring (Quality Reviewer / Hallucination Guard)
  - Phase 4: Deliverable Packaging (Executive Summary + Interactive Previews + Exportable formats)
- **Live SSE Event Streaming**: Streams granular stage updates, agent thoughts, completed steps, and live progress to the frontend.

### 2. Conversational Storage & Context Persistence (`src/lib/db/chatStore.ts`)
- Schema for conversations and messages:
  - `Conversation`: `id`, `brandId`, `title`, `created_at`, `updated_at`, `summary`
  - `ChatMessage`: `id`, `conversationId`, `role` (user/manager/agent/system), `content`, `attachments`, `deliverables`, `agentRuns`, `status`
- Seamless integration with existing `fileRepo` and `repo` interfaces.

### 3. Deliverable Interactive Renderers (`src/components/chat/deliverables/`)
- **Strategy & Audit Report**: Clean markdown with objectives, audience insights, pillars, and SWOT.
- **Content Calendar**: Interactive table/grid with filters (platform, format, date), expandable captions, copy-to-clipboard, and CSV export.
- **Creative Previews**: Visual rendering of generated SVG/PNG creatives with live headline/subtext/template toggle.
- **Video & Reel Storyboards**: Scene-by-scene script breakdown (visuals, timings, voiceover, on-screen text, audio mood).
- **Executive Deliverable Deck / Word / Sheet**: One-click download/export formats.
- **Approval & Publishing Bridge**: Direct "Send to Approvals" action without leaving the conversation.

### 4. ChatGPT / Claude-Style Main Workspace (`src/app/dashboard/page.tsx` & `/chat`)
- Sleek obsidian-dark theme (`#050505`, `#0B0B0C`, `#161618`, subtle borders `#222`, vibrant accents `#2563EB`, `#3B82F6`).
- Left Workspace Sidebar with active client switch, conversation history, and quick access.
- Chat Stream with streaming typing effect, live collapsible agent progress accordion, and rich deliverable cards.
- Right Agent Team Drawer / Panel: Displays each agent's current task, latency, model used, and status (idle, thinking, generating, review, completed).
- Composer with file upload simulation/handling, preset chips, and auto-growing textarea.
