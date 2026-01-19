-- ICP Auto-Generation Tables
-- Migration: 20260119000001_add_icp_generations.sql

-- Track ICP generation history
CREATE TABLE icp_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  generation_type TEXT NOT NULL CHECK (generation_type IN ('domain', 'csv')),
  input_data JSONB NOT NULL,           -- domain name or CSV stats
  generated_criteria JSONB NOT NULL,   -- the AI-generated criteria
  ai_reasoning TEXT,                   -- Claude's explanation
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'applied', 'rejected')),
  applied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Indexes for performance
CREATE INDEX idx_icp_generations_org ON icp_generations(organization_id);
CREATE INDEX idx_icp_generations_status ON icp_generations(status);
CREATE INDEX idx_icp_generations_created ON icp_generations(created_at DESC);

-- RLS Policies
ALTER TABLE icp_generations ENABLE ROW LEVEL SECURITY;

-- Users can view generations for their organization
CREATE POLICY "Users can view their org's ICP generations" ON icp_generations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = icp_generations.organization_id
      AND om.user_id = auth.uid()
    )
  );

-- Admins can create ICP generations
CREATE POLICY "Admins can create ICP generations" ON icp_generations
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = icp_generations.organization_id
      AND om.user_id = auth.uid()
      AND om.role = 'admin'
    )
  );

-- Admins can update ICP generations (for applying/rejecting)
CREATE POLICY "Admins can update ICP generations" ON icp_generations
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = icp_generations.organization_id
      AND om.user_id = auth.uid()
      AND om.role = 'admin'
    )
  );

-- Admins can delete ICP generations
CREATE POLICY "Admins can delete ICP generations" ON icp_generations
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = icp_generations.organization_id
      AND om.user_id = auth.uid()
      AND om.role = 'admin'
    )
  );
