"use client";

import { useState } from "react";

import { Button } from "@/components/common/button";
import { Card } from "@/components/common/card";
import { Input } from "@/components/common/input";
import { formatDateTime, formatToken } from "@/lib/format";

const TARGET_RT = 3000n;

export function SwapPanel({
  feeRate,
  reserves,
  poolStatus,
  remainingDailyGt,
  immediateLimit,
  actualPoolGt,
  actualPoolRt,
  walletGt,
  walletRt,
  onApprove,
  onSwap
}: {
  feeRate?: bigint;
  reserves?: readonly [bigint, bigint, bigint];
  poolStatus?: readonly [bigint, bigint, bigint, bigint, bigint];
  remainingDailyGt?: bigint;
  immediateLimit?: bigint;
  actualPoolGt?: bigint;
  actualPoolRt?: bigint;
  walletGt?: bigint;
  walletRt?: bigint;
  onApprove: (token: "GT" | "RT", amount: string) => Promise<unknown>;
  onSwap: (direction: "GT_TO_RT" | "RT_TO_GT", amountIn: string, minOut: string) => Promise<unknown>;
}) {
  const [direction, setDirection] = useState<"GT_TO_RT" | "RT_TO_GT">("GT_TO_RT");
  const [amountIn, setAmountIn] = useState("");
  const [minOut, setMinOut] = useState("0");
  const [busy, setBusy] = useState<string | null>(null);
  const reserveGt = poolStatus?.[0] ?? reserves?.[0] ?? 0n;
  const reserveRt = poolStatus?.[1] ?? reserves?.[1] ?? 0n;
  const bufferRt = poolStatus?.[2] ?? 0n;
  const poolK = poolStatus?.[3] ?? reserves?.[2] ?? 0n;
  const lastInjectTime = poolStatus?.[4];
  const actualGt = actualPoolGt ?? 0n;
  const actualRt = actualPoolRt ?? 0n;
  const actualK = actualGt * actualRt;
  const derivedFeeRate =
    actualRt * 100n > TARGET_RT * 80n ? 10n :
    actualRt * 100n >= TARGET_RT * 60n ? 30n :
    actualRt * 100n >= TARGET_RT * 40n ? 70n :
    actualRt > 0n ? 150n :
    0n;
  const gtDifference = (actualPoolGt ?? 0n) - reserveGt;
  const rtDifference = (actualPoolRt ?? 0n) - reserveRt;

  return (
    <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <Card>
        <div className="flex gap-2">
          <Button variant={direction === "GT_TO_RT" ? "primary" : "secondary"} onClick={() => setDirection("GT_TO_RT")}>
            GT to RT
          </Button>
          <Button variant={direction === "RT_TO_GT" ? "primary" : "secondary"} onClick={() => setDirection("RT_TO_GT")}>
            RT to GT
          </Button>
        </div>
        <h1 className="mt-8 font-serif text-4xl text-white">Swap Tokens</h1>
        <p className="mt-3 text-white/60">
          Keep slippage-friendly inputs in place. Success only counts after receipt confirmation, not on tx hash.
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
            <p className="text-xs uppercase tracking-[0.18em] text-white/40">Your GT balance</p>
            <p className="mt-2 font-serif text-3xl text-white">{formatToken(walletGt)}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
            <p className="text-xs uppercase tracking-[0.18em] text-white/40">Your RT balance</p>
            <p className="mt-2 font-serif text-3xl text-white">{formatToken(walletRt)}</p>
          </div>
        </div>
        <div className="mt-6 space-y-4">
          <Input value={amountIn} onChange={(event) => setAmountIn(event.target.value)} placeholder="Amount in" />
          <Input value={minOut} onChange={(event) => setMinOut(event.target.value)} placeholder="Minimum out" />
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button
            variant="secondary"
            onClick={async () => {
              setBusy("approve");
              try {
                await onApprove(direction === "GT_TO_RT" ? "GT" : "RT", amountIn);
              } finally {
                setBusy(null);
              }
            }}
          >
            {busy === "approve" ? "Approving..." : "Approve"}
          </Button>
          <Button
            onClick={async () => {
              setBusy("swap");
              try {
                await onSwap(direction, amountIn, minOut);
              } finally {
                setBusy(null);
              }
            }}
          >
            {busy === "swap" ? "Swapping..." : "Confirm Swap"}
          </Button>
        </div>
      </Card>
      <div className="space-y-6">
        <Card>
          <h2 className="font-serif text-2xl text-white">Reserve Side</h2>
          <p className="mt-3 text-sm leading-6 text-white/55">
            This section focuses on reserve-side RT tracking only. It is separate from the live trading state of the
            AMM pool.
          </p>
          <div className="mt-5 space-y-3 text-sm text-white/65">
            <div className="flex justify-between">
              <span>Reserve RT</span>
              <span>{formatToken(reserveRt)}</span>
            </div>
            <div className="flex justify-between">
              <span>Buffer RT</span>
              <span>{formatToken(bufferRt)}</span>
            </div>
            <div className="flex justify-between">
              <span>Last inject</span>
              <span>{lastInjectTime ? formatDateTime(Number(lastInjectTime) * 1000) : "—"}</span>
            </div>
          </div>
        </Card>
        <Card>
          <h2 className="font-serif text-2xl text-white">Actual AMM Pool</h2>
          <p className="mt-3 text-sm leading-6 text-white/55">
            This section shows the real trading-side balances and pricing state used by the AMM pool view. If governance
            mints or transfers tokens directly into the AMM address, these actual balances can diverge from the reserve-only RT tracking above.
          </p>
          <div className="mt-5 space-y-3 text-sm text-white/65">
            <div className="flex justify-between">
              <span>Actual GT in AMM contract</span>
              <span>{formatToken(actualGt)}</span>
            </div>
            <div className="flex justify-between">
              <span>Actual RT in AMM contract</span>
              <span>{formatToken(actualRt)}</span>
            </div>
            <div className="flex justify-between">
              <span>Current GT ledger used by AMM</span>
              <span>{formatToken(reserveGt)}</span>
            </div>
            <div className="flex justify-between">
              <span>Current K from actual balances</span>
              <span>{formatToken(actualK)}</span>
            </div>
            <div className="flex justify-between">
              <span>Current fee from actual RT</span>
              <span>{formatToken(derivedFeeRate)} bp</span>
            </div>
            <div className="flex justify-between">
              <span>GT difference vs reserve ledger</span>
              <span>{formatToken(gtDifference)}</span>
            </div>
            <div className="flex justify-between">
              <span>RT difference vs reserve ledger</span>
              <span>{formatToken(rtDifference)}</span>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-xs leading-6 text-white/45">
              The on-chain reserve ledger still controls official AMM pricing logic. This panel derives a live view from
              the AMM contract's actual GT and RT balances so you can see the pool state change immediately when tokens
              are minted or transferred into the pool address.
            </div>
          </div>
        </Card>
        <Card>
          <h2 className="font-serif text-2xl text-white">GT Limits</h2>
          <div className="mt-5 space-y-3 text-sm text-white/65">
            <div className="flex justify-between">
              <span>Remaining daily GT</span>
              <span>{remainingDailyGt?.toString() ?? "0"}</span>
            </div>
            <div className="flex justify-between">
              <span>Immediate limit</span>
              <span>{immediateLimit?.toString() ?? "0"}</span>
            </div>
          </div>
        </Card>
        <Card>
          <h2 className="font-serif text-2xl text-white">RT Reserve Rules</h2>
          <div className="mt-5 space-y-2 text-sm text-white/65">
            <p>{">"}80% reserve ratio: 10 bp</p>
            <p>60-80%: 30 bp</p>
            <p>40-60%: 70 bp</p>
            <p>{"<"}40%: 150 bp</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
