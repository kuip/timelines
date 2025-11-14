-- Add Twitter verification (blue checkmark) field to users table

ALTER TABLE users ADD COLUMN IF NOT EXISTS is_twitter_verified BOOLEAN DEFAULT FALSE;

-- Create index for faster queries on verified users
CREATE INDEX IF NOT EXISTS idx_users_is_verified ON users(is_twitter_verified);

-- Create index for querying verified users by x_user_id
CREATE INDEX IF NOT EXISTS idx_users_x_user_verified ON users(x_user_id) WHERE is_twitter_verified = TRUE;
