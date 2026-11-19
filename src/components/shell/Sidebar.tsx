"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Home,
  Sparkles,
  Layers,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Palette,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { AdvertiseLogo } from "@/components/brand/AdvertiseLogo";

type CleanNavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  badge?: string;
};

const MAIN_NAV: CleanNavItem[] = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/campaigns", label: "Studio", icon: Layers },
  { href: "/brand", label: "Brand Voice", icon: Palette },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [userEmail, setUserEmail] = useState("Ayan Shaikh");

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // ignore
    }
    router.push("/login");
    router.refresh();
  };

  useEffect(() => {
    setCollapsed(localStorage.getItem("advos-rail") === "1");
    fetch("/api/session")
      .then((r) => r.json())
      .then((d) => {
        if (d.session?.email) {
          const name = d.session.email.split("@")[0] || "Ayan Shaikh";
          setUserEmail(name.charAt(0).toUpperCase() + name.slice(1));
        }
      })
      .catch(() => {});
  }, []);

  const toggle = () => {
    setCollapsed((c) => {
      const next = !c;
      localStorage.setItem("advos-rail", next ? "1" : "0");
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("advos-sidebar-toggle", { detail: { collapsed: next } }));
      }
      return next;
    });
  };

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-black/[0.06] bg-white/80 backdrop-blur-xl transition-all duration-300 md:flex",
        collapsed ? "w-[76px]" : "w-[240px]"
      )}
    >
      {/* Floating Edge Toggle Button (Always visible on rail border) */}
      <button
        onClick={toggle}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        className="absolute -right-3 top-5 z-50 flex h-6 w-6 items-center justify-center rounded-full border border-black/[0.08] bg-white text-[#71717A] shadow-[0_2px_8px_rgba(0,0,0,0.08)] transition hover:scale-110 hover:bg-[#F8F6F4] hover:text-[#18181B]"
      >
        {collapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
      </button>

      {/* Brand Header */}
      <div
        className={cn(
          "flex items-center border-b border-black/[0.04] py-4 transition-all",
          collapsed ? "justify-center px-2" : "justify-between gap-2 px-4"
        )}
      >
        <AdvertiseLogo collapsed={collapsed} showTagline={!collapsed} size="sm" />
        {!collapsed && (
          <button
            onClick={toggle}
            aria-label="Collapse sidebar"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-[#71717A] transition hover:bg-black/[0.04] hover:text-[#18181B]"
          >
            <ChevronLeft size={16} />
          </button>
        )}
      </div>

      {/* Clean Navigation (Image 1 Style) */}
      <nav aria-label="Workspace navigation" className="flex-1 space-y-1.5 overflow-y-auto px-3 py-4">
        <ul className="space-y-1.5">
          {MAIN_NAV.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href + "/"));
            const Icon = item.icon;

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "group relative flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-xs font-semibold transition-all duration-200",
                    isActive
                      ? "bg-[#18181B] text-white shadow-[0_4px_16px_-4px_rgba(24,24,27,0.35)]"
                      : "text-[#71717A] hover:bg-black/[0.04] hover:text-[#18181B]",
                    collapsed && "justify-center px-0 py-3"
                  )}
                >
                  <Icon
                    size={18}
                    className={cn(
                      "shrink-0 transition-transform duration-200 group-hover:scale-105",
                      isActive ? "text-white" : "text-[#71717A] group-hover:text-[#18181B]"
                    )}
                  />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                  {!collapsed && item.badge && (
                    <span className="ml-auto rounded-full bg-[#8B5CF6]/15 px-2 py-0.5 text-[10px] font-bold text-[#7C3AED]">
                      {item.badge}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Bottom User Profile Card (Matching Image 1) */}
      <div className="border-t border-black/[0.04] p-3">
        {!collapsed ? (
          <div className="rounded-2xl border border-black/[0.05] bg-gradient-to-b from-[#FAF8F5] to-[#F5F2EE] p-3 shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-[#F97316] via-[#EC4899] to-[#8B5CF6] text-xs font-bold text-white shadow-sm ring-2 ring-white">
                {userEmail.slice(0, 1)}
                <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#10B981]" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold leading-tight text-[#18181B]">{userEmail}</p>
                <p className="truncate text-[10px] font-medium text-[#71717A]">@ayan_agency · Owner</p>
              </div>
            </div>

            <div className="mt-2.5 flex items-center justify-between gap-2 pt-2 border-t border-black/[0.04]">
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#047857]">
                <ShieldCheck size={11} /> Pro Active
              </span>
              <button
                onClick={handleLogout}
                title="Sign out"
                className="flex items-center gap-1 text-[10px] font-medium text-[#71717A] hover:text-[#DC2626] transition-colors"
              >
                <LogOut size={12} />
                <span>Exit</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-[#F97316] via-[#EC4899] to-[#8B5CF6] text-xs font-bold text-white shadow-sm ring-2 ring-white">
              {userEmail.slice(0, 1)}
              <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full border-2 border-white bg-[#10B981]" />
            </div>
            <button
              onClick={handleLogout}
              title="Sign out"
              className="flex h-8 w-8 items-center justify-center rounded-xl text-[#71717A] hover:bg-black/[0.04] hover:text-[#DC2626] transition-colors"
            >
              <LogOut size={15} />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
