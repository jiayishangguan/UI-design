window.CAMPUS_SWAP_CONFIG = {
  appName: "CampusSwap",
  chainLabel: "Local / Compatible EVM",
  contracts: {
    committeeManager: "",
    greenToken: "",
    rewardToken: "",
    activityVerification: "",
    ammPool: "",
    rewardRedemption: "",
  },
  artifacts: {
    committeeManager: "../../artifacts/Contracts/CommitteeManager.sol/CommitteeManager.json",
    greenToken: "../../artifacts/Contracts/GreenToken.sol/GreenToken.json",
    rewardToken: "../../artifacts/Contracts/RewardToken.sol/RewardToken.json",
    activityVerification:
      "../../artifacts/Contracts/ActivityVerification.sol/ActivityVerification.json",
    ammPool: "../../artifacts/Contracts/AMMPool.sol/AMMPool.json",
    rewardRedemption:
      "../../artifacts/Contracts/RewardRedemption.sol/RewardRedemption.json",
  },
  defaults: {
    earnRewardAmount: 5,
    swapSlippageBps: 300,
  },
};
