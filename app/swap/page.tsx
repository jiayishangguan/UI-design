"use client";

// We use this page for the token swap feature.
// It connects wallet data with the swap panel.

import { SwapPanel } from "@/components/swap/swap-panel";
import { useAppWallet } from "@/hooks/use-app-wallet";
import { useSwap } from "@/hooks/use-swap";

export default function SwapPage() {

  const wallet = useAppWallet();
  const swap = useSwap(wallet.address as `0x${string}` | undefined);

  return (
    <SwapPanel
      // We pass pool data, wallet balances, and swap actions into the UI.
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
