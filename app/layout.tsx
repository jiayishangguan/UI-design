import type { Metadata } from "next";

import { EnvBanner } from "@/components/layout/env-banner";
import { AppShell } from "@/components/layout/app-shell";

import { Providers } from "./providers";
import "./globals.css";

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
