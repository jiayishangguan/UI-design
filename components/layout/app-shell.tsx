import type { PropsWithChildren } from "react";

import { TopNav } from "@/components/layout/top-nav";

export function AppShell({ children }: PropsWithChildren) {
  return (
    <div className="min-h-screen">
      <TopNav />
      <main className="mx-auto max-w-7xl px-6 py-10">{children}</main>
    </div>
  );
}
