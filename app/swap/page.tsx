"use client";

import { SwapPanel } from "@/components/swap/swap-panel";
import { useAppWallet } from "@/hooks/use-app-wallet";
import { useSwap } from "@/hooks/use-swap";

export default function SwapPage() {
  const wallet = useAppWallet();
  const swap = useSwap(wallet.address as `0x${string}` | undefined);

  return (
    <SwapPanel
      feeRate={swap.data?.[2]?.result as bigint | undefined}
      reserves={swap.data?.[1]?.result as readonly [bigint, bigint, bigint] | undefined}
      poolStatus={swap.data?.[0]?.result as readonly [bigint, bigint, bigint, bigint, bigint] | undefined}
      remainingDailyGt={swap.data?.[3]?.result as bigint | undefined}
      immediateLimit={swap.data?.[4]?.result as bigint | undefined}
      actualPoolGt={swap.data?.[5]?.result as bigint | undefined}
      actualPoolRt={swap.data?.[6]?.result as bigint | undefined}
      walletGt={wallet.gtBalance.data?.value}
      walletRt={wallet.rtBalance.data?.value}
      onApprove={swap.approveToken}
      onSwap={swap.swap}
    />
  );
}
