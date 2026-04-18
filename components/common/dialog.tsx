import type { PropsWithChildren } from "react";

import { cn } from "@/lib/cn";

export function Dialog({
  open,
  title,
  description,
  children
}: PropsWithChildren<{
  open: boolean;
  title: string;
  description?: string;
}>) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className={cn("w-full max-w-xl rounded-[32px] border border-white/10 bg-[#07110a] p-8 shadow-glow")}>
        <h2 className="font-serif text-3xl text-white">{title}</h2>
        {description ? <p className="mt-3 text-sm text-white/60">{description}</p> : null}
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}
