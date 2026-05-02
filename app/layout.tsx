import type { Metadata } from "next";

import { EnvBanner } from "@/components/layout/env-banner";
import { AppShell } from "@/components/layout/app-shell";

import { Providers } from "./providers";
import "./globals.css";

// We use this layout as the main wrapper for the whole app. It adds shared providers, the app shell, and global styles.

export const metadata: Metadata = {
  title: "CampusSwap",
  description: "Campus sustainability dashboard for GT/RT, verifier flows, rewards and governance."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <EnvBanner />
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
