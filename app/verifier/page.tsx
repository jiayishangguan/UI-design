"use client";

// We use this page for the verifier area.
// It shows verifier pool details and tasks waiting for review.

import { useEffect, useMemo, useState } from "react";
import { useReadContract, useReadContracts } from "wagmi";

import type { TaskRecord } from "@/types/database";

import { ProfileGateDialog } from "@/components/profile/profile-gate-dialog";
import { VerifierList } from "@/components/verifier/verifier-list";
import { VerifierPoolCard } from "@/components/verifier-pool/verifier-pool-card";
import { useAppWallet } from "@/hooks/use-app-wallet";
import { abis } from "@/lib/contracts/abis";
import { contractAddresses } from "@/lib/contracts/addresses";
import { useProfile } from "@/hooks/use-profile";
import { useVerifierPool } from "@/hooks/use-verifier-pool";
import { TASK_COOLDOWN_SECONDS } from "@/lib/constants";
import { getVerifierTasks } from "@/lib/supabase/queries";

export default function VerifierPage() {
  const wallet = useAppWallet();
  const { hasProfile, saveProfile } = useProfile(wallet.address);
  const verifierPool = useVerifierPool(wallet.address as `0x${string}` | undefined);
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
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

  useEffect(() => {
    if (!wallet.address) {
      setProfileDialogOpen(false);
      return;
    }
    if (!hasProfile) {
      setProfileDialogOpen(true);
      return;
    }
    setProfileDialogOpen(false);
  }, [hasProfile, wallet.address]);

  const assignmentContracts = useMemo(
    () =>
      tasks
        .filter((task) => task.on_chain_task_id !== null)
        .map((task) => ({
          address: contractAddresses.ActivityVerification as `0x${string}`,
          abi: abis.ActivityVerification,
          functionName: "getTaskVerifiers" as const,
          args: [BigInt(task.on_chain_task_id!)]
        })),
    [tasks]
  );

  const assignmentReads = useReadContracts({
    contracts: assignmentContracts as any,
    query: { enabled: assignmentContracts.length > 0 }
  });
  const taskMetaContracts = useMemo(
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
  const taskMetaReads = useReadContracts({
    contracts: taskMetaContracts as any,
    query: { enabled: taskMetaContracts.length > 0 }
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

  // We combine task data with on-chain review status.
  const queueTasks = useMemo(
    () => {
      const nowSeconds = Math.floor(Date.now() / 1000);

      return tasks.map((task, index) => {
        const verifiers = assignmentReads.data?.[index]?.result as readonly string[] | undefined;
        const chainTask = taskMetaReads.data?.[index]?.result as
          | readonly [string, string, string, bigint, bigint, bigint, number, bigint, bigint, boolean, boolean, readonly string[], number]
          | undefined;
        const isAssigned = Boolean(
          wallet.address && verifiers?.some((verifier) => verifier.toLowerCase() === wallet.address?.toLowerCase())
        );
        const chainStatus = Number(chainTask?.[6] ?? 0);
        const timestamp = Number(chainTask?.[7] ?? 0n);
        const voteDeadline = Number(chainTask?.[8] ?? 0n);
        const displayStatus: "submitted" | "approved" | "rejected" | "cooldown" | "voting" | "expired" =
          chainStatus === 1
            ? "approved"
            : chainStatus === 2
              ? "rejected"
              : timestamp > 0 && nowSeconds < timestamp + TASK_COOLDOWN_SECONDS
                ? "cooldown"
                : voteDeadline > 0 && nowSeconds < voteDeadline
                  ? "voting"
                  : "expired";

        return { ...task, isAssigned, displayStatus };
      });
    },
    [assignmentReads.data, taskMetaReads.data, tasks, wallet.address]
  );

  return (
    <>
      <div className="space-y-8">
        <VerifierPoolCard
          threshold={verifierPool.data?.[0]?.result as bigint | undefined}
          stakeAmount={verifierPool.data?.[1]?.result as bigint | undefined}
          minStake={verifierPool.data?.[2]?.result as bigint | undefined}
          phase={Number(verifierPool.data?.[3]?.result ?? 0)}
          verifier={verifierPool.data?.[4]?.result as readonly [bigint, bigint, bigint, bigint, bigint, bigint, boolean] | undefined}
          activeTaskCount={verifierPool.data?.[5]?.result as bigint | undefined}
          activeVerifierCount={verifierPool.data?.[6]?.result as bigint | undefined}
          committeeMembers={verifierPool.data?.[7]?.result as readonly `0x${string}`[] | undefined}
          onApproveStake={verifierPool.approveStake}
          onJoin={verifierPool.join}
          onLeave={verifierPool.leave}
        />
        <VerifierList
          tasks={queueTasks}
          phase={Number(phaseRead.data ?? 0)}
          isCommitteeMember={Boolean(reviewerMeta.data?.[0]?.result)}
          isActiveVerifier={Boolean((reviewerMeta.data?.[1]?.result as readonly unknown[] | undefined)?.[6])}
        />
      </div>
      <ProfileGateDialog
        address={wallet.address}
        open={profileDialogOpen}
        onClose={() => setProfileDialogOpen(false)}
        onSave={async (input) => {
          // We save the profile before the user uses verifier features.
          await saveProfile(input);
          setProfileDialogOpen(false);
        }}
        allowDismiss={false}
        secondaryActionLabel="Back to Dashboard"
      />
    </>
  );
}
