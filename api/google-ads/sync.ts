import dotenv from 'dotenv';
import { dbStore } from '../_lib/db';
import { GoogleAdsService } from '../../src/lib/server/google_ads_service';
import { SyncLog } from '../../src/types';

dotenv.config();

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  try {
    const { accountId, date } = req.body || {};

    if (!accountId) {
      return res.status(400).json({ success: false, message: 'Thiếu Google Ads Account ID' });
    }

    const targetDate = date || new Date().toISOString().split('T')[0];
    const accounts = dbStore.getAccounts();
    const acc = accounts.find(a => a.id === accountId);

    if (!acc) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản quảng cáo tương ứng' });
    }

    const startedAt = new Date().toISOString();
    const result = await GoogleAdsService.syncGoogleAdsMetrics(acc, targetDate);
    const finishedAt = new Date().toISOString();

    const syncLogEntry: SyncLog = {
      id: `log-${Date.now()}`,
      googleAdsAccountId: acc.id,
      accountName: acc.accountName,
      syncType: 'manual',
      status: result.error ? 'failed' : 'success',
      rowsInserted: result.rowsCount,
      errorMessage: result.error,
      startedAt,
      finishedAt
    };

    dbStore.saveSyncLog(syncLogEntry);

    if (result.error) {
      return res.status(500).json({ 
        success: false, 
        message: `Đồng bộ thất bại: ${result.error}`, 
        log: syncLogEntry 
      });
    }

    dbStore.updateAccountSync(acc.id, finishedAt);

    return res.status(200).json({ 
      success: true, 
      message: `Đồng bộ thành công! Đã thêm ${result.rowsCount} dòng dữ liệu của ngày ${targetDate}.`,
      log: syncLogEntry
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: `Internal Server Error: ${error.message || error}`
    });
  }
}
