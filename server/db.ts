/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

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
  Recommendation,
  AnalyticsBreakdown
} from '../src/types';

// Let's establish a simple, file-based database for zero-config persistence
const DB_FILE = path.join(process.cwd(), 'data', 'db_store.json');

interface Schema {
  users: User[];
  google_ads_accounts: GoogleAdsAccount[];
  campaign_daily_metrics: CampaignDailyMetric[];
  ad_group_daily_metrics: AdGroupDailyMetric[];
  keyword_daily_metrics: KeywordDailyMetric[];
  search_term_daily_metrics: SearchTermDailyMetric[];
  monthly_reports: MonthlyReport[];
  sync_logs: SyncLog[];
  recommendations: Recommendation[];
}

export class DBManager {
  private data: Schema;

  constructor() {
    this.data = {
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
    
    this.ensureDirectory();
    this.load();
    if (this.data.google_ads_accounts.length === 0) {
      this.seedDemoData();
    }
  }

  private ensureDirectory() {
    const dir = path.dirname(DB_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  private load() {
    if (fs.existsSync(DB_FILE)) {
      try {
        const fileContent = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(fileContent);
      } catch (err) {
        console.error('Error loading DB file, reinitializing...', err);
        this.save();
      }
    } else {
      this.save();
    }
  }

  public save() {
    this.ensureDirectory();
    fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
  }

  // Getters for each table
  public getUsers() { return this.data.users; }
  public getAccounts() { return this.data.google_ads_accounts; }
  public getCampaignMetrics() { return this.data.campaign_daily_metrics; }
  public getAdGroupMetrics() { return this.data.ad_group_daily_metrics; }
  public getKeywordMetrics() { return this.data.keyword_daily_metrics; }
  public getSearchTermMetrics() { return this.data.search_term_daily_metrics; }
  public getMonthlyReports() { return this.data.monthly_reports; }
  public getSyncLogs() { return this.data.sync_logs; }
  public getRecommendations() { return this.data.recommendations; }

  // Writers & Adders
  public addAccount(account: GoogleAdsAccount) {
    const idx = this.data.google_ads_accounts.findIndex(a => a.id === account.id || a.customerId === account.customerId);
    if (idx !== -1) {
      this.data.google_ads_accounts[idx] = { ...this.data.google_ads_accounts[idx], ...account };
    } else {
      this.data.google_ads_accounts.push(account);
    }
    this.save();
  }

  public updateAccountSync(id: string, date: string) {
    const acc = this.data.google_ads_accounts.find(a => a.id === id);
    if (acc) {
      acc.lastSyncAt = date;
      acc.status = 'connected';
      this.save();
    }
  }

  public saveCampaignMetrics(metrics: CampaignDailyMetric[]) {
    // Upsert campaign metrics by accountId + date + campaignId
    metrics.forEach(item => {
      const idx = this.data.campaign_daily_metrics.findIndex(
        m => m.googleAdsAccountId === item.googleAdsAccountId && 
             m.date === item.date && 
             m.campaignId === item.campaignId
      );
      if (idx !== -1) {
        this.data.campaign_daily_metrics[idx] = item;
      } else {
        this.data.campaign_daily_metrics.push(item);
      }
    });
    this.save();
  }

  public saveSyncLog(log: SyncLog) {
    this.data.sync_logs.unshift(log); // newest first
    if (this.data.sync_logs.length > 100) {
      this.data.sync_logs = this.data.sync_logs.slice(0, 100);
    }
    this.save();
  }

  public createMonthlyReport(report: MonthlyReport) {
    const idx = this.data.monthly_reports.findIndex(
      r => r.googleAdsAccountId === report.googleAdsAccountId && r.month === report.month && r.year === report.year
    );
    if (idx !== -1) {
      this.data.monthly_reports[idx] = report;
    } else {
      this.data.monthly_reports.unshift(report);
    }
    this.save();
  }

  public clearLiveMetricsForSync(accountId: string, date: string) {
    this.data.campaign_daily_metrics = this.data.campaign_daily_metrics.filter(
      m => !(m.googleAdsAccountId === accountId && m.date === date)
    );
    this.save();
  }

  // Full-featured dynamic analytical helper on raw database collections:
  public queryCampaigns(
    accountId: string,
    startDate?: string,
    endDate?: string
  ): CampaignDailyMetric[] {
    return this.data.campaign_daily_metrics.filter(m => {
      if (m.googleAdsAccountId !== accountId) return false;
      if (startDate && m.date < startDate) return false;
      if (endDate && m.date > endDate) return false;
      return true;
    });
  }

  // Dynamic analysis tool based on campaign items
  public generateRecommendationsFromData(accountId: string, metrics: CampaignDailyMetric[]): Recommendation[] {
    // Clear old auto-recommendations and generate new ones
    const list: Recommendation[] = [];
    const dateStr = new Date().toISOString().split('T')[0];

    // Group metric sums over the period
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
      
      // Rule 1: CTR low
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

      // Rule 2: CPC high
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

      // Rule 3: Click high but conversion is 0
      if (stat.clicks > 50 && stat.conversions === 0) {
        list.push({
          id: `reco-conv-zero-${campaignId}`,
          googleAdsAccountId: accountId,
          date: dateStr,
          level: 'HIGH',
          type: 'conversion',
          title: `Chi tiêu nhiều nhưng không tạo Chuyển Đổi ở "${stat.name}"`,
          description: `Chiến dịch đã thu hút được ${stat.clicks} nhấp chuột, chi tiêu ${Math.round(stat.cost).toLocaleString()}đ nhưng KHÔNG ghi nhận bất kỳ lượt chuyển đổi nào.`,
          actionSuggestion: 'Rà soát ngay báo cáo Cụm từ tìm kiếm (Search Terms) để phủ định từ khóa rác, kiểm tra tốc độ tải trang đích, form đăng ký và thiết lập mã tracking Google Tag.',
          campaignId,
          campaignName: stat.name,
          createdAt: new Date().toISOString()
        });
      }

      // Rule 4: CPA high
      const cpa = stat.conversions > 0 ? stat.cost / stat.conversions : 0;
      if (cpa > 150000) { // arbitrary target CPA of 150k
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

      // Rule 5: Exceptional CTR and conversions: increase budget
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

    // Save newly calculated suggestions as recommendations state
    if (list.length > 0) {
      this.data.recommendations = list;
      this.save();
    }
    return list;
  }

  // Populate realistic dynamic seed data for a 30-day range
  private seedDemoData() {
    console.log('Seeding demo database...');
    
    // 1. Create default admin user (email: ads.a96agency@gmail.com, pw: pass123 or from env)
    const adminPass = process.env.ADMIN_PASSWORD || '123456'; 
    this.data.users = [
      {
        id: 'user-01',
        email: 'ads.a96agency@gmail.com',
        role: 'admin',
        createdAt: '2026-05-01T00:00:00Z'
      }
    ];

    // 2. Clear first, seed 1 main account
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
    this.data.google_ads_accounts = [googleAccount];

    // 3. Generate campaign metrics for the last 30 days
    const campaignDaily: CampaignDailyMetric[] = [];
    const dateList: string[] = [];
    
    const baseDate = new Date('2026-06-04T17:07:47Z');
    for (let i = 30; i >= 1; i--) {
      const d = new Date(baseDate);
      d.setDate(baseDate.getDate() - i);
      dateList.push(d.toISOString().split('T')[0]);
    }

    const campaignsConfig = [
      {
        id: 'camp-1',
        name: 'Search - Brand - Việt Nam',
        status: 'ENABLED' as const,
        budget: 300000,
        ctrBase: 12.5,
        cpcBase: 1500,
        convRateBase: 8.5,
        volBase: 1200
      },
      {
        id: 'camp-2',
        name: 'Performance Max - Toàn quốc',
        status: 'ENABLED' as const,
        budget: 500000,
        ctrBase: 3.4,
        cpcBase: 4200,
        convRateBase: 4.1,
        volBase: 1800
      },
      {
        id: 'camp-3',
        name: 'Search - Từ khóa ngách HaNoi',
        status: 'ENABLED' as const,
        budget: 200000,
        ctrBase: 1.8, // Low CTR < 3%
        cpcBase: 8500,
        convRateBase: 1.5,
        volBase: 600
      },
      {
        id: 'camp-4',
        name: 'Display - Remarketing',
        status: 'ENABLED' as const,
        budget: 150005,
        ctrBase: 0.9,
        cpcBase: 3100,
        convRateBase: 0, // Click heavy, NO Conversions!
        volBase: 800
      },
      {
        id: 'camp-5',
        name: 'Search - Đối thủ cạnh tranh',
        status: 'ENABLED' as const,
        budget: 400000,
        ctrBase: 4.5,
        cpcBase: 48500, // Very High CPC > account average
        convRateBase: 2.2,
        volBase: 400
      }
    ];

    dateList.forEach(date => {
      campaignsConfig.forEach(cfg => {
        // Add realistic minor daily fluctuation (-15% to +15%)
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

    this.data.campaign_daily_metrics = campaignDaily;

    // 4. Generate Ad Group daily metrics
    const adGroups: AdGroupDailyMetric[] = [];
    const adGroupConfig = [
      { id: 'ag-1', name: 'Đăng Ký Khóa Học - Brand', campaignId: 'camp-1', campaignName: 'Search - Brand - Việt Nam', clicksShare: 0.7, impsShare: 0.6 },
      { id: 'ag-2', name: 'Dịch Vụ Tư Vấn - Brand', campaignId: 'camp-1', campaignName: 'Search - Brand - Việt Nam', clicksShare: 0.3, impsShare: 0.4 },
      { id: 'ag-3', name: 'Nhóm Tất Cả Sản Phẩm PMax', campaignId: 'camp-2', campaignName: 'Performance Max - Toàn quốc', clicksShare: 1.0, impsShare: 1.0 },
      { id: 'ag-4', name: 'Thiết Kế App Giá Rẻ HN', campaignId: 'camp-3', campaignName: 'Search - Từ khóa ngách HaNoi', clicksShare: 0.5, impsShare: 0.5 },
      { id: 'ag-5', name: 'SEO Chuyên Nghiệp HN', campaignId: 'camp-3', campaignName: 'Search - Từ khóa ngách HaNoi', clicksShare: 0.5, impsShare: 0.5 },
      { id: 'ag-6', name: 'Banner Động Tiết Kiệm', campaignId: 'camp-4', campaignName: 'Display - Remarketing', clicksShare: 0.6, impsShare: 0.7 },
      { id: 'ag-7', name: 'Đeo Bám Giỏ Hàng', campaignId: 'camp-4', campaignName: 'Display - Remarketing', clicksShare: 0.4, impsShare: 0.3 },
      { id: 'ag-8', name: 'Vượt Mặt Đối Thủ Chính', campaignId: 'camp-5', campaignName: 'Search - Đối thủ cạnh tranh', clicksShare: 1.0, impsShare: 1.0 },
    ];

    adGroupConfig.forEach(ag => {
      // Create metric for adGroups for the last 15 days
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
    this.data.ad_group_daily_metrics = adGroups;

    // 5. Generate Keyword Metrics
    const keywords: KeywordDailyMetric[] = [];
    const keywordConfig = [
      { text: 'a96 agency', match: 'EXACT' as const, adGroupId: 'ag-1', adGroupName: 'Đăng Ký Khóa Học - Brand', campaignId: 'camp-1', campaignName: 'Search - Brand - Việt Nam', share: 0.6 },
      { text: 'a96agency.com', match: 'PHRASE' as const, adGroupId: 'ag-1', adGroupName: 'Đăng Ký Khóa Học - Brand', campaignId: 'camp-1', campaignName: 'Search - Brand - Việt Nam', share: 0.4 },
      { text: 'dịch vụ marketing trọn gói', match: 'PHRASE' as const, adGroupId: 'ag-4', adGroupName: 'Thiết Kế App Giá Rẻ HN', campaignId: 'camp-3', campaignName: 'Search - Từ khóa ngách HaNoi', share: 0.5 },
      { text: 'thiết kế website giá rẻ hà nội', match: 'BROAD' as const, adGroupId: 'ag-4', adGroupName: 'Thiết Kế App Giá Rẻ HN', campaignId: 'camp-3', campaignName: 'Search - Từ khóa ngách HaNoi', share: 0.5 },
      { text: 'quảng cáo đối thủ truyền thông', match: 'BROAD' as const, adGroupId: 'ag-8', adGroupName: 'Vượt Một Đối Thủ Chính', campaignId: 'camp-5', campaignName: 'Search - Đối thủ cạnh tranh', share: 1.0 }
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
    this.data.keyword_daily_metrics = keywords;

    // 6. Generate Search Terms Metrics
    const searchTerms: SearchTermDailyMetric[] = [];
    const searchTermsConfig = [
      { text: 'a96 agency tuyển dụng', campaignId: 'camp-1', campaignName: 'Search - Brand - Việt Nam', adGroupId: 'ag-1', adGroupName: 'Đăng Ký Khóa Học - Brand', clicks: 42, imps: 300, cost: 50400, conversions: 0, rec: 'NEGATIVE' as const },
      { text: 'dịch vụ marketing uy tín hà nội', campaignId: 'camp-3', campaignName: 'Search - Từ khóa ngách HaNoi', adGroupId: 'ag-4', adGroupName: 'Thiết Kế App Giá Rẻ HN', clicks: 25, imps: 180, cost: 212500, conversions: 4, rec: 'EXPAND' as const },
      { text: 'thiết kế web 500k siêu rẻ', campaignId: 'camp-3', campaignName: 'Search - Từ khóa ngách HaNoi', adGroupId: 'ag-4', adGroupName: 'Thiết Kế App Giá Rẻ HN', clicks: 88, imps: 1540, cost: 748000, conversions: 0, rec: 'NEGATIVE' as const },
      { text: 'kiến thức SEO miễn phí pdf', campaignId: 'camp-3', campaignName: 'Search - Từ khóa ngách HaNoi', adGroupId: 'ag-5', adGroupName: 'SEO Chuyên Nghiệp HN', clicks: 50, imps: 900, cost: 425000, conversions: 0, rec: 'NEGATIVE' as const }
    ];

    searchTermsConfig.forEach((st, idx) => {
      searchTerms.push({
        id: `st-metric-${idx}`,
        googleAdsAccountId: accountId,
        date: dateList[dateList.length - 1], // Attach to newest date
        campaignId: st.campaignId,
        campaignName: st.campaignName,
        adGroupId: st.adGroupId,
        adGroupName: st.adGroupName,
        searchTerm: st.text,
        impressions: st.imps,
        clicks: st.clicks,
        cost: st.cost,
        conversions: st.conversions,
        ctr: (st.clicks / st.imps) * 100,
        averageCpc: st.clicks > 0 ? st.cost / st.clicks : 0,
        costPerConversion: st.conversions > 0 ? st.cost / st.conversions : 0,
        recommendation: st.rec,
        createdAt: new Date().toISOString()
      });
    });
    this.data.search_term_daily_metrics = searchTerms;

    // 7. Seed Sync Logs
    const nowISO = new Date().toISOString();
    this.data.sync_logs = [
      {
        id: 'log-01',
        googleAdsAccountId: accountId,
        accountName: 'A96 Agency - Google Ads Master Account',
        syncType: 'daily',
        status: 'success',
        rowsInserted: 5,
        startedAt: new Date(baseDate.getTime() - 600000).toISOString(),
        finishedAt: nowISO
      },
      {
        id: 'log-02',
        googleAdsAccountId: accountId,
        accountName: 'A96 Agency - Google Ads Master Account',
        syncType: 'daily',
        status: 'success',
        rowsInserted: 5,
        startedAt: new Date(baseDate.getTime() - 86400000 - 600000).toISOString(),
        finishedAt: new Date(baseDate.getTime() - 86400000).toISOString()
      },
      {
        id: 'log-03',
        googleAdsAccountId: accountId,
        accountName: 'API Google - Credentials Test',
        syncType: 'manual',
        status: 'failed',
        rowsInserted: 0,
        errorMessage: 'DEVELOPER_TOKEN_NOT_APPROVED: The developer token is not yet approved for full access.',
        startedAt: new Date(baseDate.getTime() - 172800000 - 640000).toISOString(),
        finishedAt: new Date(baseDate.getTime() - 172800000 - 610000).toISOString()
      }
    ];

    // 8. Generate standard monthly reports
    this.data.monthly_reports = [
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
        bestDevice: 'Mobile Widget (84%)',
        bestLocation: 'Hồ Chí Minh (51.2%)',
        bestHour: '20:00 - 22:00',
        summary: 'Trong tháng 5/2026, các chiến dịch Google Ads của tài khoản A96 Agency ghi nhận tổng chi phí đạt 35.24 triệu VND với 3,240 lượt Click và 184 Chuyển đổi. Doanh thu và số lượng học viên đăng ký có sự tăng trưởng nhảy vọt nhờ chiến dịch Search Brand hoạt động cực kỳ ổn định, đạt CTR trung bình vượt trội 12.5%. Tuy nhiên, điểm thắt nghẽn lớn phát hiện tại chiến dịch Display Remarketing khi tiêu tốn 3.5 triệu nhưng không ghi nhận lượt chuyển đổi, cần tối ưu lại mã theo dấu người dùng.',
        recommendations: [
          'Tăng ngân sách chiến dịch Search Brand lên thêm 20% vì CPA cực thấp chỉ 18.000đ.',
          'Review lại toàn bộ Banner và Form đăng ký của chiến dịch Display Remarketing.',
          'Thêm tối thiểu 20 từ khóa phủ định nhắm vào nhóm từ khóa thiết kế web giá rẻ (500k) ở chiến dịch Hà Nội để hạn chế click rác từ đối tượng không có ngân sách.',
          'Giảm thầu CPC ở chiến dịch đối thủ cạnh tranh vì CPI/CPA thực tế lên tới 550.000đ/học viên, đang quá cao so với trung bình.'
        ],
        createdAt: '2026-06-01T00:00:00Z'
      }
    ];

    // Calculate suggestions from loaded data
    this.generateRecommendationsFromData(accountId, campaignDaily);

    this.save();
    console.log('Seed demo data loaded completely.');
  }
}

export const dbStore = new DBManager();
