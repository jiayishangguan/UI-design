import activityVerification from "@/contracts/abis/ActivityVerification.json";
import ammPool from "@/contracts/abis/AMMPool.json";
import committeeManager from "@/contracts/abis/CommitteeManager.json";
import greenToken from "@/contracts/abis/GreenToken.json";
import rewardRedemption from "@/contracts/abis/RewardRedemption.json";
import rewardToken from "@/contracts/abis/RewardToken.json";
import verifierManager from "@/contracts/abis/VerifierManager.json";

export const abis = {
  ActivityVerification: activityVerification.abi,
  VerifierManager: verifierManager.abi,
  AMMPool: ammPool.abi,
  RewardRedemption: rewardRedemption.abi,
  GreenToken: greenToken.abi,
  RewardToken: rewardToken.abi,
  CommitteeManager: committeeManager.abi
} as const;
