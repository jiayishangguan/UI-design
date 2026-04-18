"use client";

import { useState } from "react";
import { parseUnits } from "viem";
import { usePublicClient, useReadContracts, useWriteContract } from "wagmi";

import { abis } from "@/lib/contracts/abis";
import { contractAddresses } from "@/lib/contracts/addresses";

export function useVerifierPool(address?: `0x${string}`) {
  const [pending, setPending] = useState(false);
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const reads = useReadContracts({
    contracts: [
      {
        address: contractAddresses.VerifierManager as `0x${string}`,
        abi: abis.VerifierManager,
        functionName: "VERIFIER_THRESHOLD"
      },
      {
        address: contractAddresses.VerifierManager as `0x${string}`,
        abi: abis.VerifierManager,
        functionName: "STAKE_AMOUNT"
      },
      {
        address: contractAddresses.VerifierManager as `0x${string}`,
        abi: abis.VerifierManager,
        functionName: "MIN_STAKE"
      },
      {
        address: contractAddresses.VerifierManager as `0x${string}`,
        abi: abis.VerifierManager,
        functionName: "getPhase"
      },
      {
        address: contractAddresses.VerifierManager as `0x${string}`,
        abi: abis.VerifierManager,
        functionName: "verifiers",
        args: address ? [address] : undefined
      },
      {
        address: contractAddresses.VerifierManager as `0x${string}`,
        abi: abis.VerifierManager,
        functionName: "activeTaskCount",
        args: address ? [address] : undefined
      },
      {
        address: contractAddresses.VerifierManager as `0x${string}`,
        abi: abis.VerifierManager,
        functionName: "getActiveVerifierCount"
      },
      {
        address: contractAddresses.CommitteeManager as `0x${string}`,
        abi: abis.CommitteeManager,
        functionName: "getMembers"
      }
    ],
    query: { enabled: Boolean(address) }
  });

  async function approveStake() {
    if (!publicClient) throw new Error("Public client unavailable");
    const hash = await writeContractAsync({
      address: contractAddresses.GreenToken as `0x${string}`,
      abi: abis.GreenToken,
      functionName: "approve",
      args: [contractAddresses.VerifierManager as `0x${string}`, parseUnits("100", 0)]
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    await reads.refetch();
    return receipt;
  }

  async function join() {
    if (!publicClient) throw new Error("Public client unavailable");
    setPending(true);
    try {
      const hash = await writeContractAsync({
        address: contractAddresses.VerifierManager as `0x${string}`,
        abi: abis.VerifierManager,
        functionName: "joinVerifierPool"
      });
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      await reads.refetch();
      return receipt;
    } finally {
      setPending(false);
    }
  }

  async function leave() {
    if (!publicClient) throw new Error("Public client unavailable");
    setPending(true);
    try {
      const hash = await writeContractAsync({
        address: contractAddresses.VerifierManager as `0x${string}`,
        abi: abis.VerifierManager,
        functionName: "leaveVerifierPool"
      });
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      await reads.refetch();
      return receipt;
    } finally {
      setPending(false);
    }
  }

  return { ...reads, approveStake, join, leave, pending };
}
