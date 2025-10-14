-- Migration: Add support for multiple time slots per period
-- This allows patients to have multiple medication times within the same period
-- (e.g., 2 morning meds at different times)

-- Add new JSONB columns to store arrays of times for each period
-- These will store arrays like: ["06:00", "08:00", "09:30"]
ALTER TABLE patients 
  ADD COLUMN IF NOT EXISTS morning_times JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS afternoon_times JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS evening_times JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS bedtime_times JSONB DEFAULT '[]'::jsonb;

-- Migrate existing single time values to the new array format
-- This preserves existing data by converting single times to arrays with one element
-- Note: time columns are of type 'time', so we only check IS NOT NULL
UPDATE patients
SET 
  morning_times = CASE 
    WHEN morning_time IS NOT NULL 
    THEN jsonb_build_array(morning_time::text)
    ELSE '[]'::jsonb 
  END,
  afternoon_times = CASE 
    WHEN afternoon_time IS NOT NULL 
    THEN jsonb_build_array(afternoon_time::text)
    ELSE '[]'::jsonb 
  END,
  evening_times = CASE 
    WHEN evening_time IS NOT NULL 
    THEN jsonb_build_array(evening_time::text)
    ELSE '[]'::jsonb 
  END,
  bedtime_times = CASE 
    WHEN bedtime IS NOT NULL 
    THEN jsonb_build_array(bedtime::text)
    ELSE '[]'::jsonb 
  END
WHERE 
  morning_time IS NOT NULL OR
  afternoon_time IS NOT NULL OR
  evening_time IS NOT NULL OR
  bedtime IS NOT NULL;

-- Keep the old columns for backward compatibility during transition
-- They can be removed in a future migration once all code is updated
-- For now, we'll update them to reflect the first time in the new arrays

-- Create indexes on the new JSONB columns for better query performance
CREATE INDEX IF NOT EXISTS idx_patients_morning_times ON patients USING GIN (morning_times);
CREATE INDEX IF NOT EXISTS idx_patients_afternoon_times ON patients USING GIN (afternoon_times);
CREATE INDEX IF NOT EXISTS idx_patients_evening_times ON patients USING GIN (evening_times);
CREATE INDEX IF NOT EXISTS idx_patients_bedtime_times ON patients USING GIN (bedtime_times);

-- Add comments to document the new columns
COMMENT ON COLUMN patients.morning_times IS 'Array of morning medication times in HH:MM format, e.g., ["06:00", "08:00"]';
COMMENT ON COLUMN patients.afternoon_times IS 'Array of afternoon medication times in HH:MM format, e.g., ["12:00", "14:00"]';
COMMENT ON COLUMN patients.evening_times IS 'Array of evening medication times in HH:MM format, e.g., ["18:00", "20:00"]';
COMMENT ON COLUMN patients.bedtime_times IS 'Array of bedtime medication times in HH:MM format, e.g., ["22:00", "23:00"]';

