-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Organizations table
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,

  -- Form customization
  logo_url TEXT,
  primary_color TEXT DEFAULT '#2563EB',
  thank_you_title TEXT DEFAULT 'Thank you!',
  thank_you_message TEXT DEFAULT 'We''ll be in touch soon.',
  redirect_url TEXT,

  -- API
  public_api_key TEXT UNIQUE NOT NULL DEFAULT ('pk_' || replace(uuid_generate_v4()::text, '-', '')),

  -- Settings
  settings JSONB DEFAULT '{}'::jsonb
);

-- Organization members (links users to orgs with roles)
CREATE TABLE organization_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'viewer')),

  UNIQUE(organization_id, user_id)
);

-- Invitations
CREATE TABLE invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'viewer')),
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  token TEXT UNIQUE NOT NULL DEFAULT uuid_generate_v4()::text,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMPTZ,

  UNIQUE(organization_id, email)
);

-- Leads table
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Contact info
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  job_title TEXT,

  -- Company info
  company_name TEXT,
  company_website TEXT,
  company_size TEXT,
  industry TEXT,

  -- Intent signals
  budget_range TEXT,
  timeline TEXT,
  challenge TEXT,

  -- Qualification results
  score INTEGER,
  label TEXT CHECK (label IN ('hot', 'warm', 'cold')),
  reasoning TEXT,
  breakdown JSONB,
  recommended_action TEXT,
  qualified_at TIMESTAMPTZ,
  qualification_status TEXT DEFAULT 'pending' CHECK (qualification_status IN ('pending', 'processing', 'completed', 'failed')),

  -- Lead management
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'converted', 'rejected', 'archived')),
  notes TEXT,

  -- Duplicate tracking
  is_duplicate BOOLEAN DEFAULT FALSE,
  duplicate_of UUID REFERENCES leads(id),

  -- Metadata
  source_ip TEXT,
  user_agent TEXT,
  referrer TEXT
);

-- ICP Criteria table
CREATE TABLE icp_criteria (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('company_size', 'industry', 'job_title', 'budget', 'timeline', 'custom')),
  weight INTEGER NOT NULL DEFAULT 5 CHECK (weight >= 1 AND weight <= 10),
  acceptable_values JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_required BOOLEAN DEFAULT FALSE,
  sort_order INTEGER DEFAULT 0
);

-- Activity log
CREATE TABLE activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  action TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb
);

-- Webhooks
CREATE TABLE webhooks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  url TEXT NOT NULL,
  events TEXT[] NOT NULL DEFAULT '{}',
  secret TEXT NOT NULL DEFAULT uuid_generate_v4()::text,
  is_active BOOLEAN DEFAULT TRUE
);

-- Webhook deliveries (for logging)
CREATE TABLE webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,

  event TEXT NOT NULL,
  payload JSONB NOT NULL,
  response_status INTEGER,
  response_body TEXT,
  attempt_count INTEGER DEFAULT 1,
  next_retry_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ
);

-- Notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  data JSONB DEFAULT '{}'::jsonb,
  read_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_leads_organization ON leads(organization_id);
CREATE INDEX idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX idx_leads_label ON leads(label);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_score ON leads(score DESC);
CREATE INDEX idx_leads_email ON leads(email);
CREATE INDEX idx_leads_qualification_status ON leads(qualification_status);

CREATE INDEX idx_activity_log_lead ON activity_log(lead_id);
CREATE INDEX idx_activity_log_organization ON activity_log(organization_id);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id) WHERE read_at IS NULL;

CREATE INDEX idx_webhook_deliveries_webhook ON webhook_deliveries(webhook_id);
CREATE INDEX idx_webhook_deliveries_retry ON webhook_deliveries(next_retry_at) WHERE delivered_at IS NULL;

CREATE INDEX idx_org_members_user ON organization_members(user_id);
CREATE INDEX idx_org_members_org ON organization_members(organization_id);

CREATE INDEX idx_icp_criteria_org ON icp_criteria(organization_id);

