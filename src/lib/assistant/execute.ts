import type { Repo } from "@/lib/db/repo";
import { scoreCatalog } from "@/lib/catalog/health";
import type { AssistantIntent } from "@/lib/assistant/intent";

/** Execute a read-only intent against the repo. Reply text is written for speech:
 * short sentences, numbers spoken plainly. No mutations, ever. */

export async function executeIntent(intent: AssistantIntent, repo: Repo): Promise<{ reply: string; data: unknown }> {
  switch (intent) {
    case "status": {
      const [campaigns, items, catalog] = await Promise.all([repo.listCampaigns(), repo.listItems(), repo.listCatalog()]);
      const pending = items.filter((i) => i.status === "pending_human").length;
      const active = catalog.filter((c) => c.status === "active").length;
      const reply = `You have ${campaigns.length} campaigns, ${pending} items waiting for approval, and ${active} active catalog items. Open the dashboard for the full picture.`;
      return { reply, data: { campaigns: campaigns.length, pending, activeCatalog: active } };
    }
    case "approvals": {
      const items = await repo.listItems();
      const pending = items.filter((i) => i.status === "pending_human");
      const top = pending.slice(0, 3).map((i) => i.topic);
      const reply = pending.length
        ? `${pending.length} items are waiting for your approval. ${top.length ? `First up: ${top.join("; ")}.` : ""} Open the Approvals inbox to review.`
        : "Your approval inbox is empty. Nothing is waiting on you.";
      return { reply, data: { pending: pending.length, topics: top } };
    }
    case "trends": {
      const trends = await repo.listTrends(5);
      if (!trends.length) {
        return { reply: "No trends are stored yet. Refresh trends from the Autopilot page and I will read them back.", data: { trends: 0 } };
      }
      const top = trends.slice(0, 3).map((t) => `${t.title} (${t.source})`);
      const reply = `Latest headlines: ${top.join(". ")}. Full list with sources is on the Autopilot page.`;
      return { reply, data: { trends: trends.slice(0, 3).map((t) => ({ title: t.title, source: t.source, url: t.url })) } };
    }
    case "catalog": {
      const items = await repo.listCatalog();
      const health = scoreCatalog(items);
      const reply = items.length
        ? `Your catalog has ${health.itemCount} items, ${health.activeCount} active, with a health score of ${health.score} percent.${health.gaps.length ? ` Top gap: ${health.gaps[0]}` : ""}`
        : "Your catalog is empty. Add products and services on the Catalog page so agents can sell real things.";
      return { reply, data: health };
    }
    case "cost": {
      const runs = await repo.listRuns();
      const total = runs.reduce((s, r) => s + r.costUsd, 0);
      const reply = `AI spend so far is ${total.toFixed(2)} dollars across ${runs.length} agent runs. The monthly limit is shown in the sidebar.`;
      return { reply, data: { totalUsd: total, runs: runs.length } };
    }
    case "help":
    default:
      return {
        reply: "I can read your status, approvals, trends, catalog health, and AI cost. Try: how are my approvals?",
        data: { intents: ["status", "approvals", "trends", "catalog", "cost", "help"] },
      };
  }
}
