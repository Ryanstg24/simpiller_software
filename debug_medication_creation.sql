-- Debug medication creation issue
-- Test inserting a medication directly to see what the error is

-- First, let's see what a valid patient ID looks like
SELECT id, first_name, last_name, organization_id 
FROM patients 
LIMIT 5;

-- Test inserting a medication with minimal required fields
INSERT INTO medications (
  patient_id,
  name,
  status
) VALUES (
  '00000000-0000-0000-0000-000000000000', -- Replace with actual patient ID
  'Test Medication',
  'active'
);

-- If that fails, let's see what the error is
-- If it succeeds, then the issue is in the application logic
