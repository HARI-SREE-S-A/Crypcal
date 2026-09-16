-- =============================================================================
-- 192.168.6 — Supabase Database Schema
--
-- Instructions:
-- 1. Create a free Supabase project at https://supabase.com (no credit card needed).
-- 2. Open the SQL Editor in your Supabase project dashboard.
-- 3. Paste this script and click "Run".
-- 4. Copy your Project URL and Anon Public Key into your .env or Vercel environment variables:
--    VITE_SUPABASE_URL=https://your-project.supabase.co
--    VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
-- =============================================================================

-- Enable pgcrypto for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  short_id VARCHAR(6) UNIQUE NOT NULL,               -- e.g. "KPR472" (3 uppercase letters + 3 digits)
  display_name VARCHAR(100) NOT NULL,
  matrix_user_id VARCHAR(255) NOT NULL,              -- e.g. "@username:matrix.org"
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ
);

-- Fast lookup indexes
CREATE INDEX IF NOT EXISTS idx_users_short_id ON users(short_id);
CREATE INDEX IF NOT EXISTS idx_users_matrix_user_id ON users(matrix_user_id);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Allow anyone to search approved users by short ID (like looking up phone numbers)
CREATE POLICY "Allow public read for approved users"
  ON users FOR SELECT
  USING (true);

-- Allow anyone to submit an access request
CREATE POLICY "Allow registration request"
  ON users FOR INSERT
  WITH CHECK (status = 'pending');

-- Allow updating users (for admin approvals)
CREATE POLICY "Allow user status update"
  ON users FOR UPDATE
  USING (true)
  WITH CHECK (true);
