"use client";

import { useEffect, useMemo, useState } from "react";
import { useReadContract, useReadContracts } from "wagmi";

import type { TaskRecord } from "@/types/database";

import { VerifierList } from "@/components/verifier/verifier-list";
import { useAppWallet } from "@/hooks/use-app-wallet";
import { abis } from "@/lib/contracts/abis";
import { contractAddresses } from "@/lib/contracts/addresses";
import { getVerifierTasks } from "@/lib/supabase/queries";

export default function VerifierPage() {
  const wallet = useAppWallet();
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

  const assignmentContracts = useMemo(
    () =>
      tasks
        .filter((task) => task.on_chain_task_id !== null)
        .map((task) => ({
          address: contractAddresses.ActivityVerification as `0x${string}`,
          abi: abis.ActivityVerification,
          functionName: "tasks" as const,
          args: [BigInt(task.on_chain_task_id!)]
        })),
    [tasks]
  );

  const assignmentReads = useReadContracts({
    contracts: assignmentContracts as any,
    query: { enabled: assignmentContracts.length > 0 }
  });

  const reviewerMeta = useReadContracts({
    contracts: [
      {
        address: contractAddresses.CommitteeManager as `0x${string}`,
        abi: abis.CommitteeManager,
        functionName: "isCommitteeMember",
        args: wallet.address ? [wallet.address as `0x${string}`] : undefined
      },
      {
        address: contractAddresses.VerifierManager as `0x${string}`,
        abi: abis.VerifierManager,
        functionName: "verifiers",
        args: wallet.address ? [wallet.address as `0x${string}`] : undefined
      }
    ],
    query: { enabled: Boolean(wallet.address) }
  });

  const queueTasks = useMemo(
    () =>
      tasks.map((task, index) => {
        const chainTask = assignmentReads.data?.[index]?.result as
          | readonly [string, string, string, bigint, bigint, bigint, number, bigint, bigint, boolean, boolean, readonly string[], number]
          | undefined;
        const verifiers = chainTask?.[11] as readonly string[] | undefined;
        const isAssigned = Boolean(
          wallet.address && verifiers?.some((verifier) => verifier.toLowerCase() === wallet.address?.toLowerCase())
        );

        return { ...task, isAssigned };
      }),
    [assignmentReads.data, tasks, wallet.address]
  );

  return (
    <VerifierList
      tasks={queueTasks}
      phase={Number(phaseRead.data ?? 0)}
      isCommitteeMember={Boolean(reviewerMeta.data?.[0]?.result)}
      isActiveVerifier={Boolean((reviewerMeta.data?.[1]?.result as readonly unknown[] | undefined)?.[6])}
    />
  );
}
