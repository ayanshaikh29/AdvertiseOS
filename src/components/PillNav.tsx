"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight, Menu, X } from "lucide-react";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/briefs", label: "Briefs" },
  { href: "/calendar", label: "Calendar" },
  { href: "/approvals", label: "Approvals" },
  { href: "/assets", label: "Assets" },
  { href: "/analytics", label: "Analytics" },
  { href: "/team", label: "Team" },
];

export function PillNav() {
  const [open, setOpen] = useState(false);
  return (
    <header className="fixed inset-x-0 top-4 z-50 flex justify-center px-4">
      <nav
        aria-label="Primary"
        className="flex w-full max-w-4xl items-center justify-between gap-2 rounded-full bg-[#E5E5E5] px-4 py-2 text-black"
      >
        <Link href="/" className="font-display text-lg font-800 font-bold tracking-tight">
          AdvertiseOS
        </Link>
        <div className="hidden items-center gap-4 text-sm font-medium md:flex">
          {links.slice(0, 5).map((l) => (
            <Link key={l.href} href={l.href} className="rounded-full px-2 py-2 hover:underline">
              {l.label}
            </Link>
          ))}
          <Link
            href="/briefs/new"
            className="inline-flex min-h-[44px] items-center gap-1 rounded-full bg-black px-4 py-2 text-sm font-semibold text-white"
          >
            Get Started <ArrowUpRight size={16} aria-hidden />
          </Link>
        </div>
        <button
          className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full md:hidden"
          aria-expanded={open}
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </nav>
      {open ? (
        <div className="fixed inset-x-4 top-20 rounded-3xl border border-border bg-surface p-4 text-ink shadow-[0_24px_64px_-24px_rgba(16,24,40,0.35)] md:hidden">
          <div className="grid gap-1">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-xl px-4 py-3 text-base hover:bg-surface-hover"
              >
                {l.label}
              </Link>
            ))}
            <Link
              href="/briefs/new"
              onClick={() => setOpen(false)}
              className="mt-2 inline-flex min-h-[44px] items-center justify-center gap-1 rounded-full bg-[#2563EB] px-4 py-2 font-semibold text-white"
            >
              Get Started <ArrowUpRight size={16} aria-hidden />
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}
