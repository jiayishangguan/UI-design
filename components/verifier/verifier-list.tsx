"use client";
// The VerifierList component is responsible for displaying a list of tasks that are in the verifier queue. It receives an array of tasks, the current governance phase, and information about the user's role (whether they are a committee member or an active verifier). The component renders a card with a title and description, followed by a list of tasks. Each task is displayed as a link to its detail page, showing its title, submitter address, assignment status, and current voting status. If there are no tasks in the queue, it displays an empty state message.
import Link from "next/link";
import { useMemo, useState } from "react";

import type { TaskRecord } from "@/types/database";

import { GOVERNANCE_PHASE_DETAILS, GOVERNANCE_PHASE_LABELS } from "@/lib/constants";
import { cn } from "@/lib/cn";
import { formatAddress, formatDisplayToken } from "@/lib/format";

import { Badge } from "@/components/common/badge";
import { Button } from "@/components/common/button";
import { Card } from "@/components/common/card";
import { EmptyState } from "@/components/common/empty-state";

type VerifierQueueItem = TaskRecord & {
  isAssigned?: boolean;
  displayStatus?: "submitted" | "approved" | "rejected" | "cooldown" | "voting" | "expired";
};

type QueueTab = "assigned" | "in-review" | "follow-up" | "completed" | "all";
type TabTone = "info" | "success" | "warning" | "danger" | "default";

const TASKS_PER_VIEW = 6;
const OPEN_STATUSES = new Set(["submitted", "cooldown", "voting"]);
const FOLLOW_UP_STATUSES = new Set(["expired"]);
const DONE_STATUSES = new Set(["approved", "rejected"]);

const STATUS_LABELS: Record<NonNullable<VerifierQueueItem["displayStatus"]>, string> = {
  submitted: "Submitted",
  cooldown: "Cooling down",
  voting: "Ready to vote",
  approved: "Approved",
  rejected: "Rejected",
  expired: "Expired"
};

function getQueueStatus(task: VerifierQueueItem) {
  return task.displayStatus ?? task.status;
}

function getStatusTone(status: string) {
  if (status === "approved") return "success";
  if (status === "expired") return "warning";
  if (status === "rejected") return "danger";
  return "warning";
}

function getTabClass(tone: TabTone, isSelected: boolean) {
  if (!isSelected) {
    return "border-white/10 bg-white/[0.03] text-white/55 hover:border-white/20 hover:text-white";
  }

  if (tone === "info") return "border-sky-300/45 bg-sky-400/10 text-sky-50";
  if (tone === "success") return "border-emerald-300/35 bg-emerald-400/10 text-emerald-50";
  if (tone === "warning") return "border-amber-300/35 bg-amber-400/10 text-amber-50";
  if (tone === "danger") return "border-red-300/35 bg-red-400/10 text-red-50";
  return "border-white/20 bg-white/[0.08] text-white";
}

function getTaskAccent(task: VerifierQueueItem) {
  const status = getQueueStatus(task);
  if (task.isAssigned) return "border-sky-300/30";
  if (OPEN_STATUSES.has(status)) return "border-emerald-300/25";
  if (FOLLOW_UP_STATUSES.has(status)) return "border-amber-300/25";
  if (DONE_STATUSES.has(status)) return "border-red-300/20";
  return "border-white/10";
}

function getAccessMessage({
  task,
  status,
  phase,
  isActiveVerifier
}: {
  task: VerifierQueueItem;
  status: string;
  phase?: number;
  isActiveVerifier?: boolean;
}) {
  if (task.isAssigned) {
    if (status === "voting") return { label: "You can vote", className: "text-sky-100/85" };
    if (status === "cooldown") return { label: "Assigned - voting opens soon", className: "text-sky-100/70" };
    if (status === "expired") return { label: "Voting window ended - follow-up needed", className: "text-amber-100/75" };
    return { label: "Assigned to your wallet", className: "text-sky-100/75" };
  }

  if (status === "expired") {
    return { label: "Expired - follow-up needed", className: "text-amber-100/70" };
  }

  if (isActiveVerifier && phase === 0) {
    return { label: "Verifier pool member - Phase 1 uses committee reviewers", className: "text-amber-100/70" };
  }

  if (isActiveVerifier) {
    return { label: "Not assigned - view only", className: "text-white/40" };
  }

  return { label: "View only", className: "text-white/40" };
}
// The component receives various props related to the tasks and the user's role in the review process, such as whether the user is an assigned reviewer, a committee member, or an active verifier. It uses this information to determine what controls and information to display to the user, as well as to manage the state of voting and any actions taken on the tasks.
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
  const [activeTab, setActiveTab] = useState<QueueTab>("assigned");
  const [visibleCount, setVisibleCount] = useState(TASKS_PER_VIEW);

  const sortedTasks = useMemo(() => {
    const priority = (task: VerifierQueueItem) => {
      const status = getQueueStatus(task);
      if (task.isAssigned && status === "voting") return 0;
      if (task.isAssigned && status === "cooldown") return 1;
      if (task.isAssigned && OPEN_STATUSES.has(status)) return 2;
      if (status === "voting") return 3;
      if (status === "cooldown") return 4;
      if (OPEN_STATUSES.has(status)) return 5;
      if (status === "approved") return 6;
      if (status === "rejected") return 7;
      return 8;
    };

    return [...tasks].sort((left, right) => {
      const priorityDelta = priority(left) - priority(right);
      if (priorityDelta !== 0) return priorityDelta;
      return (right.on_chain_task_id ?? right.id) - (left.on_chain_task_id ?? left.id);
    });
  }, [tasks]);

  const groupedTasks = useMemo(
    () => ({
      assigned: sortedTasks.filter((task) => task.isAssigned),
      "in-review": sortedTasks.filter((task) => OPEN_STATUSES.has(getQueueStatus(task))),
      "follow-up": sortedTasks.filter((task) => FOLLOW_UP_STATUSES.has(getQueueStatus(task))),
      completed: sortedTasks.filter((task) => DONE_STATUSES.has(getQueueStatus(task))),
      all: sortedTasks
    }),
    [sortedTasks]
  );

  const tabs: { id: QueueTab; label: string; helper: string; tone: TabTone }[] = [
    { id: "assigned", label: "Assigned to me", helper: "Tasks where your wallet can vote when the review window opens.", tone: "info" },
    { id: "in-review", label: "In review", helper: "Pending tasks that are still moving through review.", tone: "success" },
    { id: "follow-up", label: "Needs follow-up", helper: "Expired tasks that still need a final follow-up step.", tone: "warning" },
    { id: "completed", label: "Completed", helper: "Finished tasks with an approved or rejected result.", tone: "danger" },
    { id: "all", label: "All", helper: "Every task in this queue.", tone: "default" }
  ];

  const currentTasks = groupedTasks[activeTab];
  const visibleTasks = currentTasks.slice(0, visibleCount);
  const activeTabMeta = tabs.find((tab) => tab.id === activeTab) ?? tabs[0];

  if (!tasks.length) {
    return (
      <EmptyState
        title="No review tasks"
        description="There are no active on-chain tasks in the verifier queue right now."
      />
    );
  }
