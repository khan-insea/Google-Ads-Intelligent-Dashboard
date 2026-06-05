/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleAdsAccount, CampaignDailyMetric } from '../../types';
import { dbStore } from './db';

export class GoogleAdsService {
  /**
   * Exchanges an OAuth authorization code for Google access and refresh tokens.
   */
  public static async exchangeCodeForTokens(code: string, redirectUri: string) {
    const clientId = process.env.GOOGLE_ADS_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      // Mock code exchange for demo mode execution
      return {
        access_token: 'mock_access_token_xyz',
        refresh_token: 'mock_refresh_token_abc',
        expires_in: 3600,
        scope: 'https://www.googleapis.com/auth/adwords'
      };
    }

    try {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to exchange authorization code: ${errorText}`);
      }

      return await response.json();
    } catch (err: any) {
      console.error('Error in exchangeCodeForTokens:', err);
      throw err;
    }
  }

  /**
   * Refreshes a Google Ads OAuth access token using a saved refresh token.
   */
  public static async refreshAccessToken(refreshToken: string): Promise<string> {
    const clientId = process.env.GOOGLE_ADS_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET;

    if (!clientId || !clientSecret || refreshToken.startsWith('mock_')) {
      return 'mock_new_access_token_123';
    }

    try {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to refresh access token: ${await response.text()}`);
      }

      const data = await response.json();
      return data.access_token;
    } catch (err) {
      console.error('Error refreshing access token:', err);
      throw err;
    }
  }

  /**
   * Queries real Google Ads API or simulates live data fetch.
   */
  public static async syncGoogleAdsMetrics(
    account: GoogleAdsAccount,
    targetDate: string
  ): Promise<{ rowsCount: number; error?: string }> {
    const devToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
    
    // Normalize Customer IDs (keep only digits)
    const cleanCustomerId = account.customerId.replace(/\D/g, "");
    const cleanLoginCustomerId = account.loginCustomerId ? account.loginCustomerId.replace(/\D/g, "") : undefined;
    
    // Check if configuration lacks live credentials
    if (!devToken || !process.env.GOOGLE_ADS_CLIENT_ID || account.id.includes('demo')) {
      return this.simulateSyncMetrics(account, targetDate);
    }

    try {
      // 1. Refresh Access Token
      const mockEncrypted = 'mock_refresh_token_abc'; // We simulate retrieval
      const accessToken = await this.refreshAccessToken(mockEncrypted);

      // 2. Fetch Campaign Metrics from Campaign GAQL endpoint
      const gaqlQuery = `
        SELECT 
          campaign.id, 
          campaign.name, 
          campaign.status, 
          campaign_budget.amount_micros,
          metrics.impressions, 
          metrics.clicks, 
          metrics.cost_micros, 
          metrics.conversions,
          segments.date
        FROM campaign 
        WHERE segments.date = '${targetDate}'
      `;

      const headers: { [key: string]: string } = {
        'Content-Type': 'application/json',
        'developer-token': devToken,
        'Authorization': `Bearer ${accessToken}`,
      };

      if (cleanLoginCustomerId) {
        headers['login-customer-id'] = cleanLoginCustomerId;
      }

      const apiVersion = process.env.GOOGLE_ADS_API_VERSION || 'v17';
      const url = `https://googleads.googleapis.com/${apiVersion}/customers/${cleanCustomerId}/googleAds:search`;
      console.log(`[GoogleAdsService] Calling Google Ads API from Server: POST ${url}`);

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ query: gaqlQuery }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        const isHtml = errorText.trim().startsWith('<') || errorText.includes('<html>');
        
        if (response.status === 404) {
          return {
            rowsCount: 0,
            error: "Google Ads API URL không đúng hoặc API version không còn được hỗ trợ. Hãy kiểm tra base URL googleads.googleapis.com và GOOGLE_ADS_API_VERSION."
          };
        }

        if (isHtml) {
          return {
            rowsCount: 0,
            error: "Google Ads API endpoint sai hoặc version không được hỗ trợ."
          };
        }

        throw new Error(`Google Ads search API error: ${errorText}`);
      }

      const searchResults = await response.json();
      const results = searchResults.results || [];

      if (results.length === 0) {
        return { rowsCount: 0 };
      }

      // Convert response into DB items
      const campaignMetrics: CampaignDailyMetric[] = results.map((row: any) => {
        const campaign = row.campaign || {};
        const metrics = row.metrics || {};
        const costMicros = Number(metrics.costMicros || 0);
        const cost = costMicros / 1000000;
        const clicks = Number(metrics.clicks || 0);
        const imps = Number(metrics.impressions || 0);
        const conversions = Number(metrics.conversions || 0);
        const ctr = imps > 0 ? (clicks / imps) * 100 : 0;
        const averageCpc = clicks > 0 ? cost / clicks : 0;
        const convRate = clicks > 0 ? (conversions / clicks) * 100 : 0;
        const budgetMicros = Number(row.campaignBudget?.amountMicros || 0);

        return {
          id: `metric-${campaign.id}-${targetDate}`,
          googleAdsAccountId: account.id,
          date: targetDate,
          campaignId: campaign.id,
          campaignName: campaign.name,
          campaignStatus: campaign.status,
          budget: Math.round(budgetMicros / 1000000),
          impressions: imps,
          clicks,
          cost: Math.round(cost),
          ctr,
          averageCpc: Math.round(averageCpc),
          conversions,
          conversionRate: convRate,
          costPerConversion: conversions > 0 ? Math.round(cost / conversions) : 0,
          createdAt: new Date().toISOString()
        };
      });

      // Save to database
      dbStore.saveCampaignMetrics(campaignMetrics);
      dbStore.generateRecommendationsFromData(account.id, dbStore.queryCampaigns(account.id));

      return { rowsCount: campaignMetrics.length };
    } catch (err: any) {
      console.error(`Sync error on Google Ads Account ID ${account.id}:`, err);
      return { 
        rowsCount: 0, 
        error: err.message || 'Google api connection timeout.' 
      };
    }
  }

  /**
   * Generates incremental mock data for the synced date
   */
  private static simulateSyncMetrics(account: GoogleAdsAccount, targetDate: string): { rowsCount: number } {
    const campaignsBase = [
      { id: 'camp-1', name: 'Search - Brand - Việt Nam', status: 'ENABLED' as const, budget: 300000, ctrBase: 12.3, cpcBase: 1400, convRateBase: 8.2, volBase: 1100 },
      { id: 'camp-2', name: 'Performance Max - Toàn quốc', status: 'ENABLED' as const, budget: 500000, ctrBase: 3.5, cpcBase: 4400, convRateBase: 4.1, volBase: 1700 },
      { id: 'camp-3', name: 'Search - Từ khóa ngách HaNoi', status: 'ENABLED' as const, budget: 200000, ctrBase: 1.9, cpcBase: 8800, convRateBase: 1.4, volBase: 500 },
      { id: 'camp-4', name: 'Display - Remarketing', status: 'ENABLED' as const, budget: 150005, ctrBase: 0.8, cpcBase: 3200, convRateBase: 0, volBase: 700 },
      { id: 'camp-5', name: 'Search - Đối thủ cạnh tranh', status: 'ENABLED' as const, budget: 400000, ctrBase: 4.6, cpcBase: 49000, convRateBase: 2.1, volBase: 350 }
    ];

    const targetMetrics: CampaignDailyMetric[] = campaignsBase.map(cfg => {
      const fluctuation = 0.95 + Math.random() * 0.15;
      const imps = Math.round(cfg.volBase * fluctuation);
      const clicks = Math.round(imps * (cfg.ctrBase / 100) * fluctuation);
      const cost = clicks * cfg.cpcBase * (1 + (Math.random() * 0.1 - 0.05));
      const conversions = cfg.convRateBase === 0 ? 0 : Math.round(clicks * (cfg.convRateBase / 100) * (1 + (Math.random() * 0.2 - 0.1)));

      const ctr = imps > 0 ? (clicks / imps) * 100 : 0;
      const averageCpc = clicks > 0 ? cost / clicks : 0;
      const convRate = clicks > 0 ? (conversions / clicks) * 100 : 0;
      const cpa = conversions > 0 ? cost / conversions : 0;

      return {
        id: `metric-${cfg.id}-${targetDate}`,
        googleAdsAccountId: account.id,
        date: targetDate,
        campaignId: cfg.id,
        campaignName: cfg.name,
        campaignStatus: cfg.status,
        budget: cfg.budget,
        impressions: imps,
        clicks,
        cost: Math.round(cost),
        ctr,
        averageCpc: Math.round(averageCpc),
        conversions,
        conversionRate: convRate,
        costPerConversion: Math.round(cpa),
        createdAt: new Date().toISOString()
      };
    });

    dbStore.saveCampaignMetrics(targetMetrics);
    
    // Regenerate recommendations with the newly appended metric
    dbStore.generateRecommendationsFromData(account.id, dbStore.queryCampaigns(account.id));
    return { rowsCount: targetMetrics.length };
  }
}
