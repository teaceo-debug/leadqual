-- API Keys table for programmatic access
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,                    -- "Production API Key", "Dev Key"
  key_hash TEXT NOT NULL,                -- SHA-256 hash of actual key
  key_prefix TEXT NOT NULL,              -- First 8 chars for identification (sk_live_abc...)
  scopes TEXT[] DEFAULT '{}',            -- ['leads:read', 'leads:write', 'icp:read']
  rate_limit INTEGER DEFAULT 1000,       -- Requests per hour
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,                -- Optional expiration
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  revoked_at TIMESTAMPTZ,
  revoked_by UUID REFERENCES auth.users(id)
);

-- API Usage logs (for dashboard)
CREATE TABLE api_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  api_key_id UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,                -- '/v1/leads'
  method TEXT NOT NULL,                  -- 'GET', 'POST'
  status_code INTEGER NOT NULL,          -- 200, 401, 429
  response_time_ms INTEGER,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_api_keys_org ON api_keys(organization_id) WHERE revoked_at IS NULL;
CREATE INDEX idx_api_keys_prefix ON api_keys(key_prefix);
CREATE INDEX idx_api_keys_hash ON api_keys(key_hash) WHERE revoked_at IS NULL AND is_active = true;
CREATE INDEX idx_api_usage_key ON api_usage(api_key_id, created_at DESC);
CREATE INDEX idx_api_usage_org_date ON api_usage(organization_id, created_at DESC);

-- Row Level Security
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policies for api_keys

-- Users can view API keys for their organization
CREATE POLICY "Users can view org api_keys" ON api_keys
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid())
  );

-- Only admins can create API keys
CREATE POLICY "Admins can create api_keys" ON api_keys
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Only admins can update (revoke) API keys
CREATE POLICY "Admins can update api_keys" ON api_keys
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for api_usage

-- Users can view API usage for their organization
CREATE POLICY "Users can view org api_usage" ON api_usage
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid())
  );

-- API usage is inserted via service role (bypasses RLS)
-- No INSERT policy needed as usage logging happens through admin client

-- Enable realtime for api_usage (optional, for live dashboard updates)
ALTER PUBLICATION supabase_realtime ADD TABLE api_usage;
