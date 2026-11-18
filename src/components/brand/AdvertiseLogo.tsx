"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/cn";

interface AdvertiseLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  showTagline?: boolean;
  collapsed?: boolean;
  href?: string;
}

export function AdvertiseLogo({
  className,
  size = "md",
  showTagline = true,
  collapsed = false,
  href = "/dashboard",
}: AdvertiseLogoProps) {
  const iconSize = size === "sm" ? 30 : size === "lg" ? 48 : 38;

  const content = (
    <div className={cn("group flex items-center gap-3 select-none", className)}>
      {/* Glowing Star Emblem */}
      <div
        className={cn(
          "relative flex shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-white to-[#F5F2EF] p-1 shadow-[0_4px_16px_-4px_rgba(249,115,22,0.18),0_2px_8px_-2px_rgba(139,92,246,0.18)] ring-1 ring-black/[0.06] transition-all duration-300 group-hover:scale-105 group-hover:shadow-[0_6px_22px_-4px_rgba(249,115,22,0.28)]",
          size === "sm" ? "h-8 w-8" : size === "lg" ? "h-12 w-12" : "h-10 w-10"
        )}
      >
        <Image
          src="/logo-emblem-transparent.png"
          alt="AdvertiseOS Logo"
          width={iconSize}
          height={iconSize}
          className="object-contain drop-shadow-[0_2px_6px_rgba(249,115,22,0.3)] transition-transform duration-300 group-hover:rotate-6"
          priority
        />
      </div>

      {/* Brand Text */}
      {!collapsed && (
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5 leading-none">
            <span className="font-display font-extrabold tracking-tight text-[#18181B] text-base sm:text-lg">
              Advertise<span className="text-[#8B5CF6] font-bold">OS</span>
            </span>
            <span className="rounded-full bg-[#8B5CF6]/10 px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-[#7C3AED]">
              AI
            </span>
          </div>
          {showTagline && (
            <span className="mt-1 text-[10px] font-medium tracking-wider text-[#A1A1AA] uppercase">
              Create · Showcase · Grow
            </span>
          )}
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex min-w-0 focus:outline-none">
        {content}
      </Link>
    );
  }

  return content;
}
