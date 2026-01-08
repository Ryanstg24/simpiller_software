-- Allow NULL organization_id for partner pharmacies
-- Partner pharmacies (is_partner = true) should be available to all organizations
-- and therefore don't need to be tied to a specific organization

-- Drop NOT NULL constraint on organization_id
ALTER TABLE pharmacies 
ALTER COLUMN organization_id DROP NOT NULL;

-- Update any existing partner pharmacies to have NULL organization_id
-- (Optional: only if you want to clean up existing data)
-- UPDATE pharmacies 
-- SET organization_id = NULL 
-- WHERE is_partner = true AND organization_id IS NOT NULL;

