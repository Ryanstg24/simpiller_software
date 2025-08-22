-- Add setup_fee column to organizations table
-- This migration adds the setup_fee column with a default value of 500.00

ALTER TABLE organizations 
ADD COLUMN setup_fee DECIMAL(10,2) DEFAULT 500.00;

-- Update existing organizations to have the default setup fee
UPDATE organizations 
SET setup_fee = 500.00 
WHERE setup_fee IS NULL;

-- Add a comment to document the column
COMMENT ON COLUMN organizations.setup_fee IS 'Custom setup fee amount for each organization. Default is $500.00. Can be set to 0 to waive setup fees.'; 