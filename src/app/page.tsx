"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Zap,
  Target,
  BarChart3,
  Search,
  MessageSquare,
  FileText,
  Film,
  Award,
  Layers,
  Calendar,
  CheckCircle2,
  Lock,
  ArrowUpRight,
  ChevronRight,
  Play,
  Share2,
  Copy,
  Clock,
  Eye,
  Sliders,
  Paperclip,
  Menu,
  X,
  Compass,
  Cpu,
  Smartphone,
  Check,
  Star,
  Users,
  Flame,
  CheckCircle,
  TrendingUp,
  Inbox,
  Send,
  HelpCircle,
} from "lucide-react";

// ── 7 Specialist AI Agents ───────────────────────────────────────────────────
const AGENTS = [
  {
    role: "AI Strategist",
    tagline: "Campaign Roadmaps & Positioning",
    desc: "Architects 30-day omnichannel flight plans, content pillars, positioning angles, and Plan A/B/C strategic alternatives tailored to your target audience.",
    icon: Target,
    color: "#F97316", // Warm Orange
    badge: "Specialist",
    stat: "30-Day DAG",
    highlight: "Autonomous roadmapping without hallucinations",
  },
  {
    role: "Market Researcher",
    tagline: "Competitor Benchmarking & Trends",
    desc: "Surfaces verified industry benchmarks, maps customer pain points, detects seasonal momentum, and identifies unexploited market gaps.",
    icon: Search,
    color: "#0891B2",
    badge: "Live Signals",
    stat: "Competitor Intel",
    highlight: "Audience intent & benchmark ranges",
  },
  {
    role: "Brand Voice Agent",
    tagline: "Tone Fidelity & Compliance Rules",
    desc: "Enforces strict brand lexicon, Do's & Don'ts rules, and ensures every headline and caption aligns with your approved brand personality.",
    icon: MessageSquare,
    color: "#FB923C", // Peach
    badge: "Governance",
    stat: "Tone Fidelity",
    highlight: "Zero fabricated customer claims",
  },
  {
    role: "Performance Marketer",
    tagline: "Meta & Google Ads Funnel",
    desc: "Structures multi-stage advertising funnels, conversion hooks, geo-fenced audience recommendations, and high-CTR direct-response ad copies.",
    icon: BarChart3,
    color: "#10B981",
    badge: "Conversion",
    stat: "High-CTR Funnels",
    highlight: "Proven multi-angle ad architectures",
  },
  {
    role: "SEO/SEM Specialist",
    tagline: "Search Intent & Keyword Clusters",
    desc: "Discovers high-intent commercial keyword clusters, technical SEO tags, search intent matrices, and high-converting landing page specs.",
    icon: Zap,
    color: "#F59E0B",
    badge: "Discovery",
    stat: "Keyword Clusters",
    highlight: "Organic & paid search synergy",
  },
  {
    role: "Creative Production",
    tagline: "Social Carousels & Visual Briefs",
    desc: "Packages 12 unique feed posts with 3 distinct conversion caption angles each, educational carousels, and design specifications.",
    icon: FileText,
    color: "#EC4899",
    badge: "Production",
    stat: "12 Posts / 36 Angles",
    highlight: "Slide-by-slide visual layout briefs",
  },
  {
    role: "Agency Critic & QA",
    tagline: "Mandatory Quality Gate Auditor",
    desc: "Enforces 4 strict automated quality gates: verifies no repeated caption templates, checks deliverable counts, and ensures 100% QA before publishing.",
    icon: ShieldCheck,
    color: "#8B5CF6", // Lavender
    badge: "Auditor",
    stat: "100/100 QA Gates",
    highlight: "Zero hallucination guarantee",
  },
];

// ── Strategic Alternatives (No Currency References) ──────────────────────────
const PLAN_OPTIONS = [
  {
    id: "planA",
    badge: "Organic Engagement + Community",
    title: "Plan A — Organic Community & Authority",
    scale: "Organic-First Customer Acquisition",
    mix: "70% Educational Carousels · 30% Viral Reels",
    pace: "14 Posts · 6 Story Cadences · 4 Community Polls",
    strengths: [
      "Zero ad-spend dependency for sustainable organic authority",
      "Maximizes long-term brand equity and saved shares",
      "Establishes founder-led trust through value-packed carousel breakdowns",
    ],
  },
  {
    id: "planB",
    badge: "Balanced Growth (Recommended)",
    title: "Plan B — Balanced Funnel Velocity",
    scale: "High-Velocity Direct-Response Growth",
    mix: "50% Paid Direct-Response · 50% Organic Authority",
    pace: "12 Posts · 4 Viral Reels · 3 Meta Ad Set Angles",
    strengths: [
      "Optimal balance of immediate trial inquiries & organic trust",
      "Direct-response ad sets fuel retargeting & catalog engagement",
      "Includes 3 distinct caption angles per post (Pain, Desire, Logic)",
    ],
  },
  {
    id: "planC",
    badge: "High-Volume Direct Response",
    title: "Plan C — Rapid Lead Maximizer",
    scale: "Full-Market Geo-Dominance & Acceleration",
    mix: "75% Paid Performance Ads · 25% High-Energy Reels",
    pace: "8 Conversion Posts · 8 Viral Reels · Multi-Angle Ad Sets",
    strengths: [
      "Aggressive lead generation with frictionless WhatsApp CTAs",
      "Geo-targeted local perimeter campaigns to capture in-market demand",
      "Instant feedback loops on best-performing hooks and visual creatives",
    ],
  },
];

// ── 4 Value Metrics (Matching Reference Layout) ──────────────────────────────
const VALUE_METRICS = [
  {
    title: "Entire agency aligned",
    desc: "Keep everyone on the same page with clear briefs, shared goals, and real-time handoffs. Your entire team stays synchronized.",
    icon: Layers,
    color: "#F97316",
    bgColor: "bg-orange-50",
  },
  {
    title: "20+ hours/week saved",
    desc: "Automate repetitive campaign and copywriting workflows to save valuable time every week. Focus on high-level growth strategy.",
    icon: Clock,
    color: "#FB923C",
    bgColor: "bg-orange-50/70",
  },
  {
    title: "92% higher CTR & conversion",
    desc: "Direct-response hooks and audience-matched angles deliver consistent results with zero guesswork.",
    icon: TrendingUp,
    color: "#F59E0B",
    bgColor: "bg-amber-50",
  },
  {
    title: "Zero fake claims & 100% QA",
    desc: "Automated critic agents evaluate every post against strict quality gates. Nothing publishes without your sign-off.",
    icon: ShieldCheck,
    color: "#10B981",
    bgColor: "bg-emerald-50",
  },
];

// ── Tool Capabilities List (Matching Reference Middle-Right) ─────────────────
const TOOL_CAPABILITIES = [
  {
    name: "Meta & Instagram Ads Funnel",
    desc: "High-converting direct-response architectures with audience targeting recommendations.",
    icon: Target,
    color: "#F97316",
  },
  {
    name: "Educational Carousels Engine",
    desc: "Slide-by-slide visual layout specs, swipe hooks, and saveable value breakdowns.",
    icon: FileText,
    color: "#FB923C",
  },
  {
    name: "9:16 Viral Reels Studio",
    desc: "3-second visual hooks, shot-by-shot scene breakdowns, voiceover scripts, and audio cues.",
    icon: Film,
    color: "#EC4899",
  },
  {
    name: "WhatsApp Lead Generation",
    desc: "Frictionless direct-to-chat inquiry CTAs optimized for instant conversational conversions.",
    icon: MessageSquare,
    color: "#10B981",
  },
];

