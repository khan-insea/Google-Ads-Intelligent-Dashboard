/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Download, 
  Send, 
  FileSpreadsheet, 
  CheckCircle, 
  AlertCircle,
  Smartphone,
  MapPin,
  Clock,
  Search,
  Check,
  Building,
  Mail,
  HelpCircle,
  TrendingUp,
  BrainCircuit,
  Loader2
} from 'lucide-react';
import { MonthlyReport } from '../types';

interface MonthlyReportViewProps {
  accountId: string;
  syncTrigger: number;
}

export default function MonthlyReportView({ accountId, syncTrigger }: MonthlyReportViewProps) {
  const [month, setMonth] = useState('5'); // May
  const [year, setYear] = useState('2026');
  const [reportData, setReportData] = useState<MonthlyReport | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Custom interactive Email controls
  const [emailTo, setEmailTo] = useState('ads.a96agency@gmail.com');
  const [emailSending, setEmailSending] = useState(false);
  const [emailStatus, setEmailStatus] = useState<{ text: string; isError: boolean } | null>(null);

  const fetchReport = async () => {
    if (!accountId) return;
    setLoading(true);
    try {
      const url = `/api/reports/monthly?accountId=${accountId}&month=${month}&year=${year}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setReportData(data.data);
      }
    } catch (err) {
      console.error('Error fetching monthly report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [accountId, month, year, syncTrigger]);

  const handleExportPDF = () => {
    window.open(`/api/reports/export-pdf?accountId=${accountId}&month=${month}&year=${year}`, '_blank');
  };

  const handleExportExcel = () => {
    window.location.href = `/api/reports/export-excel?accountId=${accountId}&month=${month}&year=${year}`;
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportData) return;
    
    setEmailSending(true);
    setEmailStatus(null);
    try {
      const res = await fetch('/api/reports/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mailTo: emailTo,
          subject: `Báo cáo tối ưu hóa Google Ads chính thức - Tháng ${month}/${year}`,
          summaryText: `KPI Tóm tắt Tháng ${month}/${year}:
- Tổng Chi Phí: ${Math.round(reportData.totalCost).toLocaleString()}đ
- Lượt Clicks: ${reportData.totalClicks.toLocaleString()}
- Khách chuyển đổi: ${reportData.totalConversions}
- CTR trung bình: ${reportData.averageCtr}%
- CPA trung bình: ${Math.round(reportData.averageCpa).toLocaleString()}đ
- Tỷ lệ chuyển đổi: ${reportData.conversionRate}%

Báo cáo nhận định:
${reportData.summary}`
        })
      });

      const data = await res.json();
      if (data.success) {
        setEmailStatus({ text: data.message || 'Báo cáo đã gửi email thành công.', isError: false });
      } else {
        setEmailStatus({ text: 'Gửi báo cáo thất bại, hãy kiểm tra lại cấu hình.', isError: true });
      }
    } catch (err) {
      setEmailStatus({ text: 'Có lỗi xảy ra, không thể gửi mail.', isError: true });
    } finally {
      setEmailSending(false);
      setTimeout(() => setEmailStatus(null), 5000);
    }
  };

  // Static analysis breakdown sheets details requested in specs
  const analyticBreakdown = {
    keywords: [
      { text: 'a96 agency', clicks: 210, cpc: 1200, cost: 252000, conv: 18, status: 'Hoạt động tốt' },
      { text: 'thiết kế web siêu rẻ 500k', clicks: 88, cpc: 8500, cost: 748000, conv: 0, status: 'Phủ định/Tối ưu lại' },
      { text: 'dịch vụ marketing uy tín hà nội', clicks: 25, cpc: 8500, cost: 212500, conv: 4, status: 'Tăng ngân sách' },
      { text: 'quảng cáo đối thủ truyền thông', clicks: 12, cpc: 45000, cost: 540000, conv: 0, status: 'Cần hạ CPC thầu' }
    ],
    searchTermsNegative: [
      'thiết kế web miễn phí không cần code',
      'quảng cáo google ads crack',
      'a96 agency tuyển dụng làm thêm tại nhà',
      'hướng dẫn chạy bùng quảng cáo chi tiết'
    ]
  };

  return (
    <div id="monthly_report_view" className="space-y-8 animate-fade-in">
      
      {/* 1. Filtering Controls Banner */}
      <div className="bg-white border border-slate-100 p-5 rounded-3xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
            <FileText className="w-4.5 h-4.5 text-blue-500" />
            Lập Báo Cáo Tháng Tự Động
          </h2>
          <p className="text-xs text-slate-400 mt-1">Chọn tháng cụ thể để hệ thống AI tổng hợp dữ liệu so sánh</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Month Selector */}
          <select 
            id="report_month_select"
            value={month} 
            onChange={(e) => setMonth(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-700 outline-none cursor-pointer focus:bg-white"
          >
            <option value="1">Tháng 1</option>
            <option value="2">Tháng 2</option>
            <option value="3">Tháng 3</option>
            <option value="4">Tháng 4</option>
            <option value="5">Tháng 5</option>
            <option value="6">Tháng 6</option>
            <option value="7">Tháng 7</option>
            <option value="8">Tháng 8</option>
            <option value="9">Tháng 9</option>
            <option value="10">Tháng 10</option>
            <option value="11">Tháng 11</option>
            <option value="12">Tháng 12</option>
          </select>

          {/* Year Selector */}
          <select 
            id="report_year_select"
            value={year} 
            onChange={(e) => setYear(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-705 outline-none cursor-pointer focus:bg-white"
          >
            <option value="2025">Năm 2025</option>
            <option value="2026">Năm 2026</option>
          </select>

          {/* Export Actions */}
          <button 
            id="report_export_pdf_btn"
            onClick={handleExportPDF}
            className="px-4 py-2.5 border border-slate-200 text-slate-700 font-bold rounded-xl text-xs hover:bg-slate-50 transition cursor-pointer flex items-center gap-1.5"
          >
            <FileText className="w-4 h-4 text-rose-500" />
            Xuất PDF
          </button>

          <button 
            id="report_export_excel_btn"
            onClick={handleExportExcel}
            className="px-4 py-2.5 border border-slate-200 text-slate-700 font-bold rounded-xl text-xs hover:bg-slate-50 transition cursor-pointer flex items-center gap-1.5"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
            Xuất Excel
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-20 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : !reportData ? (
        <div className="py-20 text-center text-slate-400 text-sm font-semibold">
          Chưa đồng bộ dữ liệu của khoảng tháng này. Hãy nhấn 'Đồng bộ Ngay' ở thanh tiêu đề.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* Main report details - Left Column */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* KPI statistics block */}
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Các Chỉ Số Cơ Bản</h3>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 bg-slate-50 rounded-2xl">
                  <span className="text-[10px] text-slate-400 font-bold block mb-1">TỔNG CHI PHÍ</span>
                  <span className="text-sm font-extrabold text-slate-800">{Math.round(reportData.totalCost).toLocaleString()}đ</span>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl">
                  <span className="text-[10px] text-slate-400 font-bold block mb-1">NHẤP CHUỘT</span>
                  <span className="text-sm font-extrabold text-slate-800">{reportData.totalClicks.toLocaleString()}</span>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl">
                  <span className="text-[10px] text-slate-400 font-bold block mb-1">CONVERSIONS</span>
                  <span className="text-sm font-extrabold text-slate-800">{reportData.totalConversions} lượt</span>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl">
                  <span className="text-[10px] text-slate-400 font-bold block mb-1">CPA TRUNG BÌNH</span>
                  <span className="text-sm font-extrabold text-slate-800">{Math.round(reportData.averageCpa).toLocaleString()}đ</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mt-4">
                <div className="p-3 bg-indigo-50/50 rounded-xl text-center">
                  <span className="text-[9px] text-slate-400 font-bold block mb-0.5">CTR TRUNG BÌNH</span>
                  <span className="text-xs font-bold text-indigo-600">{reportData.averageCtr}%</span>
                </div>
                <div className="p-3 bg-violet-50/50 rounded-xl text-center">
                  <span className="text-[9px] text-slate-400 font-bold block mb-0.5">CPC TRUNG BÌNH</span>
                  <span className="text-xs font-bold text-violet-600">{Math.round(reportData.averageCpc).toLocaleString()}đ</span>
                </div>
                <div className="p-3 bg-rose-50/50 rounded-xl text-center">
                  <span className="text-[9px] text-slate-400 font-bold block mb-0.5">CONVERSION RATE</span>
                  <span className="text-xs font-bold text-rose-600">{reportData.conversionRate}%</span>
                </div>
              </div>
            </div>

            {/* Smart insights block */}
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2">
                <BrainCircuit className="w-4.5 h-4.5 text-blue-500" />
                Nhận Xét Tự Động Từ Trợ Lý Chiến Dịch
              </h3>
              <p className="text-xs text-slate-650 leading-relaxed font-semibold bg-blue-50/30 p-4 border-l-4 border-blue-500 rounded-r-xl">
                {reportData.summary}
              </p>
            </div>

            {/* Sub-Bảng statistics requested: Keywords & negative Search Terms */}
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest mb-4">Phân Tích Từ Khóa Cần Tối Ưu</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px] font-medium border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-[10px] text-slate-400 uppercase">
                      <th className="p-2.5 font-bold">Từ Khóa</th>
                      <th className="p-2.5 text-right font-bold">Clicks</th>
                      <th className="p-2.5 text-right font-bold">Chi Phí</th>
                      <th className="p-2.5 text-right font-bold">Convs</th>
                      <th className="p-2.5 font-bold">Kiến Nghị Đánh Giá</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {analyticBreakdown.keywords.map((kw, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="p-2.5 font-mono font-bold text-slate-800">{kw.text}</td>
                        <td className="p-2.5 text-right">{kw.clicks}</td>
                        <td className="p-2.5 text-right font-bold">{kw.cost.toLocaleString()}đ</td>
                        <td className="p-2.5 text-right text-rose-600 font-bold">{kw.conv}</td>
                        <td className="p-2.5">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                            kw.conv > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {kw.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Negative Search Terms Box */}
              <div className="mt-6 border-t border-slate-100 pt-5">
                <h4 className="text-xs font-bold text-slate-700 mb-2">Cụm từ tìm kiếm đề xuất PHỦ ĐỊNH (Search Terms Negative)</h4>
                <div className="flex flex-wrap gap-1.5">
                  {analyticBreakdown.searchTermsNegative.map((term, i) => (
                    <span key={i} className="px-2.5 py-1 bg-slate-150 border border-slate-205 text-slate-600 rounded-lg text-[10px] font-bold">
                      🚫 {term}
                    </span>
                  ))}
                </div>
              </div>
            </div>

          </div>

          {/* Actionable items and send Email form - Right Column */}
          <div className="space-y-6">
            
            {/* action items */}
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest mb-4">Đề Xuất Hành Động</h3>
              <div className="space-y-3">
                {reportData.recommendations.map((rec, idx) => (
                   <div key={idx} className="flex items-start gap-2.5 p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                      {idx + 1}
                    </div>
                    <span className="text-slate-650 text-xs font-medium leading-relaxed">{rec}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Demographics details requested: Devices, Locations & Hours */}
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest">Nhận Định Hiệu Quả Nhất</h3>
              
              <div className="space-y-3 text-xs leading-relaxed">
                <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-purple-500" />
                    <span className="font-bold text-slate-600">Thiết bị tối ưu:</span>
                  </div>
                  <span className="font-extrabold text-purple-700">{reportData.bestDevice}</span>
                </div>

                <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-emerald-500" />
                    <span className="font-bold text-slate-600">Khu vực tốt nhất:</span>
                  </div>
                  <span className="font-extrabold text-emerald-700">{reportData.bestLocation}</span>
                </div>

                <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-500" />
                    <span className="font-bold text-slate-600">Khung giờ vàng:</span>
                  </div>
                  <span className="font-extrabold text-amber-700">{reportData.bestHour}</span>
                </div>
              </div>
            </div>

            {/* Send email report form */}
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                <Mail className="w-4.5 h-4.5 text-blue-500" />
                Gửi Báo Cáo Qua Email
              </h3>
              <p className="text-[10px] text-slate-400 mb-4 leading-relaxed">Sử dụng dịch vụ Resend để gửi trực tiếp tóm tắt KPI đến đối tác hoặc khách hàng</p>

              {emailStatus && (
                <div className={`p-3 rounded-lg text-xs font-bold leading-relaxed mb-3 ${
                  emailStatus.isError ? 'bg-rose-50 border border-rose-100 text-rose-800' : 'bg-emerald-50 border border-emerald-100 text-emerald-800'
                }`}>
                  {emailStatus.text}
                </div>
              )}

              <form onSubmit={handleSendEmail} className="space-y-3.5">
                <div>
                  <label className="block text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">Email Người nhận</label>
                  <input 
                    id="report_email_to_input"
                    type="email"
                    value={emailTo}
                    onChange={(e) => setEmailTo(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-205 focus:bg-white text-xs rounded-lg px-3 py-2.5 text-slate-800 font-semibold outline-none"
                    placeholder="khachhang@a96agency.com"
                  />
                </div>

                <button 
                  id="report_email_submit_btn"
                  type="submit"
                  disabled={emailSending}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs transition cursor-pointer flex items-center justify-center gap-2"
                >
                  {emailSending ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Đang xử lý thư gửi...
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      Gửi Report Email
                    </>
                  )}
                </button>
              </form>
            </div>

          </div>

        </div>
      )}

    </div>
  );
}
