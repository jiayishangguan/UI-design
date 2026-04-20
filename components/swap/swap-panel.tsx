"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/common/button";
import { Card } from "@/components/common/card";
import { Input } from "@/components/common/input";
import {
  BUFFER_INJECTION_TRIGGER_RT,
  BUFFER_TARGET_RT,
  TARGET_RT,
  formatThreeDecimals,
  getDynamicFee,
  getEstimatedOutput,
  getSwapExplanation,
  parseSwapAmount,
  shouldTriggerBufferInjection
} from "@/lib/swap";

function StackedPoolValue({ value }: { value: string }) {
  const [whole = "0", decimal = "000"] = value.split(".");

  return (
    <div aria-label={value} className="mt-3 flex items-baseline">
      <span className="font-serif text-4xl leading-[0.92] tracking-[-0.03em] text-white">{whole}</span>
      <span className="ml-0.5 text-[0.92rem] leading-none tracking-[0.08em] text-white/56">.{decimal}</span>
    </div>
  );
}

export function SwapPanel({
  reserves,
  poolStatus,
  remainingDailyGt,
  immediateLimit,
  walletGt,
  walletRt,
  onApprove,
  onSwap
}: {
  reserves?: readonly [bigint, bigint, bigint];
  poolStatus?: readonly [bigint, bigint, bigint, bigint, bigint];
  remainingDailyGt?: bigint;
  immediateLimit?: bigint;
  walletGt?: bigint;
  walletRt?: bigint;
  onApprove: (token: "GT" | "RT", amount: string) => Promise<unknown>;
  onSwap: (direction: "GT_TO_RT" | "RT_TO_GT", amountIn: string, minOut: string) => Promise<unknown>;
}) {
  const [direction, setDirection] = useState<"GT_TO_RT" | "RT_TO_GT">("GT_TO_RT");
  const [amountIn, setAmountIn] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const bufferRt = poolStatus?.[2] ?? 0n;
  const liveReserveGt = reserves?.[0] ?? 0n;
  const liveReserveRt = reserves?.[1] ?? 0n;
  const parsedAmountIn = useMemo(() => parseSwapAmount(amountIn), [amountIn]);
  const estimate = useMemo(
    () => getEstimatedOutput(parsedAmountIn ?? 0n, direction, liveReserveGt, liveReserveRt, bufferRt),
    [bufferRt, direction, liveReserveGt, liveReserveRt, parsedAmountIn]
  );
  const liveFeeRate = getDynamicFee(liveReserveRt);
  const outputTokenSymbol = direction === "GT_TO_RT" ? "RT" : "GT";
  const liveReserveGtDisplay = formatThreeDecimals(liveReserveGt);
  const liveReserveRtDisplay = formatThreeDecimals(liveReserveRt);
  const swapExplanation = getSwapExplanation({
    direction,
    amountIn: parsedAmountIn,
    reserveGt: estimate.effectiveReserveGt,
    reserveRt: estimate.effectiveReserveRt,
    feeRate: estimate.feeRate,
    injectedRt: estimate.injectedRt
  });
  const bufferTriggerReached = shouldTriggerBufferInjection(liveReserveRt);

  return (
    <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <Card className="relative overflow-hidden">
        <div className="glass-orb animate-drift -left-8 top-10 h-32 w-32" />
        <div className="glass-orb animate-pulse-soft bottom-6 right-10 h-24 w-24" />
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
          <div className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_18px_40px_rgba(0,0,0,0.2)]">
            <p className="text-xs uppercase tracking-[0.18em] text-white/40">Your GT balance</p>
            <p className="mt-2 font-serif text-3xl text-white">{formatThreeDecimals(walletGt ?? 0n)}</p>
          </div>
          <div className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_18px_40px_rgba(0,0,0,0.2)]">
            <p className="text-xs uppercase tracking-[0.18em] text-white/40">Your RT balance</p>
            <p className="mt-2 font-serif text-3xl text-white">{formatThreeDecimals(walletRt ?? 0n)}</p>
          </div>
        </div>
        <div className="mt-6 space-y-4">
          <Input value={amountIn} onChange={(event) => setAmountIn(event.target.value)} placeholder="Amount in" />
          <div className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_18px_40px_rgba(0,0,0,0.2)]">
            <p className="text-xs uppercase tracking-[0.18em] text-white/40">You will receive</p>
            <p className="mt-2 font-serif text-3xl text-white">
              {formatThreeDecimals(estimate.amountOut)} {outputTokenSymbol}
            </p>
          </div>
          <p className="px-1 text-sm leading-6 text-white/45">{swapExplanation}</p>
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
                await onSwap(direction, amountIn, "0");
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
        <Card className="relative overflow-hidden">
          <div className="pointer-events-none absolute left-0 top-0 h-24 w-24 rounded-full bg-sky-300/10 blur-2xl" />
          <div className="pointer-events-none absolute bottom-0 right-10 h-20 w-20 rounded-full bg-emerald-300/10 blur-2xl" />
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-serif text-2xl text-white">AMM Pool</h2>
              <p className="mt-3 max-w-xl text-sm leading-7 text-white/55">
                This is the live trading pool view. It shows the GT and RT visible to swaps and the fee that updates
                from the current RT reserve only. Locked buffer RT is kept separate until the trigger level is reached.
              </p>
            </div>
            <div className="rounded-full border border-sky-300/15 bg-sky-300/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-sky-100/80">
              Live Trading
            </div>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] px-5 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_16px_36px_rgba(0,0,0,0.2)]">
              <p className="text-xs uppercase tracking-[0.18em] text-white/40">AMM GT</p>
              <StackedPoolValue value={liveReserveGtDisplay} />
              <p className="mt-3 text-sm text-white/45">GreenToken currently visible in the live AMM pool.</p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] px-5 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_16px_36px_rgba(0,0,0,0.2)]">
              <p className="text-xs uppercase tracking-[0.18em] text-white/40">AMM RT</p>
              <StackedPoolValue value={liveReserveRtDisplay} />
              <p className="mt-3 text-sm text-white/45">RewardToken currently visible on the tradable AMM side only.</p>
            </div>
            <div className="rounded-[24px] border border-emerald-300/15 bg-[linear-gradient(180deg,rgba(122,255,172,0.08),rgba(255,255,255,0.02))] px-5 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_16px_36px_rgba(0,0,0,0.2)]">
              <p className="text-xs uppercase tracking-[0.18em] text-white/40">Current fee</p>
              <p className="mt-3 font-serif text-4xl text-white">{liveFeeRate.toString()} bp</p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/8">
                <div
                  className="h-full rounded-full bg-[linear-gradient(90deg,rgba(118,255,170,0.85),rgba(120,209,255,0.85))] transition-all duration-700"
                  style={{ width: `${(Math.min(Number(liveFeeRate), 150) / 150) * 100}%` }}
                />
              </div>
              <p className="mt-2 text-sm text-white/45">Updates automatically from the current RT state.</p>
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="font-serif text-2xl text-white">GT Limits</h2>
          <div className="mt-5 space-y-3 text-sm text-white/65">
            <div className="flex justify-between">
              <span>Remaining daily GT</span>
              <span>{formatThreeDecimals(remainingDailyGt ?? 0n)}</span>
            </div>
            <div className="flex justify-between">
              <span>Immediate limit</span>
              <span>{formatThreeDecimals(immediateLimit ?? 0n)}</span>
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
            <p className="pt-2 text-white/45">
              Buffer support stays locked until live AMM RT reaches {formatThreeDecimals(BUFFER_INJECTION_TRIGGER_RT)} RT, then reserve support can inject toward the {formatThreeDecimals(TARGET_RT)} RT target.
            </p>
          </div>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="pointer-events-none absolute -top-10 right-0 h-28 w-28 rounded-full bg-emerald-400/10 blur-2xl" />
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-serif text-2xl text-white">Buffer Pool</h2>
              <p className="mt-3 max-w-xl text-sm leading-7 text-white/55">
                The buffer pool is locked reserve-support RT. It is separate from the live AMM trading side and only
                injects into the AMM reserve when live RT reaches the trigger threshold.
              </p>
            </div>
            <div className="rounded-full border border-emerald-300/15 bg-emerald-300/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-emerald-100/80">
              Locked Support
            </div>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-[1fr_0.8fr]">
            <div className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] px-5 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_16px_36px_rgba(0,0,0,0.2)]">
              <p className="text-xs uppercase tracking-[0.18em] text-white/40">Buffer RT</p>
              <p className="mt-3 font-serif text-4xl text-white">{formatThreeDecimals(bufferRt)}</p>
              <p className="mt-3 text-sm leading-6 text-white/45">
                Locked reserve support held outside the tradable AMM balance. Buffer capacity targets {formatThreeDecimals(BUFFER_TARGET_RT)} RT.
              </p>
            </div>
            <div className="grid gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
                <p className="text-xs uppercase tracking-[0.18em] text-white/40">Trigger</p>
                <p className="mt-2 text-sm leading-6 text-white/65">
                  Support activates only when live AMM RT falls to {formatThreeDecimals(BUFFER_INJECTION_TRIGGER_RT)} RT.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
                <p className="text-xs uppercase tracking-[0.18em] text-white/40">Current state</p>
                <p className="mt-2 text-sm leading-6 text-white/65">
                  {bufferTriggerReached
                    ? "Trigger reached. The next GT to RT pricing path can draw reserve support from the locked buffer."
                    : "Locked and untouched. Buffer RT is not counted inside the live AMM trading pool before the trigger."}
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
