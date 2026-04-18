export const APP_NAME = "CampusSwap";
export const PROFILE_REQUIRED_ROUTES = ["/submit", "/rewards", "/verifier-pool"] as const;
export const ACTION_TYPES = [
  "Recycling",
  "Tree Planting",
  "Energy Saving",
  "Campus Cleanup",
  "Bike Commuting",
  "Food Waste Reduction"
] as const;

export const TASK_STATUS_LABELS = ["Pending", "Approved", "Rejected"] as const;
export const GOVERNANCE_PHASE_LABELS = ["Phase 1", "Phase 2", "Phase 3"] as const;
export const GOVERNANCE_PHASE_DETAILS = [
  "Phase 1 uses committee members as the review pool because there are not enough active verifiers yet.",
  "Phase 2 mixes committee members with eligible verifier-pool members.",
  "Phase 3 uses only the verifier pool for activity review."
] as const;
export const PROPOSAL_STATUS_LABELS = ["Pending", "Executed", "Cancelled", "Expired"] as const;
export const LEVEL_LABELS = ["Bronze", "Silver", "Gold"] as const;
export const LEVEL_DESCRIPTIONS = [
  "Early sustainability contributor with 50+ lifetime GT minted.",
  "Established campus contributor with 200+ lifetime GT minted.",
  "Top tier sustainability leader with 500+ lifetime GT minted."
] as const;

export function getLevelMeta(tier: number) {
  if (tier <= 0) {
    return {
      numericLevel: 1,
      levelName: "Bronze",
      shortLabel: "Level 1 · Bronze",
      description: "Default entry level for connected members before higher on-chain milestones are reached."
    };
  }

  const safeIndex = Math.min(Math.max(tier - 1, 0), LEVEL_LABELS.length - 1);
  return {
    numericLevel: tier,
    levelName: LEVEL_LABELS[safeIndex],
    shortLabel: `Level ${tier} · ${LEVEL_LABELS[safeIndex]}`,
    description: LEVEL_DESCRIPTIONS[safeIndex]
  };
}

export const ACTION_TYPE_OPTIONS = [
  { value: 0, label: "ADD_MEMBER" },
  { value: 1, label: "REMOVE_MEMBER" },
  { value: 2, label: "INIT_POOL" },
  { value: 3, label: "INJECT_BUFFER" },
  { value: 4, label: "SET_FEE_RECIPIENT (Reserved)", disabled: true },
  { value: 5, label: "SET_GT_MINTER" },
  { value: 6, label: "SET_RT_MINTER" },
  { value: 7, label: "MINT_RT" },
  { value: 8, label: "ADD_REWARD" },
  { value: 9, label: "REMOVE_REWARD" },
  { value: 10, label: "GENERIC_CALL" },
  { value: 11, label: "MINT_GT" },
  { value: 12, label: "LOCK_START" }
] as const;

export const GOVERNANCE_ACTION_DETAILS = {
  0: {
    title: "Add a committee member",
    description: "Add one wallet address to the committee member set.",
    targetLabel: "CommitteeManager contract",
    formatLabel: "Expected JSON format",
    template: { address: "0x0000000000000000000000000000000000000000" },
    example: { address: "0x1234567890abcdef1234567890abcdef12345678" }
  },
  1: {
    title: "Remove a committee member",
    description: "Remove one wallet address from the committee member set.",
    targetLabel: "CommitteeManager contract",
    formatLabel: "Expected JSON format",
    template: { address: "0x0000000000000000000000000000000000000000" },
    example: { address: "0x1234567890abcdef1234567890abcdef12345678" }
  },
  2: {
    title: "Initialise the GT/RT pool",
    description: "Seed the AMM pool with the first GT and RT reserves.",
    targetLabel: "AMMPool contract",
    formatLabel: "Expected JSON format",
    template: { gtAmount: "100", rtAmount: "100" },
    example: { gtAmount: "500", rtAmount: "500" }
  },
  3: {
    title: "Inject RT buffer",
    description: "Top up the AMM reward-token buffer with additional RT.",
    targetLabel: "AMMPool contract",
    formatLabel: "Expected JSON format",
    template: { amount: "100" },
    example: { amount: "250" }
  },
  4: {
    title: "Set fee recipient",
    description: "Reserved enum slot kept only to preserve on-chain indices. Do not use this action.",
    targetLabel: "Reserved / disabled",
    formatLabel: "Expected JSON format",
    template: {},
    example: {}
  },
  5: {
    title: "Set GT minter",
    description: "Set the GreenToken minter address.",
    targetLabel: "GreenToken contract",
    formatLabel: "Expected JSON format",
    template: { address: "0x0000000000000000000000000000000000000000" },
    example: { address: "0x1234567890abcdef1234567890abcdef12345678" }
  },
  6: {
    title: "Set RT minter",
    description: "Set the RewardToken minter address.",
    targetLabel: "RewardToken contract",
    formatLabel: "Expected JSON format",
    template: { address: "0x0000000000000000000000000000000000000000" },
    example: { address: "0x1234567890abcdef1234567890abcdef12345678" }
  },
  7: {
    title: "Mint RT",
    description: "Mint reward tokens to a wallet address.",
    targetLabel: "RewardToken contract",
    formatLabel: "Expected JSON format",
    template: { to: "0x0000000000000000000000000000000000000000", amount: "10" },
    example: { to: "0x1234567890abcdef1234567890abcdef12345678", amount: "30" }
  },
  8: {
    title: "Add reward",
    description: "Create a new redemption item in the reward catalogue.",
    targetLabel: "RewardRedemption contract",
    formatLabel: "Expected JSON format",
    template: { name: "Coffee Voucher", baseCost: "20" },
    example: { name: "Sandwich Voucher", baseCost: "30" }
  },
  9: {
    title: "Remove reward",
    description: "Deactivate one reward by its on-chain reward ID.",
    targetLabel: "RewardRedemption contract",
    formatLabel: "Expected JSON format",
    template: { rewardId: "0" },
    example: { rewardId: "2" }
  },
  10: {
    title: "Generic call",
    description: "Send already-encoded call data to the selected target contract. Use only for advanced actions.",
    targetLabel: "Custom target contract",
    formatLabel: "Expected JSON format",
    template: { callData: "0x" },
    example: { callData: "0x1234abcd" }
  },
  11: {
    title: "Mint GT",
    description: "Mint green tokens directly to a wallet address.",
    targetLabel: "GreenToken contract",
    formatLabel: "Expected JSON format",
    template: { to: "0x0000000000000000000000000000000000000000", amount: "10" },
    example: { to: "0x1234567890abcdef1234567890abcdef12345678", amount: "25" }
  },
  12: {
    title: "Lock start",
    description: "Run the lock-start setup action. This action does not require JSON parameters.",
    targetLabel: "CommitteeManager contract",
    formatLabel: "Expected JSON format",
    template: {},
    example: {}
  }
} as const;
