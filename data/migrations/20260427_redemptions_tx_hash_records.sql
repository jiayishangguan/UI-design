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

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'redemptions_tx_hash_lower_check'
  ) THEN
    ALTER TABLE public.redemptions
      ADD CONSTRAINT redemptions_tx_hash_lower_check
      CHECK (tx_hash = LOWER(tx_hash) AND tx_hash LIKE '0x%');
  END IF;
END $$;

ALTER TABLE public.redemptions
  ALTER COLUMN tx_hash SET NOT NULL;

DROP INDEX IF EXISTS idx_redemptions_code;

ALTER TABLE public.redemptions
  DROP COLUMN IF EXISTS redemption_code;

CREATE INDEX IF NOT EXISTS idx_redemptions_tx_hash
  ON public.redemptions(tx_hash);
