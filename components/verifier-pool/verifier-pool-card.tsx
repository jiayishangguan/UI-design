"use client";

import { Badge } from "@/components/common/badge";
import { Button } from "@/components/common/button";
import { Card } from "@/components/common/card";
import { GOVERNANCE_PHASE_LABELS } from "@/lib/constants";

export function VerifierPoolCard({
  threshold,
  stakeAmount,
  minStake,
  phase,
  verifier,
  activeTaskCount,
  onApproveStake,
  onJoin,
  onLeave
}: {
  threshold?: bigint;
  stakeAmount?: bigint;
  minStake?: bigint;
  phase?: number;
  verifier?: readonly [bigint, bigint, bigint, bigint, bigint, bigint, boolean];
  activeTaskCount?: bigint;
  onApproveStake: () => Promise<unknown>;
  onJoin: () => Promise<unknown>;
  onLeave: () => Promise<unknown>;
}) {
  const isActive = verifier?.[6] ?? false;

  return (
    <Card className="max-w-4xl">
      <h1 className="font-serif text-4xl text-white">Verifier Pool</h1>
      <p className="mt-3 text-white/55">
        Profile is mandatory here. Joining requires GT balance threshold plus approve of the 100 GT stake.
      </p>
      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-sm text-white/50">Threshold</p>
          <p className="mt-3 font-serif text-3xl text-white">{threshold?.toString() ?? "—"} GT</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-sm text-white/50">Stake Amount</p>
          <p className="mt-3 font-serif text-3xl text-white">{stakeAmount?.toString() ?? "—"} GT</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-sm text-white/50">Auto-removal floor</p>
          <p className="mt-3 font-serif text-3xl text-white">{minStake?.toString() ?? "—"} GT</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-sm text-white/50">Governance phase</p>
          <p className="mt-3 font-serif text-3xl text-white">{phase !== undefined ? GOVERNANCE_PHASE_LABELS[phase] : "—"}</p>
        </div>
      </div>
      <div className="mt-8 flex items-center gap-3">
        <Badge tone={isActive ? "success" : "warning"}>{isActive ? "Active verifier" : "Not joined"}</Badge>
        <span className="text-sm text-white/55">Active tasks: {activeTaskCount?.toString() ?? "0"}</span>
      </div>
      <div className="mt-8 flex flex-wrap gap-3">
        <Button variant="secondary" onClick={onApproveStake}>
          Approve 100 GT
        </Button>
        <Button onClick={onJoin}>Join Pool</Button>
        <Button variant="ghost" onClick={onLeave}>
          Leave Pool
        </Button>
      </div>
    </Card>
  );
}