// ── Dual-Row Marquee Brand Wordmarks (Faithful to Reference, Light Luxury Theme) ──
const MARQUEE_ROW_1 = [
  {
    name: "Bentley",
    svg: (
      <div className="flex items-center">
        <svg className="h-6 sm:h-7 w-auto" viewBox="0 0 110 32" fill="currentColor">
          <ellipse cx="55" cy="16" rx="9" ry="10" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <path d="M52 11h4.2c1.6 0 2.8.9 2.8 2.2 0 1-.7 1.8-1.8 2.1 1.4.3 2.2 1.2 2.2 2.4 0 1.6-1.3 2.8-3.4 2.8H52V11zm2.4 3.6h1.8c.7 0 1.2-.4 1.2-1s-.5-1-1.2-1h-1.8v2zm0 4.2h2c.8 0 1.4-.4 1.4-1.1s-.6-1.1-1.4-1.1h-2v2.2z" />
          <path d="M45 14C33 10 19 11 5 16c8-1 16-1.5 24-1 4 .3 8 .8 12 1.5-6-3.5-14-5-22-5 8-.5 16 0 24 1.5 4 .8 8 2 11 3.5-5-5-12-8-20-8.5 7-.5 14 .5 21 2.5 4 1.2 8 2.8 11 5-4-6-9-9.5-16-11 5-.5 10 0 15 1.8 3.5 1.3 7 3.2 10 6-3-6-7-9.5-12-11.5 4-.5 8 .2 12 2 3 1.5 6 3.8 8 7z" />
          <path d="M65 14c12-4 26-3 40 2-8-1-16-1.5-24-1-4 .3-8 .8-12 1.5 6-3.5 14-5 22-5 8-.5 16 0 24 1.5 4 .8 8 2 11 3.5-5-5-12-8-20-8.5 7-.5 14 .5 21 2.5 4 1.2 8 2.8 11 5-4-6-9-9.5-16-11-5-.5-10 0-15 1.8-3.5 1.3-7 3.2-10 6 3-6 7-9.5 12-11.5-4-.5-8 .2-12 2-3 1.5-6 3.8-8 7z" />
        </svg>
      </div>
    ),
  },
  {
    name: "Canva",
    svg: (
      <div className="flex items-center gap-1.5">
        <svg className="h-7 w-7 shrink-0" viewBox="0 0 32 32" fill="none">
          <circle cx="16" cy="16" r="15" fill="currentColor" />
          <text
            x="16"
            y="20.5"
            textAnchor="middle"
            fill="#F8F6F4"
            fontSize="10"
            fontFamily="serif"
            fontStyle="italic"
            fontWeight="bold"
          >
            Canva
          </text>
        </svg>
        <span className="font-serif italic font-bold text-lg tracking-tight">Canva</span>
      </div>
    ),
  },
  {
    name: "Capgemini",
    svg: (
      <div className="flex items-center gap-1.5">
        <span className="font-sans font-bold text-base sm:text-lg tracking-tight">Capgemini</span>
        <svg className="h-4.5 w-4.5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C9.5 5.5 6 9 6 12.5 6 15 8 17 10.5 17c.9 0 1.5-.4 1.5-.4s0 1.4-.8 2.6c-.6 1-1.2 1.8-1.2 1.8h4s-.6-.8-1.2-1.8c-.8-1.2-.8-2.6-.8-2.6s.6.4 1.5.4c2.5 0 4.5-2 4.5-4.5 0-3.5-3.5-7-6-10.5z" />
        </svg>
      </div>
    ),
  },
  {
    name: "Cisco",
    svg: (
      <div className="flex flex-col items-center justify-center">
        <svg className="h-3.5 w-auto mb-1" viewBox="0 0 54 16" fill="currentColor">
          <rect x="2" y="10" width="2.5" height="6" rx="1.2" />
          <rect x="8" y="6" width="2.5" height="10" rx="1.2" />
          <rect x="14" y="2" width="2.5" height="14" rx="1.2" />
          <rect x="20" y="6" width="2.5" height="10" rx="1.2" />
          <rect x="26" y="0" width="2.5" height="16" rx="1.2" />
          <rect x="32" y="6" width="2.5" height="10" rx="1.2" />
          <rect x="38" y="2" width="2.5" height="14" rx="1.2" />
          <rect x="44" y="6" width="2.5" height="10" rx="1.2" />
          <rect x="50" y="10" width="2.5" height="6" rx="1.2" />
        </svg>
        <span className="text-[11px] font-black tracking-[0.24em] leading-none">CISCO</span>
      </div>
    ),
  },
  {
    name: "Experian",
    svg: (
      <div className="flex items-center gap-2">
        <svg className="h-4.5 w-4.5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
          <rect x="2" y="8" width="4" height="4" rx="0.5" />
          <rect x="7" y="3" width="4" height="4" rx="0.5" />
          <rect x="7" y="8" width="4" height="4" rx="0.5" />
          <rect x="7" y="13" width="4" height="4" rx="0.5" />
          <rect x="12" y="8" width="4" height="4" rx="0.5" />
          <rect x="12" y="13" width="4" height="4" rx="0.5" />
          <rect x="17" y="13" width="4" height="4" rx="0.5" />
        </svg>
        <span className="text-base font-semibold tracking-tight">experian<span className="text-[#F97316]">.</span></span>
      </div>
    ),
  },
  {
    name: "Shopify",
    svg: (
      <div className="flex items-center gap-2">
        <svg className="h-5 w-auto" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19.9 6.8l-1.9-0.6c-0.1 0-0.2 0-0.3 0.1l-2.4 2.4c-0.2 0.2-0.5 0.1-0.6-0.1l-2.4-7.4c-0.1-0.3-0.5-0.4-0.8-0.3L4.1 3.5C3.8 3.6 3.6 3.9 3.7 4.2l3.4 17.5c0.1 0.3 0.3 0.5 0.6 0.5h11.7c0.3 0 0.5-0.2 0.6-0.5l2.4-14.3c0.1-0.3-0.1-0.5-0.5-0.6zM14.6 8.7L12.2 1.3c-0.1-0.3-0.5-0.4-0.8-0.3L4.1 3.5C3.8 3.6 3.6 3.9 3.7 4.2l3.4 17.5c0.1 0.3 0.3 0.5 0.6 0.5h4.1l2.8-13.5z" />
        </svg>
        <span className="text-base font-bold tracking-tight">shopify</span>
      </div>
    ),
  },
  {
    name: "Notion",
    svg: (
      <div className="flex items-center gap-2">
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.69c-.466-.373-.933-.56-1.54-.513L3.48 2.155c-.42.047-.514.28-.327.466l1.306 1.587zm.747 4.015v12.23c0 .887.42 1.26 1.4.186l12.562-7.562c.467-.28.7-.7.7-1.12V3.742c0-.466-.233-.746-.7-.513L5.206 8.223zm3.034 2.894l4.575 7.002h2.52V9.81h-1.914v5.368l-4.248-6.535H7.287v6.535h1.953v-4.07z" />
        </svg>
        <span className="text-base font-bold tracking-tight">Notion</span>
      </div>
    ),
  },
];

