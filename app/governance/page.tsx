"use client";

import { GovernancePanel } from "@/components/governance/governance-panel";
import { useAppWallet } from "@/hooks/use-app-wallet";
import { useGovernance } from "@/hooks/use-governance";

export default function GovernancePage() {
  const wallet = useAppWallet();
  const governance = useGovernance(wallet.address as `0x${string}` | undefined);

  return (
    <GovernancePanel
      proposals={governance.proposals}
      members={governance.members}
      threshold={governance.data?.[1]?.result as bigint | undefined}
      isCommitteeMember={governance.data?.[3]?.result as boolean | undefined}
      actionError={governance.actionError}
      onApprove={governance.approveProposal}
      onExecute={governance.executeProposal}
      onCancel={governance.cancelProposal}
      onPropose={governance.propose}
    />
  );
}
