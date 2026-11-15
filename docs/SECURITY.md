# AdvertiseOS Security & Secrets Policy

## Critical Key Rotation Notice
> [!IMPORTANT]
> Any Google Gemini API key previously pasted into chat or shared during development sessions **must be rotated immediately by the project owner in Google AI Studio / Google Cloud Console**.
> Even if old keys were deleted locally, API keys exposed in shared communication channels are considered compromised and must be revoked and replaced with a newly generated key in `.env.local`.

## Environment Variables & Secrets Hygiene
1. **Never commit `.env` or `.env*.local`**:
   - `.gitignore` explicitly blocks all `.env` files except `.env.example`.
   - Never stage, commit, or create zip archives containing `.env` or `.env.local`.
   - Run `npm run check:secrets` before pushing to ensure no private keys (`AIza...`, `AQ...`, or `-----BEGIN PRIVATE KEY-----`) exist in tracked files.

2. **Serverless Production Storage**:
   - Vercel and similar serverless platforms operate with an ephemeral, read-only filesystem.
   - The local JSON file database under `data/` is strictly for local development and offline test suites.
   - In production (`NODE_ENV=production`), Supabase database credentials (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) are mandatory.
   - The application enforces a startup check in production to refuse booting if Supabase credentials are missing.

3. **Strict AI Execution & No Secret Leaks**:
   - Agent prompts and outputs must never reflect raw API keys or internal credential tokens.
   - Error logs in `ModelRouter` and pipeline runs redact secret patterns automatically.
