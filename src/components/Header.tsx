/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { RefreshCw, Play, Calendar, AlertCircle } from 'lucide-react';
import { GoogleAdsAccount } from '../types';

interface HeaderProps {
  selectedAccountId: string;
  setSelectedAccountId: (id: string) => void;
  startDate: string;
  setStartDate: (date: string) => void;
  endDate: string;
  setEndDate: (date: string) => void;
  onSyncCompleted: () => void;
}

export default function Header({
  selectedAccountId,
  setSelectedAccountId,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  onSyncCompleted
}: HeaderProps) {
  const [accounts, setAccounts] = useState<GoogleAdsAccount[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);

  const fetchAccounts = async () => {
    try {
      const res = await fetch('/api/google-ads/accounts');
      const data = await res.json();
      if (data.success) {
        setAccounts(data.data);
        if (data.data.length > 0 && !selectedAccountId) {
          setSelectedAccountId(data.data[0].id);
        }
      }
    } catch (err) {
      console.error('Error fetching accounts:', err);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, [selectedAccountId]);

  const handleSyncNow = async () => {
    if (!selectedAccountId) return;
    setSyncing(true);
    setMessage(null);

    try {
      // Trigger API sync for currently selected user account for TODAY
      const response = await fetch('/api/google-ads/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: selectedAccountId,
          date: new Date().toISOString().split('T')[0] // today's date
        })
      });

      const result = await response.json();
      if (result.success) {
        setMessage({ text: result.message, isError: false });
        onSyncCompleted();
      } else {
        setMessage({ text: result.message || 'Lỗi liên kết Google Ads api API.', isError: true });
      }
    } catch (err) {
      setMessage({ text: 'Kết nối API gián đoạn, hãy thử lại.', isError: true });
    } finally {
      setSyncing(false);
      // Fade away notice after 4 seconds
      setTimeout(() => {
        setMessage(null);
      }, 4000);
    }
  };

  const activeAccount = accounts.find(a => a.id === selectedAccountId);

  return (
    <header id="admin_header" className="bg-white border-b border-slate-100 px-8 py-5 flex flex-col gap-4">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        
        {/* Title area */}
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            Hệ Thống Phân Tích Google Ads
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-800">
              API Live {(import.meta as any).env?.VITE_GOOGLE_ADS_API_VERSION || 'v17'}
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">Đồng bộ tự động qua OAuth bảo mật • Cập nhật: {activeAccount?.lastSyncAt ? new Date(activeAccount.lastSyncAt).toLocaleString('vi-VN') : 'Mới tạo'}</p>
        </div>

        {/* Action controls */}
        <div className="flex flex-wrap items-center gap-3">
          
          {/* Account Selector */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/80 rounded-xl px-3.5 py-2.5">
            <span className="text-xs font-bold text-slate-505 uppercase tracking-wide">Tài khoản:</span>
            <select
              id="header_account_select"
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="bg-transparent text-sm font-semibold text-slate-800 border-none outline-none cursor-pointer pr-1"
            >
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>
                  {acc.accountName} ({acc.customerId})
                </option>
              ))}
            </select>
          </div>

          {/* Start Date filter */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/80 rounded-xl px-3.5 py-2">
            <Calendar className="w-4 h-4 text-slate-500" />
            <input
              id="header_start_date_input"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent text-sm font-semibold text-slate-800 border-none outline-none"
            />
          </div>

          {/* End Date filter */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/80 rounded-xl px-3.5 py-2">
            <Calendar className="w-4 h-4 text-slate-500" />
            <input
              id="header_end_date_input"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent text-sm font-semibold text-slate-800 border-none outline-none"
            />
          </div>

          {/* Manual Trigger Synchronizations button */}
          <button
            id="header_sync_now_btn"
            onClick={handleSyncNow}
            disabled={syncing || !selectedAccountId}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition shadow-lg shadow-blue-500/10 disabled:opacity-50 cursor-pointer active:scale-95"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Đang cập nhật...' : 'Đồng bộ Ngay'}
          </button>

        </div>
      </div>

      {/* Sync Status Toast Bar */}
      {message && (
        <div 
          id="header_toast" 
          className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border text-xs font-bold leading-relaxed shadow-sm transition animate-fade-in ${
            message.isError 
              ? 'bg-rose-50 border-rose-100 text-rose-800' 
              : 'bg-emerald-50 border-emerald-100 text-emerald-800'
          }`}
        >
          <AlertCircle className="w-4 h-4 text-slate-600 shrink-0" />
          <span>{message.text}</span>
        </div>
      )}
    </header>
  );
}
