import type { BrandProfile } from "@/lib/brand";
import type { RequestIntent } from "@/lib/schemas";

export type IndustryKey =
  | "clothing"
  | "real_estate"
  | "restaurant"
  | "ecommerce"
  | "services"
  | "agency"
  | "other";

export interface IndustryProfile {
  key: IndustryKey;
  label: string;
  audienceDefaults: string[];
  contentPillars: string[];
  objectiveDefaults: string[];
  hashtagSeed: string[];
  reelTopics: (projectName: string) => string[];
  contaminationTerms: string[];
  requiresPriceRange: boolean;
  requiresLocation: boolean;
}

const PROFILES: Record<IndustryKey, IndustryProfile> = {
  clothing: {
    key: "clothing",
    label: "Fashion & Clothing",
    audienceDefaults: [
      "Men and women aged 18-35 in the target city looking for stylish, affordable apparel",
      "College students and young professionals upgrading their wardrobe",
      "Shoppers comparing fit, fabric quality and value-for-money outfits",
    ],
    contentPillars: [
      "New Arrivals & Fit Checks",
      "Style Education & Outfit Ideas",
      "Store Experience & Footwear Pairings",
      "Offers, WhatsApp Enquiries & Social Proof",
    ],
    objectiveDefaults: [
      "Increase in-store visits for new collections",
      "Drive WhatsApp enquiries for sizes and availability",
      "Grow product sales for shirts, jeans, trousers, T-shirts and footwear",
    ],
    hashtagSeed: [
      "#MensFashion",
      "#StreetStyleIndia",
      "#OOTD",
      "#FashionDeals",
      "#StyleTips",
      "#Menswear",
      "#OOTDIndia",
      "#FashionIndia",
    ],
    reelTopics: (name) => [
      `${name} — 30-Second Outfit Transformation Reel`,
      `Top 3 Shirt + Jeans Combos for College & Office`,
      `Footwear Pairing Guide: Sneakers vs Loafers`,
      `Weekend Store Visit Lookbook (Men 18-35)`,
    ],
    contaminationTerms: [
      "homebuyer",
      "site visit",
      "2BHK",
      "3BHK",
      "RERA",
      "apartment",
      "property",
      "villa",
      "floor plan",
      "Pathardi",
      "real estate",
      "possession",
      "carpet area",
      "Nashik homebuyers",
      "VIP Site Visit",
    ],
    requiresPriceRange: false,
    requiresLocation: false,
  },
  real_estate: {
    key: "real_estate",
    label: "Real Estate & Property",
    audienceDefaults: [
      "Homebuyers and families seeking upgraded residences",
      "Working professionals prioritising connectivity and amenities",
      "Property investors targeting appreciation and rental yield",
    ],
    contentPillars: [
      "Location & Connectivity",
      "Amenities & Lifestyle",
      "Pricing, Legal & Booking Process",
      "Social Proof & Site Visits",
    ],
    objectiveDefaults: [
      "Generate qualified enquiries and buyer leads",
      "Convert interest into scheduled site visits",
      "Establish trusted local brand authority",
    ],
    hashtagSeed: [
      "#RealEstate",
      "#DreamHome",
      "#PropertyInvestment",
      "#HomeBuying",
      "#LuxuryLiving",
      "#NewLaunch",
      "#RealEstateIndia",
      "#PropertyForSale",
    ],
    reelTopics: (name) => [
      `${name} — 60-Second Property & Clubhouse Walkthrough`,
      `Why Location Matters: Connectivity & Transit Perks`,
      `Step Inside the Model Apartment: Layout & Space Tour`,
      `Book Your Site Visit: What to Expect`,
    ],
    contaminationTerms: [
      "shirt",
      "jeans",
      "trousers",
      "T-shirt",
      "footwear",
      "outfit",
      "wardrobe",
      "MensFashion",
      "apparel",
      "clothing store",
    ],
    requiresPriceRange: true,
    requiresLocation: true,
  },
  restaurant: {
    key: "restaurant",
    label: "Restaurant & Food",
    audienceDefaults: [
      "Local diners aged 18-45 seeking great food experiences",
      "Families and groups looking for weekend outings",
      "Foodies exploring menus, ambience and offers",
    ],
    contentPillars: [
      "Signature Dishes & Menu Highlights",
      "Kitchen Stories & Preparation",
      "Ambience, Events & Experiences",
      "Offers, Reservations & Reviews",
    ],
    objectiveDefaults: [
      "Increase table reservations and walk-ins",
      "Drive menu discovery and repeat visits",
      "Grow Instagram engagement around food content",
    ],
    hashtagSeed: [
      "#FoodLovers",
      "#RestaurantLife",
      "#Foodie",
      "#MenuSpecials",
      "#DiningOut",
      "#FoodPhotography",
      "#Yummy",
      "#FoodPorn",
    ],
    reelTopics: (name) => [
      `${name} — Kitchen to Table in 30 Seconds`,
      `Signature Dish Breakdown (Chef POV)`,
      `Weekend Brunch Ambience Tour`,
      `Behind the Scenes: Fresh Prep Daily`,
    ],
    contaminationTerms: [
      "homebuyer",
      "site visit",
      "2BHK",
      "RERA",
      "apartment",
      "property",
      "shirt",
      "jeans",
      "footwear",
      "real estate",
    ],
    requiresPriceRange: false,
    requiresLocation: true,
  },
  ecommerce: {
    key: "ecommerce",
    label: "E-commerce & D2C",
    audienceDefaults: [
      "Online shoppers aged 18-40 comparing quality and value",
      "Repeat buyers looking for new drops and bundles",
      "Deal-seekers following launches on Instagram",
    ],
    contentPillars: [
      "Product Demos & Unboxings",
      "Social Proof & UGC",
      "Education & Use Cases",
      "Launches, Bundles & Offers",
    ],
    objectiveDefaults: [
      "Increase online orders and conversion rate",
      "Grow Instagram-driven product discovery",
      "Reduce cost per acquisition with better creative",
    ],
    hashtagSeed: [
      "#OnlineShopping",
      "#NewArrivals",
      "#ShopNow",
      "#D2C",
      "#ProductLaunch",
      "#CustomerLove",
      "#BuyOnline",
      "#ShoppingFinds",
    ],
    reelTopics: (name) => [
      `${name} — Product Unboxing Reel`,
      `Top 3 Bestsellers Explained in 30s`,
      `How Customers Use Our Product Daily`,
      `New Drop Teaser (Vertical)`,
    ],
    contaminationTerms: ["homebuyer", "site visit", "RERA", "apartment", "real estate", "2BHK"],
    requiresPriceRange: false,
    requiresLocation: false,
  },
  services: {
    key: "services",
    label: "Local Services",
    audienceDefaults: [
      "Local customers aged 25-50 searching for reliable service providers",
      "Busy professionals who value convenience and trust",
      "Repeat clients referring friends and family",
    ],
    contentPillars: [
      "Expertise & Education",
      "Process & Transparency",
      "Customer Outcomes (verified only)",
      "Offers & Booking CTAs",
    ],
    objectiveDefaults: [
      "Increase enquiries and bookings",
      "Build trust through educational content",
      "Improve local search and social discovery",
    ],
    hashtagSeed: [
      "#LocalBusiness",
      "#ServiceExcellence",
      "#BookNow",
      "#TrustedService",
      "#CustomerFirst",
      "#QualityWork",
      "#GetQuotes",
      "#LocalExperts",
    ],
    reelTopics: (name) => [
      `${name} — Service Process in 30 Seconds`,
      `Before / After (Verified Work Only)`,
      `FAQ: What Customers Ask Most`,
      `Meet the Team Behind the Service`,
    ],
    contaminationTerms: ["homebuyer", "site visit", "RERA", "apartment", "real estate", "2BHK"],
    requiresPriceRange: false,
    requiresLocation: false,
  },
  agency: {
    key: "agency",
    label: "Marketing Agency",
    audienceDefaults: [
      "Business owners and marketing leads looking for growth partners",
      "Founders who need measurable pipeline without vanity metrics",
      "Teams tired of opaque agency retainers",
    ],
    contentPillars: [
      "Strategy Education",
      "Proof & Process",
      "Offer Clarity",
      "Behind the Scenes",
    ],
    objectiveDefaults: [
      "Generate qualified discovery calls",
      "Show transparent process and reporting",
      "Build authority with practical playbooks",
    ],
    hashtagSeed: [
      "#DigitalMarketing",
      "#MarketingStrategy",
      "#GrowthMarketing",
      "#AgencyLife",
      "#ContentMarketing",
      "#PerformanceMarketing",
      "#MarketingTips",
      "#BrandBuilding",
    ],
    reelTopics: (name) => [
      `${name} — Campaign Teardown in 30s`,
      `3 Marketing Mistakes We Fix First`,
      `How We Plan a Content Week`,
      `Client Onboarding Walkthrough`,
    ],
    contaminationTerms: ["homebuyer", "site visit", "RERA", "apartment", "2BHK", "real estate"],
    requiresPriceRange: false,
    requiresLocation: false,
  },
  other: {
    key: "other",
    label: "General Business",
    audienceDefaults: [
      "Target customers defined in the brand profile",
      "Decision makers who need clear value and proof",
    ],
    contentPillars: ["Education", "Proof", "Offer", "Behind the Scenes"],
    objectiveDefaults: ["Increase qualified enquiries", "Grow brand awareness", "Support direct sales"],
    hashtagSeed: ["#Business", "#Growth", "#Quality", "#Trusted", "#Local", "#New", "#Featured", "#Community"],
    reelTopics: (name) => [
      `${name} — Brand Story Reel`,
      `Top Products / Services in 30 Seconds`,
      `Customer Journey Walkthrough`,
      `Weekend Highlight Reel`,
    ],
    contaminationTerms: ["homebuyer", "site visit", "RERA", "2BHK", "real estate"],
    requiresPriceRange: false,
    requiresLocation: false,
  },
};

