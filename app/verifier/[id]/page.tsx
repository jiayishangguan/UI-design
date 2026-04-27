"use client";
// The VerifierDetailPage component is responsible for displaying the details of a specific verification task and allowing verifiers to interact with it.
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { usePublicClient, useReadContract, useReadContracts, useWriteContract } from "wagmi";

import { EmptyState } from "@/components/common/empty-state";
import { VerifierDetail } from "@/components/verifier/verifier-detail";
import { useAppWallet } from "@/hooks/use-app-wallet";
import { abis } from "@/lib/contracts/abis";
import { contractAddresses } from "@/lib/contracts/addresses";
import { getReadableContractError } from "@/lib/errors";
import { getTaskByOnChainId } from "@/lib/supabase/queries";
import type { TaskRecord } from "@/types/database";
// The component retrieves the task ID from the URL parameters and uses it to load the corresponding on-chain task data.
export default function VerifierDetailPage() {
  const params = useParams<{ id: string }>();
  const wallet = useAppWallet();
  const taskId = useMemo(() => {
    try {
      return BigInt(params.id);
    } catch {
      return null;
    }
  }, [params.id]);
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const [actionError, setActionError] = useState<string | null>(null);
  const [mirroredTask, setMirroredTask] = useState<TaskRecord | null>(null);
  // The component uses several useReadContract and useReadContracts hooks to load data related to the task, including the task details, the user's voting status, the list of assigned verifiers, and metadata about the review phase and verifier status.
  const task = useReadContract({
    address: contractAddresses.ActivityVerification as `0x${string}`,
    abi: abis.ActivityVerification,
    functionName: "tasks",
    args: taskId !== null ? [taskId] : undefined,
    query: { enabled: taskId !== null }
  });
  const hasVotedRead = useReadContract({
    address: contractAddresses.ActivityVerification as `0x${string}`,
    abi: abis.ActivityVerification,
    functionName: "hasVoted",
    args: wallet.address && taskId !== null ? [taskId, wallet.address as `0x${string}`] : undefined,
    query: { enabled: Boolean(wallet.address) && taskId !== null }
  });
  const verifierAddressesRead = useReadContract({
    address: contractAddresses.ActivityVerification as `0x${string}`,
    abi: abis.ActivityVerification,
    functionName: "getTaskVerifiers",
    args: taskId !== null ? [taskId] : undefined,
    query: { enabled: taskId !== null }
  });
  const reviewerMeta = useReadContracts({
    contracts: [
      {
        address: contractAddresses.VerifierManager as `0x${string}`,
        abi: abis.VerifierManager,
        functionName: "getPhase"
      },
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
  const currentTask = task.data as
    | readonly [
        string,
        string,
        string,
        bigint,
        bigint,
        bigint,
        number,
        bigint,
        bigint,
        boolean,
        boolean,
        readonly string[],
        number
      ]
    | undefined;
  const verifierAddresses = useMemo(
    () =>
      (verifierAddressesRead.data as readonly string[] | undefined) ??
      (currentTask?.[11] as readonly string[] | undefined) ??
      [],
    [currentTask, verifierAddressesRead.data]
  );
  const slotVoteContracts =
    taskId !== null && currentTask
      ? verifierAddresses.map((verifier) => ({
          address: contractAddresses.ActivityVerification as `0x${string}`,
          abi: abis.ActivityVerification,
          functionName: "hasVoted" as const,
          args: [taskId, verifier as `0x${string}`]
        }))
      : [];
  const slotVoteReads = useReadContracts({
    // Wagmi is stricter than the generated ABI typing here; runtime shape is valid.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    contracts: slotVoteContracts as any,
    query: { enabled: taskId !== null && verifierAddresses.length > 0 }
  });
  const isAssigned = useMemo(() => {
    const verifiers = verifierAddresses;
    return Boolean(wallet.address && verifiers?.some((verifier) => verifier.toLowerCase() === wallet.address?.toLowerCase()));
  }, [verifierAddresses, wallet.address]);
    // The useEffect hook is used to load the mirrored task data from the database based on the on-chain task ID. This allows the component to display additional information about the task that may not be stored on-chain.
  useEffect(() => {
    let active = true;

    if (taskId === null) {
      setMirroredTask(null);
      return;
    }

    getTaskByOnChainId(Number(taskId))
      .then((taskRecord) => {
        if (active) {
          setMirroredTask(taskRecord);
        }
      })
      .catch(() => {
        if (active) {
          setMirroredTask(null);
        }
      });

    return () => {
      active = false;
    };
  }, [taskId]);

  async function wait(hash: `0x${string}`) {
    if (!publicClient) throw new Error("Public client unavailable");
    return publicClient.waitForTransactionReceipt({ hash });
  }
// The sendActivityVerificationTx function is a helper function that simulates and sends a transaction to the blockchain for a given action (voting, finalizing, or replacing a vote) on the verification task. 
// It handles errors and updates the component state accordingly.
  async function sendActivityVerificationTx(
    functionName: "voteOnTask" | "finalizeExpiredTask" | "committeeReplaceVote",
    args: readonly unknown[]
  ) {
    if (!publicClient) throw new Error("Public client unavailable");
    if (!wallet.address) throw new Error("A connected wallet is required.");

    const simulation = await publicClient.simulateContract({
      account: wallet.address as `0x${string}`,
      address: contractAddresses.ActivityVerification as `0x${string}`,
      abi: abis.ActivityVerification,
      functionName,
      args
    });

    const hash = await writeContractAsync(simulation.request);
    return wait(hash);
  }

  async function act<T>(fn: () => Promise<T>) {
    setActionError(null);
    try {
      const result = await fn();
      await Promise.all([
        task.refetch(),
        hasVotedRead.refetch(),
        verifierAddressesRead.refetch(),
        slotVoteReads.refetch()
      ]);
      return result;
    } catch (error) {
      const readable = getReadableContractError(error, "The verifier action could not be completed.");
      setActionError(readable);
      return null;
    }
  }

  if (taskId === null) {
    return <EmptyState title="Invalid task id" description="This verifier page was opened with an invalid task reference." />;
  }

  if (task.isError || !currentTask) {
    return (
      <EmptyState
        title="Task not found"
        description="This verifier detail page could not find a matching on-chain task. Open tasks that already have a valid on-chain task id from the verifier queue."
      />
    );
  }
// If the task data is successfully loaded, the component renders the VerifierDetail component, passing all the relevant data and functions as props to allow the user to interact with the verification task (e.g., voting, finalizing, replacing votes).
  return (
    <VerifierDetail
      task={{
        actionType: currentTask[1],
        proofCID: currentTask[2],
        gtReward: currentTask[3],
        approvals: currentTask[4],
        rejections: currentTask[5],
        status: Number(currentTask[6]),
        timestamp: currentTask[7],
        voteDeadline: currentTask[8],
        gtQueued: currentTask[9],
        gtClaimed: currentTask[10],
        verifiers: verifierAddresses,
        verifierCount: Number(currentTask[12])
      }}
      mirroredTask={mirroredTask}
      phaseId={Number(reviewerMeta.data?.[0]?.result ?? 0)}
      isCommitteeMember={Boolean(reviewerMeta.data?.[1]?.result)}
      isActiveVerifier={Boolean((reviewerMeta.data?.[2]?.result as readonly unknown[] | undefined)?.[6])}
      isAssigned={isAssigned}
      hasVoted={Boolean(hasVotedRead.data)}
      slotVotes={verifierAddresses.map((verifier, index) => ({
        verifier,
        hasVoted: Boolean(slotVoteReads.data?.[index]?.result),
        isCurrentWallet: Boolean(wallet.address && verifier.toLowerCase() === wallet.address.toLowerCase())
      }))}
      actionError={actionError}
      onVote={(approve) =>
        act(async () => {
          await sendActivityVerificationTx("voteOnTask", [taskId, approve]);
        })
      }
      onReplace={(slot, approve) =>
        act(async () => {
          await sendActivityVerificationTx("committeeReplaceVote", [taskId, BigInt(slot), approve]);
        })
      }
    />
  );
}