const MARQUEE_ROW_2 = [
  {
    name: "Red Bull",
    svg: (
      <div className="flex items-center gap-1.5">
        <span className="font-black text-base sm:text-lg tracking-tighter uppercase font-sans">Red Bull</span>
      </div>
    ),
  },
  {
    name: "Replit",
    svg: (
      <div className="flex items-center gap-2">
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 16.93V17a3 3 0 0 1-3-3v-1a5 5 0 0 1 5-5h1a3 3 0 0 1 3 3v1a5 5 0 0 1-5 5h-1v1.93c4.05-.46 7.24-3.65 7.82-7.7A8.005 8.005 0 0 0 4.07 11.23C4.65 15.28 7.95 18.47 12 18.93z" />
        </svg>
        <span className="text-base font-bold tracking-tight">replit</span>
      </div>
    ),
  },
  {
    name: "Roblox",
    svg: (
      <div className="flex items-center">
        <svg className="h-4.5 sm:h-5 w-auto" viewBox="0 0 98 18" fill="currentColor">
          <path d="M0 1h7.5c3.2 0 5.4 1.6 5.4 4.5 0 2-1 3.4-2.8 4L14 17H9.2l-3.4-7H4.2V17H0V1zm4.2 3.2v3h3c1 0 1.6-.5 1.6-1.5s-.6-1.5-1.6-1.5h-3z" />
          <g transform="translate(16, 0)">
            <path d="M9 0C4 0 0 4 0 9s4 9 9 9 9-4 9-9-4-9-9-9zm0 12.4l-3.4-3.4 3.4-3.4 3.4 3.4-3.4 3.4z" />
          </g>
          <path d="M38 1h7c2.6 0 4.4 1.3 4.4 3.3 0 1.3-.7 2.3-1.8 2.8 1.5.5 2.4 1.6 2.4 3.3 0 2.2-2 3.6-4.8 3.6H38V1zm3.8 2.8v2.8h2.8c.8 0 1.2-.4 1.2-1.4s-.4-1.4-1.2-1.4h-2.8zm0 5.4v3h3c.9 0 1.4-.5 1.4-1.5s-.5-1.5-1.4-1.5h-3z" />
          <path d="M53 1h4v12.5h7.5V17H53V1z" />
          <g transform="translate(67, 0)">
            <path d="M9 0C4 0 0 4 0 9s4 9 9 9 9-4 9-9-4-9-9-9zm0 12.4l-3.4-3.4 3.4-3.4 3.4 3.4-3.4 3.4z" />
          </g>
          <path d="M88 1l-4.2 7.5L79.6 1h-4.4l6.2 9-6.4 7h4.4l4.4-7.2 4.4 7.2h4.4l-6.4-7 6.4-9H88z" />
        </svg>
      </div>
    ),
  },
  {
    name: "SEGA",
    svg: (
      <div className="flex items-center">
        <svg className="h-5 sm:h-5.5 w-auto" viewBox="0 0 86 20" fill="none" stroke="currentColor">
          <path
            d="M17 4c-2.3-1.8-5-2.2-7.8-2.2C3.6 1.8 1 4.5 1 8c0 4.5 4 5.8 8 7.2 2.8.7 5 1.4 5 2.8s-1.8 2.2-4.5 2.2c-3.2 0-6-1.4-7.8-3.2M22 1.8h13v3.6h-7.5v3.2h6.5v3.2h-6.5v3.6h7.5V19H22V1.8zm20 9.5h9V19c-2.2 1-5.5 1.4-8.5 1.4-6.5 0-11-4-11-10.2S37 0.2 44 0.2c3.5 0 6.5.9 8.8 2.2l-2.2 3.6c-1.8-.9-4-1.4-6.2-1.4-4 0-6.8 2.2-6.8 6.2s2.8 6.2 6.8 6.2c1.4 0 2.8-.3 3.6-.7v-2.8H42v-3.2zm18 7.7L66.5 1.8h4.5l6 17.2h-4.4l-1.4-4.2h-6.2l-1.4 4.2H60zm4.8-7.8h3.2L66.5 6.5 64.8 11.2z"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    ),
  },
  {
    name: "Stripe",
    svg: (
      <div className="flex items-center">
        <svg className="h-5 w-auto" viewBox="0 0 60 25" fill="currentColor">
          <path d="M59.64 14.28c0-4.48-2.18-8.02-6.38-8.02-4.22 0-6.78 3.54-6.78 8 0 5.28 3.06 7.94 7.34 7.94 2.08 0 3.66-.46 4.86-1.12v-3.22c-1.2.6-2.54.92-4.04.92-1.62 0-3.04-.6-3.24-2.52h8.2c.04-.32.04-.7.04-1zm-8.3-1.66c0-1.78 1.08-2.5 2.04-2.5.94 0 1.98.72 1.98 2.5h-4.02zM43.7 6.48h-4.78v15.38h4.78V6.48zm-2.4-6.28c-1.66 0-2.82 1.16-2.82 2.7 0 1.52 1.16 2.7 2.82 2.7 1.64 0 2.8-1.18 2.8-2.7 0-1.54-1.16-2.7-2.8-2.7zM34.9 8.94c-1.04-.66-2.44-1.04-3.9-1.04-3.66 0-6.14 2.92-6.14 7.08 0 4.36 2.54 7.22 6.38 7.22 1.4 0 2.74-.36 3.66-.96v-3.48c-.92.58-2.02.94-3.14.94-1.92 0-3.2-1.18-3.2-3.72 0-2.46 1.34-3.66 3.2-3.66 1.1 0 2.14.34 3.14.9V8.94zm-14.8-2.7c-1.04 0-1.84.44-2.4 1.14V6.48h-4.7v15.38h4.78v-8.8c0-2.22 1.28-3.32 2.96-3.32.48 0 .96.06 1.36.18V6.48c-.62-.16-1.3-.24-2-.24zm-12.86 4.9C6.1 10.6 5.3 10.3 5.3 9.68c0-.6.54-1 1.48-1 1.7 0 3.42.66 4.6 1.26l.7-4.2C10.74 5.2 8.7 4.8 6.2 4.8 2.1 4.8 0 6.96 0 10.42c0 4.64 5.92 4.9 5.92 7.32 0 .76-.64 1.18-1.74 1.18-1.66 0-3.94-.82-5.46-1.66L0 21.6c1.58.88 4.12 1.46 6.84 1.46 4.5 0 7.52-2.18 7.52-6.08 0-4.96-6.26-5.16-6.26-7.34z" />
        </svg>
      </div>
    ),
  },
  {
    name: "Meta",
    svg: (
      <div className="flex items-center gap-1.5">
        <svg className="h-4.5 w-auto" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 15.5C9.7 15.5 7.8 13.9 6.8 11.9C5.4 9.1 3.5 8 1.9 8C0.8 8 0 8.7 0 9.8C0 12.3 2.5 16 6.2 16C8.8 16 10.9 14.5 12 12.8C13.1 14.5 15.2 16 17.8 16C21.5 16 24 12.3 24 9.8C24 8.7 23.2 8 22.1 8C20.5 8 18.6 9.1 17.2 11.9C16.2 13.9 14.3 15.5 12 15.5ZM17.2 9.8C18.2 8.1 19.8 7.2 21.1 7.2C21.6 7.2 22 7.5 22 8C22 9.4 20.3 12.2 17.7 12.2C15.8 12.2 14.3 10.9 13.5 9.4C14.7 8.3 16.1 7.6 17.2 9.8ZM6.8 9.8C5.8 8.1 4.2 7.2 2.9 7.2C2.4 7.2 2 7.5 2 8C2 9.4 3.7 12.2 6.3 12.2C8.2 12.2 9.7 10.9 10.5 9.4C9.3 8.3 7.9 7.6 6.8 9.8Z" />
        </svg>
        <span className="text-base font-bold tracking-tight">Meta</span>
      </div>
    ),
  },
  {
    name: "Figma",
    svg: (
      <div className="flex items-center gap-2">
        <svg className="h-5 w-auto" viewBox="0 0 24 24" fill="currentColor">
          <path d="M8 24c2.2 0 4-1.8 4-4v-4H8c-2.2 0-4 1.8-4 4s1.8 4 4 4zM4 12c0-2.2 1.8-4 4-4h4v8H8c-2.2 0-4-1.8-4-4zm0-8c0-2.2 1.8-4 4-4h4v8H8C5.8 8 4 6.2 4 4zm8-4h4c2.2 0 4 1.8 4 4s-1.8 4-4 4h-4V0zm0 8h4c2.2 0 4 1.8 4 4s-1.8 4-4 4c-2.2 0-4-1.8-4-4V8z" />
        </svg>
        <span className="text-base font-bold tracking-tight">Figma</span>
      </div>
    ),
  },
];

// ── Realistic Hero Particles & Starlight Dust ────────────────────────────────
const HERO_PARTICLES = [
  { top: "12%", left: "14%", size: 4, color: "#F97316", blur: 6, minOpacity: 0.25, maxOpacity: 0.85, duration: 6, delay: 0, dx: 6 },
  { top: "24%", left: "22%", size: 3, color: "#FB923C", blur: 4, minOpacity: 0.2, maxOpacity: 0.7, duration: 7, delay: 1.5, dx: -8 },
  { top: "14%", right: "16%", size: 5, color: "#F59E0B", blur: 8, minOpacity: 0.3, maxOpacity: 0.9, duration: 6.5, delay: 0.5, dx: -6 },
  { top: "32%", right: "18%", size: 3, color: "#F97316", blur: 4, minOpacity: 0.2, maxOpacity: 0.75, duration: 8, delay: 2, dx: 8 },
  { top: "50%", left: "8%", size: 4, color: "#FB923C", blur: 6, minOpacity: 0.15, maxOpacity: 0.65, duration: 7.5, delay: 3, dx: 10 },
  { top: "58%", right: "10%", size: 4, color: "#F97316", blur: 5, minOpacity: 0.2, maxOpacity: 0.8, duration: 6, delay: 1.2, dx: -10 },
  { top: "42%", left: "26%", size: 2.5, color: "#F59E0B", blur: 3, minOpacity: 0.25, maxOpacity: 0.7, duration: 5.5, delay: 2.5, dx: -5 },
  { top: "38%", right: "28%", size: 3, color: "#EC4899", blur: 5, minOpacity: 0.2, maxOpacity: 0.65, duration: 8.5, delay: 0.8, dx: 7 },
  { top: "68%", left: "18%", size: 3.5, color: "#F97316", blur: 5, minOpacity: 0.2, maxOpacity: 0.75, duration: 7, delay: 1.8, dx: 6 },
  { top: "72%", right: "22%", size: 3, color: "#FB923C", blur: 4, minOpacity: 0.15, maxOpacity: 0.7, duration: 6.8, delay: 0.4, dx: -8 },
];

