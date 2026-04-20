"use client";
// The CommitteesPage component serves as the main interface for users to view information about the governance committees. 
// It retrieves the connected wallet and loads governance-related data, which is then passed to the CommitteePanel component for display.
import { CommitteePanel } from "@/components/governance/committee-panel";
import { useAppWallet } from "@/hooks/use-app-wallet";
import { useGovernance } from "@/hooks/use-governance";

export default function CommitteesPage() {
  const wallet = useAppWallet();
  const governance = useGovernance(wallet.address as `0x${string}` | undefined);

  return (
    <CommitteePanel
    //  Pass the loaded governance data to the CommitteePanel component for display.
      members={governance.members}
      threshold={governance.data?.[1]?.result as bigint | undefined}
      isCommitteeMember={governance.data?.[3]?.result as boolean | undefined}
      proposals={governance.proposals}
    />
  );
}
