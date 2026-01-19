-- Behavioral tracking and pixel integration tables
-- This enables sophisticated ML lead scoring based on user behavior

-- Store click IDs and tracking parameters from ad platforms
CREATE TABLE IF NOT EXISTS lead_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

  -- Click IDs for deterministic attribution
  fbclid TEXT,                    -- Facebook Click ID
  gclid TEXT,                     -- Google Click ID
  ttclid TEXT,                    -- TikTok Click ID
  msclkid TEXT,                   -- Microsoft/Bing Click ID
  li_fat_id TEXT,                 -- LinkedIn First-Party Ad Tracking ID

  -- Platform cookies/identifiers
  fbp TEXT,                       -- Facebook Browser ID (_fbp cookie)
  fbc TEXT,                       -- Facebook Click ID cookie (_fbc)
  ttp TEXT,                       -- TikTok Pixel ID (_ttp cookie)
  ga_client_id TEXT,              -- Google Analytics Client ID

  -- UTM parameters
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  utm_term TEXT,

  -- Session context
  landing_page TEXT,
  referrer TEXT,
  user_agent TEXT,
  ip_address TEXT,
  country TEXT,
  city TEXT,
  device_type TEXT,               -- mobile, desktop, tablet
  browser TEXT,
  os TEXT,

  -- Timestamps
  first_touch_at TIMESTAMPTZ DEFAULT NOW(),
  last_touch_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Store individual page view and engagement events
CREATE TABLE IF NOT EXISTS behavioral_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  tracking_id UUID REFERENCES lead_tracking(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

  -- Event details
  event_type TEXT NOT NULL,       -- page_view, form_start, form_complete, cta_click, video_play, scroll_depth, etc.
  event_name TEXT,                -- Custom event name
  page_url TEXT,
  page_title TEXT,

  -- Engagement metrics
  time_on_page INTEGER,           -- seconds
  scroll_depth INTEGER,           -- percentage 0-100
  clicks INTEGER DEFAULT 0,

  -- Content interaction
  content_type TEXT,              -- pricing, features, case_study, blog, demo, etc.
  content_id TEXT,

  -- Custom event data
  event_data JSONB DEFAULT '{}',

  -- Timestamps
  event_time TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Aggregated behavioral scores per lead (updated periodically)
CREATE TABLE IF NOT EXISTS behavioral_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

  -- Engagement metrics
  total_page_views INTEGER DEFAULT 0,
  unique_pages_viewed INTEGER DEFAULT 0,
  total_time_on_site INTEGER DEFAULT 0,     -- seconds
  avg_time_per_page DECIMAL(10,2) DEFAULT 0,
  sessions_count INTEGER DEFAULT 0,

  -- High-intent signals
  pricing_page_views INTEGER DEFAULT 0,
  demo_page_views INTEGER DEFAULT 0,
  case_study_views INTEGER DEFAULT 0,
  feature_page_views INTEGER DEFAULT 0,

  -- Form engagement
  forms_started INTEGER DEFAULT 0,
  forms_completed INTEGER DEFAULT 0,
  form_abandonment_rate DECIMAL(5,2) DEFAULT 0,

  -- Content engagement
  videos_watched INTEGER DEFAULT 0,
  downloads INTEGER DEFAULT 0,
  cta_clicks INTEGER DEFAULT 0,

  -- Recency metrics
  days_since_first_visit INTEGER DEFAULT 0,
  days_since_last_visit INTEGER DEFAULT 0,
  visit_frequency DECIMAL(5,2) DEFAULT 0,   -- visits per week

  -- Computed scores (0-100)
  engagement_score INTEGER DEFAULT 0,
  intent_score INTEGER DEFAULT 0,
  recency_score INTEGER DEFAULT 0,
  frequency_score INTEGER DEFAULT 0,

  -- Combined behavioral score
  behavioral_score INTEGER DEFAULT 0,

  -- Last calculation
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Store conversion events sent to ad platforms
CREATE TABLE IF NOT EXISTS conversion_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

  -- Platform
  platform TEXT NOT NULL,         -- meta, google, tiktok, linkedin
  event_name TEXT NOT NULL,       -- Lead, Purchase, Subscribe, CompleteRegistration, etc.

  -- Attribution data
  click_id TEXT,                  -- fbclid, gclid, ttclid
  event_id TEXT,                  -- For deduplication

  -- Event details
  value DECIMAL(10,2),
  currency TEXT DEFAULT 'USD',
  event_data JSONB DEFAULT '{}',

  -- API response
  api_response JSONB,
  status TEXT DEFAULT 'pending',  -- pending, sent, success, failed
  error_message TEXT,

  -- Timestamps
  event_time TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Store platform credentials per organization
CREATE TABLE IF NOT EXISTS platform_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

  platform TEXT NOT NULL,         -- meta, google, tiktok, linkedin, ga4

  -- Encrypted credentials (use Supabase Vault in production)
  pixel_id TEXT,
  access_token TEXT,              -- Should be encrypted
  refresh_token TEXT,             -- Should be encrypted
  api_key TEXT,                   -- Should be encrypted

  -- Additional config
  config JSONB DEFAULT '{}',

  -- Status
  is_active BOOLEAN DEFAULT true,
  last_verified_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(organization_id, platform)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_lead_tracking_lead_id ON lead_tracking(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_tracking_org_id ON lead_tracking(organization_id);
CREATE INDEX IF NOT EXISTS idx_lead_tracking_fbclid ON lead_tracking(fbclid) WHERE fbclid IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_lead_tracking_gclid ON lead_tracking(gclid) WHERE gclid IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_lead_tracking_ttclid ON lead_tracking(ttclid) WHERE ttclid IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_behavioral_events_lead_id ON behavioral_events(lead_id);
CREATE INDEX IF NOT EXISTS idx_behavioral_events_tracking_id ON behavioral_events(tracking_id);
CREATE INDEX IF NOT EXISTS idx_behavioral_events_org_id ON behavioral_events(organization_id);
CREATE INDEX IF NOT EXISTS idx_behavioral_events_type ON behavioral_events(event_type);
CREATE INDEX IF NOT EXISTS idx_behavioral_events_time ON behavioral_events(event_time);

CREATE INDEX IF NOT EXISTS idx_behavioral_scores_lead_id ON behavioral_scores(lead_id);
CREATE INDEX IF NOT EXISTS idx_behavioral_scores_org_id ON behavioral_scores(organization_id);
CREATE INDEX IF NOT EXISTS idx_behavioral_scores_score ON behavioral_scores(behavioral_score);

CREATE INDEX IF NOT EXISTS idx_conversion_events_lead_id ON conversion_events(lead_id);
CREATE INDEX IF NOT EXISTS idx_conversion_events_platform ON conversion_events(platform);
CREATE INDEX IF NOT EXISTS idx_conversion_events_status ON conversion_events(status);

-- Enable RLS
ALTER TABLE lead_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE behavioral_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE behavioral_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversion_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_credentials ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view tracking for their org leads"
  ON lead_tracking FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can view events for their org leads"
  ON behavioral_events FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can view scores for their org leads"
  ON behavioral_scores FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can view conversions for their org"
  ON conversion_events FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Admins can manage platform credentials"
  ON platform_credentials FOR ALL
  USING (organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  ));
