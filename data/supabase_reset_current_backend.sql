-- CampusSwap Supabase reset schema aligned with the current frontend/backend.
-- This script drops existing app tables, then recreates them.

DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.votes CASCADE;
DROP TABLE IF EXISTS public.redemptions CASCADE;
DROP TABLE IF EXISTS public.tasks CASCADE;
DROP TABLE IF EXISTS public.user_profiles CASCADE;

CREATE TABLE public.user_profiles (
  address VARCHAR(42) PRIMARY KEY CHECK (address = LOWER(address) AND address LIKE '0x%'),
  full_name VARCHAR(100) NOT NULL CHECK (LENGTH(TRIM(full_name)) > 0),
  student_id VARCHAR(20) NOT NULL UNIQUE CHECK (LENGTH(TRIM(student_id)) > 0),
  email VARCHAR(100),
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

CREATE INDEX idx_profiles_student_id ON public.user_profiles(student_id);
CREATE INDEX idx_profiles_email ON public.user_profiles(email) WHERE email IS NOT NULL;

CREATE TABLE public.tasks (
  id BIGSERIAL PRIMARY KEY,
  on_chain_task_id INTEGER UNIQUE,
  tx_hash VARCHAR(66),
  block_number BIGINT,
  proof_cid VARCHAR(64) NOT NULL,
  submitter_address VARCHAR(42) NOT NULL CHECK (submitter_address = LOWER(submitter_address)),
  action_type VARCHAR(50) NOT NULL,
  title VARCHAR(200),
  description TEXT,
  location VARCHAR(200),
  activity_date DATE,
  gt_reward INTEGER NOT NULL DEFAULT 5,
  status VARCHAR(20) NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('submitted', 'verifying', 'approved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tasks_submitter ON public.tasks(submitter_address);
CREATE INDEX idx_tasks_on_chain_id ON public.tasks(on_chain_task_id);
CREATE INDEX idx_tasks_status ON public.tasks(status);
CREATE INDEX idx_tasks_action_type ON public.tasks(action_type);
CREATE INDEX idx_tasks_created_at ON public.tasks(created_at DESC);

CREATE TABLE public.redemptions (
  id BIGSERIAL PRIMARY KEY,
  address VARCHAR(42) NOT NULL CHECK (address = LOWER(address) AND address LIKE '0x%'),
  reward_id INTEGER NOT NULL,
  reward_name VARCHAR(200) NOT NULL,
  cost NUMERIC(36, 18) NOT NULL CHECK (cost > 0),
  claimed BOOLEAN NOT NULL DEFAULT false,
  claimed_at TIMESTAMPTZ,
  claimed_by VARCHAR(100),
  tx_hash VARCHAR(66) NOT NULL UNIQUE CHECK (tx_hash = LOWER(tx_hash) AND tx_hash LIKE '0x%'),
  block_number BIGINT,
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_redemptions_address ON public.redemptions(address);
CREATE INDEX idx_redemptions_tx_hash ON public.redemptions(tx_hash);
CREATE INDEX idx_redemptions_claimed ON public.redemptions(claimed) WHERE claimed = false;
CREATE INDEX idx_redemptions_redeemed_at ON public.redemptions(redeemed_at DESC);

CREATE TABLE public.votes (
  id BIGSERIAL PRIMARY KEY,
  task_id INTEGER NOT NULL,
  verifier_address VARCHAR(42) NOT NULL CHECK (verifier_address = LOWER(verifier_address)),
  approve BOOLEAN NOT NULL,
  comment TEXT,
  tx_hash VARCHAR(66),
  voted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(task_id, verifier_address)
);

CREATE INDEX idx_votes_task ON public.votes(task_id);
CREATE INDEX idx_votes_verifier ON public.votes(verifier_address);

CREATE TABLE public.notifications (
  id BIGSERIAL PRIMARY KEY,
  recipient_address VARCHAR(42) NOT NULL CHECK (recipient_address = LOWER(recipient_address)),
  type VARCHAR(50) NOT NULL,
  payload JSONB NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  email_sent BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notif_recipient ON public.notifications(recipient_address);
CREATE INDEX idx_notif_unread ON public.notifications(recipient_address, read) WHERE read = false;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY profiles_select_all ON public.user_profiles FOR SELECT USING (true);
CREATE POLICY profiles_insert_all ON public.user_profiles FOR INSERT WITH CHECK (true);
CREATE POLICY profiles_update_all ON public.user_profiles FOR UPDATE USING (true);

CREATE POLICY tasks_select_all ON public.tasks FOR SELECT USING (true);
CREATE POLICY tasks_insert_all ON public.tasks FOR INSERT WITH CHECK (true);
CREATE POLICY tasks_update_all ON public.tasks FOR UPDATE USING (true);

CREATE POLICY redemptions_select_all ON public.redemptions FOR SELECT USING (true);
CREATE POLICY redemptions_insert_all ON public.redemptions FOR INSERT WITH CHECK (true);
CREATE POLICY redemptions_update_all ON public.redemptions FOR UPDATE USING (true);

CREATE POLICY votes_select_all ON public.votes FOR SELECT USING (true);
CREATE POLICY votes_insert_all ON public.votes FOR INSERT WITH CHECK (true);

CREATE POLICY notifications_select_all ON public.notifications FOR SELECT USING (true);
CREATE POLICY notifications_insert_all ON public.notifications FOR INSERT WITH CHECK (true);
