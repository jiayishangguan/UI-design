"use client";

import Link from "next/link";
import { useAccount, useConnect, useDisconnect } from "wagmi";

import { APP_NAME } from "@/lib/constants";
import { formatAddress } from "@/lib/format";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/submit", label: "Activity" },
  { href: "/swap", label: "Swap" },
  { href: "/rewards", label: "Rewards" },
  { href: "/verifier", label: "Verifier" },
  { href: "/committees", label: "Committees" },
  { href: "/governance", label: "Governance" },
  { href: "/profile", label: "Profile" }
];

export function TopNav() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  const metaMaskConnector = connectors[0];

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
        <div className="flex items-center gap-3">
          {isConnected ? (
            <>
              <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80">
                {formatAddress(address)}
              </div>
              <button
                type="button"
                onClick={() => disconnect()}
                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/75 transition hover:border-white/20 hover:text-white"
              >
                Disconnect
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => {
                if (metaMaskConnector) connect({ connector: metaMaskConnector });
              }}
              disabled={!metaMaskConnector || isPending}
              className="rounded-full border border-emerald-300/25 bg-emerald-300/10 px-5 py-2 text-sm font-medium text-emerald-50 shadow-[0_0_30px_rgba(120,200,140,0.18)] transition hover:border-emerald-200/40 hover:bg-emerald-200/15 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? "Connecting MetaMask..." : "Connect MetaMask"}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
