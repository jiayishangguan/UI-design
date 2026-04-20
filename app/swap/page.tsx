"use client";
// The SwapPage component provides the user interface for token swapping functionality.
import { SwapPanel } from "@/components/swap/swap-panel";
import { useAppWallet } from "@/hooks/use-app-wallet";
import { useSwap } from "@/hooks/use-swap";

export default function SwapPage() {
  // It retrieves the connected wallet and loads swap-related data, which is then passed to the SwapPanel component for display and interaction.
  const wallet = useAppWallet();
  const swap = useSwap(wallet.address as `0x${string}` | undefined);

  return (
    <SwapPanel
      // The SwapPanel component receives various pieces of data related to the swap, including token reserves, pool status, remaining daily GT, immediate limit, and the user's wallet balances.
      //  It also receives functions for approving tokens and executing swaps.
      reserves={swap.data?.[1]?.result as readonly [bigint, bigint, bigint] | undefined}
      poolStatus={swap.data?.[0]?.result as readonly [bigint, bigint, bigint, bigint, bigint] | undefined}
      remainingDailyGt={swap.data?.[3]?.result as bigint | undefined}
      immediateLimit={swap.data?.[4]?.result as bigint | undefined}
      walletGt={wallet.gtBalance.data?.value}
      walletRt={wallet.rtBalance.data?.value}
      onApprove={swap.approveToken}
      onSwap={swap.swap}
    />
  );
}
