import type { HTMLAttributes, PropsWithChildren } from "react";

import { cn } from "@/lib/cn";

export function Card({ className, children, ...props }: PropsWithChildren<HTMLAttributes<HTMLDivElement>>) {
  return (
    <div
      className={cn(
        "rounded-[28px] border border-[#89b494]/20 bg-[linear-gradient(180deg,rgba(7,12,8,0.92),rgba(5,10,7,0.82))] p-6 shadow-glow backdrop-blur-xl",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
