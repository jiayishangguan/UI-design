import activityVerification from "@/Contracts/abis/ActivityVerification.json";
import ammPool from "@/Contracts/abis/AMMPool.json";
import committeeManager from "@/Contracts/abis/CommitteeManager.json";
import greenToken from "@/Contracts/abis/GreenToken.json";
import rewardRedemption from "@/Contracts/abis/RewardRedemption.json";
import rewardToken from "@/Contracts/abis/RewardToken.json";
import verifierManager from "@/Contracts/abis/VerifierManager.json";

const committeeManagerErrors = [
  { type: "error", name: "NotCommitteeMember", inputs: [] },
  { type: "error", name: "ZeroAddress", inputs: [] },
  { type: "error", name: "AlreadyMember", inputs: [] },
  { type: "error", name: "NotAMember", inputs: [] },
  { type: "error", name: "MaxMembersReached", inputs: [] },
  { type: "error", name: "MinMembersReached", inputs: [] },
  { type: "error", name: "DuplicateMember", inputs: [] },
  { type: "error", name: "InvalidMemberCount", inputs: [] },
  { type: "error", name: "ProposalNotPending", inputs: [] },
  { type: "error", name: "AlreadyApproved", inputs: [] },
  { type: "error", name: "ProposalExpired", inputs: [] },
  { type: "error", name: "OnlyProposerCanCancel", inputs: [] },
  { type: "error", name: "EmptyProposalData", inputs: [] },
  { type: "error", name: "ProposalNotFound", inputs: [] },
  { type: "error", name: "ExecutionFailed", inputs: [] },
  { type: "error", name: "StartPhaseLocked", inputs: [] },
  { type: "error", name: "StartAlreadyLocked", inputs: [] }
] as const;

export const abis = {
  ActivityVerification: activityVerification.abi,
  VerifierManager: verifierManager.abi,
  AMMPool: ammPool.abi,
  RewardRedemption: rewardRedemption.abi,
  GreenToken: greenToken.abi,
  RewardToken: rewardToken.abi,
  CommitteeManager: [...committeeManager.abi, ...committeeManagerErrors]
} as const;
