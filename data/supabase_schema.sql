-- ============================================================================
-- CampusSwap Supabase Database Schema
-- Version: 1.0 (aligned with protocol spec v1.2)
-- Target: Supabase (PostgreSQL 15+)
-- ============================================================================
-- 使用方法：
-- 1. 登录 Supabase → 你的项目 → SQL Editor → New query
-- 2. 复制本文件全部内容 → 粘贴 → Run
-- 3. 执行完毕后在 Table Editor 确认表结构
-- ============================================================================

-- 清理（如果重新建，先删旧的。首次执行可以忽略这段）
-- DROP TABLE IF EXISTS public.notifications CASCADE;
-- DROP TABLE IF EXISTS public.votes CASCADE;
-- DROP TABLE IF EXISTS public.redemptions CASCADE;
-- DROP TABLE IF EXISTS public.tasks CASCADE;
-- DROP TABLE IF EXISTS public.user_profiles CASCADE;


-- ════════════════════════════════════════════════════════════════════════════
-- 表 1: user_profiles（P0 必须）
-- 用户档案：钱包地址 + 校园身份（姓名、学号、邮箱）
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE public.user_profiles (
  -- 主键：钱包地址（小写存储，格式化为 0x 开头的 42 字符）
  address VARCHAR(42) PRIMARY KEY CHECK (address = LOWER(address) AND address LIKE '0x%'),
  
  -- 实物兑换必需
  full_name VARCHAR(100) NOT NULL CHECK (LENGTH(TRIM(full_name)) > 0),
  student_id VARCHAR(20) NOT NULL UNIQUE CHECK (LENGTH(TRIM(student_id)) > 0),
  
  -- 通知渠道（可选）
  email VARCHAR(100),
  
  -- 个性化（可选）
  avatar_url TEXT,
  bio TEXT,
  
  -- 元信息
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

CREATE INDEX idx_profiles_student_id ON public.user_profiles(student_id);
CREATE INDEX idx_profiles_email ON public.user_profiles(email) WHERE email IS NOT NULL;

COMMENT ON TABLE public.user_profiles IS 'User identity profiles linked to wallet addresses. 学生档案表';
COMMENT ON COLUMN public.user_profiles.address IS 'Wallet address, lowercased. 钱包地址（全小写）';
COMMENT ON COLUMN public.user_profiles.student_id IS 'Unique student ID, prevents multi-account abuse. 学号唯一，防刷奖';


-- ════════════════════════════════════════════════════════════════════════════
-- 表 2: tasks（P0 必须）
-- 任务元数据：链上任务 id + IPFS CID + 链下描述
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE public.tasks (
  id BIGSERIAL PRIMARY KEY,
  
  -- 链上映射（on_chain_task_id 初始为 NULL，等 tx 确认后填入）
  on_chain_task_id INTEGER UNIQUE,
  tx_hash VARCHAR(66),
  block_number BIGINT,
  
  -- 证据（对应合约 Task.proofCID）
  proof_cid VARCHAR(64) NOT NULL,
  
  -- 提交者（对应合约 Task.submitter，小写存储）
  submitter_address VARCHAR(42) NOT NULL 
    CHECK (submitter_address = LOWER(submitter_address)),
  
  -- 活动元数据（action_type 上链，其余仅 DB）
  action_type VARCHAR(50) NOT NULL,   -- "Recycling" / "Tree Planting" / ...
  title VARCHAR(200),
  description TEXT,
  location VARCHAR(200),
  activity_date DATE,
  gt_reward INTEGER NOT NULL DEFAULT 5,
  
  -- 状态镜像：'submitted' → 'verifying' → 'approved' / 'rejected'
  status VARCHAR(20) NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('submitted', 'verifying', 'approved', 'rejected')),
  
  -- 元信息
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tasks_submitter ON public.tasks(submitter_address);
CREATE INDEX idx_tasks_on_chain_id ON public.tasks(on_chain_task_id);
CREATE INDEX idx_tasks_status ON public.tasks(status);
CREATE INDEX idx_tasks_action_type ON public.tasks(action_type);
CREATE INDEX idx_tasks_created_at ON public.tasks(created_at DESC);

COMMENT ON TABLE public.tasks IS 'Off-chain mirror of ActivityVerification tasks. 任务元数据';


-- ════════════════════════════════════════════════════════════════════════════
-- 表 3: redemptions（P1 建议）
-- 奖品赎回记录：生成取餐码，咖啡店线下核销用
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE public.redemptions (
  id BIGSERIAL PRIMARY KEY,
  
  -- 用户（地址小写）
  address VARCHAR(42) NOT NULL 
    CHECK (address = LOWER(address)),
  
  -- 奖品快照（冗余存储，奖品被合约删除后仍可查看）
  reward_id INTEGER NOT NULL,
  reward_name VARCHAR(200) NOT NULL,
  cost INTEGER NOT NULL CHECK (cost > 0),
  
  -- 核销
  redemption_code VARCHAR(32) NOT NULL UNIQUE,
  claimed BOOLEAN NOT NULL DEFAULT false,
  claimed_at TIMESTAMPTZ,
  claimed_by VARCHAR(100),
  
  -- 链上关联
  tx_hash VARCHAR(66),
  block_number BIGINT,
  
  -- 元信息
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_redemptions_address ON public.redemptions(address);
CREATE INDEX idx_redemptions_code ON public.redemptions(redemption_code);
CREATE INDEX idx_redemptions_claimed ON public.redemptions(claimed) WHERE claimed = false;

COMMENT ON TABLE public.redemptions IS 'Physical reward redemption records with pickup codes. 奖品赎回记录';


-- ════════════════════════════════════════════════════════════════════════════
-- 表 4: votes（P1 可选 - 审核历史）
-- 链上 hasVoted mapping 不方便查询 "某 verifier 投过哪些票"，用 DB 补充
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE public.votes (
  id BIGSERIAL PRIMARY KEY,
  task_id INTEGER NOT NULL,
  verifier_address VARCHAR(42) NOT NULL 
    CHECK (verifier_address = LOWER(verifier_address)),
  approve BOOLEAN NOT NULL,
  comment TEXT,
  tx_hash VARCHAR(66),
  voted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(task_id, verifier_address)
);

CREATE INDEX idx_votes_task ON public.votes(task_id);
CREATE INDEX idx_votes_verifier ON public.votes(verifier_address);

COMMENT ON TABLE public.votes IS 'Off-chain vote history for verifier dashboards. 投票历史';


-- ════════════════════════════════════════════════════════════════════════════
-- 表 5: notifications（P2 可选）
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE public.notifications (
  id BIGSERIAL PRIMARY KEY,
  recipient_address VARCHAR(42) NOT NULL 
    CHECK (recipient_address = LOWER(recipient_address)),
  type VARCHAR(50) NOT NULL,
  -- 合法值: task_submitted / task_approved / task_rejected / 
  --         verifier_assigned / reward_redeemed / verifier_suspended / queue_gt_claimable
  payload JSONB NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  email_sent BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notif_recipient ON public.notifications(recipient_address);
CREATE INDEX idx_notif_unread ON public.notifications(recipient_address, read) 
  WHERE read = false;

COMMENT ON TABLE public.notifications IS 'User notifications. 通知';


-- ════════════════════════════════════════════════════════════════════════════
-- 触发器：自动更新 updated_at
-- ════════════════════════════════════════════════════════════════════════════

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


-- ════════════════════════════════════════════════════════════════════════════
-- RLS (Row Level Security) 策略
-- ════════════════════════════════════════════════════════════════════════════
-- MVP 阶段使用宽松策略：anon key 可读写。
-- ⚠️ 生产环境应改为基于钱包签名的 JWT 认证。
-- 详见协作文档第 2.9 节。
-- ════════════════════════════════════════════════════════════════════════════

-- user_profiles
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_all"
  ON public.user_profiles FOR SELECT
  USING (true);

CREATE POLICY "profiles_insert_all"
  ON public.user_profiles FOR INSERT
  WITH CHECK (true);

CREATE POLICY "profiles_update_all"
  ON public.user_profiles FOR UPDATE
  USING (true);

-- tasks
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tasks_select_all"
  ON public.tasks FOR SELECT
  USING (true);

CREATE POLICY "tasks_insert_all"
  ON public.tasks FOR INSERT
  WITH CHECK (true);

CREATE POLICY "tasks_update_all"
  ON public.tasks FOR UPDATE
  USING (true);

-- redemptions
ALTER TABLE public.redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "redemptions_select_all"
  ON public.redemptions FOR SELECT
  USING (true);

CREATE POLICY "redemptions_insert_all"
  ON public.redemptions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "redemptions_update_all"
  ON public.redemptions FOR UPDATE
  USING (true);

-- votes
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "votes_select_all"
  ON public.votes FOR SELECT
  USING (true);

CREATE POLICY "votes_insert_all"
  ON public.votes FOR INSERT
  WITH CHECK (true);

-- notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_select_own"
  ON public.notifications FOR SELECT
  USING (true);

CREATE POLICY "notifications_insert_all"
  ON public.notifications FOR INSERT
  WITH CHECK (true);

CREATE POLICY "notifications_update_own"
  ON public.notifications FOR UPDATE
  USING (true);


-- ════════════════════════════════════════════════════════════════════════════
-- 验证查询（可选执行，检查表是否建好）
-- ════════════════════════════════════════════════════════════════════════════

-- 查看所有建好的表
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- 查看 user_profiles 结构
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_schema = 'public' AND table_name = 'user_profiles'
-- ORDER BY ordinal_position;


-- ════════════════════════════════════════════════════════════════════════════
-- 可选：插入一条测试数据（建议跑完后再删掉）
-- ════════════════════════════════════════════════════════════════════════════

-- INSERT INTO public.user_profiles (address, full_name, student_id, email)
-- VALUES (
--   '0xe0113510b0863b719489e43b83d3e4dac4828b4d',
--   'Test User',
--   'TEST001',
--   'test@example.com'
-- );
-- 
-- SELECT * FROM public.user_profiles;
-- 
-- -- 清除测试数据
-- DELETE FROM public.user_profiles WHERE student_id = 'TEST001';
