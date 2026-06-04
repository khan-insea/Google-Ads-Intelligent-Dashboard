/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  LayoutDashboard, 
  Link2, 
  Layers, 
  MousePointerClick, 
  TrendingUp, 
  FileSpreadsheet, 
  History, 
  LogOut,
  Sparkles,
  ChevronRight
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  adminUser?: { email: string; name: string };
  onLogout: () => void;
}

export default function Sidebar({ currentTab, setCurrentTab, adminUser, onLogout }: SidebarProps) {
  const menuItems = [
    { id: 'dashboard', label: 'Tổng Quan Hiệu Suất', icon: LayoutDashboard, color: 'text-blue-500' },
    { id: 'accounts', label: 'Kết Nối Google Ads', icon: Link2, color: 'text-emerald-500' },
    { id: 'campaigns', label: 'Danh Sách Chiến Dịch', icon: Layers, color: 'text-violet-500' },
    { id: 'click-opt', label: 'Tối Ưu Chỉ Số Click', icon: MousePointerClick, color: 'text-amber-500' },
    { id: 'conv-opt', label: 'Tối Ưu Chuyển Đổi', icon: TrendingUp, color: 'text-rose-500' },
    { id: 'monthly', label: 'Báo Cáo Cuối Tháng', icon: FileSpreadsheet, color: 'text-cyan-500' },
    { id: 'logs', label: 'Lịch Sử Đồng Bộ', icon: History, color: 'text-slate-500' },
  ];

  return (
    <aside id="admin_sidebar" className="w-72 bg-slate-900 border-r border-slate-800 text-slate-300 flex flex-col shrink-0 min-h-screen">
      {/* Brand Section */}
      <div className="p-6 border-b border-slate-800 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-extrabold text-lg shadow-lg shadow-blue-500/10">
          A96 &nbsp;
        </div>
        <div>
          <h2 className="text-white font-extrabold text-sm tracking-tight leading-none">A96 Agency</h2>
          <p className="text-[10px] text-slate-400 font-medium mt-1 uppercase tracking-wider">Google Ads Console</p>
        </div>
      </div>

      {/* Navigation Section */}
      <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
        {menuItems.map((item) => {
          const isActive = currentTab === item.id;
          return (
            <button
              id={`sidebar_link_${item.id}`}
              key={item.id}
              onClick={() => setCurrentTab(item.id)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-all group cursor-pointer ${
                isActive 
                  ? 'bg-slate-800 text-white shadow-inner border-l-4 border-blue-500' 
                  : 'hover:bg-slate-800/50 hover:text-white text-slate-400'
              }`}
            >
              <div className="flex items-center gap-3.5">
                <item.icon className={`w-5 h-5 ${isActive ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-300'} transition-colors`} />
                <span>{item.label}</span>
              </div>
              <ChevronRight className={`w-4 h-4 transition-transform ${isActive ? 'translate-x-0.5 text-blue-400' : 'opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 text-slate-600'}`} />
            </button>
          );
        })}
      </nav>

      {/* Account / Footer Section */}
      <div className="p-4 border-t border-slate-850 bg-slate-950/40">
        <div className="flex items-center gap-3 p-3 bg-slate-900/60 rounded-xl border border-slate-800 mb-3">
          <div className="w-8 h-8 rounded-full bg-blue-600/10 text-blue-400 flex items-center justify-center font-bold text-xs">
            {adminUser?.name?.slice(0, 2) || 'AD'}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-xs font-bold text-slate-205 truncate">{adminUser?.name || 'A96 Admin'}</h4>
            <p className="text-[10px] text-slate-500 truncate mt-0.5">{adminUser?.email || 'ads.a96agency@gmail.com'}</p>
          </div>
        </div>

        <button
          id="sidebar_logout_btn"
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-850 hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/20 text-slate-400 text-xs font-bold transition duration-200 cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          Đăng xuất tài khoản
        </button>
      </div>
    </aside>
  );
}
