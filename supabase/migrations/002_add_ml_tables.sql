-- ML-Enhanced Lead Scoring Tables
-- Migration: 002_add_ml_tables.sql

-- Lead enrichment data from AI analysis
CREATE TABLE lead_enrichments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  enrichment_type TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}',
  confidence DECIMAL(3,2) CHECK (confidence >= 0 AND confidence <= 1),
  source TEXT DEFAULT 'claude',
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_enrichment_type CHECK (
    enrichment_type IN ('company_research', 'intent_analysis', 'authority_assessment', 'urgency_signals')
  )
);

-- Track lead outcomes for learning
CREATE TABLE lead_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  outcome_type TEXT NOT NULL,
  outcome_value DECIMAL,
  days_to_outcome INTEGER,
  notes TEXT,
  recorded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_outcome_type CHECK (
    outcome_type IN ('converted', 'rejected', 'no_response', 'qualified_out', 'in_progress')
  )
);

-- Learned scoring models per organization
CREATE TABLE scoring_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  model_version INTEGER DEFAULT 1,
  feature_weights JSONB NOT NULL DEFAULT '{}',
  performance_metrics JSONB DEFAULT '{}',
  trained_on_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_active_model UNIQUE (organization_id, is_active)
    DEFERRABLE INITIALLY DEFERRED
);

-- Score history for audit trail
CREATE TABLE scoring_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  label TEXT NOT NULL CHECK (label IN ('hot', 'warm', 'cold')),
  model_version INTEGER,
  feature_vector JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_lead_enrichments_lead_id ON lead_enrichments(lead_id);
CREATE INDEX idx_lead_enrichments_type ON lead_enrichments(enrichment_type);
CREATE INDEX idx_lead_outcomes_lead_id ON lead_outcomes(lead_id);
CREATE INDEX idx_lead_outcomes_type ON lead_outcomes(outcome_type);
CREATE INDEX idx_lead_outcomes_created ON lead_outcomes(created_at);
CREATE INDEX idx_scoring_models_org_active ON scoring_models(organization_id, is_active);
CREATE INDEX idx_scoring_history_lead_id ON scoring_history(lead_id);
CREATE INDEX idx_scoring_history_created ON scoring_history(created_at);

-- RLS Policies
ALTER TABLE lead_enrichments ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE scoring_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE scoring_history ENABLE ROW LEVEL SECURITY;

-- Lead enrichments: accessible via lead's organization
CREATE POLICY "Users can view enrichments for their org's leads" ON lead_enrichments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM leads l
      JOIN organization_members om ON l.organization_id = om.organization_id
      WHERE l.id = lead_enrichments.lead_id
      AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "System can insert enrichments" ON lead_enrichments
  FOR INSERT
  WITH CHECK (true);

-- Lead outcomes: organization members can view and record
CREATE POLICY "Users can view outcomes for their org's leads" ON lead_outcomes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM leads l
      JOIN organization_members om ON l.organization_id = om.organization_id
      WHERE l.id = lead_outcomes.lead_id
      AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can record outcomes for their org's leads" ON lead_outcomes
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM leads l
      JOIN organization_members om ON l.organization_id = om.organization_id
      WHERE l.id = lead_outcomes.lead_id
      AND om.user_id = auth.uid()
      AND om.role IN ('admin', 'manager')
    )
  );

-- Scoring models: organization members can view, admins can modify
CREATE POLICY "Users can view their org's scoring models" ON scoring_models
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = scoring_models.organization_id
      AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage scoring models" ON scoring_models
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = scoring_models.organization_id
      AND om.user_id = auth.uid()
      AND om.role = 'admin'
    )
  );

-- Scoring history: view via lead's organization
CREATE POLICY "Users can view scoring history for their org's leads" ON scoring_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM leads l
      JOIN organization_members om ON l.organization_id = om.organization_id
      WHERE l.id = scoring_history.lead_id
      AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "System can insert scoring history" ON scoring_history
  FOR INSERT
  WITH CHECK (true);

-- Function to count outcomes for an organization (for retraining threshold)
CREATE OR REPLACE FUNCTION get_org_outcome_count(org_id UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER
  FROM lead_outcomes lo
  JOIN leads l ON lo.lead_id = l.id
  WHERE l.organization_id = org_id
$$ LANGUAGE SQL STABLE;

-- Function to check if retraining is needed (50+ outcomes since last model)
CREATE OR REPLACE FUNCTION should_retrain_model(org_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  last_model_date TIMESTAMPTZ;
  outcomes_since INTEGER;
BEGIN
  -- Get date of last active model
  SELECT created_at INTO last_model_date
  FROM scoring_models
  WHERE organization_id = org_id AND is_active = true
  ORDER BY created_at DESC
  LIMIT 1;

  -- If no model exists, check if we have 50+ total outcomes
  IF last_model_date IS NULL THEN
    RETURN get_org_outcome_count(org_id) >= 50;
  END IF;

  -- Count outcomes since last model
  SELECT COUNT(*)::INTEGER INTO outcomes_since
  FROM lead_outcomes lo
  JOIN leads l ON lo.lead_id = l.id
  WHERE l.organization_id = org_id
  AND lo.created_at > last_model_date;

  RETURN outcomes_since >= 50;
END;
$$ LANGUAGE plpgsql STABLE;

-- Enable realtime for outcome updates
ALTER PUBLICATION supabase_realtime ADD TABLE lead_outcomes;
ALTER PUBLICATION supabase_realtime ADD TABLE scoring_history;
