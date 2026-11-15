import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const buttonVariants = cva(
  "inline-flex min-h-[40px] items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB] disabled:opacity-55 disabled:pointer-events-none",
  {
    variants: {
      variant: {
        primary: "bg-[#2563EB] text-white hover:bg-[#1D4ED8] shadow-[0_6px_16px_-8px_rgba(37,99,235,0.6)]",
        dark: "bg-ink text-white hover:bg-[#1e293b]",
        secondary: "border border-border bg-surface text-[#1f2937] hover:bg-[#f1f3f7] hover:border-[#d4d9e2]",
        ghost: "text-[#64748B] hover:bg-[#f1f3f7] hover:text-ink",
        danger: "bg-[#EF4444] text-white hover:bg-[#DC2626]",
        soft: "bg-brand-soft text-[#1D4ED8] hover:bg-[#dbeafe]",
      },
      size: { md: "", sm: "min-h-[32px] px-2.5 py-0.5 text-xs rounded-lg", icon: "min-h-[40px] min-w-[40px] px-0" },
    },
    defaultVariants: { variant: "primary", size: "md" },
  }
);

export function Button({ className, variant, size, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants>) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
