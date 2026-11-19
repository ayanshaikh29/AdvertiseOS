"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { Home, Layers, Palette, Menu, X } from "lucide-react";
import { Sidebar } from "@/components/shell/Sidebar";
import { cn } from "@/lib/cn";

const TABS = [
  { href: "/dashboard", label: "Home", icon: <Home size={20} /> },
  { href: "/campaigns", label: "Studio", icon: <Layers size={20} /> },
  { href: "/brand", label: "Brand", icon: <Palette size={20} /> },
  { href: "#more", label: "Menu", icon: <Menu size={20} /> },
];

export function MobileTabs() {
  const pathname = usePathname();
  const [drawer, setDrawer] = useState(false);

  // Auto-close drawer on route change
  useEffect(() => {
    setDrawer(false);
  }, [pathname]);

  return (
    <>
      <nav aria-label="Mobile" className="fixed inset-x-0 bottom-0 z-40 border-t border-black/[0.06] bg-white/90 pb-[env(safe-area-inset-bottom,0px)] backdrop-blur-md md:hidden">
        <ul className="grid grid-cols-4">
          {TABS.map((t) => {
            const active = pathname === t.href || (t.href !== "/dashboard" && pathname.startsWith(`${t.href}/`));
            if (t.href === "#more") {
              return (
                <li key={t.href}>
                  <button
                    onClick={() => setDrawer(true)}
                    aria-label="Open menu"
                    className="flex min-h-[56px] w-full flex-col items-center justify-center gap-1 text-[11px] font-medium text-[#64748B] transition active:scale-95"
                  >
                    {t.icon} {t.label}
                  </button>
                </li>
              );
            }
            return (
              <li key={t.href}>
                <Link
                  href={t.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-[56px] flex-col items-center justify-center gap-1 text-[11px] font-semibold transition active:scale-95",
                    active ? "text-[#18181B] font-bold" : "text-[#71717A]"
                  )}
                >
                  {t.icon} {t.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      {drawer ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-[rgba(11,18,32,0.45)] backdrop-blur-sm" onClick={() => setDrawer(false)} />
          <div className="absolute inset-y-0 left-0 w-[85%] max-w-[320px] overflow-y-auto bg-surface pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)] shadow-2xl">
            <button
              onClick={() => setDrawer(false)}
              aria-label="Close menu"
              className="absolute right-3 top-3 z-10 inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-muted hover:bg-surface-2 hover:text-ink active:scale-95"
            >
              <X size={20} />
            </button>
            <div className="[&_aside]:static [&_aside]:flex [&_aside]:w-full [&_aside]:border-0">
              <Sidebar />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
