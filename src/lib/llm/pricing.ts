/** Model price table. Prices are configured, not hardcoded in call sites.
 * Defaults (Oct 2026, from ai.google.dev/gemini-api/docs/pricing + verified hubs):
 *   gemini-flash-latest      $0.75 in / $3.75 out per 1M tokens, $0.075 cached input
 *   gemini-flash-lite-latest $0.30 in / $2.50 out per 1M tokens
 *   gemini-pro-latest        $2.00 in / $12.00 out per 1M tokens
 * Google Search grounding: first ~5,000 requests/month free, then $14 per 1,000
 * (default per-request price 0 covers the free tier; override via LLM_PRICES_JSON).
 * Unknown models fall back to an ESTIMATED price and are flagged as estimated.
 * Override the whole table with env LLM_PRICES_JSON (array of {match, ...price}). */

export type ModelPrice = {
  inputPerM: number;
  outputPerM: number;
  cachedInputPerM: number;
  groundingPerRequest: number;
  imagePerImage: number;
};

export type PricedUsage = {
  costUsd: number;
  estimated: boolean;
};

type PriceEntry = { match: string; price: ModelPrice };

const DEFAULT_PRICES: PriceEntry[] = [
  { match: "gemini-flash-latest", price: { inputPerM: 0.75, outputPerM: 3.75, cachedInputPerM: 0.075, groundingPerRequest: 0, imagePerImage: 0.05 } },
  { match: "gemini-flash-lite-latest", price: { inputPerM: 0.3, outputPerM: 2.5, cachedInputPerM: 0.03, groundingPerRequest: 0, imagePerImage: 0.025 } },
  { match: "gemini-pro-latest", price: { inputPerM: 2, outputPerM: 12, cachedInputPerM: 0.5, groundingPerRequest: 0, imagePerImage: 0.12 } },
  { match: "gemini-2.5-flash", price: { inputPerM: 0.3, outputPerM: 2.5, cachedInputPerM: 0.075, groundingPerRequest: 0, imagePerImage: 0.04 } },
  { match: "gemini-2.5-flash-lite", price: { inputPerM: 0.15, outputPerM: 1.5, cachedInputPerM: 0.03, groundingPerRequest: 0, imagePerImage: 0.02 } },
  { match: "gemini-2.5-pro", price: { inputPerM: 1.25, outputPerM: 10, cachedInputPerM: 0.31, groundingPerRequest: 0, imagePerImage: 0.12 } },
  { match: "gemini-3.1-flash-image", price: { inputPerM: 0.3, outputPerM: 2.5, cachedInputPerM: 0.03, groundingPerRequest: 0, imagePerImage: 0.024 } },
  { match: "gemini-2.5-flash-image", price: { inputPerM: 0.3, outputPerM: 2.5, cachedInputPerM: 0.03, groundingPerRequest: 0, imagePerImage: 0.04 } },
  { match: "gemini-2.5-flash-preview-tts", price: { inputPerM: 0.3, outputPerM: 12, cachedInputPerM: 0.03, groundingPerRequest: 0, imagePerImage: 0 } },
  { match: "gemini-embedding-001", price: { inputPerM: 0.15, outputPerM: 0, cachedInputPerM: 0, groundingPerRequest: 0, imagePerImage: 0 } },
  { match: "text-embedding-004", price: { inputPerM: 0.05, outputPerM: 0, cachedInputPerM: 0, groundingPerRequest: 0, imagePerImage: 0 } },
];

const UNKNOWN_PRICE: ModelPrice = { inputPerM: 1, outputPerM: 5, cachedInputPerM: 0.25, groundingPerRequest: 0, imagePerImage: 0.05 };

let cachedTable: PriceEntry[] | null = null;

export function priceTable(): PriceEntry[] {
  if (cachedTable) return cachedTable;
  const raw = process.env.LLM_PRICES_JSON;
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as PriceEntry[];
      if (Array.isArray(parsed) && parsed.every((e) => typeof e.match === "string" && e.price)) {
        cachedTable = parsed;
        return cachedTable;
      }
    } catch {
      /* invalid JSON — fall through to defaults */
    }
  }
  cachedTable = DEFAULT_PRICES;
  return cachedTable;
}

/** Test hook: reset the memoized table after env changes. */
export function resetPriceCache() {
  cachedTable = null;
}

export function priceFor(model: string): { price: ModelPrice; estimated: boolean } {
  const table = priceTable();
  const hit = table.find((e) => model.includes(e.match));
  if (hit) return { price: hit.price, estimated: false };
  return { price: UNKNOWN_PRICE, estimated: true };
}

export function estimateUsageCost(
  model: string,
  tokens: { input: number; output: number; cached?: number; groundingRequests?: number }
): PricedUsage {
  const { price, estimated } = priceFor(model);
  const cached = Math.min(tokens.cached ?? 0, tokens.input);
  const freshInput = Math.max(0, tokens.input - cached);
  const cost =
    (freshInput / 1_000_000) * price.inputPerM +
    (cached / 1_000_000) * price.cachedInputPerM +
    (tokens.output / 1_000_000) * price.outputPerM +
    (tokens.groundingRequests ?? 0) * price.groundingPerRequest;
  return { costUsd: Number(cost.toFixed(6)), estimated };
}

export function estimateImageCost(model: string): PricedUsage {
  const { price, estimated } = priceFor(model);
  return { costUsd: Number(price.imagePerImage.toFixed(6)), estimated };
}
