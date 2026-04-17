"use client";

import { useMemo, useState } from "react";
import { usePublicClient, useReadContracts, useWriteContract } from "wagmi";

import type { GovernanceProposal } from "@/types/contracts";

import { abis } from "@/lib/contracts/abis";
import { contractAddresses } from "@/lib/contracts/addresses";
import { encodeProposalData } from "@/lib/proposal-encoder";

export function useGovernance(address?: `0x${string}`) {
  const [pending, setPending] = useState(false);
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const countRead = useReadContracts({
    contracts: [
      {
        address: contractAddresses.CommitteeManager as `0x${string}`,
        abi: abis.CommitteeManager,
        functionName: "proposalCount"
      },
      {
        address: contractAddresses.CommitteeManager as `0x${string}`,
        abi: abis.CommitteeManager,
        functionName: "approvalThreshold"
      },
      {
        address: contractAddresses.CommitteeManager as `0x${string}`,
        abi: abis.CommitteeManager,
        functionName: "getMembers"
      },
      {
        address: contractAddresses.CommitteeManager as `0x${string}`,
        abi: abis.CommitteeManager,
        functionName: "isCommitteeMember",
        args: address ? [address] : undefined
      }
    ],
    query: { enabled: Boolean(address) }
  });

  const proposalCount = Number(countRead.data?.[0]?.result ?? 0n);
  const proposalContracts = useMemo(
    () =>
      Array.from({ length: proposalCount }, (_, index) => ({
        address: contractAddresses.CommitteeManager as `0x${string}`,
        abi: abis.CommitteeManager,
        functionName: "getProposal" as const,
        args: [BigInt(index)]
      })),
    [proposalCount]
  );

  const proposalReads = useReadContracts({
    contracts: proposalContracts as any,
    query: { enabled: proposalContracts.length > 0 }
  });

  const proposals = useMemo<GovernanceProposal[]>(
    () =>
      (proposalReads.data ?? []).flatMap((entry, index) => {
        if (!entry.result) return [];
        const [actionType, targetContract, proposer, approvalCount, status, createdAt] = entry.result as readonly [
          number,
          string,
          string,
          bigint,
          number,
          bigint
        ];
        return [
          {
            id: index,
            actionType: Number(actionType),
            targetContract,
            proposer,
            approvalCount,
            status: Number(status),
            createdAt
          }
        ];
      }),
    [proposalReads.data]
  );

  async function propose(input: {
    actionType: number;
    targetContract: `0x${string}`;
    params: Record<string, unknown>;
  }) {
    if (!publicClient) throw new Error("Public client unavailable");
    setPending(true);
    try {
      const data = encodeProposalData(input.actionType, input.params);
      const hash = await writeContractAsync({
        address: contractAddresses.CommitteeManager as `0x${string}`,
        abi: abis.CommitteeManager,
        functionName: "propose",
        args: [input.actionType, input.targetContract, data]
      });
      return await publicClient.waitForTransactionReceipt({ hash });
    } finally {
      setPending(false);
    }
  }

  async function approveProposal(id: number) {
    if (!publicClient) throw new Error("Public client unavailable");
    const hash = await writeContractAsync({
      address: contractAddresses.CommitteeManager as `0x${string}`,
      abi: abis.CommitteeManager,
      functionName: "approveProposal",
      args: [BigInt(id)]
    });
    return publicClient.waitForTransactionReceipt({ hash });
  }

  async function cancelProposal(id: number) {
    if (!publicClient) throw new Error("Public client unavailable");
    const hash = await writeContractAsync({
      address: contractAddresses.CommitteeManager as `0x${string}`,
      abi: abis.CommitteeManager,
      functionName: "cancelProposal",
      args: [BigInt(id)]
    });
    return publicClient.waitForTransactionReceipt({ hash });
  }

  return { ...countRead, proposals, approveProposal, cancelProposal, propose, pending };
}
