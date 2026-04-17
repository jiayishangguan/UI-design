"use client";

import { useMemo } from "react";
import { useReadContract, useReadContracts } from "wagmi";

import { abis } from "@/lib/contracts/abis";
import { contractAddresses } from "@/lib/contracts/addresses";

export function useDashboardReads(address?: `0x${string}`) {
  const reads = useReadContracts({
    contracts: [
      {
        address: contractAddresses.GreenToken as `0x${string}`,
        abi: abis.GreenToken,
        functionName: "getTier",
        args: address ? [address] : undefined
      },
      {
        address: contractAddresses.GreenToken as `0x${string}`,
        abi: abis.GreenToken,
        functionName: "totalMinted",
        args: address ? [address] : undefined
      },
      {
        address: contractAddresses.VerifierManager as `0x${string}`,
        abi: abis.VerifierManager,
        functionName: "getPhase"
      },
      {
        address: contractAddresses.AMMPool as `0x${string}`,
        abi: abis.AMMPool,
        functionName: "getReserves"
      }
    ],
    query: { enabled: Boolean(address) }
  });

  return useMemo(() => reads, [reads]);
}

export function useTaskCount() {
  return useReadContract({
    address: contractAddresses.ActivityVerification as `0x${string}`,
    abi: abis.ActivityVerification,
    functionName: "taskCount"
  });
}
