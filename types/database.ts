export type UserProfile = {
  address: string;
  full_name: string;
  student_id: string;
  email: string | null;
  avatar_url: string | null;
  bio: string | null;
  created_at?: string;
  updated_at?: string;
  last_login_at?: string | null;
};

export type TaskRecord = {
  id: number;
  on_chain_task_id: number | null;
  tx_hash: string | null;
  block_number: number | null;
  proof_cid: string;
  submitter_address: string;
  action_type: string;
  title: string | null;
  description: string | null;
  location: string | null;
  activity_date: string | null;
  gt_reward: number;
  status: "submitted" | "verifying" | "approved" | "rejected";
  created_at?: string;
  updated_at?: string;
};

export type RedemptionRecord = {
  id: number;
  address: string;
  reward_id: number;
  reward_name: string;
  cost: number | string;
  redemption_code?: string | null;
  claimed: boolean;
  claimed_at: string | null;
  claimed_by: string | null;
  tx_hash: string;
  block_number: number | null;
  redeemed_at?: string;
};