// ── Rotating Headline Value Propositions ─────────────────────────────────────
const ROTATING_TEXTS = [
  "orchestrate your marketing",
  "scale high-CTR Meta ads",
  "shoot viral 9:16 reels",
  "generate 100+ trial leads",
  "eliminate agency chaos",
];

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activePlan, setActivePlan] = useState("planB");
  const [activeStudioTab, setActiveStudioTab] = useState<"calendar" | "posts" | "reels" | "plans">("calendar");
  const [headlineIndex, setHeadlineIndex] = useState(0);

  // Auto-rotate headline value propositions every 2.8 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setHeadlineIndex((prev) => (prev + 1) % ROTATING_TEXTS.length);
    }, 2800);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative min-h-screen bg-[#F8F6F4] text-[#18181B] selection:bg-[#F97316]/20 selection:text-[#18181B]">
      
      {/* ── Background Ambient Warm Glows & Realistic Dynamic Atmosphere ─── */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        {/* Delicate Radial Dot Matrix Pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(#F97316_1px,transparent_1px)] [background-size:28px_28px] opacity-[0.06] [mask-image:radial-gradient(ellipse_65%_55%_at_50%_28%,#000_60%,transparent_100%)]" />



        {/* Ambient Floating Luminous Dust Particles */}
        {HERO_PARTICLES.map((p, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full pointer-events-none"
            style={{
              top: p.top,
              left: p.left,
              right: p.right,
              width: p.size,
              height: p.size,
              backgroundColor: p.color,
              boxShadow: `0 0 ${p.blur}px ${p.color}`,
            }}
            animate={{
              y: [0, -28, 0],
              x: [0, p.dx, 0],
              opacity: [p.minOpacity, p.maxOpacity, p.minOpacity],
              scale: [0.85, 1.3, 0.85],
            }}
            transition={{
              duration: p.duration,
              repeat: Infinity,
              ease: "easeInOut",
              delay: p.delay,
            }}
          />
        ))}

        {/* Realistic Twinkling 4-Point Starlight Sparkles */}
        <motion.div
          animate={{
            rotate: [0, 90, 180, 270, 360],
            scale: [0.75, 1.15, 0.75],
            opacity: [0.25, 0.75, 0.25],
          }}
          transition={{ duration: 16, repeat: Infinity, ease: "linear" }}
          className="absolute top-32 left-[12%] text-[#F97316]/45"
        >
          <Sparkles size={20} />
        </motion.div>

        <motion.div
          animate={{
            rotate: [360, 270, 180, 90, 0],
            scale: [0.7, 1.1, 0.7],
            opacity: [0.2, 0.7, 0.2],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear", delay: 2.5 }}
          className="absolute top-48 right-[14%] text-[#FB923C]/45"
        >
          <Sparkles size={24} />
        </motion.div>
      </div>

      {/* ── 1. Constant Fixed Floating Navbar ─────────────────────────────────── */}
      <header className="fixed top-0 left-0 right-0 z-50 px-3 sm:px-6 pt-3 sm:pt-4 pb-2 pointer-events-none">
        <nav className="pointer-events-auto mx-auto flex max-w-6xl items-center justify-between rounded-full border border-black/[0.08] bg-white/85 px-4 sm:px-6 py-2.5 shadow-[0_8px_32px_rgba(249,115,22,0.06)] backdrop-blur-2xl transition-all">
          {/* Brand Logo */}
          <Link href="/" className="group flex items-center gap-2.5 select-none">
            <div className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-[#FFF7ED] via-[#FFEDD5] to-[#FDF2F8] p-1 shadow-2xs ring-1 ring-black/[0.06] transition-transform duration-300 group-hover:scale-105">
              <Image
                src="/logo-emblem-transparent.png"
                alt="AdvertiseOS Logo"
                width={24}
                height={24}
                priority
                className="object-contain drop-shadow-[0_2px_8px_rgba(249,115,22,0.3)]"
              />
            </div>
            <div className="flex items-center gap-1.5 leading-none">
              <span className="font-display font-extrabold text-base tracking-tight text-[#18181B]">
                Advertise<span className="text-[#F97316]">OS</span>
              </span>
              <span className="rounded-full bg-[#F97316]/10 px-1.5 py-0.5 text-[9px] font-bold text-[#EA580C]">
                AI
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden lg:flex items-center gap-6 text-xs font-semibold text-[#52525B]">
            <a href="#features" className="hover:text-[#18181B] transition-colors">Features</a>
            <a href="#specialists" className="hover:text-[#18181B] transition-colors">7 Specialists</a>
            <a href="#workspace" className="hover:text-[#18181B] transition-colors">Workspace</a>
            <a href="#capabilities" className="hover:text-[#18181B] transition-colors">Capabilities</a>
            <a href="#plans" className="hover:text-[#18181B] transition-colors">Plan A/B/C</a>
          </div>

          {/* Right Action: Admin Login Button + Mobile Toggle */}
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 rounded-full bg-[#18181B] px-4 py-2 text-xs font-semibold text-white shadow-xs transition-all hover:bg-[#27272A] active:scale-[0.98]"
            >
              <Lock size={12} className="text-[#FED7AA]" />
              <span>Admin Login</span>
            </Link>

            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle mobile navigation"
              className="lg:hidden flex h-8 w-8 items-center justify-center rounded-full text-[#71717A] hover:bg-black/[0.04] hover:text-[#18181B]"
            >
              {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </nav>

        {/* Mobile Dropdown Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="pointer-events-auto mx-auto mt-2 max-w-sm rounded-3xl border border-black/[0.08] bg-white/95 p-4 shadow-xl backdrop-blur-2xl lg:hidden"
            >
              <div className="flex flex-col gap-2.5 text-xs font-semibold text-[#52525B]">
                <a
                  href="#features"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-xl px-3 py-2 hover:bg-[#F5F2EF] hover:text-[#18181B]"
                >
                  Features & Value
                </a>
                <a
                  href="#specialists"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-xl px-3 py-2 hover:bg-[#F5F2EF] hover:text-[#18181B]"
                >
                  7 Specialist Agents
                </a>
                <a
                  href="#workspace"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-xl px-3 py-2 hover:bg-[#F5F2EF] hover:text-[#18181B]"
                >
                  Execution Studio
                </a>
                <a
                  href="#capabilities"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-xl px-3 py-2 hover:bg-[#F5F2EF] hover:text-[#18181B]"
                >
                  Ad & Reels Capabilities
                </a>
                <a
                  href="#plans"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-xl px-3 py-2 hover:bg-[#F5F2EF] hover:text-[#18181B]"
                >
                  Plan A/B/C Matrix
                </a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* ── 2. Hero Section with Moving Liquid Aurora Gradient (Matching User Reference) ──── */}
      <section className="relative z-10 pt-28 sm:pt-36 pb-20 px-4 sm:px-6 overflow-hidden">
        
        {/* ── Focused Dribbble-Style Fluid Gradient Aura (NOT Full Gradient) ── */}
        <div className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center overflow-hidden">
          {/* Faint Whispy Upper-Left Diagonal Tail (Matching Dribbble Video) */}
          <motion.div
            animate={{
              x: [-4, 6, -4],
              y: [-8, 6, -8],
              rotate: [-34, -28, -34],
              opacity: [0.35, 0.55, 0.35],
            }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -top-12 left-[12%] sm:left-[22%] md:left-[26%] h-[340px] w-[110px] rounded-[50%] bg-gradient-to-b from-[#FF9129] via-[#FF9129]/40 to-transparent blur-[50px] sm:blur-[60px] will-change-transform"
          />

          {/* The Single Main Fluid Vertical Flame Aura (Matching Dribbble Video) */}
          <motion.div
            animate={{
              y: [0, -18, 14, 0],
              x: [-10, 14, -6, -10],
              rotate: [-5, 6, -6, -5],
              scaleY: [1, 1.08, 0.95, 1],
              scaleX: [1, 0.94, 1.06, 1],
              borderRadius: [
                "46% 54% 62% 38% / 58% 42% 58% 42%",
                "55% 45% 42% 58% / 44% 58% 42% 56%",
                "42% 58% 54% 46% / 58% 42% 56% 44%",
                "46% 54% 62% 38% / 58% 42% 58% 42%",
              ],
            }}
            transition={{
              duration: 10,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="relative -top-10 h-[460px] w-[280px] sm:h-[540px] sm:w-[350px] md:h-[600px] md:w-[420px] opacity-80 blur-[65px] sm:blur-[85px] will-change-transform"
            style={{
              background: "linear-gradient(135deg, #FF9129 20%, #FFA255 50%, #EE4275 80%)",
            }}
          />
        </div>

        <div className="mx-auto max-w-5xl text-center">
          
          {/* Top Rating Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 sm:gap-3 rounded-full border border-black/[0.06] bg-white/80 px-4 py-1.5 text-xs font-semibold text-[#52525B] shadow-2xs backdrop-blur-md"
          >
            <div className="flex items-center gap-1 text-[#F97316]">
              <Star size={13} className="fill-[#F97316]" />
              <span className="font-bold text-[#18181B]">4.9</span>
              <span className="text-[#71717A]">Meta Verified</span>
            </div>
            <span className="text-[#D4D4D8]">|</span>
            <div className="flex items-center gap-1 text-[#FB923C]">
              <Star size={13} className="fill-[#FB923C]" />
              <span className="font-bold text-[#18181B]">5.0</span>
              <span className="text-[#71717A]">Agency Trust</span>
            </div>
          </motion.div>

          {/* Main Headline with Smooth Rotating Value Propositions */}
          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-display mt-6 text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-[#18181B] leading-[1.12]"
          >
            AI-powered tools to{" "}
            <br className="hidden sm:inline" />
            <span className="relative inline-flex items-center justify-center min-h-[1.25em] overflow-hidden py-1">
              <AnimatePresence mode="wait">
                <motion.span
                  key={headlineIndex}
                  initial={{ y: 35, opacity: 0, filter: "blur(4px)" }}
                  animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
                  exit={{ y: -35, opacity: 0, filter: "blur(4px)" }}
                  transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                  className="inline-block bg-gradient-to-r from-[#F97316] via-[#FB923C] to-[#8B5CF6] text-transparent bg-clip-text"
                >
                  {ROTATING_TEXTS[headlineIndex]}
                </motion.span>
              </AnimatePresence>
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mx-auto mt-5 max-w-2xl text-base sm:text-lg text-[#52525B] leading-relaxed font-normal"
          >
            From 30-day cross-platform strategy and competitor research to high-CTR carousels and viral 9:16 reels, manage everything in one autonomous workspace with strict human approvals.
          </motion.p>

          {/* Dual Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-8 flex flex-wrap items-center justify-center gap-3 sm:gap-4"
          >
            <Link
              href="/dashboard"
              className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-full bg-[#18181B] px-7 py-3 text-sm font-semibold text-white shadow-md transition-all hover:bg-[#27272A] hover:shadow-lg active:scale-[0.98]"
            >
              <span>Launch Studio</span>
              <ArrowRight size={15} />
            </Link>

            <a
              href="#specialists"
              className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-full border border-black/[0.08] bg-white/90 px-6 py-3 text-sm font-semibold text-[#18181B] shadow-2xs backdrop-blur-md transition-all hover:bg-white hover:border-black/20 active:scale-[0.98]"
            >
              <span>Explore 7 Specialists</span>
              <ChevronRight size={15} className="text-[#A1A1AA]" />
            </a>
          </motion.div>

          {/* ── CONCENTRIC ORBITAL VISUAL (Matching Reference Hero Feature) ─── */}
          <div className="relative mx-auto mt-16 max-w-4xl h-[420px] sm:h-[480px] flex items-center justify-center">
            
            {/* Concentric Rings with Warm Orange/Peach Highlights & Realistic Signals */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              {/* Outer Ring with Micro Dashes */}
              <div className="h-[380px] w-[380px] sm:h-[450px] sm:w-[450px] rounded-full border border-dashed border-[#F97316]/25 animate-[spin_60s_linear_infinite]" />
              
              {/* Middle Solid Orbit Ring */}
              <div className="absolute h-[290px] w-[290px] sm:h-[350px] sm:w-[350px] rounded-full border border-[#FB923C]/30" />
              
              {/* Inner Reverse Spinning Orbit */}
              <div className="absolute h-[200px] w-[200px] sm:h-[250px] sm:w-[250px] rounded-full border border-dashed border-[#F97316]/35 animate-[spin_35s_linear_infinite_reverse]" />

              {/* Realistic Sweeping Radar Beam */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
                className="absolute h-[380px] w-[380px] sm:h-[450px] sm:w-[450px] rounded-full"
                style={{
                  background: "conic-gradient(from 0deg, transparent 0deg, transparent 300deg, rgba(249, 115, 22, 0.08) 335deg, rgba(251, 146, 60, 0.28) 360deg)",
                  maskImage: "radial-gradient(circle, transparent 56%, black 58%, black 98%, transparent 100%)",
                  WebkitMaskImage: "radial-gradient(circle, transparent 56%, black 58%, black 98%, transparent 100%)",
                }}
              />

              {/* Expanding Live Signal Beacon Waves */}
              <motion.div
                animate={{ scale: [1, 2.1], opacity: [0.45, 0] }}
                transition={{ duration: 3.2, repeat: Infinity, ease: "easeOut" }}
                className="absolute h-36 w-36 rounded-full border border-[#F97316]/50"
              />
              <motion.div
                animate={{ scale: [1, 2.4], opacity: [0.35, 0] }}
                transition={{ duration: 3.2, repeat: Infinity, ease: "easeOut", delay: 1.1 }}
                className="absolute h-36 w-36 rounded-full border border-[#FB923C]/40"
              />

              {/* Ambient Radial Flare Core */}
              <motion.div
                animate={{ scale: [0.95, 1.08, 0.95], opacity: [0.7, 0.9, 0.7] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                className="absolute h-64 w-64 rounded-full bg-gradient-to-tr from-[#FFF7ED] via-[#FFEDD5] to-[#FDF2F8] blur-2xl"
              />
            </div>

            {/* Orbiting Platform Badges around the Concentric Rings */}
            {/* 1. Meta / Instagram (Top-Left) */}
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-4 sm:top-8 left-6 sm:left-16 flex items-center gap-2 rounded-2xl border border-black/[0.06] bg-white/90 px-3.5 py-2 shadow-sm backdrop-blur-md"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-gradient-to-tr from-[#F97316] to-[#EC4899] text-white">
                <Target size={14} />
              </div>
              <span className="text-xs font-bold text-[#18181B]">Meta Ads</span>
            </motion.div>

            {/* 2. Reels / Video (Top-Right) */}
            <motion.div
              animate={{ y: [0, 6, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-6 sm:top-12 right-6 sm:right-20 flex items-center gap-2 rounded-2xl border border-black/[0.06] bg-white/90 px-3.5 py-2 shadow-sm backdrop-blur-md"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-[#EC4899] text-white">
                <Film size={14} />
              </div>
              <span className="text-xs font-bold text-[#18181B]">9:16 Viral Reels</span>
            </motion.div>

            {/* 3. WhatsApp Direct Lead Gen (Bottom-Left) */}
            <motion.div
              animate={{ y: [0, 6, 0] }}
              transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
              className="absolute bottom-6 sm:bottom-12 left-8 sm:left-24 flex items-center gap-2 rounded-2xl border border-black/[0.06] bg-white/90 px-3.5 py-2 shadow-sm backdrop-blur-md"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-[#10B981] text-white">
                <MessageSquare size={14} />
              </div>
              <span className="text-xs font-bold text-[#18181B]">WhatsApp CTAs</span>
            </motion.div>

            {/* 4. Google SEO / Intent (Bottom-Right) */}
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
              className="absolute bottom-4 sm:bottom-10 right-8 sm:right-28 flex items-center gap-2 rounded-2xl border border-black/[0.06] bg-white/90 px-3.5 py-2 shadow-sm backdrop-blur-md"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-[#F59E0B] text-white">
                <Zap size={14} />
              </div>
              <span className="text-xs font-bold text-[#18181B]">SEO Clusters</span>
            </motion.div>

            {/* Center Stacked Deliverable Card (Matching Center of Reference Orbital) */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.7 }}
              className="relative z-10 w-full max-w-sm sm:max-w-md rounded-3xl border border-black/[0.08] bg-white/95 p-5 sm:p-6 shadow-[0_16px_48px_rgba(249,115,22,0.12)] backdrop-blur-2xl text-left"
            >
              <div className="flex items-center justify-between border-b border-black/[0.06] pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#FFF7ED] p-1.5 ring-1 ring-black/[0.06]">
                    <Image
                      src="/logo-emblem-transparent.png"
                      alt="AdvertiseOS Emblem"
                      width={22}
                      height={22}
                    />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#18181B]">Live Agency Execution</h4>
                    <p className="text-[10px] text-[#71717A]">7 Specialists Active in Sync</p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  QA 100/100
                </span>
              </div>

              {/* Stacked Task Items inside Center Card */}
              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between rounded-xl bg-[#F8F6F4] p-2.5 border border-black/[0.04]">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#FFF7ED] text-[#F97316]">
                      <Target size={13} />
                    </span>
                    <span className="font-semibold text-[#18181B]">30-Day Campaign Blueprint</span>
                  </div>
                  <span className="text-[11px] font-bold text-[#F97316]">Ready</span>
                </div>

                <div className="flex items-center justify-between rounded-xl bg-[#F8F6F4] p-2.5 border border-black/[0.04]">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#FDF2F8] text-[#EC4899]">
                      <FileText size={13} />
                    </span>
                    <span className="font-semibold text-[#18181B]">12 Posts · 36 Caption Angles</span>
                  </div>
                  <span className="text-[11px] font-bold text-[#EC4899]">Packaged</span>
                </div>

                <div className="flex items-center justify-between rounded-xl bg-[#F8F6F4] p-2.5 border border-black/[0.04]">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#F0FDF4] text-[#10B981]">
                      <ShieldCheck size={13} />
                    </span>
                    <span className="font-semibold text-[#18181B]">Human Approval Gate</span>
                  </div>
                  <span className="text-[11px] font-bold text-emerald-600">Protected</span>
                </div>
              </div>
            </motion.div>

          </div>
        </div>
      </section>

      {/* ── 3. Client & Integration Logos Bar (Dual-Track Running Marquee Matching Reference) ── */}
      <section className="relative z-10 border-y border-black/[0.06] bg-[#FAF8F5]/85 py-9 sm:py-12 backdrop-blur-md overflow-hidden">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 text-center mb-6 sm:mb-8">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#71717A]">
            Trusted by High-Growth Brands, Global Leaders & Modern Agencies
          </p>
        </div>

        {/* Dual Running Marquee Tracks */}
        <div className="relative w-full space-y-6 sm:space-y-8 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]">
          {/* Row 1: Scrolling Left (Bentley, Canva, Capgemini, Cisco, Experian, Shopify, Notion) */}
          <motion.div
            animate={{ x: ["0%", "-50%"] }}
            transition={{
              duration: 28,
              repeat: Infinity,
              ease: "linear",
            }}
            className="flex w-max items-center gap-14 sm:gap-20 py-1"
          >
            {[...MARQUEE_ROW_1, ...MARQUEE_ROW_1].map((logo, idx) => (
              <div
                key={`r1-${idx}`}
                className="group flex items-center shrink-0 text-[#27272A] opacity-75 transition-all duration-300 hover:opacity-100 hover:scale-105 hover:text-[#18181B] select-none cursor-pointer"
              >
                {logo.svg}
              </div>
            ))}
          </motion.div>

          {/* Row 2: Counter-Flow Scrolling Right (Red Bull, Replit, Roblox, SEGA, Stripe, Meta, Figma) */}
          <motion.div
            animate={{ x: ["-50%", "0%"] }}
            transition={{
              duration: 32,
              repeat: Infinity,
              ease: "linear",
            }}
            className="flex w-max items-center gap-14 sm:gap-20 py-1"
          >
            {[...MARQUEE_ROW_2, ...MARQUEE_ROW_2].map((logo, idx) => (
              <div
                key={`r2-${idx}`}
                className="group flex items-center shrink-0 text-[#27272A] opacity-75 transition-all duration-300 hover:opacity-100 hover:scale-105 hover:text-[#18181B] select-none cursor-pointer"
              >
                {logo.svg}
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── 4. Value Metrics 4-Grid (Matching Reference Middle-Left) ─────────── */}
      <section id="features" className="relative z-10 py-20 px-4 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-[#18181B]">
              Simplify campaign orchestration <br className="hidden sm:inline" />
              for modern brands
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm sm:text-base text-[#52525B]">
              Break down complex marketing operations into verified, automated deliverables that keep your team focused on growth.
            </p>
          </motion.div>

          <div className="mt-14 grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
            {VALUE_METRICS.map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 45, scale: 0.94 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.5, delay: idx * 0.12, ease: [0.22, 1, 0.36, 1] }}
                whileHover={{ y: -6, scale: 1.02 }}
                className="rounded-3xl border border-black/[0.06] bg-white/80 p-7 sm:p-8 shadow-xs backdrop-blur-xl transition-all hover:shadow-lg hover:border-black/15"
              >
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${item.bgColor} ring-1 ring-black/[0.04]`}>
                  <item.icon size={22} style={{ color: item.color }} />
                </div>
                <h3 className="font-display mt-5 text-xl font-bold tracking-tight text-[#18181B]">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm text-[#71717A] leading-relaxed">
                  {item.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 5. Split Section: Plan & Track (Matching Reference Top-Right) ─────── */}
      <section className="relative z-10 py-16 px-4 sm:px-6 bg-white/40 border-y border-black/[0.05]">
        <div className="mx-auto max-w-5xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            
            {/* Left Copy */}
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="lg:col-span-5"
            >
              <div className="inline-flex items-center gap-1.5 rounded-full bg-[#FFF7ED] px-3 py-1 text-[11px] font-bold text-[#EA580C]">
                <span>Tracking</span>
                <span>·</span>
                <span>Scheduling</span>
                <span>·</span>
                <span>Visibility</span>
              </div>

              <h2 className="font-display mt-4 text-3xl font-extrabold tracking-tight text-[#18181B] leading-tight">
                Plan campaigns and track deliverables effortlessly
              </h2>

              <p className="mt-3 text-sm text-[#52525B] leading-relaxed">
                Break down campaigns into manageable milestones. Track progress in real-time, inspect creative briefs, and eliminate guesswork with automated status verification.
              </p>

              <div className="mt-6 flex items-center gap-3">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#18181B] px-5 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-[#27272A]"
                >
                  <span>Launch Studio</span>
                  <ArrowRight size={14} />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 rounded-full border border-black/[0.08] bg-white px-4 py-2.5 text-xs font-semibold text-[#18181B] hover:bg-[#F5F2EF]"
                >
                  <span>Admin Access</span>
                </Link>
              </div>
            </motion.div>

            {/* Right Visual Floating Cards */}
            <motion.div
              initial={{ opacity: 0, x: 40, scale: 0.95 }}
              whileInView={{ opacity: 1, x: 0, scale: 1 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
              className="lg:col-span-7"
            >
              <div className="relative rounded-3xl border border-black/[0.08] bg-gradient-to-br from-white to-[#FFF7ED]/30 p-6 sm:p-8 shadow-md">
                
                {/* 3 Pillar Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <motion.div
                    whileHover={{ y: -4 }}
                    className="rounded-2xl border border-black/[0.06] bg-white p-4 shadow-2xs transition-transform"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#FFF7ED] text-[#F97316]">
                      <Calendar size={16} />
                    </div>
                    <h4 className="font-bold text-xs text-[#18181B] mt-3">Autonomous Calendar</h4>
                    <p className="text-[11px] text-[#71717A] mt-1 leading-snug">
                      30-day scheduled flight plan with content pillars.
                    </p>
                  </motion.div>

                  <motion.div
                    whileHover={{ y: -4 }}
                    className="rounded-2xl border border-black/[0.06] bg-white p-4 shadow-2xs transition-transform"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#FDF2F8] text-[#EC4899]">
                      <FileText size={16} />
                    </div>
                    <h4 className="font-bold text-xs text-[#18181B] mt-3">12 Package Posts</h4>
                    <p className="text-[11px] text-[#71717A] mt-1 leading-snug">
                      3 distinct caption angles per post (Pain, Desire, Logic).
                    </p>
                  </motion.div>

                  <motion.div
                    whileHover={{ y: -4 }}
                    className="rounded-2xl border border-black/[0.06] bg-white p-4 shadow-2xs transition-transform"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#F0FDF4] text-[#10B981]">
                      <Film size={16} />
                    </div>
                    <h4 className="font-bold text-xs text-[#18181B] mt-3">4 Viral Reels</h4>
                    <p className="text-[11px] text-[#71717A] mt-1 leading-snug">
                      3-second visual hooks with complete scene breakdowns.
                    </p>
                  </motion.div>
                </div>

                {/* Sub banner inside */}
                <div className="mt-5 flex items-center justify-between rounded-2xl bg-[#18181B] p-4 text-white">
                  <div className="flex items-center gap-2.5">
                    <ShieldCheck size={18} className="text-[#FED7AA]" />
                    <span className="text-xs font-semibold">Strict Human Approvals Protected</span>
                  </div>
                  <span className="text-[11px] text-[#FED7AA] font-bold">100% Sign-Off Gate</span>
                </div>

              </div>
            </motion.div>

          </div>
        </div>
      </section>

      {/* ── 6. Split Section: Organize Work (Matching Reference Middle-Right) ─── */}
      <section id="capabilities" className="relative z-10 py-20 px-4 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            
            {/* Left Copy & Testimonial Proof */}
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="lg:col-span-5"
            >
              <h2 className="font-display text-3xl font-extrabold tracking-tight text-[#18181B] leading-tight">
                Organize work and boost marketing productivity
              </h2>

              <p className="mt-3 text-sm text-[#52525B] leading-relaxed">
                From simple feed posts to multi-angle performance ad campaigns, orchestrate everything in one unified dashboard that keeps your brand focused on ROI.
              </p>

              <div className="mt-6 flex items-center gap-3">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#18181B] px-5 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-[#27272A] active:scale-[0.98]"
                >
                  <span>Enter Studio</span>
                  <ArrowRight size={14} />
                </Link>
              </div>

              {/* Social Proof Avatars */}
              <div className="mt-8 pt-6 border-t border-black/[0.06]">
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-2 overflow-hidden">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F97316] text-[10px] font-bold text-white ring-2 ring-white">AS</span>
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FB923C] text-[10px] font-bold text-white ring-2 ring-white">MR</span>
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0891B2] text-[10px] font-bold text-white ring-2 ring-white">PM</span>
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#10B981] text-[10px] font-bold text-white ring-2 ring-white">+4</span>
                  </div>
                  <p className="text-xs text-[#71717A] font-medium">
                    Orchestrating 30-day campaigns with 7 autonomous specialists.
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Right Capability List with Push-in Reveal on Scroll */}
            <div className="lg:col-span-7 space-y-3.5">
              {TOOL_CAPABILITIES.map((tool, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: 35, scale: 0.96 }}
                  whileInView={{ opacity: 1, x: 0, scale: 1 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ duration: 0.5, delay: idx * 0.1, ease: [0.22, 1, 0.36, 1] }}
                  whileHover={{ x: 6, scale: 1.01 }}
                  className="flex items-start gap-4 rounded-2xl border border-black/[0.06] bg-white p-4 sm:p-5 shadow-2xs transition-all hover:border-black/15 hover:shadow-md"
                >
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ring-black/[0.04]"
                    style={{ backgroundColor: `${tool.color}15`, color: tool.color }}
                  >
                    <tool.icon size={18} />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-[#18181B]">{tool.name}</h4>
                    <p className="text-xs text-[#71717A] mt-1 leading-relaxed">{tool.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>

          </div>
        </div>
      </section>

      {/* ── 7. The 7 Autonomous Specialist Agents ────────────────────────────── */}
      <section id="specialists" className="relative z-10 py-20 px-4 sm:px-6 bg-[#F5F2EF]/60 border-t border-black/[0.05]">
        <div className="mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <div className="inline-flex items-center gap-1.5 rounded-full bg-[#FFF7ED] px-3.5 py-1 text-xs font-bold text-[#EA580C]">
              <Sparkles size={13} />
              <span>Autonomous Agency Architecture</span>
            </div>
            <h2 className="font-display mt-3 text-3xl sm:text-4xl font-extrabold tracking-tight text-[#18181B]">
              Seven specialists. One coordinated system.
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-sm text-[#52525B]">
              Every deliverable is handled by a dedicated AI specialist that adheres to your brand rules and verified benchmarks.
            </p>
          </motion.div>

          {/* 7 Staggered Specialist Cards with Push-in on Scroll */}
          <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {AGENTS.map((agent, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 40, scale: 0.93 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.5, delay: (idx % 3) * 0.12, ease: [0.22, 1, 0.36, 1] }}
                whileHover={{ y: -6, scale: 1.02 }}
                className="relative rounded-3xl border border-black/[0.06] bg-white p-6 shadow-xs transition-all hover:shadow-lg hover:border-black/15"
              >
                <div className="flex items-center justify-between">
                  <div
                    className="flex h-11 w-11 items-center justify-center rounded-2xl ring-1 ring-black/[0.04]"
                    style={{ backgroundColor: `${agent.color}15`, color: agent.color }}
                  >
                    <agent.icon size={20} />
                  </div>
                  <span className="rounded-full bg-[#F5F2EF] px-2.5 py-0.5 text-[10px] font-bold text-[#71717A]">
                    {agent.stat}
                  </span>
                </div>

                <h3 className="font-display mt-4 text-base font-bold text-[#18181B]">
                  {agent.role}
                </h3>
                <p className="text-xs font-semibold text-[#F97316] mt-0.5">
                  {agent.tagline}
                </p>
                <p className="mt-2 text-xs text-[#71717A] leading-relaxed">
                  {agent.desc}
                </p>

                <div className="mt-4 pt-3 border-t border-black/[0.05] text-[11px] font-medium text-[#52525B] flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                  <span>{agent.highlight}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 8. Interactive Workspace Showcase (Matching Reference Bottom-Left) ── */}
      <section id="workspace" className="relative z-10 py-20 px-4 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-[#18181B]">
              Your all-in-one marketing workspace
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-sm text-[#52525B]">
              Review 30-day schedules, compare Plan A/B/C strategic alternatives, inspect creative briefs, and sign off before publishing.
            </p>

            {/* Interactive Tab Controls */}
            <div className="mt-8 inline-flex items-center rounded-full border border-black/[0.08] bg-white p-1 shadow-xs">
              <button
                onClick={() => setActiveStudioTab("calendar")}
                className={`rounded-full px-4 py-2 text-xs font-semibold transition-all ${
                  activeStudioTab === "calendar"
                    ? "bg-[#18181B] text-white shadow-xs"
                    : "text-[#71717A] hover:text-[#18181B]"
                }`}
              >
                30-Day Calendar
              </button>
              <button
                onClick={() => setActiveStudioTab("posts")}
                className={`rounded-full px-4 py-2 text-xs font-semibold transition-all ${
                  activeStudioTab === "posts"
                    ? "bg-[#18181B] text-white shadow-xs"
                    : "text-[#71717A] hover:text-[#18181B]"
                }`}
              >
                12 Carousel Posts
              </button>
              <button
                onClick={() => setActiveStudioTab("reels")}
                className={`rounded-full px-4 py-2 text-xs font-semibold transition-all ${
                  activeStudioTab === "reels"
                    ? "bg-[#18181B] text-white shadow-xs"
                    : "text-[#71717A] hover:text-[#18181B]"
                }`}
              >
                4 Viral Reels
              </button>
              <button
                onClick={() => setActiveStudioTab("plans")}
                className={`rounded-full px-4 py-2 text-xs font-semibold transition-all ${
                  activeStudioTab === "plans"
                    ? "bg-[#18181B] text-white shadow-xs"
                    : "text-[#71717A] hover:text-[#18181B]"
                }`}
              >
                Plan A/B/C Matrix
              </button>
            </div>
          </motion.div>

          {/* Interactive Workspace Screen Preview with Push-in on Scroll */}
          <motion.div
            initial={{ opacity: 0, y: 45, scale: 0.96 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
            className="mt-10 overflow-hidden rounded-[32px] border border-black/[0.08] bg-white p-6 sm:p-8 shadow-xl"
          >
            <AnimatePresence mode="wait">
              {activeStudioTab === "calendar" && (
                <motion.div
                  key="calendar"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                >
                  <div className="flex items-center justify-between border-b border-black/[0.06] pb-4">
                    <div>
                      <h4 className="font-display font-bold text-base text-[#18181B]">
                        30-Day Omnichannel Calendar
                      </h4>
                      <p className="text-xs text-[#71717A]">
                        12 Scheduled Feed Posts · 4 High-Energy Reels · Planned Rest Days
                      </p>
                    </div>
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                      Approved Flight Plan
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                    <div className="rounded-2xl border border-black/[0.06] bg-[#F8F6F4] p-4">
                      <span className="text-[10px] font-bold uppercase text-[#F97316]">Week 1: Problem Awareness</span>
                      <h5 className="font-bold text-xs text-[#18181B] mt-1">Carousels: 3 Critical Mistakes</h5>
                      <p className="text-[11px] text-[#71717A] mt-1">Hook: Why traditional workouts stall after 14 days.</p>
                    </div>
                    <div className="rounded-2xl border border-black/[0.06] bg-[#F8F6F4] p-4">
                      <span className="text-[10px] font-bold uppercase text-[#FB923C]">Week 2: Social Proof & Reel</span>
                      <h5 className="font-bold text-xs text-[#18181B] mt-1">Reel 1: 3-Second Visual Transformation</h5>
                      <p className="text-[11px] text-[#71717A] mt-1">Hook: Don&apos;t sign up for a gym until you see this.</p>
                    </div>
                    <div className="rounded-2xl border border-black/[0.06] bg-[#F8F6F4] p-4">
                      <span className="text-[10px] font-bold uppercase text-[#10B981]">Week 3-4: Direct Inquiries</span>
                      <h5 className="font-bold text-xs text-[#18181B] mt-1">Free Trial Pass CTA</h5>
                      <p className="text-[11px] text-[#71717A] mt-1">Frictionless 2-Day Pass link via WhatsApp.</p>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeStudioTab === "posts" && (
                <motion.div
                  key="posts"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                >
                  <div className="flex items-center justify-between border-b border-black/[0.06] pb-4">
                    <div>
                      <h4 className="font-display font-bold text-base text-[#18181B]">
                        12 Posts with 3 Distinct Conversion Caption Angles
                      </h4>
                      <p className="text-xs text-[#71717A]">
                        Angle 1: Direct Pain Point · Angle 2: Desired Outcome · Angle 3: Logical Value
                      </p>
                    </div>
                    <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-bold text-[#EA580C]">
                      36 Angles Packaged
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div className="rounded-2xl border border-black/[0.06] bg-[#F8F6F4] p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-[#F97316]">Post #01 · Educational Carousel</span>
                        <span className="text-[10px] bg-white px-2 py-0.5 rounded border border-black/[0.06]">Instagram</span>
                      </div>
                      <h5 className="font-bold text-xs text-[#18181B] mt-2">The Monsoon Fitness Blueprint</h5>
                      <p className="text-[11px] text-[#71717A] mt-1">
                        Caption Angle: &ldquo;Desk job ruining your spine? 3 daily compound lifts to rebuild functional strength.&rdquo;
                      </p>
                    </div>

                    <div className="rounded-2xl border border-black/[0.06] bg-[#F8F6F4] p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-[#FB923C]">Post #02 · Direct Response</span>
                        <span className="text-[10px] bg-white px-2 py-0.5 rounded border border-black/[0.06]">Meta Ads</span>
                      </div>
                      <h5 className="font-bold text-xs text-[#18181B] mt-2">Zero-Fluff Trial Pass Offer</h5>
                      <p className="text-[11px] text-[#71717A] mt-1">
                        Caption Angle: &ldquo;2 days to test our certified trainers and customized nutrition roadmap free.&rdquo;
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeStudioTab === "reels" && (
                <motion.div
                  key="reels"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                >
                  <div className="flex items-center justify-between border-b border-black/[0.06] pb-4">
                    <div>
                      <h4 className="font-display font-bold text-base text-[#18181B]">
                        4 Shootable 9:16 Vertical Reel Scripts
                      </h4>
                      <p className="text-xs text-[#71717A]">
                        Includes 3-second visual pattern interrupts, scene cues, text overlays, and audio track recommendations.
                      </p>
                    </div>
                    <span className="rounded-full bg-pink-50 px-3 py-1 text-xs font-bold text-[#DB2777]">
                      Viral Retention
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div className="rounded-2xl border border-black/[0.06] bg-[#F8F6F4] p-4">
                      <span className="text-[11px] font-bold text-[#EC4899]">Reel #1 · The 3-Second Hook</span>
                      <p className="text-xs font-bold text-[#18181B] mt-1">&ldquo;Why your 10,000 steps aren&apos;t burning fat.&rdquo;</p>
                      <p className="text-[11px] text-[#71717A] mt-2">
                        Visual Breakdown: Trainer drops a 20kg barbell, points to the camera, and reveals the cortisol plateau curve.
                      </p>
                    </div>

                    <div className="rounded-2xl border border-black/[0.06] bg-[#F8F6F4] p-4">
                      <span className="text-[11px] font-bold text-[#EC4899]">Reel #2 · Day-In-The-Life Cut</span>
                      <p className="text-xs font-bold text-[#18181B] mt-1">&ldquo;From Bandra traffic to evening energy.&rdquo;</p>
                      <p className="text-[11px] text-[#71717A] mt-2">
                        Visual Breakdown: Fast cuts of working professional entering the studio, customized hydration, and post-session stretch.
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeStudioTab === "plans" && (
                <motion.div
                  key="plans"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                >
                  <div className="flex items-center justify-between border-b border-black/[0.06] pb-4">
                    <div>
                      <h4 className="font-display font-bold text-base text-[#18181B]">
                        Autonomous Plan A / Plan B / Plan C Matrix
                      </h4>
                      <p className="text-xs text-[#71717A]">
                        Strategic alternative flight plans tailored to your conversion target and timeline.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                    {PLAN_OPTIONS.map((plan) => (
                      <div
                        key={plan.id}
                        onClick={() => setActivePlan(plan.id)}
                        className={`cursor-pointer rounded-2xl border p-4 transition-all ${
                          activePlan === plan.id
                            ? "border-[#F97316] bg-[#FFF7ED]/50 shadow-xs"
                            : "border-black/[0.06] bg-[#F8F6F4] hover:bg-white"
                        }`}
                      >
                        <span className="text-[10px] font-bold uppercase text-[#F97316]">{plan.badge}</span>
                        <h5 className="font-bold text-xs text-[#18181B] mt-1">{plan.title}</h5>
                        <p className="text-[11px] font-semibold text-[#52525B] mt-1">{plan.scale}</p>
                        <p className="text-[10px] text-[#71717A] mt-2">{plan.mix}</p>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

        </div>
      </section>

      {/* ── 9. Final Call to Action Banner (Matching Reference Bottom-Right) ─── */}
      <section className="relative z-10 py-24 px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 45, scale: 0.94 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto max-w-4xl rounded-[40px] border border-black/[0.08] bg-[#18181B] p-8 sm:p-14 text-center text-white shadow-2xl relative overflow-hidden"
        >
          {/* Subtle Warm Amber Glow Behind */}
          <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 h-72 w-96 rounded-full bg-gradient-to-r from-[#F97316]/30 via-[#FB923C]/20 to-transparent blur-3xl" />

          <div className="relative z-10">
            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
              Smart marketing orchestration <br className="hidden sm:inline" />
              for growing brands
            </h2>

            <p className="mx-auto mt-4 max-w-xl text-sm sm:text-base text-[#A1A1AA] leading-relaxed">
              Organize campaigns, assign 7 specialist AI agents, and launch high-converting creative flight plans with a single platform built to maximize engagement.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
              <Link
                href="/dashboard"
                className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-full bg-white px-7 py-3 text-sm font-semibold text-[#18181B] shadow-sm transition-all hover:bg-[#F5F2EF] active:scale-[0.98]"
              >
                <span>Launch Studio</span>
                <ArrowRight size={15} />
              </Link>
              <Link
                href="/login"
                className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-full border border-white/20 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur-md transition-all hover:bg-white/20 active:scale-[0.98]"
              >
                <Lock size={13} className="text-[#FED7AA]" />
                <span>Admin Login</span>
              </Link>
            </div>

            <div className="mt-8 flex items-center justify-center gap-6 text-xs text-[#A1A1AA]">
              <span className="flex items-center gap-1.5">
                <Check size={14} className="text-[#F97316]" /> Zero Fabricated Claims
              </span>
              <span className="flex items-center gap-1.5">
                <Check size={14} className="text-[#F97316]" /> Strict Approval Gated
              </span>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ── 10. Footer ──────────────────────────────────────────────────────── */}
      <footer className="relative z-10 border-t border-black/[0.06] bg-white py-12 px-4 sm:px-6">
        <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-tr from-[#FFF7ED] to-[#FFEDD5] p-1 ring-1 ring-black/[0.06]">
              <Image
                src="/logo-emblem-transparent.png"
                alt="AdvertiseOS Emblem"
                width={20}
                height={20}
              />
            </div>
            <span className="font-display font-extrabold text-sm tracking-tight text-[#18181B]">
              Advertise<span className="text-[#F97316]">OS</span>
            </span>
            <span className="text-xs text-[#71717A]">
              · Autonomous AI Marketing Operating System
            </span>
          </div>

          <div className="flex items-center gap-6 text-xs font-semibold text-[#71717A]">
            <a href="#features" className="hover:text-[#18181B]">Features</a>
            <a href="#specialists" className="hover:text-[#18181B]">7 Specialists</a>
            <a href="#workspace" className="hover:text-[#18181B]">Workspace</a>
            <Link href="/login" className="hover:text-[#18181B]">Admin Login</Link>
          </div>

          <div className="text-xs text-[#A1A1AA]">
            © {new Date().getFullYear()} AdvertiseOS. All rights reserved.
          </div>
        </div>
      </footer>

    </div>
  );
}
