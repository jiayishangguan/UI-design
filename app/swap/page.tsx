"use client";

import { SwapPanel } from "@/components/swap/swap-panel";
import { useAppWallet } from "@/hooks/use-app-wallet";
import { useSwap } from "@/hooks/use-swap";

export default function SwapPage() {
  const wallet = useAppWallet();
  const swap = useSwap(wallet.address as `0x${string}` | undefined);

  return (
    <SwapPanel
      feeRate={swap.data?.[1]?.result as bigint | undefined}
      reserves={swap.data?.[0]?.result as readonly [bigint, bigint, bigint] | undefined}
      remainingDailyGt={swap.data?.[2]?.result as bigint | undefined}
      immediateLimit={swap.data?.[3]?.result as bigint | undefined}
      onApprove={swap.approveToken}
      onSwap={swap.swap}
    />
  );
}
