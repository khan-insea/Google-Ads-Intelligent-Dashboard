/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ShieldCheck, MessageSquare, KeyRound, Mail, Loader2 } from 'lucide-react';

interface LoginViewProps {
  onLoginSuccess: (user: { email: string; role: string; name: string }) => void;
}

export default function LoginView({ onLoginSuccess }: LoginViewProps) {
  const [email, setEmail] = useState('ads.a96agency@gmail.com');
  const [password, setPassword] = useState('123456');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json().catch(() => null);
      if (data && data.success) {
        // Save session locally
        localStorage.setItem('admin_token', data.token);
        localStorage.setItem('admin_user', JSON.stringify(data.user));
        onLoginSuccess(data.user);
      } else {
        setError(data?.message || 'Mật khẩu sai hoặc email chưa đúng cấu hình.');
      }
    } catch (err: any) {
      setError(`Lỗi kết nối máy chủ: ${err.message || 'Hãy thử kiểm tra cấu hình mạng.'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="login_container" className="min-h-screen flex items-center justify-center p-4 bg-slate-900 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(37,99,235,0.18),rgba(255,255,255,0))]">
      <div id="login_card" className="w-full max-w-md bg-slate-950/70 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
        
        {/* Glow ambient background effect */}
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="text-center mb-8 relative">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white shadow-xl shadow-blue-500/20 mb-4">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">A96 Agency</h1>
          <p className="text-slate-400 text-sm mt-1.5 font-medium">Bảng điều hành thông minh Google Ads API</p>
        </div>

        {error && (
          <div id="login_error" className="mb-5 p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-xs font-semibold leading-relaxed">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-slate-300 text-xs font-bold uppercase tracking-wider mb-2">Thư Điện Tử Admin</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Mail className="w-4 h-4" />
              </div>
              <input 
                id="login_email_input"
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                required
                className="w-full bg-slate-900 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-white placeholder-slate-500 text-sm rounded-xl pl-10 pr-4 py-3 leading-6 outline-none transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 text-xs font-bold uppercase tracking-wider mb-2">Mật Khẩu Quản Trị</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <KeyRound className="w-4 h-4" />
              </div>
              <input 
                id="login_password_input"
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••"
                required
                className="w-full bg-slate-900 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-white placeholder-slate-500 text-sm rounded-xl pl-10 pr-4 py-3 leading-6 outline-none transition"
              />
            </div>
          </div>

          <button 
            id="login_submit_btn"
            type="submit" 
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-3.5 px-6 rounded-xl text-sm transition hover:shadow-lg hover:shadow-blue-500/25 active:scale-[0.99] disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 mt-4"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Đang xác thực thông tin...
              </>
            ) : (
              'Đăng Nhập Quản Trị'
            )}
          </button>
        </form>

        {/* Demo Assistant Assist Box */}
        <div className="mt-8 pt-4 border-t border-slate-800/80 text-center">
          <p className="text-slate-500 text-[11px] leading-relaxed">
            🔒 Mật khẩu mặc định chạy Sandbox: <strong className="text-slate-300">123456</strong>. Sửa đổi mật khẩu chính thức qua biến thể <code className="bg-slate-900 text-blue-400 px-1 rounded font-mono">ADMIN_PASSWORD</code>.
          </p>
        </div>

      </div>
    </div>
  );
}
