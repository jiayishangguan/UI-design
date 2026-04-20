export type OnChainTask = {
  submitter: string;
  actionType: string;
  proofCID: string;
  gtReward: bigint;
  approvals: bigint;
  rejections: bigint;
  status: number;
  timestamp: bigint;
  voteDeadline: bigint;
  gtQueued: boolean;
  gtClaimed: boolean;
  verifiers: readonly string[];
  verifierCount: number;
};

export type RewardCatalogItem = {
  id: number;
  name: string;
  baseCost: bigint;
  active: boolean;
  currentCost?: bigint;
};

export type GovernanceProposal = {
  id: number;
  actionType: number;
  targetContract: string;
  proposer: string;
  approvalCount: bigint;
  status: number;
  effectiveStatus?: number;
  hasApproved?: boolean;
  validTarget?: boolean;
  executionHint?: string;
  summary?: string;
  details?: Array<{ label: string; value: string }>;
  detailText?: string;
  createdAt: bigint;
};

export type CommitteeOverview = {
  members: string[];
  threshold?: bigint;
  isCommitteeMember?: boolean;
};
