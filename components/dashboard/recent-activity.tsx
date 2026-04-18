import Link from "next/link";

import type { TaskRecord } from "@/types/database";

import { Badge } from "@/components/common/badge";
import { Card } from "@/components/common/card";
import { EmptyState } from "@/components/common/empty-state";
import { formatDateTime } from "@/lib/format";

export function RecentActivity({ tasks }: { tasks: TaskRecord[] }) {
  if (!tasks.length) {
    return (
      <EmptyState
        title="No recent submissions"
        description="Your on-chain task flow will appear here after the first verified campus action."
      />
    );
  }

  return (
    <Card>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-3xl text-white">Recent Activity</h2>
          <p className="mt-2 text-sm text-white/55">Supabase mirrors of your latest task submissions.</p>
        </div>
        <Link href="/submit" className="text-sm text-emerald-100/80">
          New submission
        </Link>
      </div>
      <div className="mt-6 space-y-4">
        {tasks.map((task) => (
          <div
            key={task.id}
            className="grid gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 md:grid-cols-[1fr_auto_auto]"
          >
            <div>
              <p className="text-white">{task.title || task.action_type}</p>
              <p className="mt-1 text-sm text-white/50">{task.description || task.location || "Awaiting verification"}</p>
            </div>
            <div className="text-sm text-white/55">{formatDateTime(task.created_at)}</div>
            <Badge
              tone={
                task.status === "approved" ? "success" : task.status === "rejected" ? "danger" : "warning"
              }
            >
              {task.status}
            </Badge>
          </div>
        ))}
      </div>
    </Card>
  );
}
