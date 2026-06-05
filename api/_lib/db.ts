import fs from 'fs';
import path from 'path';
import { 
  User, 
  GoogleAdsAccount, 
  CampaignDailyMetric, 
  AdGroupDailyMetric, 
  KeywordDailyMetric, 
  SearchTermDailyMetric, 
  MonthlyReport, 
  SyncLog, 
  Recommendation
} from './types.js';

// Let's establish a simple, file-based database for zero-config persistence
const DB_FILE = path.join(process.cwd(), 'data', 'db_store.json');

// Helper to make standalone HTTP calls to Supabase PostgREST api
async function fetchSupabase(tableName: string, method: 'GET' | 'POST' | 'PATCH' | 'DELETE', body?: any, query?: string) {
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

  if (res.status === 204) {
    return null;
  }

  const text = await res.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return text;
  }
}

export class DBManager {
  private localData: {
    users: User[];
    google_ads_accounts: GoogleAdsAccount[];
    campaign_daily_metrics: CampaignDailyMetric[];
    ad_group_daily_metrics: AdGroupDailyMetric[];
    keyword_daily_metrics: KeywordDailyMetric[];
    search_term_daily_metrics: SearchTermDailyMetric[];
    monthly_reports: MonthlyReport[];
    sync_logs: SyncLog[];
    recommendations: Recommendation[];
  };

  constructor() {
    this.localData = {
      users: [],
      google_ads_accounts: [],
      campaign_daily_metrics: [],
      ad_group_daily_metrics: [],
      keyword_daily_metrics: [],
      search_term_daily_metrics: [],
      monthly_reports: [],
      sync_logs: [],
      recommendations: []
    };
    
    if (process.env.NODE_ENV !== 'production') {
      this.loadLocal();
      if (this.localData.google_ads_accounts.length === 0) {
        this.seedLocalDemoData();
      }
    }
  }

  private ensureLocalDirectory() {
    if (process.env.NODE_ENV === 'production') return;
    const dir = path.dirname(DB_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  private loadLocal() {
    if (process.env.NODE_ENV === 'production') return;
    if (fs.existsSync(DB_FILE)) {
      try {
        const fileContent = fs.readFileSync(DB_FILE, 'utf-8');
        this.localData = JSON.parse(fileContent);
      } catch (err) {
        console.error('Error loading DB file, reinitializing...', err);
        this.saveLocal();
      }
    } else {
      this.saveLocal();
    }
  }

  public saveLocal() {
    if (process.env.NODE_ENV === 'production') return;
    try {
      this.ensureLocalDirectory();
      fs.writeFileSync(DB_FILE, JSON.stringify(this.localData, null, 2), 'utf-8');
    } catch (err) {
      console.warn('Unable to write fallback database locally:', err);
    }
  }

  // --- API Methods ---
  public async syncWithSupabase() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('Thiếu cấu hình biến môi trường Supabase ở production!');
      }
      return;
    }

