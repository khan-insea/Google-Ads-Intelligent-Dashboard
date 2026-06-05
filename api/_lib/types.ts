/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface User {
  id: string;
  email: string;
  role: 'admin' | 'viewer';
  createdAt: string;
}

export interface GoogleAdsAccount {
  id: string;
  accountName: string;
  customerId: string;
  loginCustomerId?: string; // Standard for MCC accounts
  status: 'connected' | 'disconnected' | 'error';
  lastSyncAt?: string;
  createdAt: string;
  refresh_token?: string;
}

export interface CampaignDailyMetric {
  id: string;
  googleAdsAccountId: string;
  date: string; // YYYY-MM-DD
  campaignId: string;
  campaignName: string;
  campaignStatus: 'ENABLED' | 'PAUSED' | 'REMOVED' | 'UNKNOWN';
  budget: number; // in VND
  impressions: number;
  clicks: number;
  cost: number; // in VND
  ctr: number; // custom calculated but saved as percentage (0 - 100) or ratio (0 - 1)
  averageCpc: number; // in VND
  conversions: number;
  conversionRate: number; // custom calculated percentage (0 - 100)
  costPerConversion: number; // CPA in VND
  createdAt: string;
}

export interface AdGroupDailyMetric {
  id: string;
  googleAdsAccountId: string;
  date: string;
  campaignId: string;
  campaignName: string;
  adGroupId: string;
  adGroupName: string;
  impressions: number;
  clicks: number;
  cost: number;
  ctr: number;
  averageCpc: number;
  conversions: number;
  conversionRate: number;
  costPerConversion: number;
  createdAt: string;
}

export interface KeywordDailyMetric {
  id: string;
  googleAdsAccountId: string;
  date: string;
  campaignId: string;
  campaignName: string;
  adGroupId: string;
  adGroupName: string;
  keyword: string;
  matchType: 'BROAD' | 'PHRASE' | 'EXACT' | 'UNKNOWN';
  impressions: number;
  clicks: number;
  cost: number;
  ctr: number;
  averageCpc: number;
  conversions: number;
  conversionRate: number;
  costPerConversion: number;
  createdAt: string;
}

export interface SearchTermDailyMetric {
  id: string;
  googleAdsAccountId: string;
  date: string;
  campaignId: string;
  campaignName: string;
  adGroupId: string;
  adGroupName: string;
  searchTerm: string;
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  ctr: number;
  averageCpc: number;
  costPerConversion: number;
  recommendation?: 'NEGATIVE' | 'EXPAND' | 'NONE';
  createdAt: string;
}

export interface MonthlyReport {
  id: string;
  googleAdsAccountId: string;
  month: number; // 1-12
  year: number;
  totalCost: number;
  totalClicks: number;
  totalImpressions: number;
  totalConversions: number;
  averageCtr: number;
  averageCpc: number;
  averageCpa: number;
  conversionRate: number;
  summary: string;
  recommendations: string[]; // List of actions
  bestCampaign: string;
  worstCampaign: string;
  bestDevice: string;
  bestLocation: string;
  bestHour: string;
  createdAt: string;
}

export interface SyncLog {
  id: string;
  googleAdsAccountId: string;
  accountName: string;
  syncType: 'daily' | 'manual' | 'historical';
  status: 'success' | 'failed';
  rowsInserted: number;
  errorMessage?: string;
  startedAt: string;
  finishedAt: string;
}

export interface Recommendation {
  id: string;
  googleAdsAccountId: string;
  date: string;
  level: 'HIGH' | 'MEDIUM' | 'LOW';
  type: 'click' | 'conversion' | 'budget';
  title: string;
  description: string;
  actionSuggestion: string;
  campaignId: string;
  campaignName: string;
  createdAt: string;
}

// Support analytical objects
export interface AnalyticsBreakdown {
  device: { name: string; clicks: number; cost: number; conversions: number }[];
  location: { name: string; clicks: number; cost: number; conversions: number }[];
  hour: { label: string; clicks: number; cost: number; conversions: number }[];
}
