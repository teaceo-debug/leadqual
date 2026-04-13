-- Store Facebook tracking identifiers on lead records
-- so Purchase/ClosedWon CAPI events (fired days later) can attribute back to the original ad click
ALTER TABLE leads ADD COLUMN IF NOT EXISTS fbclid TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS fbp TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS fbc TEXT;
