ALTER TABLE public.redemptions
  ALTER COLUMN cost TYPE NUMERIC(36, 18)
  USING cost::numeric;

UPDATE public.redemptions
SET tx_hash = LOWER(tx_hash)
WHERE tx_hash IS NOT NULL;

DELETE FROM public.redemptions
WHERE tx_hash IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS redemptions_tx_hash_unique
  ON public.redemptions(tx_hash);

DROP INDEX IF EXISTS idx_redemptions_code;

ALTER TABLE public.redemptions
  DROP COLUMN IF EXISTS redemption_code;

INSERT INTO public.redemptions (
  address,
  reward_id,
  reward_name,
  cost,
  claimed,
  claimed_at,
  claimed_by,
  tx_hash,
  block_number,
  redeemed_at
)
SELECT
  '0xe0113510b0863b719489e43b83d3e4dac4828b4d',
  0,
  'Coffee Voucher',
  20.783205296246166425,
  false,
  null,
  null,
  '0xbaa810d5222265db8da3a4c206e0e143e517cdb32f3eb283ab76a954e390995c',
  10742965,
  '2026-04-27T13:52:36.000Z'
WHERE NOT EXISTS (
  SELECT 1
  FROM public.redemptions
  WHERE tx_hash = '0xbaa810d5222265db8da3a4c206e0e143e517cdb32f3eb283ab76a954e390995c'
);

UPDATE public.redemptions
SET cost = 20.783205296246166425,
    redeemed_at = '2026-04-27T13:52:36.000Z'
WHERE tx_hash = '0xbaa810d5222265db8da3a4c206e0e143e517cdb32f3eb283ab76a954e390995c';
