"use client";
// The VerifierPoolCard component provides an interface for users to view information about the verifier pool and to join or leave the pool. It displays key metrics such as the current threshold for joining, the user's stake amount, the minimum stake required to avoid auto-removal, and the current governance phase. The component also shows the number of active verifiers and committee members, as well as the user's current status in the verifier pool. Users can interact with the component to approve their stake, join the pool, or leave the pool, with appropriate feedback based on their actions and the current state of the verifier pool.
import { Badge } from "@/components/common/badge";
import { Button } from "@/components/common/button";
import { Card } from "@/components/common/card";
import { GOVERNANCE_PHASE_DETAILS, GOVERNANCE_PHASE_LABELS } from "@/lib/constants";
import { formatDisplayToken, formatToken } from "@/lib/format";
import { CheckCircle2, DoorOpen, ShieldCheck, WalletCards } from "lucide-react";
// The component receives various props related to the verifier pool, such as the current threshold for joining, the user's stake amount, the minimum stake required to avoid auto-removal, the current governance phase, the user's verifier status, the number of active tasks and verifiers, and the list of committee members. It also receives callback functions for approving the stake, joining the pool, and leaving the pool.
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
  const activeTaskLabel = formatDisplayToken(Number(activeTaskCount ?? 0n), 0);
  const joinStakeLabel = stakeAmount !== undefined ? `${formatToken(stakeAmount)} GT` : "the required GT stake";
  const nextStepMessage = isActive
    ? activeTaskCount && activeTaskCount > 0n
      ? `You're in the pool. You currently have ${activeTaskLabel} active review task${activeTaskLabel === "1" ? "" : "s"}.`
      : "You're in the pool. New review tasks will appear below when they are assigned to you."
    : `To join, approve ${joinStakeLabel} first, then click Join verifier pool.`;
  const nextPhaseMessage =
    activeCount >= 10
      ? "The verifier pool is fully active. Reviews are now assigned to active verifiers."
      : activeCount >= 5
        ? `${10 - activeCount} more active verifier${10 - activeCount === 1 ? "" : "s"} will unlock the final review mode.`
        : `${5 - activeCount} more active verifier${5 - activeCount === 1 ? "" : "s"} will unlock a larger review pool.`;
// The component uses the received props to display relevant information about the verifier pool and the user's status, as well as to manage the state of the join and leave actions. It also provides feedback on the current phase of governance and what is required to reach the next phase, encouraging users to join the verifier pool to advance the governance process.
  return (
    <Card>
      <h1 className="font-serif text-4xl text-white">Become a Verifier</h1>
      <p className="mt-3 text-white/55">
        Help review campus activities and keep rewards fair. You will need a profile, enough GT to qualify, and a small
        stake approved from your wallet before joining.
      </p>
      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-sm text-white/50">GT needed to qualify</p>
          <p className="mt-3 font-serif text-3xl text-white">{threshold !== undefined ? formatToken(threshold) : "—"} GT</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-sm text-white/50">Stake to join</p>
          <p className="mt-3 font-serif text-3xl text-white">{stakeAmount !== undefined ? formatToken(stakeAmount) : "—"} GT</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-sm text-white/50">Keep at least</p>
          <p className="mt-3 font-serif text-3xl text-white">{minStake !== undefined ? formatToken(minStake) : "—"} GT</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-sm text-white/50">Review mode</p>
          <p className="mt-3 font-serif text-3xl text-white">{phase !== undefined ? GOVERNANCE_PHASE_LABELS[phase] : "—"}</p>
        </div>
      </div>
      <div className="mt-6 rounded-3xl border border-emerald-400/20 bg-emerald-400/[0.05] p-5">
        <p className="text-xs uppercase tracking-[0.2em] text-emerald-100/55">How reviews work right now</p>
        <p className="mt-3 text-sm leading-7 text-white/70">{GOVERNANCE_PHASE_DETAILS[currentPhase] ?? GOVERNANCE_PHASE_DETAILS[0]}</p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
            <p className="text-xs uppercase tracking-[0.18em] text-white/40">Active verifiers</p>
            <p className="mt-2 font-serif text-3xl text-white">{formatDisplayToken(activeCount, 0)}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
            <p className="text-xs uppercase tracking-[0.18em] text-white/40">Committee backup</p>
            <p className="mt-2 font-serif text-3xl text-white">{formatDisplayToken(committeeMembers?.length ?? 0, 0)}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
            <p className="text-xs uppercase tracking-[0.18em] text-white/40">Your status</p>
            <p className="mt-2 font-serif text-3xl text-white">{isActive ? "Joined" : "Not joined"}</p>
          </div>
        </div>
        <p className="mt-4 text-sm leading-7 text-white/60">{nextPhaseMessage}</p>
        <p className="mt-3 text-sm leading-7 text-white/45">
          Only active verifier-pool members count toward review mode upgrades. In the earliest mode, committee members
          can help cover reviews while the verifier pool grows.
        </p>
      </div>
      <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <Badge tone={isActive ? "success" : "warning"}>{isActive ? "Active verifier" : "Not joined yet"}</Badge>
            <span className="text-sm text-white/55">Active tasks: {activeTaskLabel}</span>
          </div>
          <p className="text-sm text-white/65">{nextStepMessage}</p>
        </div>
      </div>
      <div className="mt-8 flex flex-wrap gap-3">
        <Button variant="secondary" onClick={onApproveStake}>
          <WalletCards className="mr-2 h-4 w-4" aria-hidden="true" />
          Approve stake
        </Button>
        <Button onClick={onJoin} disabled={isActive}>
          <ShieldCheck className="mr-2 h-4 w-4" aria-hidden="true" />
          Join verifier pool
        </Button>
        <Button variant="ghost" onClick={onLeave} disabled={!isActive}>
          {isActive ? <DoorOpen className="mr-2 h-4 w-4" aria-hidden="true" /> : <CheckCircle2 className="mr-2 h-4 w-4" aria-hidden="true" />}
          Leave pool
        </Button>
      </div>
    </Card>
  );
}