const CLOTHING_RE =
  /\b(clothing|clothes|apparel|fashion|shirt|shirts|jeans|trousers|t-?shirt|footwear|wardrobe|menswear|womenswear|boutique|kurta|sneakers)\b/i;
const REAL_ESTATE_RE =
  /\b(real estate|realty|residential|property|apartment|flat|villa|homebuyer|housing project|2bhk|3bhk|rera|possession|carpet area|site visit|project launch|housing)\b/i;
const RESTAURANT_RE =
  /\b(restaurant|cafe|café|menu|dining|food|kitchen|chef|bakery|pizzeria|eatery|cuisine|buffet)\b/i;
const ECOMMERCE_RE =
  /\b(e-?commerce|d2c|online store|shopify|product catalog|unboxing|shipping|cart)\b/i;
const AGENCY_RE =
  /\b(marketing agency|digital marketing|seo agency|performance marketing|ad agency|client retainers)\b/i;
const SERVICES_RE =
  /\b(salon|clinic|gym|plumber|electrician|ca repair|coaching|tutoring|services near|local service)\b/i;

export function detectIndustry(
  texts: Array<string | undefined | null>,
  brand?: Pick<BrandProfile, "products" | "audience" | "name" | "usp">,
  intent?: Pick<RequestIntent, "industry" | "topic">
): IndustryProfile {
  const haystack = [
    ...texts.filter(Boolean).map(String),
    brand?.products ?? "",
    brand?.audience ?? "",
    brand?.name ?? "",
    brand?.usp ?? "",
    intent?.industry ?? "",
    intent?.topic ?? "",
  ]
    .join(" \n ")
    .toLowerCase();

  if (REAL_ESTATE_RE.test(haystack) && !CLOTHING_RE.test(haystack)) return PROFILES.real_estate;
  if (CLOTHING_RE.test(haystack)) return PROFILES.clothing;
  if (RESTAURANT_RE.test(haystack)) return PROFILES.restaurant;
  if (ECOMMERCE_RE.test(haystack)) return PROFILES.ecommerce;
  if (AGENCY_RE.test(haystack)) return PROFILES.agency;
  if (SERVICES_RE.test(haystack)) return PROFILES.services;
  return PROFILES.other;
}

