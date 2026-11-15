import { z } from "zod";
import type { CatalogItem } from "@/lib/db/repo";

/** Structured catalog (Phase 6B) — real products/services agents can sell.
 * Brand.products string stays for back-compat; catalog is the source of truth. */

export type { CatalogItem };

export const catalogItemSchema = z.object({
  brandId: z.string().min(1).max(80),
  kind: z.enum(["product", "service"]).default("product"),
  name: z.string().min(2).max(120),
  description: z.string().max(1000).default(""),
  price: z.number().nonnegative().max(10_000_000).nullable().default(null),
  currency: z.string().min(1).max(8).default("INR"),
  tags: z.array(z.string().min(1).max(40)).max(12).default([]),
  features: z.array(z.string().min(1).max(120)).max(12).default([]),
  status: z.enum(["active", "draft", "archived"]).default("active"),
});

export type CatalogItemInput = z.infer<typeof catalogItemSchema>;
