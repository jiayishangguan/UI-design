"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { usePublicClient, useReadContract, useReadContracts, useWriteContract } from "wagmi";

import { VerifierDetail } from "@/components/verifier/verifier-detail";
import { useAppWallet } from "@/hooks/use-app-wallet";
import { abis } from "@/lib/contracts/abis";
import { contractAddresses } from "@/lib/contracts/addresses";
import { getReadableContractError } from "@/lib/errors";

export default function VerifierDetailPage() {
  const params = useParams<{ id: string }>();
  const wallet = useAppWallet();
  const taskId = BigInt(params.id);
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const [actionError, setActionError] = useState<string | null>(null);

  const task = useReadContract({
    address: contractAddresses.ActivityVerification as `0x${string}`,
    abi: abis.ActivityVerification,
    functionName: "tasks",
    args: [taskId]
  });
  const hasVotedRead = useReadContract({
    address: contractAddresses.ActivityVerification as `0x${string}`,
    abi: abis.ActivityVerification,
    functionName: "hasVoted",
    args: wallet.address ? [taskId, wallet.address as `0x${string}`] : undefined,
    query: { enabled: Boolean(wallet.address) }
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
  const isAssigned = useMemo(() => {
    const verifiers = currentTask?.[11] as readonly string[] | undefined;
    return Boolean(wallet.address && verifiers?.some((verifier) => verifier.toLowerCase() === wallet.address?.toLowerCase()));
  }, [currentTask, wallet.address]);

  async function wait(hash: `0x${string}`) {
    if (!publicClient) throw new Error("Public client unavailable");
    return publicClient.waitForTransactionReceipt({ hash });
  }

  async function act<T>(fn: () => Promise<T>) {
    setActionError(null);
    try {
      return await fn();
    } catch (error) {
      const readable = getReadableContractError(error, "The verifier action could not be completed.");
      setActionError(readable);
      return null;
    }
  }

  if (!currentTask) return null;

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
        verifiers: currentTask[11] as readonly string[],
        verifierCount: Number(currentTask[12])
      }}
      phaseId={Number(reviewerMeta.data?.[0]?.result ?? 0)}
      isCommitteeMember={Boolean(reviewerMeta.data?.[1]?.result)}
      isAssigned={isAssigned}
      hasVoted={Boolean(hasVotedRead.data)}
      actionError={actionError}
      onVote={(approve) =>
        act(async () => {
          const hash = await writeContractAsync({
            address: contractAddresses.ActivityVerification as `0x${string}`,
            abi: abis.ActivityVerification,
            functionName: "voteOnTask",
            args: [taskId, approve]
          });
          await wait(hash);
        })
      }
      onFinalize={() =>
        act(async () => {
          const hash = await writeContractAsync({
            address: contractAddresses.ActivityVerification as `0x${string}`,
            abi: abis.ActivityVerification,
            functionName: "finalizeExpiredTask",
            args: [taskId]
          });
          await wait(hash);
        })
      }
      onReplace={(slot, approve) =>
        act(async () => {
          const hash = await writeContractAsync({
            address: contractAddresses.ActivityVerification as `0x${string}`,
            abi: abis.ActivityVerification,
            functionName: "committeeReplaceVote",
            args: [taskId, BigInt(slot), approve]
          });
          await wait(hash);
        })
      }
    />
  );
}
