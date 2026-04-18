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
export const LEVEL_LABELS = ["Seed", "Bronze", "Silver", "Gold"] as const;
export const LEVEL_DESCRIPTIONS = [
  "Connected wallet with no verified mint history yet.",
  "Early sustainability contributor with 50+ lifetime GT minted.",
  "Established campus contributor with 200+ lifetime GT minted.",
  "Top tier sustainability leader with 500+ lifetime GT minted."
] as const;

export const ACTION_TYPE_OPTIONS = [
  { value: 0, label: "ADD_MEMBER" },
  { value: 1, label: "REMOVE_MEMBER" },
  { value: 2, label: "INIT_POOL" },
  { value: 3, label: "INJECT_BUFFER" },
  { value: 5, label: "SET_GT_MINTER" },
  { value: 6, label: "SET_RT_MINTER" },
  { value: 7, label: "MINT_RT" },
  { value: 8, label: "ADD_REWARD" },
  { value: 9, label: "REMOVE_REWARD" },
  { value: 10, label: "GENERIC_CALL" }
] as const;
