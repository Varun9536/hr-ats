-- Add parsed resume fields to candidates
ALTER TABLE "candidates"
  ADD COLUMN IF NOT EXISTS "education"          JSONB,
  ADD COLUMN IF NOT EXISTS "previousCompanies"  TEXT[]  NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "parseConfidence"    DOUBLE PRECISION;
