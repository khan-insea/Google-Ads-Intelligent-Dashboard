/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  HelpCircle, 
  AlertCircle, 
  CheckCircle,
  TrendingUp,
  MousePointerClick,
  ChevronRight
} from 'lucide-react';

interface ClickOptimizationViewProps {
  accountId: string;
  syncTrigger: number;
}

export default function ClickOptimizationView({ accountId, syncTrigger }: ClickOptimizationViewProps) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchClickOpt = async () => {
    if (!accountId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/reports/click-optimization?accountId=${accountId}`);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      }
    } catch (err) {
      console.error('Error fetching click optimization data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClickOpt();
  }, [accountId, syncTrigger]);

  return (
    <div id="click_optimization_view" className="space-y-6 animate-fade-in">
      
      {/* Informative Explanation banner */}
      <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-6 rounded-3xl border border-blue-400 shadow-lg flex items-start gap-4">
        <div className="p-3 bg-white/10 rounded-xl">
          <MousePointerClick className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-base font-black tracking-tight uppercase">Phân Tích Tối Ưu Chỉ Số Clicks (Nâng Cao)</h2>
          <p className="text-xs text-blue-100 mt-1 pl-0.5 leading-relaxed">
            Hệ thống tự động rà soát tỉ lệ CTR và chi phí nhấp chuột trung bình (CPC) của từng chiến dịch dựa trên mốc tiêu chuẩn 3% và mức dao động chi phi trung bình của tài khoản quảng cáo.
          </p>
        </div>
      </div>

      {/* Metrics list */}
      <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-16 flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-405 uppercase tracking-wider">
                  <th className="py-4.5 px-6">Tên chiến dịch</th>
                  <th className="py-4.5 px-4 text-right">Lượt Hiển Thị</th>
                  <th className="py-4.5 px-4 text-right">Click</th>
                  <th className="py-4.5 px-4 text-center">CTR thực tế</th>
                  <th className="py-4.5 px-4 text-right">Giá CPC</th>
                  <th className="py-4.5 px-4 text-right">Chi phí đã tiêu</th>
                  <th className="py-4.5 px-6 min-w-[150px]">Vấn đề phát hiện</th>
                  <th className="py-4.5 px-6 min-w-[200px]">Đề xuất điều chỉnh</th>
                  <th className="py-4.5 px-6 text-center">Ưu tiên</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {data.map((item, idx) => {
                  
                  const priorityColor = {
                    'Cao': 'bg-rose-50 text-rose-700 border border-rose-200 font-bold',
                    'Trung bình': 'bg-amber-50 text-amber-700 border border-amber-200 font-bold',
                    'Thấp': 'bg-emerald-50 text-emerald-700 border border-emerald-100 font-medium'
                  }[item.priority] || 'bg-slate-50 text-slate-700';

                  const textAlertColor = item.priority === 'Cao' 
                    ? 'text-rose-600 font-bold' 
                    : item.priority === 'Trung bình' 
                      ? 'text-amber-600 font-bold' 
                      : 'text-emerald-600 font-medium';

                  return (
                    <tr id={`click_opt_row_${idx}`} key={idx} className="hover:bg-slate-50/50 transition">
                      <td className="py-4 px-6 font-bold text-slate-800">{item.campaignName}</td>
                      <td className="py-4 px-4 text-right font-medium text-slate-500">{item.impressions.toLocaleString('vi-VN')}</td>
                      <td className="py-4 px-4 text-right font-bold text-slate-800">{item.clicks.toLocaleString('vi-VN')}</td>
                      <td className="py-4 px-4 text-center">
                        <span className={`font-bold ${item.ctr < 3 ? 'text-amber-600' : 'text-emerald-600'}`}>
                          {item.ctr}%
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right font-semibold text-slate-800">{item.cpc.toLocaleString('vi-VN')}đ</td>
                      <td className="py-4 px-4 text-right font-bold text-slate-800">{item.cost.toLocaleString('vi-VN')}đ</td>
                      
                      <td className="py-4 px-6">
                        <span className={`inline-block ${textAlertColor} text-[11px]`}>
                          ⚠️ {item.issue}
                        </span>
                      </td>

                      <td className="py-4 px-6 text-slate-505 leading-relaxed text-[11px] font-medium max-w-[250px]">{item.suggestion}</td>
                      
                      <td className="py-4 px-6 text-center">
                        <span className={`inline-block px-2.5 py-1 rounded-lg text-[10px] ${priorityColor}`}>
                          {item.priority}
                        </span>
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
