/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  History, 
  CheckCircle, 
  XCircle, 
  Clock, 
  CornerDownRight, 
  HelpCircle,
  Database,
  ArrowRight,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { SyncLog } from '../types';

interface SyncLogsViewProps {
  accountId: string;
  syncTrigger: number;
}

export default function SyncLogsView({ accountId, syncTrigger }: SyncLogsViewProps) {
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSyncLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/sync-logs');
      const data = await res.json();
      if (data.success) {
        setLogs(data.data);
      }
    } catch (err) {
      console.error('Error fetching synchronization logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSyncLogs();
  }, [accountId, syncTrigger]);

  const formatDurationMs = (start: string, end: string) => {
    if (!start || !end) return '-';
    const duration = new Date(end).getTime() - new Date(start).getTime();
    return `${(duration / 1000).toFixed(1)}s`;
  };

  return (
    <div id="sync_logs_view" className="space-y-6 animate-fade-in">
      
      {/* Intro block */}
      <div className="bg-white border border-slate-100 p-5 rounded-3xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
            <History className="w-4.5 h-4.5 text-blue-500" />
            Nhật Ký Đồng Bộ Dữ Liệu
          </h2>
          <p className="text-xs text-slate-400 mt-1">Lưu trữ hoạt động cập nhật chỉ số từ các API Google Ads</p>
        </div>

        <button 
          id="sync_logs_refresh_btn"
          onClick={fetchSyncLogs}
          className="px-4 py-2 bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-semibold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Tải lại danh sách
        </button>
      </div>

      {/* Main logging grid */}
      <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-16 flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : logs.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            Chưa phát sinh nhật ký đồng bộ dữ liệu nào.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-405 uppercase tracking-wider">
                  <th className="py-4.5 px-6">Tài Khoản Đồng Bộ</th>
                  <th className="py-4.5 px-4 text-center">Trạng Thái</th>
                  <th className="py-4.5 px-4 text-center">Loại Tác vụ</th>
                  <th className="py-4.5 px-4 text-right">Dòng Ghi Nhận</th>
                  <th className="py-4.5 px-4 text-center font-bold">Thời gian chạy</th>
                  <th className="py-4.5 px-6">Chi Tiết Lỗi / Thông báo</th>
                  <th className="py-4.5 px-6 block text-right">Ngày thực thi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {logs.map((log) => {
                  const isSuccess = log.status === 'success';
                  return (
                    <tr id={`sync_log_row_${log.id}`} key={log.id} className="hover:bg-slate-50/50 transition">
                      
                      {/* Connected Account name / description */}
                      <td className="py-4 px-6">
                        <div className="font-bold text-slate-800 leading-none mb-1">{log.accountName}</div>
                        <span className="text-[9px] text-slate-400 font-bold">Khóa kết nối: {log.googleAdsAccountId}</span>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          isSuccess 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          {isSuccess ? <CheckCircle className="w-3 h-3 text-emerald-600" /> : <XCircle className="w-3 h-3 text-rose-600" />}
                          {isSuccess ? 'Thành Công' : 'Thất Bại'}
                        </span>
                      </td>

                      {/* Sync type (cron daily vs manual) */}
                      <td className="py-4 px-4 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                          log.syncType === 'daily' 
                            ? 'bg-purple-100 text-purple-800' 
                            : 'bg-blue-105 bg-blue-100 text-blue-800'
                        }`}>
                          {log.syncType === 'daily' ? '📅 Daily Cron' : '⚡ Manual Click'}
                        </span>
                      </td>

                      {/* Rows inserted */}
                      <td className="py-4 px-4 text-right font-semibold text-slate-800">
                        {log.rowsInserted} rows
                      </td>

                      {/* Runtime duration in seconds */}
                      <td className="py-4 px-4 text-center text-slate-500 font-bold">
                        {formatDurationMs(log.startedAt, log.finishedAt)}
                      </td>

                      {/* Error or Success notification description detail */}
                      <td className="py-4 px-6 text-slate-600 font-medium leading-relaxed max-w-[280px]">
                        {log.errorMessage ? (
                          <div className="flex items-start gap-1 p-2 bg-rose-50 border border-rose-100 rounded-lg text-rose-700 text-[11px]">
                            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                            <span>{log.errorMessage}</span>
                          </div>
                        ) : (
                          <span className="text-emerald-700 font-semibold flex items-center gap-1">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                            Toàn bộ dữ liệu quảng cáo đã nạp hoàn tất.
                          </span>
                        )}
                      </td>

                      {/* Execution time */}
                      <td className="py-3 px-6 text-slate-400 text-right text-[11px] font-bold">
                        {new Date(log.startedAt).toLocaleString('vi-VN')}
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
