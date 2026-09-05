-- ==========================================================
-- CareerBot AI - Supabase Database Schema
-- Run this in Supabase Dashboard -> SQL Editor -> New Query
-- ==========================================================

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  username TEXT,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  credits INTEGER DEFAULT 25,
  last_free_credit_claim_at TIMESTAMP WITH TIME ZONE,
  referral_code TEXT UNIQUE,
  referred_by TEXT,
  referral_count INTEGER DEFAULT 0,
  referral_earnings INTEGER DEFAULT 0,
  signup_ip TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Sessions Table
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Chats Table
CREATE TABLE IF NOT EXISTS chats (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  messages JSONB DEFAULT '[]'::jsonb NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Resumes / CVs Table
CREATE TABLE IF NOT EXISTS resumes (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  text TEXT NOT NULL,
  score INTEGER,
  review JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Transactions Table
CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL,
  amount NUMERIC,
  currency TEXT,
  credits_delta INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Applications Table
CREATE TABLE IF NOT EXISTS applications (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  job JSONB NOT NULL,
  status TEXT NOT NULL,
  applied_at TIMESTAMP WITH TIME ZONE,
  follow_up_at TIMESTAMP WITH TIME ZONE,
  follow_up_count INTEGER DEFAULT 0,
  contact_name TEXT,
  contact_email TEXT,
  contact_linkedin TEXT,
  timeline JSONB DEFAULT '[]'::jsonb NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Crawled Jobs Table (High-volume multi-source aggregation pool)
CREATE TABLE IF NOT EXISTS crawled_jobs (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  location TEXT,
  is_remote BOOLEAN DEFAULT false,
  job_type TEXT DEFAULT 'Full-time',
  experience_level TEXT DEFAULT 'Mid-Level',
  salary_formatted TEXT,
  description TEXT,
  snippet TEXT,
  tags JSONB DEFAULT '[]'::jsonb,
  apply_url TEXT UNIQUE NOT NULL,
  source TEXT NOT NULL,
  posted_at TEXT,
  age_days INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. Password Resets Table
CREATE TABLE IF NOT EXISTS password_resets (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  otp TEXT,
  token TEXT,
  token_hash TEXT,
  expires_at BIGINT NOT NULL,
  used BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for ultra-fast queries
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code);
CREATE INDEX IF NOT EXISTS idx_users_referred_by ON users(referred_by);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_chats_user_id ON chats(user_id);
CREATE INDEX IF NOT EXISTS idx_resumes_user_id ON resumes(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_applications_user_id ON applications(user_id);
CREATE INDEX IF NOT EXISTS idx_password_resets_email ON password_resets(email);
CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token);
CREATE INDEX IF NOT EXISTS idx_password_resets_token_hash ON password_resets(token_hash);
CREATE INDEX IF NOT EXISTS idx_crawled_jobs_created_at ON crawled_jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crawled_jobs_source ON crawled_jobs(source);
CREATE INDEX IF NOT EXISTS idx_crawled_jobs_apply_url ON crawled_jobs(apply_url);

-- ==========================================================
-- Safe Idempotent Column Migrations for Existing Databases
-- ==========================================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS username TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_free_credit_claim_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_count INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_earnings INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS signup_ip TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_referral_code_unique ON users(referral_code) WHERE referral_code IS NOT NULL;

ALTER TABLE sessions ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS token TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE chats ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE chats ADD COLUMN IF NOT EXISTS messages JSONB DEFAULT '[]'::jsonb;

ALTER TABLE resumes ADD COLUMN IF NOT EXISTS score INTEGER;
ALTER TABLE resumes ADD COLUMN IF NOT EXISTS review JSONB;

ALTER TABLE transactions ADD COLUMN IF NOT EXISTS amount NUMERIC;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS currency TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS credits_delta INTEGER;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS balance_after INTEGER;

ALTER TABLE applications ADD COLUMN IF NOT EXISTS timeline JSONB DEFAULT '[]'::jsonb;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS follow_up_count INTEGER DEFAULT 0;

ALTER TABLE password_resets ADD COLUMN IF NOT EXISTS otp TEXT;
ALTER TABLE password_resets ADD COLUMN IF NOT EXISTS token TEXT;
ALTER TABLE password_resets ADD COLUMN IF NOT EXISTS token_hash TEXT;
ALTER TABLE password_resets ADD COLUMN IF NOT EXISTS expires_at BIGINT;
ALTER TABLE password_resets ADD COLUMN IF NOT EXISTS used BOOLEAN DEFAULT false;

ALTER TABLE crawled_jobs ADD COLUMN IF NOT EXISTS is_remote BOOLEAN DEFAULT false;
ALTER TABLE crawled_jobs ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb;
ALTER TABLE crawled_jobs ADD COLUMN IF NOT EXISTS posted_at TEXT;
ALTER TABLE crawled_jobs ADD COLUMN IF NOT EXISTS age_days INTEGER;

