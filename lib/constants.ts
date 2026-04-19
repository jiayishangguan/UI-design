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
  { value: 4, label: "SET_GT_MINTER" },
  { value: 5, label: "SET_RT_MINTER" },
  { value: 6, label: "MINT_RT" },
  { value: 7, label: "ADD_REWARD" },
  { value: 8, label: "REMOVE_REWARD" },
  { value: 9, label: "GENERIC_CALL" },
  { value: 10, label: "MINT_GT" },
  { value: 11, label: "LOCK_START" }
] as const;

export type GovernanceFieldConfig = {
  key: string;
  label: string;
  placeholder: string;
  input: "text" | "address" | "number" | "textarea";
  helper?: string;
};

export const GOVERNANCE_ACTION_DETAILS = {
  0: {
    title: "Add a committee member",
    description: "Add one wallet address to the committee member set.",
    targetLabel: "CommitteeManager contract",
    inputModeLabel: "Fill in the new member wallet",
    defaults: { address: "" },
    fields: [
      { key: "address", label: "New member wallet", placeholder: "0x...", input: "address", helper: "Enter the wallet to add." }
    ] satisfies GovernanceFieldConfig[]
  },
  1: {
    title: "Remove a committee member",
    description: "Remove one wallet address from the committee member set.",
    targetLabel: "CommitteeManager contract",
    inputModeLabel: "Fill in the member wallet to remove",
    defaults: { address: "" },
    fields: [
      { key: "address", label: "Member wallet", placeholder: "0x...", input: "address", helper: "Enter the wallet to remove." }
    ] satisfies GovernanceFieldConfig[]
  },
  2: {
    title: "Initialise the GT/RT pool",
    description: "Seed the AMM pool with the first GT and RT reserves.",
    targetLabel: "AMMPool contract",
    inputModeLabel: "Set the initial GT and RT reserves",
    defaults: { gtAmount: "100", rtAmount: "100" },
    fields: [
      { key: "gtAmount", label: "GT amount", placeholder: "100", input: "number", helper: "Initial green-token reserve." },
      { key: "rtAmount", label: "RT amount", placeholder: "100", input: "number", helper: "Initial reward-token reserve." }
    ] satisfies GovernanceFieldConfig[]
  },
  3: {
    title: "Inject RT buffer",
    description: "Top up the AMM reward-token buffer with additional RT.",
    targetLabel: "AMMPool contract",
    inputModeLabel: "Enter the RT amount to inject",
    defaults: { amount: "100" },
    fields: [{ key: "amount", label: "RT amount", placeholder: "250", input: "number", helper: "Additional RT to move into the buffer." }] satisfies GovernanceFieldConfig[]
  },
  4: {
    title: "Set GT minter",
    description: "Set the GreenToken minter address.",
    targetLabel: "GreenToken contract",
    inputModeLabel: "Set the new GT minter wallet",
    defaults: { address: "" },
    fields: [
      { key: "address", label: "Minter wallet", placeholder: "0x...", input: "address", helper: "This wallet will be allowed to mint GT." }
    ] satisfies GovernanceFieldConfig[]
  },
  5: {
    title: "Set RT minter",
    description: "Set the RewardToken minter address.",
    targetLabel: "RewardToken contract",
    inputModeLabel: "Set the new RT minter wallet",
    defaults: { address: "" },
    fields: [
      { key: "address", label: "Minter wallet", placeholder: "0x...", input: "address", helper: "This wallet will be allowed to mint RT." }
    ] satisfies GovernanceFieldConfig[]
  },
  6: {
    title: "Mint RT",
    description: "Mint reward tokens to a wallet address.",
    targetLabel: "RewardToken contract",
    inputModeLabel: "Choose the recipient and amount",
    defaults: { to: "", amount: "10" },
    fields: [
      { key: "to", label: "Recipient wallet", placeholder: "0x...", input: "address", helper: "Wallet that will receive RT." },
      { key: "amount", label: "RT amount", placeholder: "30", input: "number", helper: "Whole-token amount to mint." }
    ] satisfies GovernanceFieldConfig[]
  },
  7: {
    title: "Add reward",
    description: "Create a new redemption item in the reward catalogue.",
    targetLabel: "RewardRedemption contract",
    inputModeLabel: "Enter the reward name and base cost",
    defaults: { name: "Coffee Voucher", baseCost: "20" },
    fields: [
      { key: "name", label: "Reward name", placeholder: "Coffee Voucher", input: "text", helper: "How the reward will appear in the catalogue." },
      { key: "baseCost", label: "Base cost", placeholder: "20", input: "number", helper: "RT cost when reserves are at target." }
    ] satisfies GovernanceFieldConfig[]
  },
  8: {
    title: "Remove reward",
    description: "Deactivate one reward by its on-chain reward ID.",
    targetLabel: "RewardRedemption contract",
    inputModeLabel: "Enter the reward ID to deactivate",
    defaults: { rewardId: "0" },
    fields: [
      { key: "rewardId", label: "Reward ID", placeholder: "2", input: "number", helper: "Use the on-chain reward ID." }
    ] satisfies GovernanceFieldConfig[]
  },
  9: {
    title: "Generic call",
    description: "Send already-encoded call data to the selected target contract. Use only for advanced actions.",
    targetLabel: "Custom target contract",
    inputModeLabel: "Advanced mode",
    defaults: { targetContract: "", callData: "0x" },
    fields: [
      { key: "targetContract", label: "Target contract", placeholder: "0x...", input: "address", helper: "The contract that will receive the call." },
      { key: "callData", label: "Encoded calldata", placeholder: "0x1234abcd", input: "textarea", helper: "Already-encoded function calldata." }
    ] satisfies GovernanceFieldConfig[]
  },
  10: {
    title: "Mint GT",
    description: "Mint green tokens directly to a wallet address.",
    targetLabel: "GreenToken contract",
    inputModeLabel: "Choose the recipient and amount",
    defaults: { to: "", amount: "10" },
    fields: [
      { key: "to", label: "Recipient wallet", placeholder: "0x...", input: "address", helper: "Wallet that will receive GT." },
      { key: "amount", label: "GT amount", placeholder: "25", input: "number", helper: "Whole-token amount to mint." }
    ] satisfies GovernanceFieldConfig[]
  },
  11: {
    title: "Lock start",
    description: "Run the lock-start setup action. This action does not require JSON parameters.",
    targetLabel: "CommitteeManager contract",
    inputModeLabel: "No extra fields required",
    defaults: {},
    fields: [] satisfies GovernanceFieldConfig[]
  }
} as const;
