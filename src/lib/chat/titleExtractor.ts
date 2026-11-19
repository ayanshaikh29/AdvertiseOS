/**
 * Intelligently extracts a concise, meaningful business/task title from a user marketing prompt.
 * e.g.:
 *  - "Nashik me hamare premium men's fashion and streetwear store 'Urban Threads' ke liye 30-day Instagram campaign plan banao." -> "Urban Threads"
 *  - "Curry Leaves coffee shop ke liye marketing plan" -> "Curry Leaves"
 *  - "Generate 12 Instagram posts for Nike running shoes" -> "Nike"
 *  - "Audit our marketing strategy for IronCore Fitness" -> "IronCore Fitness"
 */
export function deriveConversationTitle(prompt: string): string {
  if (!prompt || typeof prompt !== "string") return "New Agency Task";

  const clean = prompt.trim();

  // 1. Check for quoted brand/business names: "Brand Name", 'Brand Name', “Brand Name”
  const quotedMatch = clean.match(/["'“]([^"'”]{2,36})["'”]/);
  if (quotedMatch && quotedMatch[1]?.trim()) {
    const candidate = quotedMatch[1].trim();
    if (!/^(campaign|marketing|strategy|plan|reels|posts|seo)$/i.test(candidate)) {
      return formatTitle(candidate);
    }
  }

  // 2. Check for explicit phrases: "shop/store/cafe/brand name is X", "named X", "called X", "name hai X"
  const namedMatch = clean.match(
    /(?:name\s+(?:is|hai)|named|called|shop\s+name|store\s+name|brand\s+name)\s*[:=-]?\s*["']?([A-Za-z0-9&'\s]{2,30})["']?/i
  );
  if (namedMatch && namedMatch[1]?.trim()) {
    const candidate = cleanTrailingNoise(namedMatch[1].trim());
    if (candidate.length >= 2) return formatTitle(candidate);
  }

  // 3. Check for business type + name, e.g. "coffee shop Curry Leaves", "streetwear store Urban Threads", "restaurant Saffron"
  const businessTypePreMatch = clean.match(
    /(?:coffee\s+shop|cafe|restaurant|store|gym|brand|fitness|agency|salon|boutique|clinic|hotel)\s+["']?([A-Za-z0-9&']+(?:\s+[A-Za-z0-9&']+){0,3})["']?/i
  );
  if (businessTypePreMatch && businessTypePreMatch[1]?.trim()) {
    const candidate = cleanTrailingNoise(businessTypePreMatch[1].trim());
    if (candidate.length >= 2 && !/^(ke|in|for|and|with|the)$/i.test(candidate)) {
      return formatTitle(candidate);
    }
  }

  // 4. Check for name followed by business type, e.g. "Curry Leaves coffee shop", "Urban Threads store"
  const businessTypePostMatch = clean.match(
    /([A-Za-z0-9&']+(?:\s+[A-Za-z0-9&']+){0,3})\s+(?:coffee\s+shop|cafe|restaurant|store|gym|fitness|agency|salon|boutique|clinic|hotel)/i
  );
  if (businessTypePostMatch && businessTypePostMatch[1]?.trim()) {
    const candidate = cleanLeadingNoise(businessTypePostMatch[1].trim());
    if (candidate.length >= 2) {
      return formatTitle(candidate);
    }
  }

  // 5. Check for "for X" or "X ke liye"
  const forMatch = clean.match(/(?:for|ke\s+liye)\s+["']?([A-Za-z0-9&']+(?:\s+[A-Za-z0-9&']+){0,3})["']?/i);
  if (forMatch && forMatch[1]?.trim()) {
    const candidate = cleanTrailingNoise(cleanLeadingNoise(forMatch[1].trim()));
    if (candidate.length >= 2 && !/^(30-day|instagram|marketing|campaign|social|content)$/i.test(candidate)) {
      return formatTitle(candidate);
    }
  }

  const keLiyeMatch = clean.match(/([A-Za-z0-9&']+(?:\s+[A-Za-z0-9&']+){0,3})\s+ke\s+liye/i);
  if (keLiyeMatch && keLiyeMatch[1]?.trim()) {
    const candidate = cleanLeadingNoise(keLiyeMatch[1].trim());
    if (candidate.length >= 2) {
      return formatTitle(candidate);
    }
  }

  // 6. Fallback: Take first 4-5 meaningful words, strip filler words
  const words = clean
    .replace(/[^\w\s-]/g, " ")
    .split(/\s+/)
    .filter(
      (w) =>
        !/^(hamare|hamari|mera|meri|apna|apni|bhai|ek|me|mein|ke|liye|ka|ki|ko|aur|with|for|the|and|in|on|at|to|a|an|please|plz)$/i.test(
          w
        )
    );

  if (words.length > 0) {
    const snippet = words.slice(0, 4).join(" ");
    return formatTitle(snippet.slice(0, 32));
  }

  return "Marketing Campaign";
}

function cleanLeadingNoise(str: string): string {
  return str
    .replace(/^(hamare|hamari|mera|meri|apna|apni|the|a|an|ek|our|my)\s+/i, "")
    .replace(/^(premium|luxury|local|new|best)\s+/i, "")
    .trim();
}

function cleanTrailingNoise(str: string): string {
  return str
    .replace(/\s+(ke|liye|ka|ki|ko|in|me|mein|for|and|with|to|campaign|plan|banao)$/i, "")
    .trim();
}

function formatTitle(str: string): string {
  const words = str.split(/\s+/).filter(Boolean);
  const capitalized = words
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
  return capitalized.slice(0, 40);
}
