-- ==========================================================
-- CareerBot AI - Supabase Database Schema
-- Run this in Supabase Dashboard -> SQL Editor -> New Query
-- ==========================================================

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  credits INTEGER DEFAULT 25,
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

-- Indexes for ultra-fast queries
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_chats_user_id ON chats(user_id);
CREATE INDEX IF NOT EXISTS idx_resumes_user_id ON resumes(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_applications_user_id ON applications(user_id);
CREATE INDEX IF NOT EXISTS idx_crawled_jobs_created_at ON crawled_jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crawled_jobs_source ON crawled_jobs(source);
CREATE INDEX IF NOT EXISTS idx_crawled_jobs_apply_url ON crawled_jobs(apply_url);
