"use client";

import { CommitteePanel } from "@/components/governance/committee-panel";
import { useAppWallet } from "@/hooks/use-app-wallet";
import { useGovernance } from "@/hooks/use-governance";

export default function CommitteesPage() {
  const wallet = useAppWallet();
  const governance = useGovernance(wallet.address as `0x${string}` | undefined);

  return (
    <CommitteePanel
      members={governance.members}
      threshold={governance.data?.[1]?.result as bigint | undefined}
      isCommitteeMember={governance.data?.[3]?.result as boolean | undefined}
      proposals={governance.proposals}
    />
  );
}
