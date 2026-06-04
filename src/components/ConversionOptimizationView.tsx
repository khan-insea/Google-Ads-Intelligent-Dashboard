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
  Award,
  TrendingDown
} from 'lucide-react';

interface ConversionOptimizationViewProps {
  accountId: string;
  syncTrigger: number;
}

export default function ConversionOptimizationView({ accountId, syncTrigger }: ConversionOptimizationViewProps) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConversionOpt = async () => {
    if (!accountId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/reports/conversion-optimization?accountId=${accountId}`);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      }
    } catch (err) {
      console.error('Error fetching conversion optimization data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversionOpt();
  }, [accountId, syncTrigger]);

  return (
    <div id="conversion_optimization_view" className="space-y-6 animate-fade-in">
      
      {/* Informative Header card */}
      <div className="bg-gradient-to-r from-rose-500 to-red-650 text-white p-6 rounded-3xl border border-rose-400 shadow-lg flex items-start gap-4">
        <div className="p-3 bg-white/10 rounded-xl">
          <Award className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-base font-black tracking-tight uppercase">Phân Tích Tối Ưu Chuyển Đổi (CPA & Conversion)</h2>
          <p className="text-xs text-rose-100 mt-1 pl-0.5 leading-relaxed">
            Hệ thống tự động đồng hành tối ưu hóa Chi phí trên mỗi đăng ký/chuyển đổi (CPA). Cảnh báo kịp thời nếu Chiến dịch lãng phí ngân sách hoặc có tỷ lệ chuyển đổi form dưới mốc khuyến dùng 2%.
          </p>
        </div>
      </div>

      {/* Main Grid data layout */}
      <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-16 flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-rose-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-405 uppercase tracking-wider">
                  <th className="py-4.5 px-6">Tên chiến dịch</th>
                  <th className="py-4.5 px-4 text-right">Chi phí đã chi tiêu</th>
                  <th className="py-4.5 px-4 text-right">clicks</th>
                  <th className="py-4.5 px-4 text-right">Lượt Chuyển đổi</th>
                  <th className="py-4.5 px-4 text-center">Tỷ Lệ CR</th>
                  <th className="py-4.5 px-4 text-right">CPA thực tế</th>
                  <th className="py-4.5 px-6 min-w-[150px]">Vấn đề thu gom</th>
                  <th className="py-4.5 px-6 min-w-[200px]">Kế hoạch tối ưu đề xuất</th>
                  <th className="py-4.5 px-6 text-center">Mức độ ưu tiên</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {data.map((item, idx) => {
                  
                  const priorityStyles = {
                    'Cao': 'bg-rose-50 text-rose-700 border border-rose-200 font-bold',
                    'Trung bình': 'bg-amber-50 text-amber-700 border border-amber-200 font-bold',
                    'Thấp': 'bg-emerald-50 text-emerald-700 border border-emerald-100 font-medium'
                  }[item.priority] || 'bg-slate-50 text-slate-700';

                  const issueTextStyles = item.priority === 'Cao' 
                    ? 'text-rose-600 font-bold' 
                    : item.priority === 'Trung bình' 
                      ? 'text-amber-600 font-bold' 
                      : 'text-emerald-600 font-medium';

                  return (
                    <tr id={`conv_opt_row_${idx}`} key={idx} className="hover:bg-slate-50/50 transition">
                      
                      {/* Name */}
                      <td className="py-4 px-6 font-bold text-slate-800">{item.campaignName}</td>
                      
                      {/* Cost */}
                      <td className="py-4 px-4 text-right font-black text-slate-800">
                        {item.cost.toLocaleString('vi-VN')} đ
                      </td>
                      
                      {/* Clicks */}
                      <td className="py-4 px-4 text-right font-medium text-slate-500">
                        {item.clicks.toLocaleString('vi-VN')}
                      </td>
                      
                      {/* Conversions */}
                      <td className="py-4 px-4 text-right font-black text-rose-600">
                        {item.conversions} Lượt
                      </td>
                      
                      {/* Conversion Rate */}
                      <td className="py-4 px-4 text-center">
                        <span className={`font-black ${item.conversionRate < 2.0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                          {item.conversionRate}%
                        </span>
                      </td>
                      
                      {/* CPA */}
                      <td className="py-4 px-4 text-right font-bold text-slate-800">
                        {item.conversions > 0 ? `${item.cpa.toLocaleString('vi-VN')}đ` : 'Không có'}
                      </td>
                      
                      {/* Issue */}
                      <td className="py-4 px-6">
                        <span className={`inline-block ${issueTextStyles} text-[11px]`}>
                          🎯 {item.issue}
                        </span>
                      </td>
                      
                      {/* Suggestions */}
                      <td className="py-4 px-6 text-slate-505 leading-relaxed text-[11px] font-medium max-w-[250px]">
                        {item.suggestion}
                      </td>
                      
                      {/* Priority Badge */}
                      <td className="py-4 px-6 text-center">
                        <span className={`inline-block px-2.5 py-1 rounded-lg text-[10px] ${priorityStyles}`}>
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
