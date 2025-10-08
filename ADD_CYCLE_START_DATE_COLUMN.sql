-- Migration: Add cycle_start_date to patients table
-- Run this in Supabase SQL Editor

-- Step 1: Add the column (nullable for now to handle existing patients)
ALTER TABLE patients 
ADD COLUMN IF NOT EXISTS cycle_start_date TIMESTAMP WITH TIME ZONE;

-- Step 2: Backfill existing patients with their calculated cycle start
-- This uses the same logic as the current system (earliest medication's created_at)
DO $$
DECLARE
  patient_record RECORD;
  earliest_med_date TIMESTAMP WITH TIME ZONE;
  calculated_cycle_start TIMESTAMP WITH TIME ZONE;
  now_ts TIMESTAMP WITH TIME ZONE := NOW();
  elapsed_seconds BIGINT;
  cycles_passed INTEGER;
BEGIN
  FOR patient_record IN 
    SELECT id FROM patients WHERE cycle_start_date IS NULL
  LOOP
    -- Find earliest medication for this patient
    SELECT MIN(created_at) INTO earliest_med_date
    FROM medications
    WHERE patient_id = patient_record.id;
    
    IF earliest_med_date IS NOT NULL THEN
      -- Calculate current cycle start (same logic as frontend)
      -- Use INTERVAL arithmetic instead of milliseconds to avoid integer overflow
      elapsed_seconds := EXTRACT(EPOCH FROM (now_ts - earliest_med_date))::BIGINT;
      cycles_passed := FLOOR(elapsed_seconds / (30.0 * 24 * 60 * 60))::INTEGER;
      calculated_cycle_start := earliest_med_date + (cycles_passed * INTERVAL '30 days');
      
      -- Update the patient
      UPDATE patients 
      SET cycle_start_date = calculated_cycle_start
      WHERE id = patient_record.id;
      
      RAISE NOTICE 'Patient %: Set cycle_start_date to %', patient_record.id, calculated_cycle_start;
    ELSE
      -- No medications found, use patient creation date
      UPDATE patients 
      SET cycle_start_date = created_at
      WHERE id = patient_record.id;
      
      RAISE NOTICE 'Patient %: No medications found, using created_at', patient_record.id;
    END IF;
  END LOOP;
END $$;

-- Step 3: Make the column NOT NULL now that all existing patients have a value
ALTER TABLE patients 
ALTER COLUMN cycle_start_date SET NOT NULL;

-- Step 4: Set default for new patients to use creation date
ALTER TABLE patients 
ALTER COLUMN cycle_start_date SET DEFAULT NOW();

-- Step 5: Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_patients_cycle_start_date 
ON patients(cycle_start_date);

-- Verification: Check that all patients have a cycle_start_date
SELECT 
  COUNT(*) as total_patients,
  COUNT(cycle_start_date) as patients_with_cycle_date,
  COUNT(*) - COUNT(cycle_start_date) as patients_missing_cycle_date
FROM patients;

-- Sample output to verify
SELECT 
  id,
  first_name,
  last_name,
  created_at,
  cycle_start_date,
  (
    SELECT MIN(created_at) 
    FROM medications 
    WHERE patient_id = patients.id
  ) as earliest_medication_date
FROM patients
LIMIT 10;

COMMENT ON COLUMN patients.cycle_start_date IS 'Anchor date for 30-day RTM billing cycles. Automatically set to patient creation date for new patients. Can be manually adjusted for ported patients.';
