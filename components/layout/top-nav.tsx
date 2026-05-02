"use client";

// We use this top bar for page navigation.
// It also lets users connect or disconnect MetaMask.

import Image from "next/image";
import Link from "next/link";
import { useAccount, useConnect, useDisconnect } from "wagmi";

import { useDashboardReads } from "@/hooks/use-contract-reads";
import { useProfile } from "@/hooks/use-profile";
import { APP_NAME, getLevelMeta } from "@/lib/constants";
import { formatAddress } from "@/lib/format";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/submit", label: "Activity" },
  { href: "/swap", label: "Swap" },
  { href: "/rewards", label: "Rewards" },
  { href: "/my-redemptions", label: "Redemptions" },
  { href: "/verifier", label: "Verifier" },
  { href: "/committees", label: "Committees" },
  { href: "/governance", label: "Governance" },
  { href: "/profile", label: "Profile" }
];

export function TopNav() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { profile } = useProfile(address);
  const dashboardReads = useDashboardReads(address);

  const metaMaskConnector = connectors[0];
  const tier = Number(dashboardReads.data?.[0]?.result ?? 0);
  const levelMeta = getLevelMeta(tier);

  // We show the user name, level, and wallet address when connected.
  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-[linear-gradient(180deg,rgba(1,4,2,0.92),rgba(1,4,2,0.56))] backdrop-blur-2xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
        <Link href="/" className="flex items-center gap-4">
          <div className="relative h-16 w-16 overflow-visible sm:h-[4.5rem] sm:w-[4.5rem]">
            <Image
              src="/campusswap-logo.svg"
              alt="CampusSwap logo"
              fill
              sizes="72px"
              className="object-contain"
              priority
            />
          </div>
          <div>
            <p className="font-serif text-[1.35rem] leading-none text-white">{APP_NAME}</p>
            <p className="mt-1 text-[11px] uppercase tracking-[0.28em] text-white/34">Sustainable Campus Protocol</p>
          </div>
        </Link>
        <nav className="hidden items-center gap-6 lg:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="px-1 py-2 text-sm text-white/65 transition hover:text-white"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          {isConnected ? (
            <>
              <div className="min-w-[150px] text-right">
                <p className="text-sm leading-5 text-white/92">{profile?.full_name ?? "Connected wallet"}</p>
                <p className="mt-1 text-xs text-white/50">{levelMeta.shortLabel}</p>
                <p className="mt-1 text-xs text-white/42">{formatAddress(address)}</p>
              </div>
              <button
                type="button"
                onClick={() => disconnect()}
                className="rounded-full border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] px-4 py-2 text-sm text-white/75 transition hover:-translate-y-0.5 hover:border-white/20 hover:text-white"
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
              className="rounded-full border border-emerald-300/22 bg-[linear-gradient(180deg,rgba(126,182,141,0.16),rgba(126,182,141,0.06))] px-5 py-2 text-sm font-medium text-emerald-50 shadow-[0_0_16px_rgba(120,200,140,0.10)] transition hover:-translate-y-0.5 hover:border-emerald-200/34 hover:bg-emerald-200/12 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? "Connecting MetaMask..." : "Connect MetaMask"}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
