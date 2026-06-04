/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  HelpCircle, 
  AlertTriangle, 
  CheckCircle, 
  TrendingUp,
  CirclePlay,
  Lightbulb
} from 'lucide-react';
import { CampaignDailyMetric } from '../types';

interface CampaignsViewProps {
  accountId: string;
  startDate: string;
  endDate: string;
  syncTrigger: number;
}

export default function CampaignsView({ accountId, startDate, endDate, syncTrigger }: CampaignsViewProps) {
  const [metrics, setMetrics] = useState<CampaignDailyMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchCampaigns = async () => {
    if (!accountId) return;
    setLoading(true);
    try {
      const url = `/api/reports/overview?accountId=${accountId}&startDate=${startDate}&endDate=${endDate}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        // We fetch raw campaign-grouped totals
        const rawMetrics = data.chartData; // aggregated trends, but we want campaign individual metrics
      }

      // To get campaign-level aggregated datasets, let's query raw endpoint or aggregate here:
      const campRes = await fetch(`/api/reports/click-optimization?accountId=${accountId}`);
      const clickData = await campRes.json();
      
      const convRes = await fetch(`/api/reports/conversion-optimization?accountId=${accountId}`);
      const convData = await convRes.json();

      if (clickData.success && convData.success) {
        // Let's merge both reports into campaign metrics representation
        const campaignsMap: { [name: string]: any } = {};

        clickData.data.forEach((item: any) => {
          campaignsMap[item.campaignName] = {
            id: item.campaignId,
            name: item.campaignName,
            status: 'ENABLED',
            budget: item.campaignId === 'camp-1' ? 300000 : item.campaignId === 'camp-2' ? 500000 : item.campaignId === 'camp-3' ? 200000 : item.campaignId === 'camp-4' ? 150005 : 400000,
            impressions: item.impressions,
            clicks: item.clicks,
            ctr: item.ctr,
            cpc: item.cpc,
            cost: item.cost,
            conversions: 0,
            conversionRate: 0,
            cpa: 0,
            assessment: 'Cần theo dõi',
            recommendation: item.suggestion
          };
        });

        convData.data.forEach((item: any) => {
          if (campaignsMap[item.campaignName]) {
            campaignsMap[item.campaignName].conversions = item.conversions;
            campaignsMap[item.campaignName].conversionRate = item.conversionRate;
            campaignsMap[item.campaignName].cpa = item.cpa;
            
            // Dynamic Performance Label assignment based on specification rules
            const ctr = campaignsMap[item.campaignName].ctr;
            const cpc = campaignsMap[item.campaignName].cpc;
            const conversions = item.conversions;
            const cpa = item.cpa;

            if (conversions > 15 && ctr > 6 && cpa < 100000) {
              campaignsMap[item.campaignName].assessment = 'Tốt';
            } else if (conversions > 0 && ctr >= 3 && cpa <= 150000) {
              campaignsMap[item.campaignName].assessment = 'Đang ổn';
            } else if (ctr < 3.0 || item.conversionRate < 2.0) {
              campaignsMap[item.campaignName].assessment = 'Cần theo dõi';
            }
            
            // Critical items overrides
            if (item.cost > 2000000 && conversions === 0) {
              campaignsMap[item.campaignName].assessment = 'Cần tối ưu';
            }
            if (cpa > 180000) {
              campaignsMap[item.campaignName].assessment = 'Cần tạm dừng kiểm tra';
            }
          }
        });

        setMetrics(Object.values(campaignsMap));
      }
    } catch (err) {
      console.error('Error loading campaigns list:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, [accountId, startDate, endDate, syncTrigger]);

  const filteredMetrics = metrics.filter(m => 
    m.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div id="campaigns_view" className="space-y-6 animate-fade-in">
      
      {/* Search and Filters Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-100">
        <div className="relative flex-1 max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4.5 h-4.5" />
          </div>
          <input
            id="campaigns_search_input"
            type="text"
            placeholder="Tìm kiếm chiến dịch..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs font-semibold rounded-xl pl-10 pr-4 py-3 leading-4 outline-none focus:border-blue-500 focus:bg-white transition"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs text-slate-500 font-semibold">Bộ lọc: Tất cả trạng thái hoạt động</span>
        </div>
      </div>

      {/* Campaigns Metrics table card */}
      <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-20 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : filteredMetrics.length === 0 ? (
          <div className="py-20 text-center text-slate-400 text-sm font-semibold">
            Không tìm thấy chiến dịch phù hợp trong khoảng thời gian đã chọn.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-405 uppercase tracking-wider">
                  <th className="py-4.5 px-6">Tên chiến dịch / Ngân sách</th>
                  <th className="py-4.5 px-3 text-center">Trạng thái</th>
                  <th className="py-4.5 px-3 text-right">Chi phí</th>
                  <th className="py-4.5 px-3 text-right">Click / Imps</th>
                  <th className="py-4.5 px-3 text-center">CTR / CPC</th>
                  <th className="py-4.5 px-3 text-right">Chuyển Đổi [CR]</th>
                  <th className="py-4.5 px-3 text-right">CPA</th>
                  <th className="py-4.5 px-4 text-center">Hiệu Suất</th>
                  <th className="py-4.5 px-6 min-w-[220px]">Khuyến nghị hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredMetrics.map((item) => {
                  
                  // Color codes maps for performance evaluation
                  const badgeStyles = {
                    'Tốt': 'bg-emerald-100 text-emerald-800',
                    'Đang ổn': 'bg-blue-100 text-blue-800',
                    'Cần theo dõi': 'bg-amber-100 text-amber-800',
                    'Cần tối ưu': 'bg-rose-100 text-rose-800 border border-rose-200',
                    'Cần tạm dừng kiểm tra': 'bg-red-500 text-white font-extrabold shadow-sm'
                  }[item.assessment] || 'bg-slate-100 text-slate-800';

                  return (
                    <tr id={`campaign_row_${item.id}`} key={item.id} className="hover:bg-slate-50/80 transition duration-150">
                      
                      {/* Name / Budget */}
                      <td className="py-4 px-6">
                        <div className="font-bold text-slate-800 max-w-[200px] truncate leading-none mb-1">{item.name}</div>
                        <span className="text-[10px] text-slate-400 font-bold">Ngân sách: {Math.round(item.budget).toLocaleString('vi-VN')} đ/ngày</span>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-3 text-center">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700">
                          <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full animate-pulse"></span>
                          LIVE
                        </span>
                      </td>

                      {/* Cost */}
                      <td className="py-4 px-3 text-right font-black text-slate-800">
                        {Math.round(item.cost).toLocaleString('vi-VN')} đ
                      </td>

                      {/* Click / Imps */}
                      <td className="py-4 px-3 text-right font-medium">
                        <div className="text-slate-800 font-bold">{item.clicks.toLocaleString('vi-VN')}</div>
                        <div className="text-[9px] text-slate-404 font-bold mt-0.5">{item.impressions.toLocaleString('vi-VN')} imps</div>
                      </td>

                      {/* CTR / CPC */}
                      <td className="py-4 px-3 text-center">
                        <div className="text-indigo-600 font-bold">{item.ctr}%</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">{Math.round(item.cpc).toLocaleString('vi-VN')}đ</div>
                      </td>

                      {/* Conversions */}
                      <td className="py-4 px-3 text-right">
                        <div className="text-rose-600 font-bold">{item.conversions}</div>
                        <div className="text-[9px] text-slate-404 font-bold mt-0.5">[{Number(item.conversionRate).toFixed(1)}%]</div>
                      </td>

                      {/* CPA */}
                      <td className="py-4 px-3 text-right font-bold text-slate-800">
                        {item.conversions > 0 ? `${Math.round(item.cpa).toLocaleString('vi-VN')}đ` : '-'}
                      </td>

                      {/* Performance Eval */}
                      <td className="py-4 px-3 text-center">
                        <span className={`inline-flex px-2.5 py-1 rounded-lg text-[10px] font-black ${badgeStyles}`}>
                          {item.assessment}
                        </span>
                      </td>

                      {/* Recommended text */}
                      <td className="py-4 px-6 text-slate-505 leading-relaxed text-[11px] font-medium">
                        <div className="flex items-start gap-1.5 p-1.5 bg-slate-50 rounded-lg">
                          <Lightbulb className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                          <span>{item.recommendation}</span>
                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
