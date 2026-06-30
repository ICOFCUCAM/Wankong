import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useApp } from '@/store/AppContext';
import { ViewPage } from '@/lib/constants';
import CreatorDashboardView from '@/components/dashboard/CreatorDashboard';
import WalletView from '@/components/dashboard/WalletView';
import UploadView from '@/components/dashboard/UploadView';
import AnalyticsView from '@/components/dashboard/AnalyticsView';
import CompetitionsView from '@/components/dashboard/CompetitionsView';
import DistributionView from '@/components/dashboard/DistributionView';
import NotificationsView from '@/components/dashboard/NotificationsView';
import SettingsView from '@/components/dashboard/SettingsView';
import AdminPanel from '@/components/dashboard/AdminPanel';
import Marketplace from '@/components/home/Marketplace';
import PremiumBackground from '@/components/PremiumBackground';
import { supabase } from '@/lib/supabase';

const NAV_ITEMS: { page: ViewPage; label: string; icon: string }[] = [
  { page: 'dashboard', label: 'Overview', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { page: 'upload', label: 'Upload', icon: 'M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12' },
  { page: 'marketplace', label: 'Marketplace', icon: 'M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z' },
  { page: 'wallet', label: 'Wallet', icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' },
  { page: 'analytics', label: 'Analytics', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
  { page: 'competitions', label: 'Competitions', icon: 'M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z' },
  { page: 'distribution', label: 'Distribution', icon: 'M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
  { page: 'notifications', label: 'Notifications', icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' },
  { page: 'settings', label: 'Settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' },
  { page: 'admin', label: 'Admin', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
];

export default function DashboardPage() {
  const { isAuthenticated, currentPage, setCurrentPage, user, notifications, sidebarOpen, toggleSidebar } = useApp();
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);

  const isAdmin = user?.role === 'admin';

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const renderContent = () => {
    switch (currentPage) {
      case 'dashboard': return <CreatorDashboardView />;
      case 'upload': return <UploadView />;
      case 'marketplace': return <Marketplace />;
      case 'wallet': return <WalletView />;
      case 'analytics': return <AnalyticsView />;
      case 'competitions': return <CompetitionsView />;
      case 'distribution': return <DistributionView />;
      case 'notifications': return <NotificationsView />;
      case 'settings': return <SettingsView />;
      case 'admin': return isAdmin ? <AdminPanel /> : <CreatorDashboardView />;
      default: return <CreatorDashboardView />;
    }
  };

  // Show a guest dashboard if not authenticated
  const guestMode = !isAuthenticated;

  return (
    <div className="relative min-h-screen bg-[#0B0814] flex">
      <PremiumBackground />
      {/* Sidebar overlay (mobile) */}
      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={toggleSidebar} />}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-gray-950 border-r border-gray-800 transform transition-transform duration-200 lg:translate-x-0 lg:static lg:flex-shrink-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center gap-2 p-4 border-b border-gray-800">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#9D4EDD] to-purple-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">W</span>
            </div>
            <span className="text-white font-bold">WANKONG</span>
          </div>

          {/* User info */}
          {user && (
            <div className="p-4 border-b border-gray-800">
              <div className="flex items-center gap-3">
                <img src={user.avatar} alt="" className="w-9 h-9 rounded-full object-cover" onError={e => { (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${user.displayName}`; }} />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white truncate">{user.displayName}</p>
                  <p className="text-xs text-gray-400 truncate">@{user.username}</p>
                </div>
              </div>
            </div>
          )}

          {/* Nav */}
          <nav className="flex-1 p-3 overflow-y-auto space-y-0.5">
            {NAV_ITEMS.filter(item => item.page !== 'admin' || isAdmin).map(item => (
              <button
                key={item.page}
                onClick={() => { setCurrentPage(item.page); if (sidebarOpen) toggleSidebar(); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-left relative ${currentPage === item.page ? 'bg-[#9D4EDD] text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
              >
                <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} /></svg>
                {item.label}
                {item.page === 'notifications' && unreadCount > 0 && (
                  <span className="ml-auto w-5 h-5 bg-[#9D4EDD] text-white text-[10px] rounded-full flex items-center justify-center font-bold">{unreadCount}</span>
                )}
              </button>
            ))}
          </nav>

          {/* Bottom */}
          <div className="p-3 border-t border-gray-800 space-y-1">
            <a href="/" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
              Homepage
            </a>
            {isAuthenticated && (
              <button onClick={handleSignOut} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-400 hover:text-red-400 hover:bg-gray-800 transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                Sign Out
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="relative z-10 flex-1 flex flex-col min-h-screen min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-20 bg-gray-950/80 backdrop-blur-xl border-b border-gray-800 px-4 py-3 flex items-center gap-3">
          <button onClick={toggleSidebar} className="lg:hidden p-2 text-gray-400 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          <div className="flex-1" />
          {!isAuthenticated && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">Not signed in</span>
              <a href="/" className="px-3 py-1.5 bg-[#9D4EDD] hover:bg-[#7C3AED] text-white text-sm rounded-lg transition-colors">Sign In</a>
            </div>
          )}
        </header>

        <main className="flex-1 p-6 overflow-auto">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}
