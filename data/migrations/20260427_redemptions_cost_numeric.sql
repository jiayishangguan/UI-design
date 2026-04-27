ALTER TABLE public.redemptions
  ALTER COLUMN cost TYPE NUMERIC(36, 18)
  USING cost::numeric;
