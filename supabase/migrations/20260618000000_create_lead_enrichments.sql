-- Standalone lead enrichment tracking (independent of quiz submissions)
CREATE TABLE IF NOT EXISTS lead_enrichments (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  ghl_contact_id    TEXT,
  email             TEXT        NOT NULL,
  full_name         TEXT,
  company_name      TEXT,
  website           TEXT,
  status            TEXT        NOT NULL DEFAULT 'processing'
                                CHECK (status IN ('processing', 'completed', 'failed')),
  report            TEXT,
  ghl_note_added    BOOLEAN     NOT NULL DEFAULT FALSE,
  ghl_tagged        BOOLEAN     NOT NULL DEFAULT FALSE,
  error_message     TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_lead_enrichments_email
  ON lead_enrichments (email);

CREATE INDEX IF NOT EXISTS idx_lead_enrichments_ghl_contact
  ON lead_enrichments (ghl_contact_id);

CREATE INDEX IF NOT EXISTS idx_lead_enrichments_status
  ON lead_enrichments (status);

-- RLS: only service role can read/write (enrichment data is internal)
ALTER TABLE lead_enrichments ENABLE ROW LEVEL SECURITY;