// The component uses several useReadContract and useReadContracts hooks to load data related to the tasks, including the list of assigned verifiers for each task and metadata about the review phase and verifier status. It then uses this data to determine the display status of each task (e.g., whether it is in cooldown, voting, or expired) and whether it is assigned to the current user's wallet.
  return (
    <Card>
      <h1 className="font-serif text-4xl text-white">Verifier Queue</h1>
      <p className="mt-3 max-w-2xl text-white/55">
        Start with tasks assigned to your wallet. Open a task to review proof, check details, and vote when voting is
        available.
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
      <div className="mt-8 flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const isSelected = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              type="button"
              className={cn(
                "rounded-full border px-4 py-2 text-sm transition",
                getTabClass(tab.tone, isSelected)
              )}
              aria-pressed={isSelected}
              onClick={() => {
                setActiveTab(tab.id);
                setVisibleCount(TASKS_PER_VIEW);
              }}
            >
              {tab.label}
              <span className="ml-2 text-white/40">{formatDisplayToken(groupedTasks[tab.id].length, 0)}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-5 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <p className="text-sm text-white/55">{activeTabMeta.helper}</p>
        <p className="text-sm text-white/40">
          Showing {formatDisplayToken(visibleTasks.length, 0)} of {formatDisplayToken(currentTasks.length, 0)}
        </p>
      </div>

      <div className="mt-5 space-y-3">
        {visibleTasks.length ? (
          visibleTasks.map((task) => {
            const status = getQueueStatus(task);
            const statusLabel = STATUS_LABELS[status as NonNullable<VerifierQueueItem["displayStatus"]>] ?? task.status;
            const accessMessage = getAccessMessage({ task, status, phase, isActiveVerifier });

            return (
              <Link
                key={task.id}
                href={`/verifier/${task.on_chain_task_id}`}
                className={cn(
                  "grid gap-3 rounded-2xl border bg-white/[0.03] px-4 py-4 transition hover:border-emerald-300/25 hover:bg-white/[0.05] md:grid-cols-[1fr_auto] md:items-center",
                  getTaskAccent(task)
                )}
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-white">{task.title || task.action_type}</p>
                    {task.isAssigned ? <Badge tone="success">Assigned</Badge> : null}
                  </div>
                  <p className="mt-2 text-sm text-white/50">
                    Submitted by {formatAddress(task.submitter_address, 4)}
                    {task.action_type ? <span className="text-white/25"> · {task.action_type}</span> : null}
                    {task.gt_reward ? <span className="text-white/25"> · {formatDisplayToken(task.gt_reward, 0)} GT</span> : null}
                  </p>
                  <p className={cn("mt-2 text-xs uppercase tracking-[0.16em]", accessMessage.className)}>
                    {accessMessage.label}
                  </p>
                </div>
                <div className="flex md:justify-end">
                  <Badge tone={getStatusTone(status)}>{statusLabel}</Badge>
                </div>
              </Link>
            );
          })
        ) : (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-6 text-sm text-white/55">
            Nothing is in this view right now.
          </div>
        )}
      </div>

      {visibleCount < currentTasks.length ? (
        <div className="mt-5 flex justify-center">
          <Button variant="secondary" onClick={() => setVisibleCount((count) => count + TASKS_PER_VIEW)}>
            Show more
          </Button>
        </div>
      ) : null}
    </Card>
  );
}
