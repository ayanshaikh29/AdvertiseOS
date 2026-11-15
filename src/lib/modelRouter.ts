import { getLLM, type LLMProvider, type Usage } from "@/lib/llm";

export type ModelTier = "fast" | "strong" | "default";

export interface ModelRouterConfig {
  fastModel: string;
  strongModel: string;
  defaultModel: string;
  enableCaching: boolean;
  cacheTTLMs: number;
  maxConcurrency: number;
  rateLimitRpm: number;
}

export const DEFAULT_ROUTER_CONFIG: ModelRouterConfig = {
  fastModel: process.env.GEMINI_MODEL_FAST ?? "gemini-2.5-flash-lite",
  strongModel: process.env.GEMINI_MODEL_TEXT ?? "gemini-2.5-flash",
  defaultModel: process.env.GEMINI_MODEL_TEXT ?? "gemini-2.5-flash",
  enableCaching: true,
  cacheTTLMs: 10 * 60 * 1000, // 10 minutes
  maxConcurrency: Number(process.env.CONCURRENCY ?? 5),
  rateLimitRpm: Number(process.env.GEMINI_RPM ?? 60),
};

/** Model routing rules by agent and task type */
export const MODEL_ROUTING: Record<string, ModelTier> = {
  // Agency Orchestrator & Planning - strong model
  "manager:plan": "strong",
  "ceo:plan": "strong",
  "ceo:review": "strong",
  "ceo:hr": "strong",
  
  // 1. Strategist - strong model
  "strategist:strategy": "strong",
  "strategist:calendar": "strong",

  // 2. Market Research - strong model for deep synthesis
  "researcher:market": "strong",
  "researcher:competitors": "strong",

  // 3. Brand Voice - fast model
  "brand_voice:guidelines": "fast",
  "brand_voice:audit": "fast",

  // 4. Performance Marketing
  "performance:strategy": "strong",
  "performance:report": "fast",

  // 5. SEO / SEM
  "seo:keywords": "strong",
  "seo:audit": "strong",

  // 6. Creative Production & Drafting - fast model for high throughput (<60s)
  "creative:write": "fast",
  "creative:design": "fast",
  "creative:video": "fast",
  "content:write": "fast",
  "content:design": "fast",
  "content:video": "fast",
  "content:social": "fast",
  "content:performance": "fast",
  "content_manager:review": "fast",
  "reviewer:score": "fast",
  
  // 7. Critic / Quality Assurance - strong model for rigorous gate
  "critic:review": "strong",
};

/** Semaphore for concurrency control */
class Semaphore {
  private permits: number;
  private waiters: Array<() => void> = [];

  constructor(permits: number) {
    this.permits = permits;
  }

  async acquire(): Promise<void> {
    if (this.permits > 0) {
      this.permits--;
      return;
    }
    return new Promise<void>((resolve) => {
      this.waiters.push(resolve);
    });
  }

  release(): void {
    this.permits++;
    const waiter = this.waiters.shift();
    if (waiter) waiter();
  }
}

/** Simple in-memory cache with TTL */
interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

class ResponseCache {
  private cache = new Map<string, CacheEntry<{ data: unknown; usage: Usage }>>();
  private ttlMs: number;

  constructor(ttlMs: number) {
    this.ttlMs = ttlMs;
  }

  get(key: string): { data: unknown; usage: Usage } | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.value;
  }

  set(key: string, value: { data: unknown; usage: Usage }): void {
    this.cache.set(key, { value, expiresAt: Date.now() + this.ttlMs });
  }

  clear(): void {
    this.cache.clear();
  }
}

/** Model router with concurrency control, caching, and model selection */
export class ModelRouter {
  private config: ModelRouterConfig;
  private provider: LLMProvider;
  private semaphore: Semaphore;
  private cache: ResponseCache;
  private requestTimestamps: number[] = [];

  constructor(config: Partial<ModelRouterConfig> = {}) {
    this.config = { ...DEFAULT_ROUTER_CONFIG, ...config };
    this.provider = getLLM();
    this.semaphore = new Semaphore(this.config.maxConcurrency);
    this.cache = new ResponseCache(this.config.cacheTTLMs);
  }

  /** Get the appropriate model tier for an agent/task */
  getModelTier(agent: string, taskType: string): ModelTier {
    const key = `${agent}:${taskType}`;
    return MODEL_ROUTING[key] ?? "default";
  }

  /** Execute with model routing, caching, and rate limiting */
  async execute<T>(
    agent: string,
    taskType: string,
    args: { system: string; user: string; schema: any; cacheKey?: string; grounding?: boolean; temperature?: number }
  ): Promise<{ data: T; usage: Usage }> {
    const tier = this.getModelTier(agent, taskType);
    const cacheKey = args.cacheKey ? `${tier}:${args.cacheKey}` : undefined;

    // Check cache first
    if (this.config.enableCaching && cacheKey) {
      const cached = this.cache.get(cacheKey);
      if (cached) {
        return cached as { data: T; usage: Usage };
      }
    }

    // Rate limiting
    await this.waitForRateLimit();

    // Concurrency control
    await this.semaphore.acquire();

    try {
      const useFast = tier === "fast";
      const result = await this.provider.json<T>({
        system: args.system,
        user: args.user,
        schema: args.schema,
        cacheKey,
        grounding: args.grounding,
        temperature: args.temperature ?? 0.2,
        fast: useFast,
      });

      // Cache successful result
      if (this.config.enableCaching && cacheKey) {
        this.cache.set(cacheKey, result);
      }

      return result;
    } finally {
      this.semaphore.release();
    }
  }

  /** Wait if we've hit the rate limit */
  private async waitForRateLimit(): Promise<void> {
    if (this.provider.sample || process.env.NODE_ENV === "test" || (process.env.LLM_PROVIDER ?? "").toLowerCase() === "fake") {
      return;
    }
    const now = Date.now();
    const windowStart = now - 60_000; // 1 minute window
    this.requestTimestamps = this.requestTimestamps.filter(ts => ts > windowStart);
    
    if (this.requestTimestamps.length >= this.config.rateLimitRpm) {
      const oldest = this.requestTimestamps[0];
      if (oldest !== undefined) {
        const waitMs = Math.min(Math.max(0, oldest + 60_000 - now) + 100, 2000);
        await new Promise(resolve => setTimeout(resolve, waitMs));
      }
    }
    
    this.requestTimestamps.push(now);
  }

  /** Clear the cache */
  clearCache(): void {
    this.cache.clear();
  }

  /** Get current cache stats */
  getCacheStats(): { size: number } {
    return { size: this.cache["cache"].size };
  }
}

// Singleton instance
let routerInstance: ModelRouter | null = null;

export function getModelRouter(config?: Partial<ModelRouterConfig>): ModelRouter {
  if (!routerInstance) {
    routerInstance = new ModelRouter(config);
  }
  return routerInstance;
}

export function resetModelRouter(): void {
  routerInstance = null;
}