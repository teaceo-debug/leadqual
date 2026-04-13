-- Add branding, facebook settings, and view tracking to forms
ALTER TABLE forms ADD COLUMN IF NOT EXISTS branding JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE forms ADD COLUMN IF NOT EXISTS facebook JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE forms ADD COLUMN IF NOT EXISTS view_count INTEGER NOT NULL DEFAULT 0;

-- Form views tracking table (for analytics)
CREATE TABLE IF NOT EXISTS form_views (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  form_id UUID NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  source_ip TEXT,
  user_agent TEXT,
  referrer TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT
);

-- Enable RLS on form_views
ALTER TABLE form_views ENABLE ROW LEVEL SECURITY;

-- RLS: org members can view form_views
CREATE POLICY "Users can view form views in their organization" ON form_views
  FOR SELECT USING (
    form_id IN (
      SELECT f.id FROM forms f
      JOIN organization_members om ON om.organization_id = f.organization_id
      WHERE om.user_id = auth.uid()
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_form_views_form_id ON form_views(form_id);
CREATE INDEX IF NOT EXISTS idx_form_views_created_at ON form_views(form_id, created_at);
CREATE INDEX IF NOT EXISTS idx_form_submissions_created_at ON form_submissions(form_id, created_at);
