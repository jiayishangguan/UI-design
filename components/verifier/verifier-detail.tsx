"use client";

import Image from "next/image";
import { useMemo, useState } from "react";

import { Button } from "@/components/common/button";
import { Card } from "@/components/common/card";
import { GOVERNANCE_PHASE_DETAILS, GOVERNANCE_PHASE_LABELS, TASK_COOLDOWN_SECONDS, TASK_VOTING_WINDOW_SECONDS } from "@/lib/constants";
import { formatRelativeCountdown } from "@/lib/format";
import { getIpfsGatewayUrl } from "@/lib/ipfs";

export function VerifierDetail({
  task,
  mirroredTask,
  phaseId,
  isCommitteeMember,
  isActiveVerifier,
  isAssigned,
  hasVoted,
  slotVotes,
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
  mirroredTask?: {
    title: string | null;
    description: string | null;
    location: string | null;
    activity_date: string | null;
    proof_cid: string;
  } | null;
  phaseId: number;
  isCommitteeMember: boolean;
  isActiveVerifier: boolean;
  isAssigned: boolean;
  hasVoted: boolean;
  slotVotes: Array<{
    verifier: string;
    hasVoted: boolean;
    isCurrentWallet: boolean;
  }>;
  actionError?: string | null;
  onVote: (approve: boolean) => Promise<unknown>;
  onFinalize: () => Promise<unknown>;
  onReplace: (slot: number, approve: boolean) => Promise<unknown>;
}) {
  const nowSeconds = Date.now() / 1000;
  const cooldownEnd = Number(task.timestamp) + TASK_COOLDOWN_SECONDS;
  const votingEnd = Number(task.voteDeadline);
  const phase = nowSeconds < cooldownEnd ? "Cooldown" : nowSeconds < votingEnd ? "Voting" : "Expired";
  const displayProofCID = mirroredTask?.proof_cid || task.proofCID;
  const [imageFailed, setImageFailed] = useState(false);
  const proofImageUrl = useMemo(() => getIpfsGatewayUrl(displayProofCID), [displayProofCID]);
  const voteBlockReason = hasVoted
    ? "This wallet has already voted on this task."
    : !isAssigned
      ? phaseId === 0 && isActiveVerifier && !isCommitteeMember
        ? "Phase 1 still assigns committee members as reviewers. Joining the verifier pool alone does not unlock voting on this task yet."
        : "This wallet is not one of the assigned reviewers for this task."
      : phase === "Cooldown"
        ? `Voting opens after the ${Math.floor(TASK_COOLDOWN_SECONDS / 60)}-minute cooldown.`
        : phase === "Expired"
          ? "The standard voting window has ended. Committee replacement or finalization is now available."
          : null;

  return (
    <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
      <Card>
        <h1 className="font-serif text-4xl text-white">{mirroredTask?.title || task.actionType}</h1>
        {mirroredTask?.description ? <p className="mt-3 text-white/60">{mirroredTask.description}</p> : null}
        {proofImageUrl && !imageFailed ? (
          <div className="mt-6 overflow-hidden rounded-[24px] border border-white/10 bg-black/20">
            <div className="relative aspect-[4/3] w-full">
              <Image
                src={proofImageUrl}
                alt={`Evidence for ${task.actionType}`}
                fill
                className="object-cover"
                unoptimized
                onError={() => setImageFailed(true)}
              />
            </div>
          </div>
        ) : (
          <div className="mt-6 rounded-[24px] border border-dashed border-white/10 bg-white/[0.03] px-4 py-6 text-sm text-white/45">
            Evidence image is unavailable from the current IPFS gateway.
          </div>
        )}
        <div className="mt-4 space-y-2 text-sm text-white/60">
          <p>Proof CID: {displayProofCID}</p>
          {mirroredTask?.location ? <p>Location: {mirroredTask.location}</p> : null}
          {mirroredTask?.activity_date ? <p>Activity date: {mirroredTask.activity_date}</p> : null}
          {proofImageUrl ? (
            <a
              href={proofImageUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex text-sm text-emerald-200/85 transition hover:text-emerald-100"
            >
              Open evidence image
            </a>
          ) : null}
        </div>
        <div className="mt-8 space-y-3 text-sm text-white/60">
          <p>Governance phase: {GOVERNANCE_PHASE_LABELS[phaseId] ?? GOVERNANCE_PHASE_LABELS[0]}</p>
          <p>{GOVERNANCE_PHASE_DETAILS[phaseId] ?? GOVERNANCE_PHASE_DETAILS[0]}</p>
          <p>Stage: {phase}</p>
          <p>Cooldown remaining: {phase === "Cooldown" ? formatRelativeCountdown(BigInt(cooldownEnd)) : "Complete"}</p>
          <p>Review closes in: {formatRelativeCountdown(task.voteDeadline)}</p>
          <p>Approvals / Rejections: {task.approvals.toString()} / {task.rejections.toString()}</p>
          <p>Queued GT: {task.gtQueued ? "Yes" : "No"}</p>
          <p>
            Your role:{" "}
            {isAssigned
              ? "Assigned reviewer"
              : isCommitteeMember
                ? "Committee member"
                : isActiveVerifier
                  ? "Verifier pool member"
                  : "Standard viewer"}
          </p>
        </div>
      </Card>
      <Card>
        <h2 className="font-serif text-3xl text-white">Voting Controls</h2>
        <p className="mt-3 text-white/55">
          In Phase 1, committee wallets can still review activities only when they are one of the assigned reviewer
          addresses. Voting opens after the mandatory {Math.floor(TASK_COOLDOWN_SECONDS / 60)}-minute cooldown and
          stays open for {Math.floor(TASK_VOTING_WINDOW_SECONDS / 60)} minutes.
        </p>
        {actionError ? <p className="mt-4 text-sm text-red-200">{actionError}</p> : null}
        {voteBlockReason ? <p className="mt-4 text-sm text-amber-100/85">{voteBlockReason}</p> : null}
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
        {isCommitteeMember ? (
          <div className="mt-8 space-y-3">
            {slotVotes.map((slot, index) => (
              <div key={slot.verifier} className="flex items-center justify-between rounded-2xl border border-white/10 px-4 py-3">
                <div>
                  <p className="text-sm text-white/65">Slot {index + 1}</p>
                  <p className="mt-1 text-sm text-white/75">{slot.verifier}</p>
                </div>
                <div className="flex items-center gap-3">
                  {slot.hasVoted ? (
                    <span className="text-center text-xs uppercase tracking-[0.16em] text-emerald-100/70">
                      Already voted
                    </span>
                  ) : (
                    <>
                      <span className="text-center text-xs uppercase tracking-[0.16em] text-amber-100/70">
                        Awaiting vote
                      </span>
                      <div className="flex gap-2">
                        <Button variant="ghost" disabled={phase !== "Expired"} onClick={() => onReplace(index, true)}>
                          Replace + Approve
                        </Button>
                        <Button variant="ghost" disabled={phase !== "Expired"} onClick={() => onReplace(index, false)}>
                          Replace + Reject
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : isAssigned ? (
          <p className="mt-8 text-sm text-white/50">
            Only your own verifier decision is shown here. Reviewer slot management is visible to committee wallets only.
          </p>
        ) : null}
      </Card>
    </div>
  );
}
