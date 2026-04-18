"use client";

import { useMemo, useState } from "react";
import { usePublicClient, useReadContracts, useWriteContract } from "wagmi";

import type { GovernanceProposal } from "@/types/contracts";

import { getReadableContractError } from "@/lib/errors";
import { abis } from "@/lib/contracts/abis";
import { contractAddresses } from "@/lib/contracts/addresses";
import { encodeProposalData } from "@/lib/proposal-encoder";

export function useGovernance(address?: `0x${string}`) {
  const [pending, setPending] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
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
      Array.from({ length: proposalCount }, (_, index) => {
        const proposalId = BigInt(index);
        return [
          {
            address: contractAddresses.CommitteeManager as `0x${string}`,
            abi: abis.CommitteeManager,
            functionName: "getProposal" as const,
            args: [proposalId]
          },
          {
            address: contractAddresses.CommitteeManager as `0x${string}`,
            abi: abis.CommitteeManager,
            functionName: "getEffectiveStatus" as const,
            args: [proposalId]
          },
          {
            address: contractAddresses.CommitteeManager as `0x${string}`,
            abi: abis.CommitteeManager,
            functionName: "hasApproved" as const,
            args: address ? [proposalId, address] : undefined
          }
        ];
      }).flat(),
    [address, proposalCount]
  );

  const proposalReads = useReadContracts({
    contracts: proposalContracts as any,
    query: { enabled: proposalContracts.length > 0 }
  });

  const proposals = useMemo<GovernanceProposal[]>(
    () => {
      const rows = proposalReads.data ?? [];
      const next: GovernanceProposal[] = [];
      for (let index = 0; index < rows.length; index += 3) {
        const proposalEntry = rows[index];
        const effectiveStatusEntry = rows[index + 1];
        const hasApprovedEntry = rows[index + 2];
        if (!proposalEntry?.result) continue;
        const [actionType, targetContract, proposer, approvalCount, status, createdAt] = proposalEntry.result as readonly [
          number,
          string,
          string,
          bigint,
          number,
          bigint
        ];
        next.push({
          id: Math.floor(index / 3),
          actionType: Number(actionType),
          targetContract,
          proposer,
          approvalCount,
          status: Number(status),
          effectiveStatus: Number(effectiveStatusEntry?.result ?? status),
          hasApproved: Boolean(hasApprovedEntry?.result ?? false),
          createdAt
        });
      }
      return next;
    },
    [proposalReads.data]
  );

  const members = useMemo<string[]>(
    () => ((countRead.data?.[2]?.result as string[] | undefined) ?? []).map((member) => member),
    [countRead.data]
  );

  async function propose(input: {
    actionType: number;
    targetContract: `0x${string}`;
    params: Record<string, unknown>;
  }) {
    if (!publicClient || !address) throw new Error("A connected wallet is required.");
    setPending(true);
    setActionError(null);
    try {
      const data = encodeProposalData(input.actionType, input.params);
      const simulation = await publicClient.simulateContract({
        account: address,
        address: contractAddresses.CommitteeManager as `0x${string}`,
        abi: abis.CommitteeManager,
        functionName: "propose",
        args: [input.actionType, input.targetContract, data]
      });
      const hash = await writeContractAsync(simulation.request);
      return await publicClient.waitForTransactionReceipt({ hash });
    } catch (error) {
      const readable = getReadableContractError(error, "The proposal could not be created.");
      setActionError(readable);
      return null;
    } finally {
      setPending(false);
    }
  }

  async function approveProposal(id: number) {
    if (!publicClient || !address) throw new Error("A connected wallet is required.");
    setActionError(null);
    try {
      const simulation = await publicClient.simulateContract({
        account: address,
        address: contractAddresses.CommitteeManager as `0x${string}`,
        abi: abis.CommitteeManager,
        functionName: "approveProposal",
        args: [BigInt(id)]
      });
      const hash = await writeContractAsync(simulation.request);
      return publicClient.waitForTransactionReceipt({ hash });
    } catch (error) {
      const readable = getReadableContractError(error, "The approval could not be submitted.");
      setActionError(readable);
      return null;
    }
  }

  async function cancelProposal(id: number) {
    if (!publicClient || !address) throw new Error("A connected wallet is required.");
    setActionError(null);
    try {
      const simulation = await publicClient.simulateContract({
        account: address,
        address: contractAddresses.CommitteeManager as `0x${string}`,
        abi: abis.CommitteeManager,
        functionName: "cancelProposal",
        args: [BigInt(id)]
      });
      const hash = await writeContractAsync(simulation.request);
      return publicClient.waitForTransactionReceipt({ hash });
    } catch (error) {
      const readable = getReadableContractError(error, "The cancellation could not be submitted.");
      setActionError(readable);
      return null;
    }
  }

  return { ...countRead, proposals, members, approveProposal, cancelProposal, propose, pending, actionError };
}
