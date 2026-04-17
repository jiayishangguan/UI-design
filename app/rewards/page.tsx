"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useReadContract } from "wagmi";

import type { RewardCatalogItem } from "@/types/contracts";

import { RewardsCatalog } from "@/components/rewards/rewards-catalog";
import { ProfileGateDialog } from "@/components/profile/profile-gate-dialog";
import { useAppWallet } from "@/hooks/use-app-wallet";
import { useProfile } from "@/hooks/use-profile";
import { useRedeemReward } from "@/hooks/use-redeem-reward";
import { abis } from "@/lib/contracts/abis";
import { contractAddresses } from "@/lib/contracts/addresses";

export default function RewardsPage() {
  const router = useRouter();
  const wallet = useAppWallet();
  const { hasProfile, saveProfile } = useProfile(wallet.address);
  const { approve, redeem } = useRedeemReward();
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const catalogRead = useReadContract({
    address: contractAddresses.RewardRedemption as `0x${string}`,
    abi: abis.RewardRedemption,
    functionName: "getCatalog"
  });
  const [items, setItems] = useState<RewardCatalogItem[]>([]);

  useEffect(() => {
    const catalog = (catalogRead.data as { name: string; baseCost: bigint; active: boolean }[] | undefined) ?? [];
    Promise.all(
      catalog.map(async (item, id) => {
        if (!item.active) return { id, ...item };
        const response = await fetch(
          `/api/reward-cost?id=${id}`,
          { method: "GET" }
        ).catch(() => null);
        let currentCost = undefined;
        if (response?.ok) {
          const payload = await response.json();
          currentCost = BigInt(payload.cost);
        }
        return { id, ...item, currentCost };
      })
    )
      .then(setItems)
      .catch(() => setItems(catalog.map((item, id) => ({ id, ...item }))));
  }, [catalogRead.data]);

  useEffect(() => {
    if (!wallet.address) {
      setProfileDialogOpen(false);
      return;
    }
    if (!hasProfile) {
      setProfileDialogOpen(true);
      return;
    }
    setProfileDialogOpen(false);
  }, [hasProfile, wallet.address]);

  return (
    <>
      <RewardsCatalog
        items={items.filter((item) => item.active)}
        onApprove={approve}
        onRedeem={async (item) => {
          if (!wallet.address || !item.currentCost) throw new Error("Wallet and current cost required");
          await redeem({
            rewardId: item.id,
            rewardName: item.name,
            cost: item.currentCost,
            address: wallet.address
          });
        }}
      />
      <ProfileGateDialog
        address={wallet.address}
        open={profileDialogOpen}
        onClose={() => router.push("/")}
        onSave={async (input) => {
          await saveProfile(input);
          setProfileDialogOpen(false);
        }}
        allowDismiss={false}
        secondaryActionLabel="Back to Dashboard"
      />
    </>
  );
}
