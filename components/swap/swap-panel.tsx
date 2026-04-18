"use client";

import { useState } from "react";

import { Button } from "@/components/common/button";
import { Card } from "@/components/common/card";
import { Input } from "@/components/common/input";

export function SwapPanel({
  feeRate,
  reserves,
  remainingDailyGt,
  immediateLimit,
  onApprove,
  onSwap
}: {
  feeRate?: bigint;
  reserves?: readonly [bigint, bigint, bigint];
  remainingDailyGt?: bigint;
  immediateLimit?: bigint;
  onApprove: (token: "GT" | "RT", amount: string) => Promise<unknown>;
  onSwap: (direction: "GT_TO_RT" | "RT_TO_GT", amountIn: string, minOut: string) => Promise<unknown>;
}) {
  const [direction, setDirection] = useState<"GT_TO_RT" | "RT_TO_GT">("GT_TO_RT");
  const [amountIn, setAmountIn] = useState("");
  const [minOut, setMinOut] = useState("0");
  const [busy, setBusy] = useState<string | null>(null);

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
          <h2 className="font-serif text-2xl text-white">Pool Status</h2>
          <div className="mt-5 space-y-3 text-sm text-white/65">
            <div className="flex justify-between">
              <span>Reserve GT</span>
              <span>{reserves?.[0]?.toString() ?? "0"}</span>
            </div>
            <div className="flex justify-between">
              <span>Reserve RT</span>
              <span>{reserves?.[1]?.toString() ?? "0"}</span>
            </div>
            <div className="flex justify-between">
              <span>Current fee</span>
              <span>{feeRate?.toString() ?? "0"} bp</span>
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
