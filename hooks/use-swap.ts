"use client";

import { useState } from "react";
import { parseUnits } from "viem";
import { usePublicClient, useReadContracts, useWriteContract } from "wagmi";

import { abis } from "@/lib/contracts/abis";
import { contractAddresses } from "@/lib/contracts/addresses";

export function useSwap(address?: `0x${string}`) {
  const [pending, setPending] = useState(false);
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  const reads = useReadContracts({
    contracts: [
      {
        address: contractAddresses.AMMPool as `0x${string}`,
        abi: abis.AMMPool,
        functionName: "getPoolStatus"
      },
      {
        address: contractAddresses.AMMPool as `0x${string}`,
        abi: abis.AMMPool,
        functionName: "getReserves"
      },
      {
        address: contractAddresses.AMMPool as `0x${string}`,
        abi: abis.AMMPool,
        functionName: "getCurrentFeeRate"
      },
      {
        address: contractAddresses.AMMPool as `0x${string}`,
        abi: abis.AMMPool,
        functionName: "getRemainingDailyGT",
        args: address ? [address] : undefined
      },
      {
        address: contractAddresses.AMMPool as `0x${string}`,
        abi: abis.AMMPool,
        functionName: "getCurrentImmediateLimit",
        args: address ? [address] : undefined
      },
      {
        address: contractAddresses.GreenToken as `0x${string}`,
        abi: abis.GreenToken,
        functionName: "balanceOf",
        args: [contractAddresses.AMMPool as `0x${string}`]
      },
      {
        address: contractAddresses.RewardToken as `0x${string}`,
        abi: abis.RewardToken,
        functionName: "balanceOf",
        args: [contractAddresses.AMMPool as `0x${string}`]
      }
    ]
  });

  async function approveToken(token: "GT" | "RT", amount: string) {
    if (!publicClient) throw new Error("Public client unavailable");
    const hash = await writeContractAsync({
      address:
        token === "GT"
          ? (contractAddresses.GreenToken as `0x${string}`)
          : (contractAddresses.RewardToken as `0x${string}`),
      abi: token === "GT" ? abis.GreenToken : abis.RewardToken,
      functionName: "approve",
      args: [
        contractAddresses.AMMPool as `0x${string}`,
        parseUnits(amount || "0", 0)
      ]
    });
    return publicClient.waitForTransactionReceipt({ hash });
  }

  async function swap(direction: "GT_TO_RT" | "RT_TO_GT", amountIn: string, minOut: string) {
    if (!publicClient) throw new Error("Public client unavailable");
    setPending(true);
    try {
      const hash = await writeContractAsync({
        address: contractAddresses.AMMPool as `0x${string}`,
        abi: abis.AMMPool,
        functionName: direction === "GT_TO_RT" ? "swapGTforRT" : "swapRTforGT",
        args: [parseUnits(amountIn || "0", 0), parseUnits(minOut || "0", 0)]
      });
      return await publicClient.waitForTransactionReceipt({ hash });
    } finally {
      setPending(false);
    }
  }

  return { ...reads, approveToken, swap, pending };
}
