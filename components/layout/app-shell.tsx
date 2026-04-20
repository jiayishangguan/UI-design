// The AppShell component serves as the main layout wrapper for the application, providing a consistent structure across different pages. It includes a top navigation bar and a main content area where child components can be rendered. The component ensures that the application has a cohesive design and user experience by maintaining a uniform layout throughout the app. The top navigation bar typically contains links to key sections of the application, while the main content area is designed to be flexible and accommodate various types of content depending on the specific page being displayed.
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
