import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

// Helper to make standalone HTTP calls to Supabase PostgREST api
async function fetchSupabase(tableName: string, method: 'GET' | 'POST', body?: any, query?: string) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    throw new Error('Missing Supabase credentials');
  }

  const cleanUrl = supabaseUrl.replace(/\/$/, '');
  const url = `${cleanUrl}/rest/v1/${tableName}${query || ''}`;

  const headers: Record<string, string> = {
    'apikey': serviceKey,
    'Authorization': `Bearer ${serviceKey}`,
    'Content-Type': 'application/json',
  };

  if (method === 'POST') {
    headers['Prefer'] = 'return=representation';
  }

  const options: RequestInit = {
    method,
    headers,
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const res = await fetch(url, options);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase API responded with status ${res.status}: ${text}`);
  }

  return await res.json();
}

// Low-dependency local JSON file operations
const DB_FILE = path.join(process.cwd(), 'data', 'db_store.json');

function getLocalData() {
  if (fs.existsSync(DB_FILE)) {
    try {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      return JSON.parse(content);
    } catch {
      return {};
    }
  }
  return {};
}

function saveLocalData(data: any) {
  const dir = path.dirname(DB_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Unable to write fallback JSON database:', err);
  }
}

export default async function handler(req: any, res: any) {
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    // 1. Handle GET: Retrieve accounts
    if (req.method === 'GET') {
      try {
        if (process.env.NODE_ENV === 'production' || (supabaseUrl && serviceKey)) {
          if (!supabaseUrl || !serviceKey) {
            return res.status(400).json({
              success: false,
              message: "Missing Supabase environment variables"
            });
          }
          const accounts = await fetchSupabase('google_ads_accounts', 'GET', undefined, '?select=*&order=created_at.desc');
          const mappedAccounts = accounts.map((acc: any) => ({
            id: acc.id,
            accountName: acc.account_name,
            customerId: acc.customer_id,
            loginCustomerId: acc.login_customer_id || '',
            status: acc.status || 'connected',
            lastSyncAt: acc.last_sync_at,
            createdAt: acc.created_at
          }));

          return res.status(200).json({
            success: true,
            data: mappedAccounts,
            accounts: mappedAccounts
          });
        }

        // Falling back to Local JSON database
        const localData = getLocalData();
        const accounts = localData.google_ads_accounts || [];
        return res.status(200).json({
          success: true,
          data: accounts,
          accounts: accounts
        });
      } catch (dbErr: any) {
        return res.status(500).json({
          success: false,
          message: `Lookup failed: ${dbErr.message || dbErr}`
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

        const syncLog = {
          id: `log-${Date.now()}`,
          googleAdsAccountId: newAcc.id,
          accountName: newAcc.accountName,
          syncType: 'manual',
          status: 'success',
          rowsInserted: 5,
          startedAt: new Date(Date.now() - 4000).toISOString(),
          finishedAt: new Date().toISOString()
        };

        const recommendationsList = [
          {
            id: `reco-ctr-mcamp-1`,
            googleAdsAccountId: newAcc.id,
            date: targetDate,
            level: 'LOW',
            type: 'budget',
            title: `Tối ưu ngân sách chiến dịch Search - Thương Hiệu Mới`,
            description: `Tài khoản vừa thiết lập cần tối ưu hóa nâng cao ngân sách để tối ưu hóa chi phí click chuột ban đầu.`,
            actionSuggestion: 'Có thể điều chỉnh ngân sách linh hoạt theo chuyển đổi của ngày để mang lại lưu lượng truy cập cao.',
            campaignId: 'mcamp-1',
            campaignName: 'Search - Thương Hiệu Mới',
            createdAt: new Date().toISOString()
          }
        ];

        if (process.env.NODE_ENV === 'production' || (supabaseUrl && serviceKey)) {
          if (!supabaseUrl || !serviceKey) {
            return res.status(400).json({
              success: false,
              message: "Missing Supabase environment variables"
            });
          }

          // Write core account to Supabase
          await fetchSupabase('google_ads_accounts', 'POST', {
            id: newAcc.id,
            account_name: newAcc.accountName,
            customer_id: newAcc.customerId,
            login_customer_id: newAcc.loginCustomerId || null,
            status: newAcc.status,
            last_sync_at: newAcc.lastSyncAt,
            created_at: newAcc.createdAt
          });

          // Write sync log
          try {
            await fetchSupabase('sync_logs', 'POST', {
              id: syncLog.id,
              google_ads_account_id: syncLog.googleAdsAccountId,
              account_name: syncLog.accountName,
              sync_type: syncLog.syncType,
              status: syncLog.status,
              rows_inserted: syncLog.rowsInserted,
              started_at: syncLog.startedAt,
              finished_at: syncLog.finishedAt
            });
          } catch (eLog) {
            console.warn('Sync log creation failed in Supabase:', eLog);
          }

          // Write base campaign metrics
          try {
            for (const m of targetMetrics) {
              await fetchSupabase('campaign_daily_metrics', 'POST', {
                id: m.id,
                google_ads_account_id: m.googleAdsAccountId,
                date: m.date,
                campaign_id: m.campaignId,
                campaign_name: m.campaignName,
                campaign_status: m.campaignStatus,
                budget: m.budget,
                impressions: m.impressions,
                clicks: m.clicks,
                cost: m.cost,
                ctr: m.ctr,
                average_cpc: m.averageCpc,
                conversions: m.conversions,
                conversion_rate: m.conversionRate,
                cost_per_conversion: m.costPerConversion,
                created_at: m.createdAt
              });
            }
          } catch (eMetrics) {
            console.warn('Seeding campaign metrics failed in Supabase:', eMetrics);
          }

          // Write base recommendations
          try {
            for (const r of recommendationsList) {
              await fetchSupabase('recommendations', 'POST', {
                id: r.id,
                google_ads_account_id: r.googleAdsAccountId,
                date: r.date,
                level: r.level,
                type: r.type,
                title: r.title,
                description: r.description,
                action_suggestion: r.actionSuggestion,
                campaign_id: r.campaignId,
                campaign_name: r.campaignName,
                created_at: r.createdAt
              });
            }
          } catch (eRecos) {
            console.warn('Seeding recommendations failed in Supabase:', eRecos);
          }

          return res.status(200).json({
            success: true,
            data: newAcc,
            account: newAcc
          });
        }

        // Falling back to Local JSON database write
        const localData = getLocalData();
        if (!localData.google_ads_accounts) localData.google_ads_accounts = [];
        localData.google_ads_accounts.push(newAcc);

        if (!localData.sync_logs) localData.sync_logs = [];
        localData.sync_logs.unshift(syncLog);

        if (!localData.campaign_daily_metrics) localData.campaign_daily_metrics = [];
        localData.campaign_daily_metrics.push(...targetMetrics);

        if (!localData.recommendations) localData.recommendations = [];
        localData.recommendations.push(...recommendationsList);

        saveLocalData(localData);

        return res.status(200).json({
          success: true,
          data: newAcc,
          account: newAcc
        });
      } catch (dbErr: any) {
        return res.status(500).json({
          success: false,
          message: `Database insertion failed: ${dbErr.message || dbErr}`
        });
      }
    }

    // 3. For other methods
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
