"use client";

import { useEffect, useState } from "react";

import type { TaskRecord } from "@/types/database";

import { VerifierList } from "@/components/verifier/verifier-list";
import { getVerifierTasks } from "@/lib/supabase/queries";

export default function VerifierPage() {
  const [tasks, setTasks] = useState<TaskRecord[]>([]);

  useEffect(() => {
    getVerifierTasks()
      .then(setTasks)
      .catch(() => setTasks([]));
  }, []);

  return <VerifierList tasks={tasks} />;
}
