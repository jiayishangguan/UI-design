import type { HTMLAttributes, PropsWithChildren } from "react";

import { cn } from "@/lib/cn";

export function Card({ className, children, ...props }: PropsWithChildren<HTMLAttributes<HTMLDivElement>>) {
  return (
    <div
      className={cn(
        "panel-3d rounded-[32px] border border-[#89b494]/20 bg-[linear-gradient(180deg,rgba(7,12,8,0.95),rgba(5,10,7,0.84))] p-6 shadow-glow backdrop-blur-xl",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
