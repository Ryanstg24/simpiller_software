-- Create DRx Integration Tables
-- This migration creates the drx_patient_sync table and adds drx_group_name to pharmacies table

-- Create drx_patient_sync table to track patient sync status with DRx
CREATE TABLE IF NOT EXISTS drx_patient_sync (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  drx_patient_id VARCHAR(255), -- DRx's internal patient ID
  drx_group_id VARCHAR(255), -- DRx group ID (e.g., "Simpiller")
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_sync_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'success', 'failed'
  error_message TEXT,
  last_medication_sync_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(patient_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_drx_patient_sync_patient_id ON drx_patient_sync(patient_id);
CREATE INDEX IF NOT EXISTS idx_drx_patient_sync_drx_patient_id ON drx_patient_sync(drx_patient_id);
CREATE INDEX IF NOT EXISTS idx_drx_patient_sync_status ON drx_patient_sync(last_sync_status);

-- Add drx_group_name column to pharmacies table
ALTER TABLE pharmacies 
ADD COLUMN IF NOT EXISTS drx_group_name VARCHAR(255) DEFAULT 'Simpiller';

-- Update existing partner pharmacies to have default group name if null
UPDATE pharmacies 
SET drx_group_name = 'Simpiller' 
WHERE is_partner = true AND drx_group_name IS NULL;

-- Create updated_at trigger for drx_patient_sync
CREATE OR REPLACE FUNCTION update_drx_patient_sync_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER drx_patient_sync_updated_at
BEFORE UPDATE ON drx_patient_sync
FOR EACH ROW
EXECUTE FUNCTION update_drx_patient_sync_updated_at();

-- Add RLS policies for drx_patient_sync
ALTER TABLE drx_patient_sync ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view sync status for patients they can see
CREATE POLICY "Users can view drx sync for visible patients"
ON drx_patient_sync
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM patients
    WHERE patients.id = drx_patient_sync.patient_id
  )
);

-- Policy: Only service role can insert/update/delete (via API with service role)
CREATE POLICY "Service role can manage drx sync"
ON drx_patient_sync
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

