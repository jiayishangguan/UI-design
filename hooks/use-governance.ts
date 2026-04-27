"use client";

import { useEffect, useMemo, useState } from "react";
import { decodeEventLog } from "viem";
import { usePublicClient, useReadContracts, useWriteContract } from "wagmi";

import type { GovernanceProposal } from "@/types/contracts";

import { getReadableContractError } from "@/lib/errors";
import { abis } from "@/lib/contracts/abis";
import { contractAddresses } from "@/lib/contracts/addresses";
import {
  decodeProposalData,
  encodeProposalData,
  getProposalDetailText,
  getFallbackProposalDetails,
  getFallbackProposalSummary,
  getProposalDisplayFields,
  getProposalDisplayName,
  getGovernanceExecutionHint,
  isActionTargetValid
} from "@/lib/proposal-encoder";

function getProposalDataFromGetterResult(result: unknown): `0x${string}` | undefined {
  if (!Array.isArray(result) || result.length < 3 || typeof result[2] !== "string") return undefined;
  return result[2] as `0x${string}`;
}

export function useGovernance(address?: `0x${string}`) {
  const [pending, setPending] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [proposalMeta, setProposalMeta] = useState<Record<number, { summary: string; details: Array<{ label: string; value: string }>; detailText: string }>>(
    {}
  );
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
            functionName: "proposals" as const,
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

  useEffect(() => {
    let active = true;

    function loadProposalMeta() {
      if (proposalCount === 0) {
        if (active) setProposalMeta({});
        return;
      }

      const nextMeta: Record<number, { summary: string; details: Array<{ label: string; value: string }>; detailText: string }> = {};

      for (let proposalId = 0; proposalId < proposalCount; proposalId += 1) {
        try {
          const proposalEntry = proposalReads.data?.[proposalId * 4];
          const dataEntry = proposalReads.data?.[proposalId * 4 + 1];
          if (!proposalEntry?.result) continue;

          const [actionType, targetContract] = proposalEntry.result as readonly [number, string, string, bigint, number, bigint];
          const data = getProposalDataFromGetterResult(dataEntry?.result);
          if (!data) continue;
          const params = decodeProposalData(Number(actionType), data);
          nextMeta[proposalId] = {
            summary: getProposalDisplayName(Number(actionType)),
            details: getProposalDisplayFields(Number(actionType), params),
            detailText: getProposalDetailText(Number(actionType), params, targetContract)
          };
        } catch {
          // Ignore per-proposal decode failures so other proposals still show their content.
        }
      }

      if (active) {
        setProposalMeta(nextMeta);
      }
    }

    loadProposalMeta();
    return () => {
      active = false;
    };
  }, [proposalCount, proposalReads.data]);

  const proposals = useMemo<GovernanceProposal[]>(() => {
    const rows = proposalReads.data ?? [];
    const next: GovernanceProposal[] = [];
    for (let index = 0; index < rows.length; index += 4) {
      const proposalEntry = rows[index];
      const dataEntry = rows[index + 1];
      const effectiveStatusEntry = rows[index + 2];
      const hasApprovedEntry = rows[index + 3];
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
        id: Math.floor(index / 4),
        actionType: Number(actionType),
        targetContract,
        data: getProposalDataFromGetterResult(dataEntry?.result),
        proposer,
        approvalCount,
        status: Number(status),
        effectiveStatus: Number(effectiveStatusEntry?.result ?? status),
        hasApproved: Boolean(hasApprovedEntry?.result ?? false),
        validTarget: isActionTargetValid(Number(actionType), targetContract as `0x${string}`),
        executionHint: getGovernanceExecutionHint(Number(actionType), targetContract),
        summary: proposalMeta[Math.floor(index / 4)]?.summary ?? getFallbackProposalSummary(Number(actionType)),
        details: proposalMeta[Math.floor(index / 4)]?.details ?? getFallbackProposalDetails(Number(actionType)),
        detailText: proposalMeta[Math.floor(index / 4)]?.detailText ?? "",
        createdAt
      });
    }
    return next.sort((left, right) => right.id - left.id);
  }, [proposalMeta, proposalReads.data]);

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
      if (!isActionTargetValid(input.actionType, input.targetContract)) {
        throw new Error(getGovernanceExecutionHint(input.actionType, input.targetContract));
      }
      const data = encodeProposalData(input.actionType, input.params);
      const simulation = await publicClient.simulateContract({
        account: address,
        address: contractAddresses.CommitteeManager as `0x${string}`,
        abi: abis.CommitteeManager,
        functionName: "propose",
        args: [input.actionType, input.targetContract, data]
      });
      const hash = await writeContractAsync(simulation.request);
      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      let createdProposalId: number | null = null;
      for (const log of receipt.logs) {
        try {
          const parsed = decodeEventLog({
            abi: abis.CommitteeManager,
            data: log.data,
            topics: log.topics
          });
          if (parsed.eventName === "ProposalCreated") {
            createdProposalId = Number((parsed.args as unknown as { proposalId: bigint }).proposalId);
            break;
          }
        } catch {
          // Ignore unrelated logs.
        }
      }

      if (createdProposalId !== null) {
        const params = decodeProposalData(input.actionType, data);
        setProposalMeta((current) => ({
          ...current,
          [createdProposalId]: {
            summary: getProposalDisplayName(input.actionType),
            details: getProposalDisplayFields(input.actionType, params),
            detailText: getProposalDetailText(input.actionType, params, input.targetContract)
          }
        }));
      }

      return receipt;
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
      const proposal = proposals.find((item) => item.id === id);
      const fallback = proposal?.executionHint
        ? `The approval could not be submitted. ${proposal.executionHint}`
        : "The approval could not be submitted.";
      const readable = getReadableContractError(error, fallback);
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
