import { NextResponse } from "next/server";
import { supabaseConfigured } from "@/lib/db/supabaseClient";
import { fakeConnectorsEnabled } from "@/lib/connectors/registry";
import { llmMode } from "@/lib/llm";
import { getRepo } from "@/lib/db/fileRepo";

/** Public status flags for the Settings page (no secrets, booleans/mode names only). */
export async function GET() {
  const repo = await getRepo();
  const [catalog, trends] = await Promise.all([repo.listCatalog(), repo.listTrends(1)]);
  return NextResponse.json({
    llm: {
      mode: llmMode(),
      provider: (process.env.LLM_PROVIDER ?? "auto").toLowerCase(),
      model: process.env.GEMINI_MODEL_TEXT ?? "gemini-flash-latest",
    },
    supabase: supabaseConfigured(),
    metaPublish: (process.env.FEATURE_META_PUBLISH ?? "false") === "true",
    fakeConnectors: fakeConnectorsEnabled(),
    autopilot: process.env.FEATURE_AUTOPILOT !== "false",
    voice: true,
    costLimitUsd: Number(process.env.MONTHLY_COST_LIMIT_USD ?? 50),
    catalogItems: catalog.length,
    trendsFetchedAt: trends[0]?.fetchedAt ?? null,
    secrets: {
      connectorTokens: /^[0-9a-fA-F]{64}$/.test((process.env.CONNECTOR_TOKEN_KEY ?? "").trim()),
      cronSecret: !!(process.env.CRON_SECRET ?? "").trim(),
    },
  });
}