-- Row Level Security
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE icp_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Organizations: users can only see orgs they belong to
CREATE POLICY "Users can view their organizations" ON organizations
  FOR SELECT USING (
    id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update their organizations" ON organizations
  FOR UPDATE USING (
    id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Organization members: users can see members of their orgs
CREATE POLICY "Users can view org members" ON organization_members
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins can insert org members" ON organization_members
  FOR INSERT WITH CHECK (
    organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can delete org members" ON organization_members
  FOR DELETE USING (
    organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can update org members" ON organization_members
  FOR UPDATE USING (
    organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Invitations
CREATE POLICY "Users can view org invitations" ON invitations
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins can manage invitations" ON invitations
  FOR ALL USING (
    organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Leads: users can CRUD leads in their org
CREATE POLICY "Users can view org leads" ON leads
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can insert org leads" ON leads
  FOR INSERT WITH CHECK (
    organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Non-viewers can update org leads" ON leads
  FOR UPDATE USING (
    organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role IN ('admin', 'manager'))
  );

-- ICP Criteria: users can CRUD criteria in their org
CREATE POLICY "Users can view org criteria" ON icp_criteria
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins/Managers can insert criteria" ON icp_criteria
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Admins/Managers can update criteria" ON icp_criteria
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Admins/Managers can delete criteria" ON icp_criteria
  FOR DELETE USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

-- Notifications: users can only see their own notifications
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (user_id = auth.uid());

-- Activity log: users can view logs in their org
CREATE POLICY "Users can view org activity" ON activity_log
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can insert org activity" ON activity_log
  FOR INSERT WITH CHECK (
    organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid())
  );

-- Webhooks: admins only
CREATE POLICY "Admins can view webhooks" ON webhooks
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can manage webhooks" ON webhooks
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Webhook deliveries: admins only
CREATE POLICY "Admins can view webhook deliveries" ON webhook_deliveries
  FOR SELECT USING (
    webhook_id IN (
      SELECT w.id FROM webhooks w
      JOIN organization_members om ON w.organization_id = om.organization_id
      WHERE om.user_id = auth.uid() AND om.role = 'admin'
    )
  );

-- Functions

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_icp_criteria_updated_at
  BEFORE UPDATE ON icp_criteria
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_webhooks_updated_at
  BEFORE UPDATE ON webhooks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Function to check for duplicate leads
CREATE OR REPLACE FUNCTION check_duplicate_lead()
RETURNS TRIGGER AS $$
DECLARE
  existing_lead_id UUID;
BEGIN
  SELECT id INTO existing_lead_id
  FROM leads
  WHERE organization_id = NEW.organization_id
    AND email = NEW.email
    AND id != COALESCE(NEW.id, uuid_generate_v4())
  ORDER BY created_at DESC
  LIMIT 1;

  IF existing_lead_id IS NOT NULL THEN
    NEW.is_duplicate = TRUE;
    NEW.duplicate_of = existing_lead_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_lead_duplicate
  BEFORE INSERT ON leads
  FOR EACH ROW EXECUTE FUNCTION check_duplicate_lead();

-- Function to create organization with default ICP criteria
CREATE OR REPLACE FUNCTION create_organization_with_defaults(
  org_name TEXT,
  org_slug TEXT,
  creator_user_id UUID
)
RETURNS UUID AS $$
DECLARE
  new_org_id UUID;
BEGIN
  -- Create organization
  INSERT INTO organizations (name, slug)
  VALUES (org_name, org_slug)
  RETURNING id INTO new_org_id;

  -- Add creator as admin
  INSERT INTO organization_members (organization_id, user_id, role)
  VALUES (new_org_id, creator_user_id, 'admin');

  -- Add default ICP criteria
  INSERT INTO icp_criteria (organization_id, name, type, weight, acceptable_values, is_required, sort_order)
  VALUES
    (new_org_id, 'Company Size', 'company_size', 8, '["51-200 employees", "201-500 employees", "500+ employees"]', false, 0),
    (new_org_id, 'Budget', 'budget', 9, '["$50,000 - $100,000", "$100,000+"]', true, 1),
    (new_org_id, 'Timeline', 'timeline', 7, '["Immediately", "1-3 months"]', false, 2),
    (new_org_id, 'Job Title', 'job_title', 6, '["CEO", "CTO", "VP", "Director", "Head of", "Manager"]', false, 3),
    (new_org_id, 'Industry', 'industry', 5, '["Technology / SaaS", "Finance / Banking", "Healthcare"]', false, 4);

  RETURN new_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable realtime for leads table
ALTER PUBLICATION supabase_realtime ADD TABLE leads;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
