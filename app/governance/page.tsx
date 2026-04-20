"use client";
// The GovernancePage component serves as the main interface for users to view and interact with governance proposals. 
// It retrieves the connected wallet and loads governance-related data, which is then passed to the GovernancePanel component for display and interaction.
import { GovernancePanel } from "@/components/governance/governance-panel";
import { useAppWallet } from "@/hooks/use-app-wallet";
import { useGovernance } from "@/hooks/use-governance";

export default function GovernancePage() {
  const wallet = useAppWallet();
  const governance = useGovernance(wallet.address as `0x${string}` | undefined);
// The GovernancePanel component receives the loaded governance data, including proposals, members, threshold, and committee membership status.
  return (
    <GovernancePanel
      proposals={governance.proposals}
      members={governance.members}
      threshold={governance.data?.[1]?.result as bigint | undefined}
      isCommitteeMember={governance.data?.[3]?.result as boolean | undefined}
      actionError={governance.actionError}
      onApprove={governance.approveProposal}
      onCancel={governance.cancelProposal}
      onPropose={governance.propose}
    />
  );
}
