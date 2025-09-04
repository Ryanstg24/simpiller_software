-- Add password_change_required column to users table
-- This will track whether a user needs to change their temporary password

-- Add the column
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_change_required BOOLEAN DEFAULT false;

-- Update existing users to not require password change (they already have permanent passwords)
UPDATE users SET password_change_required = false WHERE password_change_required IS NULL;

-- Add a comment to document the column
COMMENT ON COLUMN users.password_change_required IS 'Indicates whether the user must change their password on next login (for temporary passwords)';

-- Verify the column was added
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name = 'password_change_required';
