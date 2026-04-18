import type { ButtonHTMLAttributes, PropsWithChildren } from "react";

import { cn } from "@/lib/cn";

type Props = PropsWithChildren<
  ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "primary" | "secondary" | "ghost" | "danger";
  }
>;

export function Button({ className, variant = "primary", children, ...props }: Props) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-full border px-4 py-2 text-sm transition duration-300 disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary" &&
          "border-[#7eaa89]/24 bg-[linear-gradient(180deg,rgba(139,181,150,0.16),rgba(139,181,150,0.06))] text-[#ecf7ef] shadow-[0_0_16px_rgba(111,191,136,0.10)] hover:-translate-y-0.5 hover:bg-[linear-gradient(180deg,rgba(139,181,150,0.2),rgba(139,181,150,0.08))]",
        variant === "secondary" && "border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] text-white shadow-[0_0_10px_rgba(255,255,255,0.03)] hover:-translate-y-0.5 hover:bg-white/[0.08]",
        variant === "ghost" && "border-transparent bg-transparent text-white/80 hover:bg-white/5",
        variant === "danger" && "border-red-400/20 bg-red-500/10 text-red-100 shadow-[0_0_12px_rgba(239,68,68,0.08)] hover:-translate-y-0.5 hover:bg-red-500/20",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
