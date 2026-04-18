"use client";

import { useEffect, useState } from "react";
import { useReadContract } from "wagmi";

import type { TaskRecord } from "@/types/database";

import { VerifierList } from "@/components/verifier/verifier-list";
import { abis } from "@/lib/contracts/abis";
import { contractAddresses } from "@/lib/contracts/addresses";
import { getVerifierTasks } from "@/lib/supabase/queries";

export default function VerifierPage() {
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const phaseRead = useReadContract({
    address: contractAddresses.VerifierManager as `0x${string}`,
    abi: abis.VerifierManager,
    functionName: "getPhase"
  });

  useEffect(() => {
    getVerifierTasks()
      .then(setTasks)
      .catch(() => setTasks([]));
  }, []);

  return <VerifierList tasks={tasks} phase={Number(phaseRead.data ?? 0)} />;
}
