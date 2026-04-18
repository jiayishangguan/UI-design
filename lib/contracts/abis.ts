import activityVerification from "@/Contracts/abis/ActivityVerification.json";
import ammPool from "@/Contracts/abis/AMMPool.json";
import committeeManager from "@/Contracts/abis/CommitteeManager.json";
import greenToken from "@/Contracts/abis/GreenToken.json";
import rewardRedemption from "@/Contracts/abis/RewardRedemption.json";
import rewardToken from "@/Contracts/abis/RewardToken.json";
import verifierManager from "@/Contracts/abis/VerifierManager.json";

export const abis = {
  ActivityVerification: activityVerification.abi,
  VerifierManager: verifierManager.abi,
  AMMPool: ammPool.abi,
  RewardRedemption: rewardRedemption.abi,
  GreenToken: greenToken.abi,
  RewardToken: rewardToken.abi,
  CommitteeManager: committeeManager.abi
} as const;
