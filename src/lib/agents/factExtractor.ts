import type { FactRecord } from "@/types/chat";

/**
 * Extracts structured facts from user messages and context.
 * Supports multi-turn fact accumulation and data classification (verified, demo, unverified).
 */

export interface FactExtractionResult {
  facts: Record<string, FactRecord>;
  isDemoMode: boolean;
  rawMatches: Record<string, string>;
}

export function detectDemoMode(text: string): boolean {
  return /\b(fictional\s+demo\s+data|demo\s+data|fictional\s+data|demo\s+mode|demo|fictional|dummy\s+data|sample\s+data)\b/i.test(
    text
  );
}

export function extractFacts(
  text: string,
  existingFacts: Record<string, FactRecord> = {}
): FactExtractionResult {
  const merged: Record<string, FactRecord> = { ...existingFacts };
  const rawMatches: Record<string, string> = {};
  const now = new Date().toISOString();

  const isDemo = detectDemoMode(text) || Object.values(existingFacts).some((f) => f.dataClassification === "demo");
  const defaultClassification: FactRecord["dataClassification"] = isDemo ? "demo" : "verified";
  const defaultStatus: FactRecord["verificationStatus"] = isDemo ? "demo" : "user_provided";

  // 1. Location — value must be a short fragment ending at ; . or a sentence keyword.
  // The old `([^\n\r;]+)` grabbed the whole line, so "Platform: Instagram only" became
  // a bogus location and "split (₹25,000)" leaked into project names.
  // IMPORTANT: never stop at a comma — Indian number formats (₹25,000) break.
  const LOC_STOP = /(?:\s+(?:only|and|with|for|from|month|platform|language|deliverables?|rules?|goal|budget|allocation|target|hook|posts?|reels?|briefs?|calendar|ads?|copy|copies|whatsapp|kpi|footfall|orders?|swiggy|zomato|instagram|facebook|linkedin|meta|hinglish|pune crowd)\b|\.\s|;|\.\s*["“”']?\s*$)/i;
  const locExplicit = text.match(/(?<!\w)(?:location|project\s+location|address|area|city)\s*(?:[:\-]|is|will be|=|hai)?\s*([^\n\r;]+)/i);
  // Known-city pattern: "ProjectName, Pune" style. Every word of the name prefix must
  // be Capitalized ([A-Z][a-z]+) so lowercase prose like "chain in Pune" can never be
  // swallowed into a fake project name (the old [a-zA-Z\s]+ class did exactly that).
  const locKnown = text.match(/\b((?:[A-Z][a-z]+\s)+[A-Z][a-z]+(?:\s(?:Residency|Heights|Park|Enclave|Gardens|Estate|Plaza|Towers|Valley|Greens))?(?:,\s*)?(?:[A-Za-z\s]+Phata|[A-Za-z\s]+Road)?(?:,\s*)?(?:Nashik|Mumbai|Pune|Bangalore|Bengaluru|Delhi|Hyderabad|Chennai|Kolkata|Thane|Navi Mumbai|Noida|Gurgaon|Gurugram|Indore|Surat|Ahmedabad|Jaipur))\b/);
  // City mention directly after "in" / "at" / "based in" — chai chain brief style.
  // The city must be the LAST word of the phrase (negative lookahead for " with/and/of")
  // and the preceding word must not itself be the city — "chain in Pune with 3 outlets"
  // must yield "Pune", never "chain in Pune".
  const locInline = text.match(/\b(?:in|at|based\s+in|outlets?\s+in|located\s+in)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})(?=\s+with\b|\s+and\b|\s+of\b|\s+for\b|\s+from\b|\.|\s*,|\s*$|\s+only\b)/);

  const cleanLoc = (raw: string): string => {
    const stop = raw.search(LOC_STOP);
    const val = (stop > 0 ? raw.slice(0, stop) : raw).trim().replace(/^[:\-\s"“”']+/, "").replace(/[."'“”'.\s]+$/, "");
    return val;
  };

  const locCandidate = locExplicit?.[1] ? cleanLoc(locExplicit[1]) : "";
  if (locCandidate.length > 2 && locCandidate.length <= 60 && !/^(only|and|with|for|from)\b/i.test(locCandidate)) {
    rawMatches.location = locCandidate;
    merged.location = {
      field: "location",
      value: locCandidate,
      source: "user",
      verificationStatus: defaultStatus,
      dataClassification: defaultClassification,
      timestamp: now,
      confidence: 0.95,
    };
  } else if (locKnown?.[1] && !merged.location) {
    const val = locKnown[1].trim();
    rawMatches.location = val;
    merged.location = {
      field: "location",
      value: val,
      source: "user",
      verificationStatus: defaultStatus,
      dataClassification: defaultClassification,
      timestamp: now,
      confidence: 0.85,
    };
  } else if (locInline?.[1] && !merged.location) {
    const val = locInline[1].trim();
    rawMatches.location = val;
    merged.location = {
      field: "location",
      value: val,
      source: "user",
      verificationStatus: defaultStatus,
      dataClassification: defaultClassification,
      timestamp: now,
      confidence: 0.8,
    };
  }

  // 2. Price Range — same boundary discipline. "price" must connect to an actual
  // price: "price range", "pricing", "starting at/from", or "price:". Bare "price"
  // followed by "s/claims" ("No invented prices/claims") must NOT match, and a ₹
  // figure introduced by budget/split/allocation is the BUDGET, not a product price.
  const priceExplicit = text.match(/(?:price\s*range|pricing|starting\s+(?:at|from)|price\s*[:\-])\s*(?:[:\-]|is|will be|=|hai)?\s*([^\n\r;]+)/i);
  const priceGeneral = text.match(/(?:₹|rs\.?|inr)?\s*[\d,.]+\s*(?:lakhs?|lac|l|cr|crore|k)?\s*(?:–|-|to)\s*(?:₹|rs\.?|inr)?\s*[\d,.]+\s*(?:lakhs?|lac|l|cr|crore|k)/i);
  const priceSingle = text.match(/(?:starting\s*(?:at|from)\s*)?(?:₹|rs\.?|inr)\s*[\d,.]+\s*(?:lakhs?|lac|l|cr|crore|k)?/i);

  const cleanPrice = (raw: string): string => {
    const stop = raw.search(LOC_STOP);
    return (stop > 0 ? raw.slice(0, stop) : raw).trim().replace(/^[:\-\s"“”']+/, "").replace(/[."'“”'.\s]+$/, "");
  };

  /** True when a ₹ figure sits in a budget/split context — it is spend, not a price. */
  const isBudgetContext = (match: RegExpMatchArray): boolean => {
    const idx = match.index ?? 0;
    const prefix = text.slice(Math.max(0, idx - 40), idx).toLowerCase();
    return /(budget|spend|allocation|split)\s*[:\-]?\s*$/.test(prefix);
  };

  if (priceExplicit?.[1]) {
    const val = cleanPrice(priceExplicit[1]);
    if (val.length > 1 && val.length <= 60) {
      rawMatches.price_range = val;
      merged.price_range = {
        field: "price_range",
        value: val,
        source: "user",
        verificationStatus: defaultStatus,
        dataClassification: defaultClassification,
        timestamp: now,
        confidence: 0.95,
      };
    }
  } else if (priceGeneral?.[0] && !isBudgetContext(priceGeneral)) {
    const val = priceGeneral[0].trim();
    rawMatches.price_range = val;
    merged.price_range = {
      field: "price_range",
      value: val,
      source: "user",
      verificationStatus: defaultStatus,
      dataClassification: defaultClassification,
      timestamp: now,
      confidence: 0.9,
    };
  } else if (priceSingle?.[0] && !merged.price_range && !isBudgetContext(priceSingle)) {
    const val = priceSingle[0].trim();
    rawMatches.price_range = val;
    merged.price_range = {
      field: "price_range",
      value: val,
      source: "user",
      verificationStatus: defaultStatus,
      dataClassification: defaultClassification,
      timestamp: now,
      confidence: 0.85,
    };
  }

  // 3. Budget — the ad/media spend for the campaign. Clean the captured tail the
  // same way ("Budget: ₹25,000 Meta ads for the month." → "₹25,000 Meta ads").
  const budgetExplicit = text.match(/(?:advertising\s*budget|marketing\s*budget|ad\s*budget|budget|spend)\s*(?:[:\-]|is|will be|=|hai)?\s*([^\n\r;]+)/i);
  const budgetGeneral = text.match(/(?:₹|rs\.?|inr)\s*[\d,.]+\s*(?:k|thousand|lakh|lac)?(?:\/|\s*per\s*)?(?:month|mo|day|campaign)?/i);

  if (budgetExplicit?.[1]) {
    const val = (cleanPrice(budgetExplicit[1]).split(/[,;]\s*(?=[A-Z])/)[0] || "").trim().replace(/^[:\-\s]+/, "").replace(/[.]+$/, "");
    if (val.length > 1) {
      rawMatches.budget = val;
      merged.budget = {
        field: "budget",
        value: val,
        source: "user",
        verificationStatus: defaultStatus,
        dataClassification: defaultClassification,
        timestamp: now,
        confidence: 0.95,
      };
    }
  } else if (budgetGeneral?.[0] && !merged.budget && !rawMatches.price_range?.includes(budgetGeneral[0])) {
    const val = budgetGeneral[0].trim();
    rawMatches.budget = val;
    merged.budget = {
      field: "budget",
      value: val,
      source: "user",
      verificationStatus: defaultStatus,
      dataClassification: defaultClassification,
      timestamp: now,
      confidence: 0.85,
    };
  }

  // 4. Configurations (e.g., 2BHK, 3BHK)
  const configExplicit = text.match(/(?:configurations?|unit\s*types?|bhk\s*types?|plans?)\s*(?:[:\-]|is|will be|=|hai)?\s*([^\n\r;]+)/i);
  const configGeneral = text.match(/\b(?:\d\s*bhk(?:\s*[,&/]\s*\d\s*bhk)*|\d\s*&\s*\d\s*bhk|studio\s*apartments?|penthouses?)\b/i);

  if (configExplicit?.[1]) {
    const val = configExplicit[1].trim().replace(/^[:\-\s]+/, "").replace(/[.]+$/, "");
    rawMatches.configurations = val;
    merged.configurations = {
      field: "configurations",
      value: val,
      source: "user",
      verificationStatus: defaultStatus,
      dataClassification: defaultClassification,
      timestamp: now,
      confidence: 0.95,
    };
  } else if (configGeneral?.[0]) {
    const val = configGeneral[0].trim();
    rawMatches.configurations = val;
    merged.configurations = {
      field: "configurations",
      value: val,
      source: "user",
      verificationStatus: defaultStatus,
      dataClassification: defaultClassification,
      timestamp: now,
      confidence: 0.9,
    };
  }

  // 5. Amenities / Features
  const amenitiesExplicit = text.match(/(?:amenities|features|facilities|specifications)\s*(?:[:\-]|is|will be|=|hai)?\s*([^\n\r;]+)/i);
  const amenitiesGeneral = text.match(/\b(?:clubhouse|swimming\s*pool|gymnasium|fitness\s*center|landscaped\s*gardens?|children'?s?\s*play\s*area|gated\s*security)\b/i);

  if (amenitiesExplicit?.[1]) {
    const val = amenitiesExplicit[1].trim().replace(/^[:\-\s]+/, "").replace(/[.]+$/, "");
    rawMatches.amenities_or_features = val;
    merged.amenities_or_features = {
      field: "amenities_or_features",
      value: val,
      source: "user",
      verificationStatus: defaultStatus,
      dataClassification: defaultClassification,
      timestamp: now,
      confidence: 0.95,
    };
  } else if (amenitiesGeneral?.[0] && !merged.amenities_or_features) {
    const val = amenitiesGeneral[0].trim();
    rawMatches.amenities_or_features = val;
    merged.amenities_or_features = {
      field: "amenities_or_features",
      value: val,
      source: "user",
      verificationStatus: defaultStatus,
      dataClassification: defaultClassification,
      timestamp: now,
      confidence: 0.85,
    };
  }

  // 5b. Business / Brand name — the client's actual name, never the demo brand.
  // Matches: We run "X", our brand is X, brand: X, company: X, client: X, we are X
  const bizNamePatterns: RegExp[] = [
    /(?:we\s+(?:run|own|operate|are|have)\s+)["“”']([^"“”'\n]{2,60})["“”']/i,
    /(?:we\s+(?:run|own|operate|are)\s+)([A-Z][A-Za-z0-9&'.-]*(?:\s+[A-Z][A-Za-z0-9&'.-]*){0,4})/,
    /(?:business|brand|company|client|project)\s*(?:name)?\s*(?:[:\-]|is|is called|=|hai)\s*["“”']?([^"'“”\n,;]{2,60})/i,
  ];
  for (const re of bizNamePatterns) {
    const m = text.match(re);
    const val = m?.[1]?.trim().replace(/^[:\-\s"“”']+|["“”'.\s]+$/g, "") ?? "";
    if (val.length >= 2 && val.length <= 60) {
      rawMatches.business_name = val;
      merged.business_name = {
        field: "business_name",
        value: val,
        source: "user",
        verificationStatus: defaultStatus,
        dataClassification: defaultClassification,
        timestamp: now,
        confidence: 0.9,
      };
      break;
    }
  }

  // 6. Objective / Goal
  const objExplicit = text.match(/(?:objective|campaign\s*goal|goal|aim)\s*(?:[:\-]|is|will be|=|hai)?\s*([^\n\r;]+)/i);
  if (objExplicit?.[1]) {
    const val = objExplicit[1].trim().replace(/^[:\-\s]+/, "").replace(/[.]+$/, "");
    rawMatches.objective = val;
    merged.objective = {
      field: "objective",
      value: val,
      source: "user",
      verificationStatus: defaultStatus,
      dataClassification: defaultClassification,
      timestamp: now,
      confidence: 0.95,
    };
  }

  // 7. Target Audience
  const audExplicit = text.match(/(?:target\s*audience|audience|target\s*buyers?)\s*(?:[:\-]|is|will be|=|hai)?\s*([^\n\r;]+)/i);
  if (audExplicit?.[1]) {
    const val = audExplicit[1].trim().replace(/^[:\-\s]+/, "").replace(/[.]+$/, "");
    rawMatches.target_audience = val;
    merged.target_audience = {
      field: "target_audience",
      value: val,
      source: "user",
      verificationStatus: defaultStatus,
      dataClassification: defaultClassification,
      timestamp: now,
      confidence: 0.95,
    };
  }

  // 8. Contact / CTA Destination
  const ctaExplicit = text.match(/(?:contact|cta|destination|call\s*to\s*action|phone|whatsapp)\s*(?:[:\-]|is|will be|=|hai)?\s*([^\n\r;]+)/i);
  const ctaGeneral = text.match(/\b(?:book\s*(?:a\s*)?site\s*visit|schedule\s*a\s*visit|call\s*us|whatsapp\s*us|\+91\d{10}|wa\.me\/\d+)\b/i);

  if (ctaExplicit?.[1]) {
    const val = ctaExplicit[1].trim().replace(/^[:\-\s]+/, "").replace(/[.]+$/, "");
    rawMatches.contact_or_cta = val;
    merged.contact_or_cta = {
      field: "contact_or_cta",
      value: val,
      source: "user",
      verificationStatus: defaultStatus,
      dataClassification: defaultClassification,
      timestamp: now,
      confidence: 0.95,
    };
  } else if (ctaGeneral?.[0] && !merged.contact_or_cta) {
    const val = ctaGeneral[0].trim();
    rawMatches.contact_or_cta = val;
    merged.contact_or_cta = {
      field: "contact_or_cta",
      value: val,
      source: "user",
      verificationStatus: defaultStatus,
      dataClassification: defaultClassification,
      timestamp: now,
      confidence: 0.85,
    };
  }

  // If Demo Mode is active, populate realistic fallback demo facts for non-critical gaps.
  // Defaults are industry-aware — a café/restaurant brief must never receive apartment
  // pricing, clubhouse amenities or homebuyer audiences from a real-estate template.
  if (isDemo) {
    const haystackLower = `${text} ${merged.amenities_or_features?.value ?? ""} ${merged.products?.value ?? ""}`.toLowerCase();
    const isFood = /\b(resto|cafe|café|chai|tea|coffee|bakery|food|menu|dining|kitchen|pizza|burger|snack|bistro|eatery)\b/.test(haystackLower);
    const isClothing = /\b(clothing|clothes|apparel|fashion|shirt|jeans|trouser|footwear|wardrobe|boutique|sneaker|kurta)\b/.test(haystackLower);
    const isEcommerce = /\b(e-?commerce|d2c|online store|shopify|product catalog|unboxing)\b/.test(haystackLower);

    const demoConfig = isFood
      ? { configurations: "Menu Tiers: Kadak Chai ₹30 · Bun Maska ₹45 · Vada Pav ₹35 · Brownie Shake ₹99", amenities: "3 outlets in Pune · Monsoon Special Menu · dine-in + delivery (Swiggy/Zomato)", cta: "Order on Swiggy/Zomato · DM 'MENU' · visit nearest outlet", audience: "Pune chai & café lovers aged 18-45, foodies and students" }
      : isClothing
        ? { configurations: "Product range: Shirts, Jeans, Trousers, T-shirts & Footwear (sizes S–XXL)", amenities: "In-store fitting · Exchange policy · New arrivals weekly", cta: "DM 'SIZE' for availability · WhatsApp to book a fitting · visit the store", audience: "Men & women 18-35 shopping for everyday style" }
        : isEcommerce
          ? { configurations: "SKUs: Starter, Standard and Premium bundles (with verified pricing to confirm)", amenities: "Free shipping above threshold · 7-day returns · secure checkout", cta: "Shop now on the store link · DM 'CATALOGUE' · WhatsApp for bulk orders", audience: "Online shoppers 18-40 comparing quality and value" }
          : { configurations: "Service tiers: Basic, Standard and Premium packages (pricing to confirm)", amenities: "Clear process documentation · Dedicated account manager · transparent reporting", cta: "Book a discovery call · DM 'ENQUIRE' · WhatsApp the team", audience: "Decision makers aged 25-50 looking for reliable providers" };

    if (!merged.configurations) {
      merged.configurations = {
        field: "configurations",
        value: demoConfig.configurations,
        source: "demo",
        verificationStatus: "demo",
        dataClassification: "demo",
        timestamp: now,
        confidence: 0.8,
      };
    }
    if (!merged.amenities_or_features) {
      merged.amenities_or_features = {
        field: "amenities_or_features",
        value: demoConfig.amenities,
        source: "demo",
        verificationStatus: "demo",
        dataClassification: "demo",
        timestamp: now,
        confidence: 0.8,
      };
    }
    if (!merged.contact_or_cta) {
      merged.contact_or_cta = {
        field: "contact_or_cta",
        value: demoConfig.cta,
        source: "demo",
        verificationStatus: "demo",
        dataClassification: "demo",
        timestamp: now,
        confidence: 0.8,
      };
    }
    if (!merged.target_audience) {
      merged.target_audience = {
        field: "target_audience",
        value: demoConfig.audience,
        source: "demo",
        verificationStatus: "demo",
        dataClassification: "demo",
        timestamp: now,
        confidence: 0.8,
      };
    }
    if (!merged.objective) {
      merged.objective = {
        field: "objective",
        value: "Generate qualified enquiries and repeat customers",
        source: "demo",
        verificationStatus: "demo",
        dataClassification: "demo",
        timestamp: now,
        confidence: 0.8,
      };
    }
  }

  return {
    facts: merged,
    isDemoMode: isDemo,
    rawMatches,
  };
}
