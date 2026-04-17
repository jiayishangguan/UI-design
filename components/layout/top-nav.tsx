"use client";

import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";

import { APP_NAME } from "@/lib/constants";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/submit", label: "Activity" },
  { href: "/swap", label: "Swap" },
  { href: "/rewards", label: "Rewards" },
  { href: "/verifier", label: "Verifier" },
  { href: "/governance", label: "Governance" },
  { href: "/profile", label: "Profile" }
];

export function TopNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-black/20 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-emerald-300/20 bg-emerald-400/10 text-lg font-semibold text-emerald-100">
            C
          </div>
          <div>
            <p className="font-serif text-lg text-white">{APP_NAME}</p>
            <p className="text-xs uppercase tracking-[0.18em] text-white/40">Sustainable Campus Protocol</p>
          </div>
        </Link>
        <nav className="hidden items-center gap-5 lg:flex">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="text-sm text-white/65 transition hover:text-white">
              {link.label}
            </Link>
          ))}
        </nav>
        <ConnectButton showBalance={false} />
      </div>
    </header>
  );
}
