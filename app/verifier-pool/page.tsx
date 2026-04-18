"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { ProfileGateDialog } from "@/components/profile/profile-gate-dialog";
import { VerifierPoolCard } from "@/components/verifier-pool/verifier-pool-card";
import { useAppWallet } from "@/hooks/use-app-wallet";
import { useProfile } from "@/hooks/use-profile";
import { useVerifierPool } from "@/hooks/use-verifier-pool";

export default function VerifierPoolPage() {
  const router = useRouter();
  const wallet = useAppWallet();
  const { hasProfile, saveProfile } = useProfile(wallet.address);
  const verifierPool = useVerifierPool(wallet.address as `0x${string}` | undefined);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);

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
      <VerifierPoolCard
        threshold={verifierPool.data?.[0]?.result as bigint | undefined}
        stakeAmount={verifierPool.data?.[1]?.result as bigint | undefined}
        minStake={verifierPool.data?.[2]?.result as bigint | undefined}
        phase={Number(verifierPool.data?.[3]?.result ?? 0)}
        verifier={verifierPool.data?.[4]?.result as readonly [bigint, bigint, bigint, bigint, bigint, bigint, boolean] | undefined}
        activeTaskCount={verifierPool.data?.[5]?.result as bigint | undefined}
        onApproveStake={verifierPool.approveStake}
        onJoin={verifierPool.join}
        onLeave={verifierPool.leave}
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
