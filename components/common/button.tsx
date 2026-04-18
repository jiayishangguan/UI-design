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
        "inline-flex items-center justify-center rounded-full border px-4 py-2 text-sm transition disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary" &&
          "border-[#7eaa89]/30 bg-[#8bb596]/10 text-[#ecf7ef] shadow-glow hover:bg-[#8bb596]/14",
        variant === "secondary" && "border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08]",
        variant === "ghost" && "border-transparent bg-transparent text-white/80 hover:bg-white/5",
        variant === "danger" && "border-red-400/20 bg-red-500/10 text-red-100 hover:bg-red-500/20",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
