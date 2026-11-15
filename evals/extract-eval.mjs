// Smoke test for the fixed fact extraction against the real Chai Point Studio brief.
import { readFileSync } from "fs";

const db = JSON.parse(readFileSync("data/advertiseos.json", "utf8"));
const goal = db.campaigns["cmp-agency-1794654155614"].brief.goal;
console.log("=== BRIEF (first 140 chars) ===");
console.log(goal.slice(0, 140), "...\n");

// Mirrors src/lib/agents/factExtractor.ts after the fix.
const LOC_STOP = /(?:\s+(?:only|and|with|for|from|month|platform|language|deliverables?|rules?|goal|budget|allocation|target|hook|posts?|reels?|briefs?|calendar|ads?|copy|copies|whatsapp|kpi|footfall|orders?|swiggy|zomato|instagram|facebook|linkedin|meta|hinglish|pune crowd)\b|\.\s|;|\.\s*["“”']?\s*$)/i;

// 1. Business name (new)
const bizNamePatterns = [
  /(?:we\s+(?:run|own|operate|are|have)\s+)["“”']([^"“”'\n]{2,60})["“”']/i,
  /(?:we\s+(?:run|own|operate|are)\s+)([A-Z][A-Za-z0-9&'.-]*(?:\s+[A-Z][A-Za-z0-9&'.-]*){0,4})/,
  /(?:business|brand|company|client|project)\s*(?:name)?\s*(?:[:\-]|is|is called|=|hai)\s*["“”']?([^'"“”\n,;]{2,60})/i,
];
let biz = "";
for (const re of bizNamePatterns) {
  const m = goal.match(re);
  const val = m?.[1]?.trim().replace(/^[:\-\s"“”']+|["“”'.\s]+$/g, "") ?? "";
  if (val.length >= 2 && val.length <= 60) {
    biz = val;
    break;
  }
}
console.log("business_name =>", JSON.stringify(biz));

// 2. Location
const locExplicit = goal.match(/(?<!\w)(?:location|project\s+location|address|area|city)\s*(?:[:\-]|is|will be|=|hai)?\s*([^\n\r;]+)/i);
let loc = "";
if (locExplicit?.[1]) {
  const stop = locExplicit[1].search(LOC_STOP);
  loc = (stop > 0 ? locExplicit[1].slice(0, stop) : locExplicit[1]).trim().replace(/^[:\-\s"“”']+/, "").replace(/[."'“”'.\s]+$/, "");
}
const locInline = goal.match(/\b(?:in|at|based\s+in|outlets?\s+in|located\s+in)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})/);
console.log("location explicit =>", JSON.stringify(loc));
console.log("location inline   =>", JSON.stringify(locInline?.[1] ?? ""));

// 3. Price
const priceExplicit = goal.match(/(?:price\s*range|pricing|starting\s+(?:at|from)|price\s*[:\-])\s*(?:[:\-]|is|will be|=|hai)?\s*([^\n\r;]+)/i);
const priceGeneral = goal.match(/(?:₹|rs\.?|inr)?\s*[\d,.]+\s*(?:lakhs?|lac|l|cr|crore|k)?\s*(?:–|-|to)\s*(?:₹|rs\.?|inr)?\s*[\d,.]+\s*(?:lakhs?|lac|l|cr|crore|k)/i);
const priceSingle = goal.match(/(?:starting\s*(?:at|from)\s*)?(?:₹|rs\.?|inr)\s*[\d,.]+\s*(?:lakhs?|lac|l|cr|crore|k)?/i);
const isBudgetContext = (match) => {
  const idx = match.index ?? 0;
  const prefix = goal.slice(Math.max(0, idx - 40), idx).toLowerCase();
  return /(budget|spend|allocation|split)\s*[:\-]?\s*$/.test(prefix);
};
let price = "";
if (priceExplicit?.[1]) {
  const stop = priceExplicit[1].search(LOC_STOP);
  price = (stop > 0 ? priceExplicit[1].slice(0, stop) : priceExplicit[1]).trim().replace(/^[:\-\s"“”']+/, "").replace(/[."'“”'.\s]+$/, "");
} else if (priceGeneral?.[0] && !isBudgetContext(priceGeneral)) {
  price = priceGeneral[0].trim();
} else if (priceSingle?.[0] && !isBudgetContext(priceSingle)) {
  price = priceSingle[0].trim();
}
console.log("price_range       =>", JSON.stringify(price));

// 4. Budget
const budgetExplicit = goal.match(/(?:advertising\s*budget|marketing\s*budget|ad\s*budget|budget|spend)\s*(?:[:\-]|is|will be|=|hai)?\s*([^\n\r;]+)/i);
const bRaw = budgetExplicit?.[1] ?? "";
const bStop = bRaw.search(LOC_STOP);
const bClean = (bStop > 0 ? bRaw.slice(0, bStop) : bRaw).trim();
const bNum = bClean.match(/[\d,.]+/);
console.log("budget raw        =>", JSON.stringify(bRaw));
console.log("budget cleaned    =>", JSON.stringify(bClean));
console.log("budget parsed     =>", bNum ? Number(bNum[0].replace(/,/g, "")) : null);

// 5. Offers (taskState derives offers from price_range.value)
console.log("offers (from price) =>", JSON.stringify(price));
