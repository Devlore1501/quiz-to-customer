-- Daily news digest storage + saved news archive for the morning content pipeline

CREATE TABLE IF NOT EXISTS public.daily_digests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  digest_date DATE NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'partial', 'error')),
  digest_data JSONB,
  sources_summary JSONB,
  error TEXT,
  email_sent BOOLEAN NOT NULL DEFAULT false,
  model TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_daily_digests_date ON public.daily_digests (digest_date DESC);

GRANT SELECT ON public.daily_digests TO authenticated;
GRANT ALL ON public.daily_digests TO service_role;

ALTER TABLE public.daily_digests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read daily digests" ON public.daily_digests;
CREATE POLICY "Admins can read daily digests"
  ON public.daily_digests
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Saved news items: bookmark digest items to repropose them in future digests
CREATE TABLE IF NOT EXISTS public.saved_news_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  digest_id UUID REFERENCES public.daily_digests(id) ON DELETE SET NULL,
  digest_date DATE,
  title TEXT NOT NULL,
  url TEXT,
  source TEXT,
  item_data JSONB NOT NULL,
  notes TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'saved' CHECK (status IN ('saved', 'used', 'archived')),
  times_reproposed INTEGER NOT NULL DEFAULT 0,
  last_reproposed_at TIMESTAMPTZ,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_saved_news_items_url ON public.saved_news_items (url) WHERE url IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_saved_news_items_status ON public.saved_news_items (status, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_news_items TO authenticated;
GRANT ALL ON public.saved_news_items TO service_role;

ALTER TABLE public.saved_news_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read saved news" ON public.saved_news_items;
CREATE POLICY "Admins can read saved news"
  ON public.saved_news_items
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can insert saved news" ON public.saved_news_items;
CREATE POLICY "Admins can insert saved news"
  ON public.saved_news_items
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can update saved news" ON public.saved_news_items;
CREATE POLICY "Admins can update saved news"
  ON public.saved_news_items
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can delete saved news" ON public.saved_news_items;
CREATE POLICY "Admins can delete saved news"
  ON public.saved_news_items
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