export function getIndustryProfile(key: IndustryKey): IndustryProfile {
  return PROFILES[key];
}

/** Returns contamination hits when text contains another industry's language. */
export function findContamination(text: string, industry: IndustryKey): string[] {
  const lower = text.toLowerCase();
  const profile = PROFILES[industry];
  const hits: string[] = [];
  for (const term of profile.contaminationTerms) {
    if (lower.includes(term.toLowerCase())) hits.push(term);
  }
  return hits;
}

export function isContaminated(text: string, industry: IndustryKey): boolean {
  return findContamination(text, industry).length > 0;
}

/** Audience/platform-aware channel recommendations for strategy deliverable. */
export function recommendedChannelsFor(
  platforms: string[],
  industry: IndustryKey
): Array<{ channel: string; rationale: string }> {
  const label = PROFILES[industry].label;
  const map: Record<string, string> = {
    instagram: `Primary visual channel for ${label} storytelling, reels and product/service proof.`,
    facebook: `Community reach and local awareness for ${label} audiences.`,
    linkedin: `Professional audience depth when the offer is B2B or high-consideration.`,
    blog: `Long-form SEO surface supporting informational search demand.`,
    email: `Retention and nurture sequences for existing customers.`,
  };
  const list = platforms.length ? platforms : ["instagram"];
  return list.map((p) => ({
    channel: p.charAt(0).toUpperCase() + p.slice(1),
    rationale: map[p] ?? `Supports the requested ${label} campaign on ${p}.`,
  }));
}
