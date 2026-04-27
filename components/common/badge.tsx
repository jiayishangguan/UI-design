// The Badge component is a reusable UI element that displays a small badge with different tones (default, success, warning, danger) based on the props passed to it. It uses the cn utility function to conditionally apply CSS classes for styling the badge according to the specified tone. The component accepts children as its content, allowing it to display any text or elements passed to it within the badge.
import type { PropsWithChildren } from "react";

import { cn } from "@/lib/cn";

export function Badge({
  children,
  tone = "default"
}: PropsWithChildren<{ tone?: "default" | "success" | "warning" | "danger" }>) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full border px-3 py-1 text-center text-xs uppercase leading-none tracking-[0.18em]",
        tone === "default" && "border-white/10 bg-white/5 text-white/70",
        tone === "success" && "border-emerald-300/20 bg-emerald-400/10 text-emerald-100",
        tone === "warning" && "border-amber-300/20 bg-amber-400/10 text-amber-100",
        tone === "danger" && "border-red-300/20 bg-red-400/10 text-red-100"
      )}
    >
      {children}
    </span>
  );
}
