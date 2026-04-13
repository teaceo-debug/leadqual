-- Form builder tables
CREATE TABLE IF NOT EXISTS forms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Untitled Form',
  description TEXT,
  slug TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  thank_you_title TEXT NOT NULL DEFAULT 'Thank you!',
  thank_you_message TEXT NOT NULL DEFAULT 'We''ve received your submission and will be in touch soon.',
  redirect_url TEXT,
  submission_count INTEGER NOT NULL DEFAULT 0,
  UNIQUE(organization_id, slug)
);

-- Form submissions table
CREATE TABLE IF NOT EXISTS form_submissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  form_id UUID NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  source_ip TEXT,
  user_agent TEXT,
  referrer TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_term TEXT,
  utm_content TEXT,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  qualification_status TEXT NOT NULL DEFAULT 'pending' CHECK (qualification_status IN ('pending', 'processing', 'completed', 'skipped'))
);

-- Enable RLS
ALTER TABLE forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_submissions ENABLE ROW LEVEL SECURITY;

-- RLS policies for forms
CREATE POLICY "Users can view forms in their organization" ON forms
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage forms" ON forms
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- RLS policies for form_submissions
CREATE POLICY "Users can view submissions in their organization" ON form_submissions
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

-- Index for performance
CREATE INDEX idx_forms_org_id ON forms(organization_id);
CREATE INDEX idx_forms_slug ON forms(organization_id, slug);
CREATE INDEX idx_form_submissions_form_id ON form_submissions(form_id);
CREATE INDEX idx_form_submissions_org_id ON form_submissions(organization_id);
