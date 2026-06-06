import dotenv from 'dotenv';
import { dbStore } from '../_lib/db.js';
import { GoogleAdsService } from '../_lib/google_ads_service.js';
import { SyncLog } from '../_lib/types.js';

dotenv.config();

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  // Check Supabase configurations in Production
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (process.env.NODE_ENV === 'production' || (supabaseUrl && serviceKey)) {
    if (!supabaseUrl || !serviceKey) {
      return res.status(400).json({
        success: false,
        message: "Missing Supabase environment variables"
      });
    }
  }

  // Check GOOGLE_ADS_API_VERSION as required
  const envApiVersion = process.env.GOOGLE_ADS_API_VERSION;
  if (process.env.NODE_ENV === 'production' && !envApiVersion) {
    return res.status(400).json({
      success: false,
      message: "Missing GOOGLE_ADS_API_VERSION"
    });
  }

  try {
    // If Supabase environment is valid, make sure we syncOurData first
    if (supabaseUrl && serviceKey) {
      await dbStore.syncWithSupabase();
    }

    const { accountId, date } = req.body || {};
    const targetDate = date || new Date().toISOString().split('T')[0];
    const accounts = dbStore.getAccounts();

    // Support empty request body by choosing a default account if possible
    let targetAccountId = accountId;
    if (!targetAccountId) {
      if (accounts && accounts.length > 0) {
        // Find first connected account, or use first account
        const defaultAcc = accounts.find((a: any) => a.status === 'connected') || accounts[0];
        targetAccountId = defaultAcc?.id;
      }
    }

    if (!targetAccountId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing accountId' 
      });
    }

    const acc = accounts.find(a => a.id === targetAccountId);
    if (!acc) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản quảng cáo tương ứng' });
    }

    // Checking requirements for live accounts
    const isDemo = acc.id.includes('demo');
    if (!isDemo) {
      const devToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
      const clientId = process.env.GOOGLE_ADS_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET;

      if (!devToken || !clientId || !clientSecret) {
        return res.status(400).json({
          success: false,
          message: "Missing Google Ads environment variables"
        });
      }

      if (!acc.refresh_token) {
        return res.status(400).json({
          success: false,
          message: "Tài khoản này chưa có Google OAuth refresh_token. Vui lòng bấm Kết Nối Google Ads trước."
        });
      }
    }

    const cleanCid = acc.customerId ? acc.customerId.replace(/\D/g, "") : "";
    const activeVersion = process.env.GOOGLE_ADS_API_VERSION || (process.env.NODE_ENV === 'production' ? '' : 'v17');
    const googleAdsUrl = `https://googleads.googleapis.com/${activeVersion}/customers/${cleanCid}/googleAds:search`;

    const startedAt = new Date().toISOString();
    const result = await GoogleAdsService.syncGoogleAdsMetrics(acc, targetDate);
    const finishedAt = new Date().toISOString();

    const syncLogEntry: SyncLog = {
      id: `log-${Date.now()}`,
      googleAdsAccountId: acc.id,
      accountName: acc.accountName,
      syncType: 'manual',
      status: result.error ? 'failed' : 'success',
      rowsInserted: result.rowsCount || 0,
      errorMessage: result.error || null,
      startedAt,
      finishedAt
    };

    await dbStore.saveSyncLog(syncLogEntry);

    if (result.error) {
      return res.status(400).json({ 
        success: false, 
        message: result.error.includes('Google Ads API error') ? result.error : `Google Ads API error: ${result.error}`, 
        details: result.errorDetails || null,
        apiVersion: activeVersion,
        googleAdsUrl,
        log: syncLogEntry 
      });
    }

    await dbStore.updateAccountSync(acc.id, finishedAt);

    return res.status(200).json({ 
      success: true, 
      message: "Đồng bộ dữ liệu Google Ads thành công",
      details: `Đồng bộ thành công! Đã thêm ${result.rowsCount} dòng dữ liệu của ngày ${targetDate}.`,
      apiVersion: activeVersion,
      googleAdsUrl,
      log: syncLogEntry
    });
  } catch (error: any) {
    console.error('API sync error handler:', error);
    return res.status(500).json({
      success: false,
      message: `Internal Server Error: ${error.message || error}`
    });
  }
}

