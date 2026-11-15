import { cn } from "@/lib/cn";

const base = "w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-base sm:text-sm text-ink placeholder:text-[#94A3B8] focus:border-[#2563EB] focus:outline-none transition-colors";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(base, "min-h-[44px]", props.className)} />;
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn(base, props.className)} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cn(base, "min-h-[44px] cursor-pointer appearance-none bg-white", props.className)} />;
}

export function Label({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="grid gap-1 text-sm font-medium text-[#334155]">
      {children}
    </label>
  );
}
