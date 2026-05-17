-- v2.4.2 Migration
-- Futtatandó: Supabase SQL Editor

-- 1. Soft delete mezők a cards táblán
ALTER TABLE public.cards
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS deleted_by text DEFAULT NULL;

-- 2. Backups tábla
CREATE TABLE IF NOT EXISTS public.backups (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  data jsonb NOT NULL,
  cards_count int DEFAULT 0,
  clients_count int DEFAULT 0
);
ALTER TABLE public.backups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_access" ON public.backups FOR ALL USING (true) WITH CHECK (true);

-- 3. GCal snapshots tábla
CREATE TABLE IF NOT EXISTS public.gcal_snapshots (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id uuid REFERENCES public.staff(id),
  snapshot_at timestamptz DEFAULT now(),
  events jsonb DEFAULT '[]',
  events_count int DEFAULT 0
);
ALTER TABLE public.gcal_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_access" ON public.gcal_snapshots FOR ALL USING (true) WITH CHECK (true);

-- 4. GCal tokens tábla (cron jobhoz)
CREATE TABLE IF NOT EXISTS public.gcal_tokens (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id uuid REFERENCES public.staff(id) UNIQUE,
  access_token text NOT NULL,
  expires_at timestamptz,
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.gcal_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_access" ON public.gcal_tokens FOR ALL USING (true) WITH CHECK (true);

-- 5. Meglévő GCal kártyák aktualizálása:
--    addr tartalmát beírjuk a title végére ha is_gcal=true és addr nem üres
UPDATE public.cards
SET
  title = CASE
    WHEN addr IS NOT NULL AND addr != '' AND title NOT LIKE '%' || addr || '%'
    THEN title || ', ' || addr
    ELSE title
  END,
  addr = ''
WHERE is_gcal = true AND addr IS NOT NULL AND addr != '';
