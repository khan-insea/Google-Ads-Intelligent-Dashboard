import dotenv from 'dotenv';

dotenv.config();

export default async function handler(req: any, res: any) {
  try {
    // Dynamically load the database module to guarantee zero startup/compile crashes on serverless
    const { dbStore } = await import('../../src/lib/server/db');

    // 1. Handle GET: Retrieve accounts
    if (req.method === 'GET') {
      try {
        const accounts = dbStore.getAccounts() || [];
        return res.status(200).json({
          success: true,
          data: accounts,
          accounts: accounts
        });
      } catch (dbErr: any) {
        return res.status(500).json({
          success: false,
          message: `Supabase error or database lookup failed: ${dbErr.message || dbErr}`
        });
      }
    }

    // 2. Handle POST: Add manual account
    if (req.method === 'POST') {
      try {
        const { accountName, customerId, loginCustomerId } = req.body || {};

        if (!accountName || !customerId) {
          return res.status(400).json({
            success: false,
            message: 'Nhập thiếu Tên tài khoản hoặc Customer ID'
          });
        }

        // Normalize matching both 411-705-7088 and 4117057088 formats
        const cleanCustomerId = customerId.replace(/\D/g, "");
        const cleanLoginCustomerId = loginCustomerId ? loginCustomerId.replace(/\D/g, "") : "";

        if (cleanCustomerId.length !== 10) {
          return res.status(400).json({
            success: false,
            message: 'Google Ads Customer ID không hợp lệ. Phải bao gồm đúng 10 số.'
          });
        }

        if (loginCustomerId && cleanLoginCustomerId.length !== 10) {
          return res.status(400).json({
            success: false,
            message: 'Login Customer ID không hợp lệ. Phải bao gồm đúng 10 số.'
          });
        }

        const newAcc = {
          id: `acc-manual-${Date.now()}`,
          accountName,
          customerId: cleanCustomerId, // Save as plain numbers (4117057088)
          loginCustomerId: cleanLoginCustomerId || '', // Save as plain numbers or empty
          status: 'connected' as const,
          lastSyncAt: new Date().toISOString(),
          createdAt: new Date().toISOString()
        };

        dbStore.addAccount(newAcc);

        dbStore.saveSyncLog({
          id: `log-${Date.now()}`,
          googleAdsAccountId: newAcc.id,
          accountName: newAcc.accountName,
          syncType: 'manual',
          status: 'success',
          rowsInserted: 5,
          startedAt: new Date(Date.now() - 4000).toISOString(),
          finishedAt: new Date().toISOString()
        });

        const targetDate = new Date().toISOString().split('T')[0];
        const campaignsBase = [
          { id: 'mcamp-1', name: 'Search - Thương Hiệu Mới', status: 'ENABLED' as const, budget: 150000, ctrBase: 10.2, cpcBase: 1800, convRateBase: 7.5, volBase: 800 },
          { id: 'mcamp-2', name: 'Performance Max - Toàn Quốc Mới', status: 'ENABLED' as const, budget: 350000, ctrBase: 4.1, cpcBase: 4100, convRateBase: 3.8, volBase: 1200 }
        ];

        const targetMetrics = campaignsBase.map(cfg => {
          return {
            id: `metric-${cfg.id}-${targetDate}`,
            googleAdsAccountId: newAcc.id,
            date: targetDate,
            campaignId: cfg.id,
            campaignName: cfg.name,
            campaignStatus: cfg.status,
            budget: cfg.budget,
            impressions: cfg.volBase,
            clicks: Math.round(cfg.volBase * (cfg.ctrBase / 100)),
            cost: Math.round(cfg.volBase * (cfg.ctrBase / 100) * cfg.cpcBase),
            ctr: cfg.ctrBase,
            averageCpc: cfg.cpcBase,
            conversions: Math.round(cfg.volBase * (cfg.ctrBase / 100) * (cfg.convRateBase / 100)),
            conversionRate: cfg.convRateBase,
            costPerConversion: Math.round(cfg.cpcBase / (cfg.convRateBase / 100)),
            createdAt: new Date().toISOString()
          };
        });
        
        dbStore.saveCampaignMetrics(targetMetrics);
        dbStore.generateRecommendationsFromData(newAcc.id, dbStore.queryCampaigns(newAcc.id));

        return res.status(200).json({
          success: true,
          data: newAcc,
          account: newAcc
        });
      } catch (dbErr: any) {
        return res.status(500).json({
          success: false,
          message: `Supabase error or database insertion failed: ${dbErr.message || dbErr}`
        });
      }
    }

    // 3. For any other methods
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({
      success: false,
      message: 'Method Not Allowed'
    });

  } catch (globalErr: any) {
    return res.status(500).json({
      success: false,
      message: `Internal server error: ${globalErr.message || globalErr}`
    });
  }
}
