/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import DashboardView from './components/DashboardView';
import AccountView from './components/AccountView';
import CampaignsView from './components/CampaignsView';
import ClickOptimizationView from './components/ClickOptimizationView';
import ConversionOptimizationView from './components/ConversionOptimizationView';
import MonthlyReportView from './components/MonthlyReportView';
import SyncLogsView from './components/SyncLogsView';
import LoginView from './components/LoginView';

export default function App() {
  const [adminUser, setAdminUser] = useState<{ email: string; name: string } | null>(null);
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [selectedAccountId, setSelectedAccountId] = useState('');
  
  // Filtering states - initialized to our 2026 context time frame
  const [startDate, setStartDate] = useState('2026-05-01');
  const [endDate, setEndDate] = useState('2026-06-04');
  
  // Triggers atomic children rerendering
  const [syncTrigger, setSyncTrigger] = useState(0);

  // Authenticate user on load
  useEffect(() => {
    const savedToken = localStorage.getItem('admin_token');
    const savedUser = localStorage.getItem('admin_user');
    if (savedToken && savedUser) {
      setAdminUser(JSON.parse(savedUser));
    }
  }, []);

  const handleLoginSuccess = (user: { email: string; role: string; name: string }) => {
    setAdminUser(user);
    setCurrentTab('dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    setAdminUser(null);
  };

  const handleSyncCompleted = () => {
    // Increment the syncTrigger state to trigger child widgets to re-fetch metrics instantly
    setSyncTrigger(prev => prev + 1);
  };

  if (!adminUser) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div id="app_frame" className="flex min-h-screen bg-slate-50 font-sans">
      
      {/* Sidebar Layout */}
      <Sidebar 
        currentTab={currentTab} 
        setCurrentTab={setCurrentTab} 
        adminUser={adminUser}
        onLogout={handleLogout} 
      />

      <div id="content_main" className="flex-1 flex flex-col min-w-0">
        {/* Header Layout */}
        <Header 
          selectedAccountId={selectedAccountId}
          setSelectedAccountId={setSelectedAccountId}
          startDate={startDate}
          setStartDate={setStartDate}
          endDate={endDate}
          setEndDate={setEndDate}
          onSyncCompleted={handleSyncCompleted}
        />

        {/* Dynamic Inner Router Views */}
        <main id="router_main_content" className="flex-1 p-8 overflow-y-auto">
          {currentTab === 'dashboard' && (
            <DashboardView 
              accountId={selectedAccountId} 
              startDate={startDate} 
              endDate={endDate}
              syncTrigger={syncTrigger}
            />
          )}

          {currentTab === 'accounts' && (
            <AccountView 
              selectedAccountId={selectedAccountId}
              setSelectedAccountId={setSelectedAccountId}
              onAccountAdded={handleSyncCompleted}
            />
          )}

          {currentTab === 'campaigns' && (
            <CampaignsView 
              accountId={selectedAccountId} 
              startDate={startDate} 
              endDate={endDate}
              syncTrigger={syncTrigger}
            />
          )}

          {currentTab === 'click-opt' && (
            <ClickOptimizationView 
              accountId={selectedAccountId} 
              syncTrigger={syncTrigger}
            />
          )}

          {currentTab === 'conv-opt' && (
            <ConversionOptimizationView 
              accountId={selectedAccountId} 
              syncTrigger={syncTrigger}
            />
          )}

          {currentTab === 'monthly' && (
            <MonthlyReportView 
              accountId={selectedAccountId} 
              syncTrigger={syncTrigger}
            />
          )}

          {currentTab === 'logs' && (
            <SyncLogsView 
              accountId={selectedAccountId} 
              syncTrigger={syncTrigger}
            />
          )}
        </main>
      </div>

    </div>
  );
}
