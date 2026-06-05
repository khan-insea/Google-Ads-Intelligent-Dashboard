-- SQL SCHEMA FOR GOOGLE ADS INTELLIGENT DASHBOARD
-- Run these statements in your Supabase SQL Editor to provision the exact tables

-- Enable UUID extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  role TEXT DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Google Ads Connected Accounts Table
CREATE TABLE IF NOT EXISTS google_ads_accounts (
  id TEXT PRIMARY KEY,
  account_name TEXT NOT NULL,
  customer_id TEXT NOT NULL,
  login_customer_id TEXT,
  status TEXT DEFAULT 'connected',
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Campaign Daily Metrics Table
CREATE TABLE IF NOT EXISTS campaign_daily_metrics (
  id TEXT PRIMARY KEY,
  google_ads_account_id TEXT REFERENCES google_ads_accounts(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  campaign_id TEXT NOT NULL,
  campaign_name TEXT NOT NULL,
  campaign_status TEXT NOT NULL,
  budget INTEGER DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  cost INTEGER DEFAULT 0,
  ctr NUMERIC DEFAULT 0,
  average_cpc NUMERIC DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  conversion_rate NUMERIC DEFAULT 0,
  cost_per_conversion NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- Prevent duplicated record insertion for same date/campaign
  UNIQUE(google_ads_account_id, date, campaign_id)
);

-- 4. Ad Group Daily Metrics Table
CREATE TABLE IF NOT EXISTS ad_group_daily_metrics (
  id TEXT PRIMARY KEY,
  google_ads_account_id TEXT REFERENCES google_ads_accounts(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  campaign_id TEXT NOT NULL,
  campaign_name TEXT NOT NULL,
  ad_group_id TEXT NOT NULL,
  ad_group_name TEXT NOT NULL,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  cost INTEGER DEFAULT 0,
  ctr NUMERIC DEFAULT 0,
  average_cpc NUMERIC DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  conversion_rate NUMERIC DEFAULT 0,
  cost_per_conversion NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(google_ads_account_id, date, ad_group_id)
);

-- 5. Keyword Daily Metrics Table
CREATE TABLE IF NOT EXISTS keyword_daily_metrics (
  id TEXT PRIMARY KEY,
  google_ads_account_id TEXT REFERENCES google_ads_accounts(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  campaign_id TEXT NOT NULL,
  campaign_name TEXT NOT NULL,
  ad_group_id TEXT NOT NULL,
  ad_group_name TEXT NOT NULL,
  keyword TEXT NOT NULL,
  match_type TEXT NOT NULL,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  cost INTEGER DEFAULT 0,
  ctr NUMERIC DEFAULT 0,
  average_cpc NUMERIC DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  conversion_rate NUMERIC DEFAULT 0,
  cost_per_conversion NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Search Term Daily Metrics Table
CREATE TABLE IF NOT EXISTS search_term_daily_metrics (
  id TEXT PRIMARY KEY,
  google_ads_account_id TEXT REFERENCES google_ads_accounts(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  campaign_id TEXT NOT NULL,
  campaign_name TEXT NOT NULL,
  ad_group_id TEXT NOT NULL,
  ad_group_name TEXT NOT NULL,
  search_term TEXT NOT NULL,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  cost INTEGER DEFAULT 0,
  ctr NUMERIC DEFAULT 0,
  average_cpc NUMERIC DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  conversion_rate NUMERIC DEFAULT 0,
  cost_per_conversion NUMERIC DEFAULT 0,
  recommendation TEXT, -- 'NEGATIVE' or 'EXPAND' or 'NONE'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Monthly Performance Reports Table
CREATE TABLE IF NOT EXISTS monthly_reports (
  id TEXT PRIMARY KEY,
  google_ads_account_id TEXT REFERENCES google_ads_accounts(id) ON DELETE CASCADE,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  total_cost INTEGER DEFAULT 0,
  total_clicks INTEGER DEFAULT 0,
  total_impressions INTEGER DEFAULT 0,
  total_conversions INTEGER DEFAULT 0,
  average_ctr NUMERIC DEFAULT 0,
  average_cpc NUMERIC DEFAULT 0,
  average_cpa NUMERIC DEFAULT 0,
  conversion_rate NUMERIC DEFAULT 0,
  best_campaign TEXT,
  worst_campaign TEXT,
  best_device TEXT,
  best_location TEXT,
  best_hour TEXT,
  summary TEXT,
  recommendations TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(google_ads_account_id, month, year)
);

-- 8. Execution and Synchronization Logs
CREATE TABLE IF NOT EXISTS sync_logs (
  id TEXT PRIMARY KEY,
  google_ads_account_id TEXT REFERENCES google_ads_accounts(id) ON DELETE CASCADE,
  account_name TEXT NOT NULL,
  sync_type TEXT NOT NULL, -- 'manual' or 'daily' (cron)
  status TEXT NOT NULL, -- 'success' or 'failed'
  rows_inserted INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMPTZ NOT NULL,
  finished_at TIMESTAMPTZ NOT NULL
);

-- 9. Automated Intelligent Optimization Recommendations
CREATE TABLE IF NOT EXISTS recommendations (
  id TEXT PRIMARY KEY,
  google_ads_account_id TEXT REFERENCES google_ads_accounts(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  level TEXT NOT NULL, -- 'HIGH' or 'MEDIUM' or 'LOW'
  type TEXT NOT NULL, -- 'click' or 'conversion' or 'budget' or 'quality'
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  action_suggestion TEXT NOT NULL,
  campaign_id TEXT,
  campaign_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- INDEXES for lightning fast dashboard analytical querying
CREATE INDEX IF NOT EXISTS idx_campaign_metrics_account_date ON campaign_daily_metrics(google_ads_account_id, date);
CREATE INDEX IF NOT EXISTS idx_ad_group_metrics_account_date ON ad_group_daily_metrics(google_ads_account_id, date);
CREATE INDEX IF NOT EXISTS idx_keyword_metrics_account_date ON keyword_daily_metrics(google_ads_account_id, date);
CREATE INDEX IF NOT EXISTS idx_search_term_metrics_account_date ON search_term_daily_metrics(google_ads_account_id, date);
CREATE INDEX IF NOT EXISTS idx_sync_logs_account ON sync_logs(google_ads_account_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_account ON recommendations(google_ads_account_id);
