# Integrations (connector framework)

Every external channel implements `ChannelConnector` (`src/lib/connectors/types.ts`).
Nothing talks to a real account unless its feature flag is on **and** real credentials exist.
Otherwise you get either a clearly-labeled **sample connector** (`FEATURE_FAKE_CONNECTORS=true`, default) or an
**unconfigured stub** that explains exactly what to set. Sample rows are never mixed with real data.

## Status (Phase 6A framework — real connectors land in 6B)

| Provider | Flag | Credentials (env) | Fake connector | Real connector |
|---|---|---|---|---|
| website (digitaladvertise.in) | `FEATURE_WEBSITE_CONNECTOR` | embed script + crawler consent | yes (sample) | 6B |
| meta (Instagram + Facebook) | `FEATURE_META_CONNECTOR` | Meta app id/secret, Page token, IG user id | yes (sample) | 6B |
| whatsapp (Cloud API) | `FEATURE_WHATSAPP_CONNECTOR` | `WHATSAPP_TOKEN`, phone number id, verify token | yes (sample) | 6B |
| ga4 | `FEATURE_GOOGLE_CONNECTOR` | GA4 property + read-only API | yes (sample) | 6B |
| search_console | `FEATURE_GOOGLE_CONNECTOR` | Search Console read scope | yes (sample) | 6B |
| meta_ads (read-only) | `FEATURE_META_CONNECTOR` | ads read insights token | yes (sample) | 6B |
| google_ads (read-only) | `FEATURE_GOOGLE_CONNECTOR` | developer token + OAuth | yes (sample) | 6B |

Turn off sample mode everywhere with `FEATURE_FAKE_CONNECTORS=false` — then unconfigured providers fail the
"Test connection" check with setup instructions instead of returning sample OKs.

## Endpoints
- `GET /api/integrations` — Data Health: per-provider status, capabilities, last test, freshness, completeness score.
- `POST /api/integrations/test { provider }` — runs the connector health check; owner/admin only; result persisted to
  `channel_accounts` and audit-logged.

## Token storage
Tokens are encrypted AES-256-GCM (`src/lib/crypto.ts`) with `CONNECTOR_TOKEN_KEY` (64 hex chars: `openssl rand -hex 32`).
They never reach client code, logs, or git. Saving real tokens fails with a clear error if the key is not set.

## UI
`/integrations` (sidebar: Grow → Integrations) shows the completeness ring ("Connect GA4 to unlock traffic-based
planning"), per-connector Test buttons, sample-data chips, and freshness ("Never synced" until a real sync job runs).

## Platform notes (to be verified against live docs in 6B before enabling real connectors)
- **Meta**: Instagram Graph API publishing needs `instagram_content_publish` + a connected FB Page; app development
  mode works for your own accounts, public use needs App Review. Trending audio/hashtags are **not** available via the
  official API — manual entry only.
- **WhatsApp Cloud API**: covers the **business number** only (not personal chats). Inbound messages arrive via webhook;
  outbound template messages need pre-approved templates. AI replies are drafts, auto-reply off by default.
- **GA4 / Search Console**: read-only service-account or OAuth access.
- Docs for each provider's permission list and review steps: completed in 6B when the real connectors land.

## Catalog sync (Phase 6B)
- `pullCatalog` capability: website + meta providers return labeled sample items until their real connectors land (`POST /api/catalog/sync`).
- Synced rows keep `source=connector` + `externalId` (deduped on re-sync) and a `sample` flag.
- Data health: per-item field weights + brand score on `/catalog` (see `src/lib/catalog/health.ts`).
