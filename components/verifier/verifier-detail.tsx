"use client";

import { Button } from "@/components/common/button";
import { Card } from "@/components/common/card";
import { GOVERNANCE_PHASE_DETAILS, GOVERNANCE_PHASE_LABELS } from "@/lib/constants";
import { formatRelativeCountdown } from "@/lib/format";

export function VerifierDetail({
  task,
  phaseId,
  isCommitteeMember,
  isAssigned,
  hasVoted,
  actionError,
  onVote,
  onFinalize,
  onReplace
}: {
  task: {
    actionType: string;
    proofCID: string;
    gtReward: bigint;
    status: number;
    approvals: bigint;
    rejections: bigint;
    timestamp: bigint;
    voteDeadline: bigint;
    gtQueued: boolean;
    gtClaimed: boolean;
    verifiers: readonly string[];
    verifierCount: number;
  };
  phaseId: number;
  isCommitteeMember: boolean;
  isAssigned: boolean;
  hasVoted: boolean;
  actionError?: string | null;
  onVote: (approve: boolean) => Promise<unknown>;
  onFinalize: () => Promise<unknown>;
  onReplace: (slot: number, approve: boolean) => Promise<unknown>;
}) {
  const nowSeconds = Date.now() / 1000;
  const cooldownEnd = Number(task.timestamp) + 24 * 60 * 60;
  const votingEnd = Number(task.voteDeadline);
  const phase = nowSeconds < cooldownEnd ? "Cooldown" : nowSeconds < votingEnd ? "Voting" : "Expired";

  return (
    <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
      <Card>
        <h1 className="font-serif text-4xl text-white">{task.actionType}</h1>
        <p className="mt-3 text-white/60">Proof CID: {task.proofCID}</p>
        <div className="mt-8 space-y-3 text-sm text-white/60">
          <p>Governance phase: {GOVERNANCE_PHASE_LABELS[phaseId] ?? GOVERNANCE_PHASE_LABELS[0]}</p>
          <p>{GOVERNANCE_PHASE_DETAILS[phaseId] ?? GOVERNANCE_PHASE_DETAILS[0]}</p>
          <p>Stage: {phase}</p>
          <p>Cooldown remaining: {phase === "Cooldown" ? formatRelativeCountdown(BigInt(cooldownEnd)) : "Complete"}</p>
          <p>Voting deadline: {formatRelativeCountdown(task.voteDeadline)}</p>
          <p>Approvals / Rejections: {task.approvals.toString()} / {task.rejections.toString()}</p>
          <p>Queued GT: {task.gtQueued ? "Yes" : "No"}</p>
          <p>Your role: {isCommitteeMember ? "Committee member" : "Standard viewer"}</p>
        </div>
      </Card>
      <Card>
        <h2 className="font-serif text-3xl text-white">Voting Controls</h2>
        <p className="mt-3 text-white/55">
          In Phase 1, committee wallets can still review activities only when they are one of the assigned reviewer
          addresses. Voting opens after the mandatory 24-hour cooldown.
        </p>
        {actionError ? <p className="mt-4 text-sm text-red-200">{actionError}</p> : null}
        <div className="mt-8 flex flex-wrap gap-3">
          <Button disabled={!isAssigned || hasVoted || phase !== "Voting"} onClick={() => onVote(true)}>
            Approve
          </Button>
          <Button variant="danger" disabled={!isAssigned || hasVoted || phase !== "Voting"} onClick={() => onVote(false)}>
            Reject
          </Button>
          <Button variant="secondary" disabled={phase !== "Expired"} onClick={onFinalize}>
            Finalize Expired
          </Button>
        </div>
        <div className="mt-8 space-y-3">
          {task.verifiers.map((verifier, index) => (
            <div key={verifier} className="flex items-center justify-between rounded-2xl border border-white/10 px-4 py-3">
              <span className="text-sm text-white/65">Slot {index + 1}: {verifier}</span>
              <div className="flex gap-2">
                <Button variant="ghost" disabled={phase !== "Expired"} onClick={() => onReplace(index, true)}>
                  Replace + Approve
                </Button>
                <Button variant="ghost" disabled={phase !== "Expired"} onClick={() => onReplace(index, false)}>
                  Replace + Reject
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