    try {
      const fetchTable = async (tableName: string) => {
        try {
          return await fetchSupabase(tableName, 'GET', undefined, '?select=*') || [];
        } catch (err) {
          console.error(`Failed to fetch table ${tableName} from Supabase:`, err);
          return [];
        }
      };

      const [
        accounts,
        campaignMetrics,
        adGroupMetrics,
        keywordMetrics,
        searchTermMetrics,
        monthlyReports,
        syncLogs,
        recommendations
      ] = await Promise.all([
        fetchTable('google_ads_accounts'),
        fetchTable('campaign_daily_metrics'),
        fetchTable('ad_group_daily_metrics'),
        fetchTable('keyword_daily_metrics'),
        fetchTable('search_term_daily_metrics'),
        fetchTable('monthly_reports'),
        fetchTable('sync_logs'),
        fetchTable('recommendations')
      ]);

      if (Array.isArray(accounts)) {
        this.localData.google_ads_accounts = accounts.map((acc: any) => ({
          id: acc.id,
          accountName: acc.account_name,
          customerId: acc.customer_id,
          loginCustomerId: acc.login_customer_id || '',
          status: acc.status || 'connected',
          lastSyncAt: acc.last_sync_at,
          createdAt: acc.created_at,
          refresh_token: acc.refresh_token
        }));
      }

      if (Array.isArray(campaignMetrics)) {
        this.localData.campaign_daily_metrics = campaignMetrics.map((m: any) => ({
          id: m.id,
          googleAdsAccountId: m.google_ads_account_id,
          date: m.date,
          campaignId: m.campaign_id,
          campaignName: m.campaign_name,
          campaignStatus: m.campaign_status,
          budget: Number(m.budget) || 0,
          impressions: Number(m.impressions) || 0,
          clicks: Number(m.clicks) || 0,
          cost: Number(m.cost) || 0,
          ctr: Number(m.ctr) || 0,
          averageCpc: Number(m.average_cpc) || 0,
          conversions: Number(m.conversions) || 0,
          conversionRate: Number(m.conversion_rate) || 0,
          costPerConversion: Number(m.cost_per_conversion) || 0,
          createdAt: m.created_at
        }));
      }

      if (Array.isArray(adGroupMetrics)) {
        this.localData.ad_group_daily_metrics = adGroupMetrics.map((m: any) => ({
          id: m.id,
          googleAdsAccountId: m.google_ads_account_id,
          date: m.date,
          campaignId: m.campaign_id,
          campaignName: m.campaign_name,
          adGroupId: m.ad_group_id,
          adGroupName: m.ad_group_name,
          impressions: Number(m.impressions) || 0,
          clicks: Number(m.clicks) || 0,
          cost: Number(m.cost) || 0,
          ctr: Number(m.ctr) || 0,
          averageCpc: Number(m.average_cpc) || 0,
          conversions: Number(m.conversions) || 0,
          conversionRate: Number(m.conversion_rate) || 0,
          costPerConversion: Number(m.cost_per_conversion) || 0,
          createdAt: m.created_at
        }));
      }

      if (Array.isArray(keywordMetrics)) {
        this.localData.keyword_daily_metrics = keywordMetrics.map((m: any) => ({
          id: m.id,
          googleAdsAccountId: m.google_ads_account_id,
          date: m.date,
          campaignId: m.campaign_id,
          campaignName: m.campaign_name,
          adGroupId: m.ad_group_id,
          adGroupName: m.ad_group_name,
          keyword: m.keyword,
          matchType: m.match_type,
          impressions: Number(m.impressions) || 0,
          clicks: Number(m.clicks) || 0,
          cost: Number(m.cost) || 0,
          ctr: Number(m.ctr) || 0,
          averageCpc: Number(m.average_cpc) || 0,
          conversions: Number(m.conversions) || 0,
          conversionRate: Number(m.conversion_rate) || 0,
          costPerConversion: Number(m.cost_per_conversion) || 0,
          createdAt: m.created_at
        }));
      }

      if (Array.isArray(searchTermMetrics)) {
        this.localData.search_term_daily_metrics = searchTermMetrics.map((m: any) => ({
          id: m.id,
          googleAdsAccountId: m.google_ads_account_id,
          date: m.date,
          campaignId: m.campaign_id,
          campaignName: m.campaign_name,
          adGroupId: m.ad_group_id,
          adGroupName: m.ad_group_name,
          searchTerm: m.search_term,
          impressions: Number(m.impressions) || 0,
          clicks: Number(m.clicks) || 0,
          cost: Number(m.cost) || 0,
          conversions: Number(m.conversions) || 0,
          ctr: Number(m.ctr) || 0,
          averageCpc: Number(m.average_cpc) || 0,
          costPerConversion: Number(m.cost_per_conversion) || 0,
          recommendation: m.recommendation,
          createdAt: m.created_at
        }));
      }

      if (Array.isArray(monthlyReports)) {
        this.localData.monthly_reports = monthlyReports.map((r: any) => ({
          id: r.id,
          googleAdsAccountId: r.google_ads_account_id,
          month: r.month,
          year: r.year,
          totalCost: Number(r.total_cost) || 0,
          totalClicks: Number(r.total_clicks) || 0,
          totalImpressions: Number(r.total_impressions) || 0,
          totalConversions: Number(r.total_conversions) || 0,
          averageCtr: Number(r.average_ctr) || 0,
          averageCpc: Number(r.average_cpc) || 0,
          averageCpa: Number(r.average_cpa) || 0,
          conversionRate: Number(r.conversion_rate) || 0,
          summary: r.summary,
          recommendations: Array.isArray(r.recommendations) ? r.recommendations : JSON.parse(r.recommendations || '[]'),
          bestCampaign: r.best_campaign,
          worstCampaign: r.worst_campaign,
          bestDevice: r.best_device,
          bestLocation: r.best_location,
          bestHour: r.best_hour,
          createdAt: r.created_at
        }));
      }

      if (Array.isArray(syncLogs)) {
        this.localData.sync_logs = syncLogs.map((l: any) => ({
          id: l.id,
          googleAdsAccountId: l.google_ads_account_id,
          accountName: l.account_name,
          syncType: l.sync_type,
          status: l.status,
          rowsInserted: Number(l.rows_inserted) || 0,
          errorMessage: l.error_message,
          startedAt: l.started_at,
          finishedAt: l.finished_at
        }));
      }

      if (Array.isArray(recommendations)) {
        this.localData.recommendations = recommendations.map((r: any) => ({
          id: r.id,
          googleAdsAccountId: r.google_ads_account_id,
          date: r.date,
          level: r.level,
          type: r.type,
          title: r.title,
          description: r.description,
          actionSuggestion: r.action_suggestion,
          campaignId: r.campaign_id,
          campaignName: r.campaign_name,
          createdAt: r.created_at
        }));
      }
    } catch (err) {
      console.error('Failed processing Supabase query synchronization inside DBManager:', err);
      if (process.env.NODE_ENV === 'production') {
        throw err;
      }
    }
  }

  public getAccounts(): GoogleAdsAccount[] {
    this.loadLocal();
    return this.localData.google_ads_accounts || [];
  }

  public getUsers() {
    this.loadLocal();
    return this.localData.users || [];
  }

  public getCampaignMetrics() {
    this.loadLocal();
    return this.localData.campaign_daily_metrics || [];
  }

  public getAdGroupMetrics() {
    this.loadLocal();
    return this.localData.ad_group_daily_metrics || [];
  }

  public getKeywordMetrics() {
    this.loadLocal();
    return this.localData.keyword_daily_metrics || [];
  }

  public getSearchTermMetrics() {
    this.loadLocal();
    return this.localData.search_term_daily_metrics || [];
  }

  public getMonthlyReports() {
    this.loadLocal();
    return this.localData.monthly_reports || [];
  }

  public getSyncLogs() {
    this.loadLocal();
    return this.localData.sync_logs || [];
  }

  public getRecommendations() {
    this.loadLocal();
    return this.localData.recommendations || [];
  }

  // Writers / Adders
  public async addAccount(account: GoogleAdsAccount) {
    this.loadLocal();
    const idx = this.localData.google_ads_accounts.findIndex(a => a.id === account.id || a.customerId === account.customerId);
    if (idx !== -1) {
      this.localData.google_ads_accounts[idx] = { ...this.localData.google_ads_accounts[idx], ...account };
    } else {
      this.localData.google_ads_accounts.push(account);
    }
    this.saveLocal();

    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (supabaseUrl && serviceKey) {
      try {
        const check = await fetchSupabase('google_ads_accounts', 'GET', undefined, `?id=eq.${encodeURIComponent(account.id)}`);
        const itemBody = {
          id: account.id,
          account_name: account.accountName,
          customer_id: account.customerId,
          login_customer_id: account.loginCustomerId || null,
          status: account.status || 'connected',
          last_sync_at: account.lastSyncAt || null,
          created_at: account.createdAt || new Date().toISOString()
        };
        if (check && check.length > 0) {
          await fetchSupabase('google_ads_accounts', 'PATCH', itemBody, `?id=eq.${encodeURIComponent(account.id)}`);
        } else {
          await fetchSupabase('google_ads_accounts', 'POST', itemBody);
        }
      } catch (err) {
        console.error('Failed to save account to Supabase:', err);
        if (process.env.NODE_ENV === 'production') throw err;
      }
    }
  }

  public async updateAccountSync(id: string, date: string) {
    this.loadLocal();
    const acc = this.localData.google_ads_accounts.find(a => a.id === id);
    if (acc) {
      acc.lastSyncAt = date;
      acc.status = 'connected';
      this.saveLocal();
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (supabaseUrl && serviceKey) {
      try {
        await fetchSupabase('google_ads_accounts', 'PATCH', {
          last_sync_at: date,
          status: 'connected'
        }, `?id=eq.${encodeURIComponent(id)}`);
      } catch (err) {
        console.error('Failed to update account sync status in Supabase:', err);
        if (process.env.NODE_ENV === 'production') throw err;
      }
    }
  }

  public async saveCampaignMetrics(metrics: CampaignDailyMetric[]) {
    this.loadLocal();
    metrics.forEach(item => {
      const idx = this.localData.campaign_daily_metrics.findIndex(
        m => m.googleAdsAccountId === item.googleAdsAccountId && 
             m.date === item.date && 
             m.campaignId === item.campaignId
      );
      if (idx !== -1) {
        this.localData.campaign_daily_metrics[idx] = item;
      } else {
        this.localData.campaign_daily_metrics.push(item);
      }
    });
    this.saveLocal();

    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (supabaseUrl && serviceKey) {
      try {
        for (const item of metrics) {
          const body = {
            id: item.id,
            google_ads_account_id: item.googleAdsAccountId,
            date: item.date,
            campaign_id: item.campaignId,
            campaign_name: item.campaignName,
            campaign_status: item.campaignStatus,
            budget: item.budget,
            impressions: item.impressions,
            clicks: item.clicks,
            cost: item.cost,
            ctr: item.ctr,
            average_cpc: item.averageCpc,
            conversions: item.conversions,
            conversion_rate: item.conversionRate,
            cost_per_conversion: item.costPerConversion,
            created_at: item.createdAt || new Date().toISOString()
          };
          const check = await fetchSupabase('campaign_daily_metrics', 'GET', undefined, `?id=eq.${encodeURIComponent(item.id)}`);
          if (check && check.length > 0) {
            await fetchSupabase('campaign_daily_metrics', 'PATCH', body, `?id=eq.${encodeURIComponent(item.id)}`);
          } else {
            await fetchSupabase('campaign_daily_metrics', 'POST', body);
          }
        }
      } catch (err) {
        console.error('Failed to save campaign metrics to Supabase:', err);
        if (process.env.NODE_ENV === 'production') throw err;
      }
    }
  }

  public async saveSyncLog(log: SyncLog) {
    this.localData.sync_logs.unshift(log); // newest first
    if (this.localData.sync_logs.length > 100) {
      this.localData.sync_logs = this.localData.sync_logs.slice(0, 100);
    }
    this.saveLocal();

    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (supabaseUrl && serviceKey) {
      try {
        await fetchSupabase('sync_logs', 'POST', {
          id: log.id,
          google_ads_account_id: log.googleAdsAccountId,
          account_name: log.accountName,
          sync_type: log.syncType,
          status: log.status,
          rows_inserted: log.rowsInserted,
          error_message: log.errorMessage || null,
          started_at: log.startedAt,
          finished_at: log.finishedAt
        });
      } catch (err) {
        console.error('Failed to save sync log to Supabase:', err);
        if (process.env.NODE_ENV === 'production') throw err;
      }
    }
  }

  public async createMonthlyReport(report: MonthlyReport) {
    this.loadLocal();
    const idx = this.localData.monthly_reports.findIndex(
      r => r.googleAdsAccountId === report.googleAdsAccountId && r.month === report.month && r.year === report.year
    );
    if (idx !== -1) {
      this.localData.monthly_reports[idx] = report;
    } else {
      this.localData.monthly_reports.unshift(report);
    }
    this.saveLocal();

    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (supabaseUrl && serviceKey) {
      try {
        const check = await fetchSupabase('monthly_reports', 'GET', undefined, `?id=eq.${encodeURIComponent(report.id)}`);
        const reportBody = {
          id: report.id,
          google_ads_account_id: report.googleAdsAccountId,
          month: report.month,
          year: report.year,
          total_cost: report.totalCost,
          total_clicks: report.totalClicks,
          total_impressions: report.totalImpressions,
          total_conversions: report.totalConversions,
          average_ctr: report.averageCtr,
          average_cpc: report.averageCpc,
          average_cpa: report.averageCpa,
          conversion_rate: report.conversionRate,
          best_campaign: report.bestCampaign,
          worst_campaign: report.worstCampaign,
          best_device: report.bestDevice,
          best_location: report.bestLocation,
          best_hour: report.bestHour,
          summary: report.summary,
          recommendations: report.recommendations,
          created_at: report.createdAt || new Date().toISOString()
        };
        if (check && check.length > 0) {
          await fetchSupabase('monthly_reports', 'PATCH', reportBody, `?id=eq.${encodeURIComponent(report.id)}`);
        } else {
          await fetchSupabase('monthly_reports', 'POST', reportBody);
        }
      } catch (err) {
        console.error('Failed to write monthly report to Supabase:', err);
        if (process.env.NODE_ENV === 'production') throw err;
      }
    }
  }

  public async clearLiveMetricsForSync(accountId: string, date: string) {
    this.loadLocal();
    this.localData.campaign_daily_metrics = this.localData.campaign_daily_metrics.filter(
      m => !(m.googleAdsAccountId === accountId && m.date === date)
    );
    this.saveLocal();

    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (supabaseUrl && serviceKey) {
      try {
        await fetchSupabase('campaign_daily_metrics', 'DELETE', undefined, `?google_ads_account_id=eq.${encodeURIComponent(accountId)}&date=eq.${encodeURIComponent(date)}`);
      } catch (err) {
        console.error('Failed to clear live metrics in Supabase:', err);
        if (process.env.NODE_ENV === 'production') throw err;
      }
    }
  }

  public queryCampaigns(
    accountId: string,
    startDate?: string,
    endDate?: string
  ): CampaignDailyMetric[] {
    this.loadLocal();
    return this.localData.campaign_daily_metrics.filter(m => {
      if (m.googleAdsAccountId !== accountId) return false;
      if (startDate && m.date < startDate) return false;
      if (endDate && m.date > endDate) return false;
      return true;
    });
  }

  public async generateRecommendationsFromData(accountId: string, metrics: CampaignDailyMetric[]): Promise<Recommendation[]> {
    const list: Recommendation[] = [];
    const dateStr = new Date().toISOString().split('T')[0];

    const campaignStats: { [id: string]: { name: string; clicks: number; cost: number; conversions: number; ctrSum: number; days: number; averageCpcSum: number; count: number; impressions: number } } = {};
    
    metrics.forEach(m => {
      if (!campaignStats[m.campaignId]) {
        campaignStats[m.campaignId] = {
          name: m.campaignName,
          clicks: 0,
          cost: 0,
          conversions: 0,
          ctrSum: 0,
          days: 0,
          averageCpcSum: 0,
          count: 0,
          impressions: 0
        };
      }
      campaignStats[m.campaignId].clicks += m.clicks;
      campaignStats[m.campaignId].cost += m.cost;
      campaignStats[m.campaignId].conversions += m.conversions;
      campaignStats[m.campaignId].ctrSum += m.ctr;
      campaignStats[m.campaignId].averageCpcSum += m.averageCpc;
      campaignStats[m.campaignId].impressions += m.impressions;
      campaignStats[m.campaignId].count += 1;
    });

    const accountAvgCpc = Object.values(campaignStats).reduce((acc, curr) => acc + (curr.clicks > 0 ? curr.cost / curr.clicks : 0), 0) / (Object.keys(campaignStats).length || 1);

    Object.entries(campaignStats).forEach(([campaignId, stat]) => {
      const avgCtr = stat.impressions > 0 ? (stat.clicks / stat.impressions) * 100 : 0;
      const actualCpc = stat.clicks > 0 ? stat.cost / stat.clicks : 0;
      
      if (avgCtr > 0 && avgCtr < 3) {
        list.push({
          id: `reco-ctr-${campaignId}`,
          googleAdsAccountId: accountId,
          date: dateStr,
          level: 'MEDIUM',
          type: 'click',
          title: `CTR thấp ở chiến dịch "${stat.name}"`,
          description: `Tỉ lệ nhấp chuột (CTR) trung bình của chiến dịch chỉ đạt ${avgCtr.toFixed(2)}% (ngưỡng tối thiểu đề xuất là 3%).`,
          actionSuggestion: 'Viết lại mẫu quảng cáo, tối ưu tiêu đề phụ và thêm ít nhất 3 tiện ích mở rộng cuộc gọi/liên kết trang web để chiếm lĩnh không gian hiển thị.',
          campaignId,
          campaignName: stat.name,
          createdAt: new Date().toISOString()
        });
      }

      if (actualCpc > accountAvgCpc * 1.3) {
        list.push({
          id: `reco-cpc-${campaignId}`,
          googleAdsAccountId: accountId,
          date: dateStr,
          level: 'HIGH',
          type: 'click',
          title: `CPC cao ở chiến dịch "${stat.name}"`,
          description: `Giá Click trung bình (CPC) là ${Math.round(actualCpc).toLocaleString()}đ, cao hơn trung bình tài khoản (${Math.round(accountAvgCpc).toLocaleString()}đ) trên 30%`,
          actionSuggestion: 'Kiểm tra điểm chất lượng từ khóa (Quality Score), rà soát mức độ liên quan của Landing Page, và chuyển chiến dịch sang thầu tối đa hóa lượt chuyển đổi có đặt CPA mục tiêu (tCPA).',
          campaignId,
          campaignName: stat.name,
          createdAt: new Date().toISOString()
        });
      }

      if (stat.clicks > 50 && stat.conversions === 0) {
        list.push({
          id: `reco-conv-zero-${campaignId}`,
          googleAdsAccountId: accountId,
          date: dateStr,
          level: 'HIGH',
          type: 'conversion',
          title: `Chi tiêu nhiều nhưng không tạo Chuyển Đổi ở "${stat.name}"`,
          description: `Chiên dịch đã thu hút được ${stat.clicks} nhấp chuột, chi tiêu ${Math.round(stat.cost).toLocaleString()}đ nhưng KHÔNG ghi nhận bất kỳ lượt chuyển đổi nào.`,
          actionSuggestion: 'Rà soát ngay báo cáo Cụm từ tìm kiếm (Search Terms) để phủ định từ khóa rác, kiểm tra tốc độ tải trang đích, form đăng ký và thiết lập mã tracking Google Tag.',
          campaignId,
          campaignName: stat.name,
          createdAt: new Date().toISOString()
        });
      }

      const cpa = stat.conversions > 0 ? stat.cost / stat.conversions : 0;
      if (cpa > 150000) {
        list.push({
          id: `reco-cpa-high-${campaignId}`,
          googleAdsAccountId: accountId,
          date: dateStr,
          level: 'HIGH',
          type: 'conversion',
          title: `CPA vượt ngưỡng mục tiêu ở "${stat.name}"`,
          description: `Chi phí trên mỗi chuyển đổi (CPA) hiện tại là ${Math.round(cpa).toLocaleString()}đ, vượt quá hạn mức tối ưu của doanh nghiệp (150.000đ).`,
          actionSuggestion: 'Giảm 15% ngân sách hàng ngày của chiến dịch này, loại bỏ các nhóm quảng cáo hoạt động kém, loại bỏ từ khóa khớp mở rộng (Broad Match) gây lãng phí.',
          campaignId,
          campaignName: stat.name,
          createdAt: new Date().toISOString()
        });
      }

      if (avgCtr > 6 && stat.conversions > 15 && actualCpc < accountAvgCpc) {
        list.push({
          id: `reco-budget-scale-${campaignId}`,
          googleAdsAccountId: accountId,
          date: dateStr,
          level: 'LOW',
          type: 'budget',
          title: `Hiệu suất xuất sắc - Hãy tăng ngân sách "${stat.name}"`,
          description: `Chiến dịch hoạt động cực kỳ hiệu quả: CTR rất cao (${avgCtr.toFixed(2)}%), CPC thấp (${Math.round(actualCpc).toLocaleString()}đ), tạo ra ${stat.conversions} chuyển đổi.`,
          actionSuggestion: 'Đề xuất tăng ngân sách chiến dịch thêm 20% hoặc mở rộng thêm từ khóa cụm từ để gom lọc khách hàng tiềm năng.',
          campaignId,
          campaignName: stat.name,
          createdAt: new Date().toISOString()
        });
      }
    });

    if (list.length > 0) {
      this.localData.recommendations = list;
      this.saveLocal();

      const supabaseUrl = process.env.SUPABASE_URL;
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (supabaseUrl && serviceKey) {
        try {
          await fetchSupabase('recommendations', 'DELETE', undefined, `?google_ads_account_id=eq.${encodeURIComponent(accountId)}`);
          for (const r of list) {
            await fetchSupabase('recommendations', 'POST', {
              id: r.id,
              google_ads_account_id: r.googleAdsAccountId,
              date: r.date,
              level: r.level,
              type: r.type,
              title: r.title,
              description: r.description,
              action_suggestion: r.actionSuggestion,
              campaign_id: r.campaignId || null,
              campaign_name: r.campaignName || null,
              created_at: r.createdAt || new Date().toISOString()
            });
          }
        } catch (err) {
          console.error('Failed to save recommendations to Supabase:', err);
          if (process.env.NODE_ENV === 'production') throw err;
        }
      }
    }
    return list;
  }

  private seedLocalDemoData() {
    console.log('Seeding standalone local DB...');
    this.localData.users = [
      {
        id: 'user-01',
        email: 'ads.a96agency@gmail.com',
        role: 'admin',
        createdAt: '2026-05-01T00:00:00Z'
      }
    ];

    const accountId = 'acc-demo-google-ads';
    const googleAccount: GoogleAdsAccount = {
      id: accountId,
      accountName: 'A96 Agency - Google Ads Master Account',
      customerId: '831-294-1188',
      loginCustomerId: '831-294-0000',
      status: 'connected',
      lastSyncAt: new Date().toISOString(),
      createdAt: '2026-05-01T00:00:00Z'
    };
    this.localData.google_ads_accounts = [googleAccount];

    const campaignDaily: CampaignDailyMetric[] = [];
    const dateList: string[] = [];
    const baseDate = new Date();
    for (let i = 30; i >= 1; i--) {
      const d = new Date(baseDate);
      d.setDate(baseDate.getDate() - i);
      dateList.push(d.toISOString().split('T')[0]);
    }

    const campaignsConfig = [
      { id: 'camp-1', name: 'Search - Brand - Việt Nam', status: 'ENABLED' as const, budget: 300000, ctrBase: 12.5, cpcBase: 1500, convRateBase: 8.5, volBase: 1200 },
      { id: 'camp-2', name: 'Performance Max - Toàn quốc', status: 'ENABLED' as const, budget: 500000, ctrBase: 3.4, cpcBase: 4200, convRateBase: 4.1, volBase: 1800 },
      { id: 'camp-3', name: 'Search - Từ khóa ngách HaNoi', status: 'ENABLED' as const, budget: 200000, ctrBase: 1.8, cpcBase: 8500, convRateBase: 1.5, volBase: 600 },
      { id: 'camp-4', name: 'Display - Remarketing', status: 'ENABLED' as const, budget: 150005, ctrBase: 0.9, cpcBase: 3100, convRateBase: 0, volBase: 800 },
      { id: 'camp-5', name: 'Search - Đối thủ cạnh tranh', status: 'ENABLED' as const, budget: 400000, ctrBase: 4.5, cpcBase: 48500, convRateBase: 2.2, volBase: 400 }
    ];

    dateList.forEach(date => {
      campaignsConfig.forEach(cfg => {
        const fluctuation = 1 + (Math.random() * 0.3 - 0.15);
        const imps = Math.round(cfg.volBase * fluctuation);
        const clicks = Math.round(imps * (cfg.ctrBase / 100) * fluctuation);
        const cost = clicks * cfg.cpcBase * (1 + (Math.random() * 0.1 - 0.05));
        const conversions = cfg.convRateBase === 0 ? 0 : Math.round(clicks * (cfg.convRateBase / 100) * (1 + (Math.random() * 0.2 - 0.1)));
        
        const ctr = imps > 0 ? (clicks / imps) * 100 : 0;
        const averageCpc = clicks > 0 ? cost / clicks : 0;
        const convRate = clicks > 0 ? (conversions / clicks) * 100 : 0;
        const cpa = conversions > 0 ? cost / conversions : 0;

        campaignDaily.push({
          id: `metric-${cfg.id}-${date}`,
          googleAdsAccountId: accountId,
          date,
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
        });
      });
    });

    this.localData.campaign_daily_metrics = campaignDaily;

    const adGroups: AdGroupDailyMetric[] = [];
    const adGroupConfig = [
      { id: 'ag-1', name: 'Đăng Ký Khóa Học - Brand', campaignId: 'camp-1', campaignName: 'Search - Brand - Việt Nam', clicksShare: 0.7, impsShare: 0.6 },
      { id: 'ag-2', name: 'Dịch Vụ Tư Vấn - Brand', campaignId: 'camp-1', campaignName: 'Search - Brand - Việt Nam', clicksShare: 0.3, impsShare: 0.4 },
      { id: 'ag-3', name: 'Nhóm Tất Cả Sản Phẩm PMax', campaignId: 'camp-2', campaignName: 'Performance Max - Toàn quốc', clicksShare: 1.0, impsShare: 1.0 },
      { id: 'ag-4', name: 'Thiết Kế App Giá Rẻ HN', campaignId: 'camp-3', campaignName: 'Search - Từ khóa ngách HaNoi', clicksShare: 0.5, impsShare: 0.5 },
      { id: 'ag-5', name: 'SEO Chuyên Nghiệp HN', campaignId: 'camp-3', campaignName: 'Search - Từ khóa ngách HaNoi', clicksShare: 0.5, impsShare: 0.5 },
    ];

    adGroupConfig.forEach(ag => {
      dateList.slice(15).forEach(date => {
        const campMetric = campaignDaily.find(m => m.campaignId === ag.campaignId && m.date === date);
        if (campMetric) {
          const clicks = Math.round(campMetric.clicks * ag.clicksShare);
          const imps = Math.round(campMetric.impressions * ag.impsShare);
          const cost = Math.round(campMetric.cost * ag.clicksShare);
          const conversions = Math.round(campMetric.conversions * ag.clicksShare);
          adGroups.push({
            id: `ag-metric-${ag.id}-${date}`,
            googleAdsAccountId: accountId,
            date,
            campaignId: ag.campaignId,
            campaignName: ag.campaignName,
            adGroupId: ag.id,
            adGroupName: ag.name,
            impressions: imps,
            clicks,
            cost,
            ctr: imps > 0 ? (clicks / imps) * 100 : 0,
            averageCpc: clicks > 0 ? cost / clicks : 0,
            conversions,
            conversionRate: clicks > 0 ? (conversions / clicks) * 100 : 0,
            costPerConversion: conversions > 0 ? cost / conversions : 0,
            createdAt: new Date().toISOString()
          });
        }
      });
    });
    this.localData.ad_group_daily_metrics = adGroups;

    const keywords: KeywordDailyMetric[] = [];
    const keywordConfig = [
      { text: 'a96 agency', match: 'EXACT' as const, adGroupId: 'ag-1', adGroupName: 'Đăng Ký Khóa Học - Brand', campaignId: 'camp-1', campaignName: 'Search - Brand - Việt Nam', share: 0.6 },
    ];

    keywordConfig.forEach((kw, index) => {
      dateList.slice(20).forEach(date => {
        const agMetric = adGroups.find(m => m.adGroupId === kw.adGroupId && m.date === date);
        if (agMetric) {
          const clicks = Math.round(agMetric.clicks * kw.share);
          const imps = Math.round(agMetric.impressions * kw.share);
          const cost = Math.round(agMetric.cost * kw.share);
          const conversions = Math.round(agMetric.conversions * kw.share);
          keywords.push({
            id: `kw-metric-${index}-${date}`,
            googleAdsAccountId: accountId,
            date,
            campaignId: kw.campaignId,
            campaignName: kw.campaignName,
            adGroupId: kw.adGroupId,
            adGroupName: kw.adGroupName,
            keyword: kw.text,
            matchType: kw.match,
            impressions: imps,
            clicks,
            cost,
            ctr: imps > 0 ? (clicks / imps) * 100 : 0,
            averageCpc: clicks > 0 ? cost / clicks : 0,
            conversions,
            conversionRate: clicks > 0 ? (conversions / clicks) * 100 : 0,
            costPerConversion: conversions > 0 ? cost / conversions : 0,
            createdAt: new Date().toISOString()
          });
        }
      });
    });
    this.localData.keyword_daily_metrics = keywords;

    const searchTerms: SearchTermDailyMetric[] = [];
    searchTerms.push({
      id: `st-metric-1`,
      googleAdsAccountId: accountId,
      date: dateList[dateList.length - 1],
      campaignId: 'camp-1',
      campaignName: 'Search - Brand - Việt Nam',
      adGroupId: 'ag-1',
      adGroupName: 'Đăng Ký Khóa Học - Brand',
      searchTerm: 'a96 agency tuyển dụng',
      impressions: 300,
      clicks: 42,
      cost: 50400,
      conversions: 0,
      ctr: 14,
      averageCpc: 1200,
      costPerConversion: 0,
      recommendation: 'NEGATIVE',
      createdAt: new Date().toISOString()
    });
    this.localData.search_term_daily_metrics = searchTerms;

    this.localData.sync_logs = [
      {
        id: 'log-01',
        googleAdsAccountId: accountId,
        accountName: 'A96 Agency - Google Ads Master Account',
        syncType: 'daily',
        status: 'success',
        rowsInserted: 5,
        startedAt: new Date(Date.now() - 600000).toISOString(),
        finishedAt: new Date().toISOString()
      }
    ];

    this.localData.monthly_reports = [
      {
        id: 'report-may-2026',
        googleAdsAccountId: accountId,
        month: 5,
        year: 2026,
        totalCost: 35240000,
        totalClicks: 3240,
        totalImpressions: 78500,
        totalConversions: 184,
        averageCtr: 4.12,
        averageCpc: 10876,
        averageCpa: 191521,
        conversionRate: 5.67,
        bestCampaign: 'Search - Brand - Việt Nam',
        worstCampaign: 'Display - Remarketing',
        bestDevice: 'Mobile Button',
        bestLocation: 'Hồ Chí Minh',
        bestHour: '20:00 - 22:00',
        summary: 'Demo tóm tắt hoạt động báo cáo tài khoản.',
        recommendations: [
          'Tăng ngân sách chiến dịch Search Brand lên thêm 20%.'
        ],
        createdAt: new Date().toISOString()
      }
    ];

    this.generateRecommendationsFromData(accountId, campaignDaily);
    this.saveLocal();
  }
}

export const dbStore = new DBManager();
