"use client";

import { useState } from "react";
import { formatUnits } from "viem";
import { usePublicClient, useWriteContract } from "wagmi";

import { abis } from "@/lib/contracts/abis";
import { contractAddresses } from "@/lib/contracts/addresses";
import { getReadableErrorMessage } from "@/lib/errors";
import { TOKEN_DECIMALS } from "@/lib/format";
import { createRedemption } from "@/lib/supabase/mutations";

export function useRedeemReward() {
  const [pending, setPending] = useState(false);
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  async function approve(cost: bigint) {
    if (!publicClient) throw new Error("Public client unavailable");
    const hash = await writeContractAsync({
      address: contractAddresses.RewardToken as `0x${string}`,
      abi: abis.RewardToken,
      functionName: "approve",
      args: [contractAddresses.RewardRedemption as `0x${string}`, cost]
    });
    return publicClient.waitForTransactionReceipt({ hash });
  }

  async function redeem(params: {
    rewardId: number;
    rewardName: string;
    cost: bigint;
    address: string;
  }) {
    if (!publicClient) throw new Error("Public client unavailable");
    setPending(true);
    try {
      const hash = await writeContractAsync({
        address: contractAddresses.RewardRedemption as `0x${string}`,
        abi: abis.RewardRedemption,
        functionName: "redeem",
        args: [BigInt(params.rewardId)]
      });
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      let record;
      try {
        record = await createRedemption({
          address: params.address.toLowerCase(),
          reward_id: params.rewardId,
          reward_name: params.rewardName,
          cost: formatUnits(params.cost, TOKEN_DECIMALS),
          claimed: false,
          claimed_at: null,
          claimed_by: null,
          tx_hash: hash,
          block_number: Number(receipt.blockNumber),
          redeemed_at: new Date().toISOString()
        });
      } catch (error) {
        throw new Error(
          `Redemption confirmed on-chain, but saving the redemption record failed. Transaction: ${hash}. ${getReadableErrorMessage(
            error,
            "Please check the redemptions table configuration."
          )}`
        );
      }
      return { receipt, record };
    } finally {
      setPending(false);
    }
  }

  return { approve, redeem, pending };
}
