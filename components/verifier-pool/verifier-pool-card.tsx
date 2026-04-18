"use client";

import { Badge } from "@/components/common/badge";
import { Button } from "@/components/common/button";
import { Card } from "@/components/common/card";
import { GOVERNANCE_PHASE_DETAILS, GOVERNANCE_PHASE_LABELS } from "@/lib/constants";

export function VerifierPoolCard({
  threshold,
  stakeAmount,
  minStake,
  phase,
  verifier,
  activeTaskCount,
  activeVerifierCount,
  committeeMembers,
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
  activeVerifierCount?: bigint;
  committeeMembers?: readonly `0x${string}`[];
  onApproveStake: () => Promise<unknown>;
  onJoin: () => Promise<unknown>;
  onLeave: () => Promise<unknown>;
}) {
  const isActive = verifier?.[6] ?? false;
  const currentPhase = phase ?? 0;
  const activeCount = Number(activeVerifierCount ?? 0n);
  const nextPhaseMessage =
    activeCount >= 10
      ? "Phase 3 is active. The verifier pool alone now handles review assignment."
      : activeCount >= 5
        ? `Phase 2 is active. Add ${10 - activeCount} more active verifier${10 - activeCount === 1 ? "" : "s"} to reach Phase 3.`
        : `Phase 1 is active. Add ${5 - activeCount} more active verifier${5 - activeCount === 1 ? "" : "s"} to unlock Phase 2.`;

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
      <div className="mt-6 rounded-3xl border border-emerald-400/20 bg-emerald-400/[0.05] p-5">
        <p className="text-xs uppercase tracking-[0.2em] text-emerald-100/55">Phase logic from the contract</p>
        <p className="mt-3 text-sm leading-7 text-white/70">{GOVERNANCE_PHASE_DETAILS[currentPhase] ?? GOVERNANCE_PHASE_DETAILS[0]}</p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
            <p className="text-xs uppercase tracking-[0.18em] text-white/40">Active verifiers</p>
            <p className="mt-2 font-serif text-3xl text-white">{activeCount}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
            <p className="text-xs uppercase tracking-[0.18em] text-white/40">Committee members</p>
            <p className="mt-2 font-serif text-3xl text-white">{committeeMembers?.length ?? 0}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
            <p className="text-xs uppercase tracking-[0.18em] text-white/40">Your verifier status</p>
            <p className="mt-2 font-serif text-3xl text-white">{isActive ? "Joined" : "Not joined"}</p>
          </div>
        </div>
        <p className="mt-4 text-sm leading-7 text-white/60">{nextPhaseMessage}</p>
        <p className="mt-3 text-sm leading-7 text-white/45">
          Contract rule: only active verifier-pool members count toward phase upgrades. Committee size does not increase
          the phase threshold directly, but committee wallets are used as the review pool during Phase 1.
        </p>
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
