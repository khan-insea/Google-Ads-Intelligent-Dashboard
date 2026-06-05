/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Link2, 
  PlusCircle, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle,
  HelpCircle,
  Clock,
  User,
  Hash,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { GoogleAdsAccount } from '../types';

interface AccountViewProps {
  selectedAccountId: string;
  setSelectedAccountId: (id: string) => void;
  onAccountAdded: () => void;
}

const formatCustomerId = (idStr: string) => {
  const clean = idStr.replace(/\D/g, '');
  if (clean.length === 10) {
    return `${clean.slice(0, 3)}-${clean.slice(3, 6)}-${clean.slice(6)}`;
  }
  return idStr;
};

export default function AccountView({ selectedAccountId, setSelectedAccountId, onAccountAdded }: AccountViewProps) {
  const [accounts, setAccounts] = useState<GoogleAdsAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [accountName, setAccountName] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [loginCustomerId, setLoginCustomerId] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/google-ads/accounts');
      const data = await res.json();
      if (data.success) {
        setAccounts(data.data);
      }
    } catch (err) {
      console.error('Error fetching connected accounts list:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();

    // Listen to messages from OAuth Popup
    const handleOauthMessage = (event: MessageEvent) => {
      // Validate origin is from AI Studio preview or localhost
      const origin = event.origin;
      if (!origin.endsWith('.run.app') && !origin.includes('localhost')) {
        return;
      }
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        const accId = event.data?.accountId;
        setSuccessMsg('Liên kết Google Ads API thành công thông qua OAuth 2.0!');
        fetchAccounts();
        onAccountAdded();
        if (accId) {
          setSelectedAccountId(accId);
        }
        setTimeout(() => setSuccessMsg(null), 5000);
      }
    };

    window.addEventListener('message', handleOauthMessage);
    return () => window.removeEventListener('message', handleOauthMessage);
  }, []);

  const handleOAuthConnect = async () => {
    try {
      const response = await fetch('/api/auth/google/start');
      if (!response.ok) {
        throw new Error('Failed to start OAuth consent flow');
      }
      const data = await response.json();
      
      // Open popup with direct provider authorization URL as per guidelines
      const width = 600;
      const height = 700;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;
      
      const authWindow = window.open(
        data.url,
        'oauth_google_ads_popup',
        `width=${width},height=${height},top=${top},left=${left},scrollbars=yes`
      );

      if (!authWindow) {
        alert('Trình duyệt đang chặn Popup. Hãy cho phép hiển thị popup để tiếp tục đăng nhập.');
      }
    } catch (err) {
      console.error('OAuth initiation failed:', err);
    }
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);
    setFormError(null);
    setSuccessMsg(null);

    // Normalize IDs (support both 4117057088 and 411-705-7080 formats)
    const cleanCustomerId = customerId.replace(/\D/g, '');
    const cleanLoginCustomerId = loginCustomerId ? loginCustomerId.replace(/\D/g, '') : '';

    if (cleanCustomerId.length !== 10) {
      setFormError('ID khách hàng không đúng định dạng. Phải nhập đúng 10 số (Ví dụ: 411-705-7088 hoặc 4117057088)');
      setAdding(false);
      return;
    }

    if (loginCustomerId && cleanLoginCustomerId.length !== 10) {
      setFormError('ID MCC người quản lý không đúng định dạng. Phải nhập đúng 10 số (Ví dụ: 831-294-0000 hoặc 8312940000)');
      setAdding(false);
      return;
    }

    try {
      const res = await fetch('/api/google-ads/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          accountName, 
          customerId: cleanCustomerId, 
          loginCustomerId: cleanLoginCustomerId 
        })
      });

      const result = await res.json();
      if (result.success) {
        setSuccessMsg(`Đã tạo liên kết thành công cho tài khoản "${accountName}"!`);
        setAccountName('');
        setCustomerId('');
        setLoginCustomerId('');
        fetchAccounts();
        onAccountAdded();
        setSelectedAccountId(result.data.id);
        setTimeout(() => setSuccessMsg(null), 5000);
      } else {
        setFormError(result.message || 'Lỗi thêm tài khoản.');
      }
    } catch (err) {
      setFormError('Lỗi kết nối máy chủ.');
    } finally {
      setAdding(false);
    }
  };

  return (
    <div id="accounts_view" className="space-y-8 animate-fade-in">
      
      {/* 1. Introductory Alert */}
      {successMsg && (
        <div id="accounts_success_toast" className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-800 text-xs font-bold shadow-sm">
          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {formError && (
        <div id="accounts_error_toast" className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-rose-800 text-xs font-bold shadow-sm">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      {/* 2. Top OAuth Connect Panel */}
      <div className="bg-gradient-to-tr from-slate-900 to-slate-950 text-white rounded-3xl p-8 border border-slate-850 shadow-xl relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-10 w-60 h-60 bg-blue-500/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="max-w-2xl relative">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-500/15 border border-blue-500/35 rounded-full text-xs font-semibold text-blue-400">
            <Sparkles className="w-3.5 h-3.5" />
            OAuth 2.0 Kết Nối Chính Thức
          </span>
          <h2 className="text-2xl font-black mt-4 tracking-tight">Ủy Quyền Truy Cập Google Ads API</h2>
          <p className="text-slate-400 text-sm mt-2 leading-relaxed">
            Kết nối bảo mật trực tiếp thông qua máy chủ Google OAuth. Hệ thống mã hóa thông tin Token an toàn và không bao giờ tiết lộ mã Token của khách hàng cho giao diện Frontend.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <button 
              id="accounts_oauth_connect_btn"
              onClick={handleOAuthConnect}
              className="px-6 py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-sm transition hover:shadow-lg hover:shadow-blue-500/20 flex items-center gap-2.5 cursor-pointer active:scale-95"
            >
              <Link2 className="w-4.5 h-4.5" />
              Kết Nối Google Ads của tôi
            </button>

            <a 
              href="https://console.cloud.google.com/apis/credentials" 
              target="_blank" 
              referrerPolicy="no-referrer"
              className="px-5 py-3.5 border border-slate-800 hover:bg-slate-900 text-slate-300 font-bold rounded-xl text-sm transition flex items-center gap-1.5"
            >
              Cấu hình Google Cloud Platform
              <ArrowRight className="w-4 h-4 text-slate-505" />
            </a>
          </div>
        </div>
      </div>

      {/* 3. Grid containing custom account setup & Connected Accounts list */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Custom Account Registration Form */}
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
          <div className="mb-5">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
              <PlusCircle className="w-4 h-4 text-blue-505" />
              Hồ Sơ Tài Khoản Thủ Công / MCC
            </h3>
            <p className="text-xs text-slate-400 mt-1">Dễ dàng thêm tài khoản phụ hoặc tích hợp MCC để kiểm định cấu trúc dữ liệu</p>
          </div>

          <form onSubmit={handleCreateAccount} className="space-y-4">
            <div>
              <label className="block text-slate-600 text-xs font-bold mb-1.5">Tên Tài Khoản Gợi Nhớ</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input 
                  id="account_form_name"
                  type="text" 
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  placeholder="Ví dụ: A96 agency - Client A"
                  required
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white text-slate-800 text-sm rounded-xl pl-10 pr-4 py-3 leading-6 outline-none transition"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-605 text-xs font-bold mb-1.5">Google Ads Customer ID</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Hash className="w-4 h-4" />
                  </div>
                  <input 
                    id="account_form_customer"
                    type="text" 
                    value={customerId}
                    onChange={(e) => setCustomerId(e.target.value)}
                    placeholder="Ví dụ: 411-705-7088 hoặc 4117057088"
                    required
                    className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white text-slate-800 text-sm rounded-xl pl-10 pr-4 py-3 leading-6 outline-none transition"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                  📌 ID tài khoản quảng cáo cần lấy báo cáo.
                </p>
              </div>

              <div>
                <label className="block text-slate-605 text-xs font-bold mb-1.5">Login Customer ID (Nếu dùng MCC)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Hash className="w-4 h-4" />
                  </div>
                  <input 
                    id="account_form_mcc"
                    type="text" 
                    value={loginCustomerId}
                    onChange={(e) => setLoginCustomerId(e.target.value)}
                    placeholder="Ví dụ: 831-294-0000 hoặc 8312940000"
                    className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white text-slate-800 text-sm rounded-xl pl-10 pr-4 py-3 leading-6 outline-none transition"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                  🏢 ID MCC / Manager Account dùng để phân quyền gọi API. Có thể để trống nếu không dùng MCC.
                </p>
              </div>
            </div>

            <button 
              id="account_form_submit"
              type="submit" 
              disabled={adding}
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-sm transition cursor-pointer disabled:opacity-50 mt-2"
            >
              {adding ? 'Đang kích hoạt...' : 'Tạo Liên Kết Tài Khoản'}
            </button>
          </form>
        </div>

        {/* Connected Accounts List */}
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex flex-col">
          <div className="mb-5">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-505" />
              Tài Khoản Đang Hoạt Động ({accounts.length})
            </h3>
            <p className="text-xs text-slate-400 mt-1">Các cổng Customer ID đang liên kết đồng bộ chỉ số metrics</p>
          </div>

          {loading ? (
            <div className="flex-1 flex items-center justify-center py-10">
              <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : accounts.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50 rounded-2xl text-center">
              <AlertCircle className="w-8 h-8 text-slate-350" />
              <p className="text-xs text-slate-400 font-bold mt-2">Chưa có tài khoản kết nối nào.</p>
            </div>
          ) : (
            <div className="space-y-3 overflow-y-auto max-h-80 pr-1">
              {accounts.map(acc => {
                const isActive = acc.id === selectedAccountId;
                return (
                  <div 
                    id={`account_card_${acc.id}`}
                    key={acc.id}
                    onClick={() => setSelectedAccountId(acc.id)}
                    className={`p-4 rounded-2xl border text-left transition duration-200 cursor-pointer ${
                      isActive 
                        ? 'border-blue-500 bg-blue-50/20' 
                        : 'border-slate-100 hover:border-slate-205 bg-slate-50/10'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-800 truncate max-w-[200px]">{acc.accountName}</span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 shrink-0">
                        ● Live Connected
                      </span>
                    </div>

                     <div className="grid grid-cols-2 gap-2 mt-3 text-[11px] text-slate-500">
                      <div>
                        <span className="font-bold">Customer ID:</span>
                        <code className="ml-1 bg-slate-100 text-slate-600 px-1 rounded font-mono">{formatCustomerId(acc.customerId)}</code>
                      </div>
                      {acc.loginCustomerId && (
                        <div>
                          <span className="font-bold">MCC ID:</span>
                          <code className="ml-1 bg-slate-100 text-slate-650 px-1 rounded font-mono">{formatCustomerId(acc.loginCustomerId)}</code>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 mt-3 text-[10px] text-slate-400 border-t border-slate-100 pt-2">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Đồng bộ gần nhất: {acc.lastSyncAt ? new Date(acc.lastSyncAt).toLocaleString('vi-VN') : 'Mới tạo'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
