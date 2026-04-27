// The RecentActivity component is a section of the dashboard that displays a list of recent task submissions by the user. It accepts an array of TaskRecord objects as a prop and renders each task's title, description, creation date, and status in a styled card format. If there are no tasks to display, it shows an empty state message encouraging the user to submit their first activity. The component also includes a link to the submission page for users to easily create new tasks. The design incorporates a clean and modern aesthetic with a focus on readability and user engagement.
import Link from "next/link";

import type { TaskRecord } from "@/types/database";

import { Badge } from "@/components/common/badge";
import { Card } from "@/components/common/card";
import { EmptyState } from "@/components/common/empty-state";
import { formatDateTime } from "@/lib/format";
// The RecentActivity component is a section of the dashboard that displays a list of recent task submissions by the user. It accepts an array of TaskRecord objects as a prop and renders each task's title, description, creation date, and status in a styled card format. If there are no tasks to display, it shows an empty state message encouraging the user to submit their first activity. The component also includes a link to the submission page for users to easily create new tasks. The design incorporates a clean and modern aesthetic with a focus on readability and user engagement.
export function RecentActivity({ tasks }: { tasks: TaskRecord[] }) {
  if (!tasks.length) {
    return (
      <EmptyState
        title="No recent submissions"
        description="Submit your first campus action to start building your activity history."
      />
    );
  }
// If there are tasks to display, the component renders a card for each task, showing its title, description, creation date, and status. The status is visually represented using a Badge component with different tones based on whether the task is approved, rejected, or pending.
  return (
    <Card>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-3xl text-white">Recent Activity</h2>
          <p className="mt-2 text-sm text-white/55">Your latest submitted activities, review status, and GT mint result.</p>
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
