"use client";

import Link from "next/link";

import type { TaskRecord } from "@/types/database";

import { GOVERNANCE_PHASE_DETAILS, GOVERNANCE_PHASE_LABELS } from "@/lib/constants";

import { Badge } from "@/components/common/badge";
import { Card } from "@/components/common/card";
import { EmptyState } from "@/components/common/empty-state";

type VerifierQueueItem = TaskRecord & {
  isAssigned?: boolean;
  displayStatus?: "submitted" | "approved" | "rejected" | "cooldown" | "voting" | "expired";
};

export function VerifierList({
  tasks,
  phase,
  isCommitteeMember,
  isActiveVerifier
}: {
  tasks: VerifierQueueItem[];
  phase?: number;
  isCommitteeMember?: boolean;
  isActiveVerifier?: boolean;
}) {
  if (!tasks.length) {
    return (
      <EmptyState
        title="No review tasks"
        description="There are no active on-chain tasks in the verifier queue right now."
      />
    );
  }

  return (
    <Card>
      <h1 className="font-serif text-4xl text-white">Verifier Queue</h1>
      <p className="mt-3 max-w-2xl text-white/55">
        Voting controls only appear on detail pages for assigned verifiers, and duplicate vote UI is blocked by hasVoted.
      </p>
      <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 text-sm text-white/60">
        <p className="text-white">{GOVERNANCE_PHASE_LABELS[phase ?? 0] ?? GOVERNANCE_PHASE_LABELS[0]}</p>
        <p className="mt-2">{GOVERNANCE_PHASE_DETAILS[phase ?? 0] ?? GOVERNANCE_PHASE_DETAILS[0]}</p>
        {phase === 0 && isActiveVerifier && !isCommitteeMember ? (
          <p className="mt-3 text-amber-100/85">
            Your wallet is in the verifier pool, but Phase 1 still assigns committee members as reviewers until more
            active verifiers join.
          </p>
        ) : null}
      </div>
      <div className="mt-8 space-y-4">
        {tasks.map((task) => (
          <Link
            key={task.id}
            href={`/verifier/${task.on_chain_task_id}`}
            className="grid gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 transition hover:border-emerald-300/20"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-white">{task.title || task.action_type}</p>
                <p className="mt-1 text-sm text-white/50">{task.submitter_address}</p>
                <p className={`mt-2 text-xs uppercase tracking-[0.16em] ${task.isAssigned ? "text-red-300" : "text-white/35"}`}>
                  {task.isAssigned ? "Assigned to you" : "Not assigned to this wallet"}
                </p>
              </div>
              <Badge
                tone={
                  task.displayStatus === "approved"
                    ? "success"
                    : task.displayStatus === "rejected" || task.displayStatus === "expired"
                      ? "danger"
                      : "warning"
                }
              >
                {task.displayStatus ?? task.status}
              </Badge>
            </div>
          </Link>
        ))}
      </div>
    </Card>
  );
}
