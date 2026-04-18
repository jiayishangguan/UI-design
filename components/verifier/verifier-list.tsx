"use client";

import Link from "next/link";

import type { TaskRecord } from "@/types/database";

import { Badge } from "@/components/common/badge";
import { Card } from "@/components/common/card";
import { EmptyState } from "@/components/common/empty-state";

export function VerifierList({ tasks }: { tasks: TaskRecord[] }) {
  if (!tasks.length) {
    return (
      <EmptyState
        title="No mirrored tasks"
        description="Verifier dashboard will become useful once task drafts are stored in Supabase and tied back to on-chain task ids."
      />
    );
  }

  return (
    <Card>
      <h1 className="font-serif text-4xl text-white">Verifier Queue</h1>
      <p className="mt-3 text-white/55">
        Voting controls only appear on detail pages for assigned verifiers, and duplicate vote UI is blocked by hasVoted.
      </p>
      <div className="mt-8 space-y-4">
        {tasks.map((task) => (
          <Link
            key={task.id}
            href={`/verifier/${task.on_chain_task_id ?? task.id}`}
            className="grid gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 transition hover:border-emerald-300/20"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-white">{task.title || task.action_type}</p>
                <p className="mt-1 text-sm text-white/50">{task.submitter_address}</p>
              </div>
              <Badge tone={task.status === "approved" ? "success" : task.status === "rejected" ? "danger" : "warning"}>
                {task.status}
              </Badge>
            </div>
          </Link>
        ))}
      </div>
    </Card>
  );
}
