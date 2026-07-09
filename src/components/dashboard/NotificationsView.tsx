import React from 'react';
import { useApp } from '@/store/AppContext';

export default function NotificationsView() {
  const { notifications, markNotificationRead } = useApp();

  const iconMap: Record<string, { icon: string; color: string }> = {
    payment: { icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z', color: 'text-emerald-400 bg-emerald-500/10' },
    competition: { icon: 'M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z', color: 'text-purple-400 bg-purple-500/10' },
    content: { icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z', color: 'text-blue-400 bg-blue-500/10' },
    system: { icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z', color: 'text-gray-400 bg-gray-500/10' },
    subscription: { icon: 'M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z', color: 'text-[#B794F4] bg-[#9D4EDD]/10' },
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Notifications</h1>
          <p className="text-gray-400 mt-1">{notifications.filter(n => !n.read).length} unread</p>
        </div>
        <button onClick={() => notifications.forEach(n => markNotificationRead(n.id))} className="text-sm text-[#B794F4] hover:text-[#C9B3F5]">Mark all as read</button>
      </div>
      <div className="space-y-2">
        {notifications.map(n => {
          const style = iconMap[n.type] || iconMap.system;
          return (
            <button key={n.id} onClick={() => markNotificationRead(n.id)} className={`w-full text-left p-4 rounded-xl border transition-all ${!n.read ? 'bg-[#150C26]/10 border-[#9D4EDD]/20 hover:bg-[#150C26]/20' : 'bg-gray-900/30 border-gray-800 hover:bg-gray-800/50'}`}>
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${style.color}`}>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={style.icon} /></svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-white">{n.title}</p>
                    {!n.read && <span className="w-2 h-2 bg-[#B794F4] rounded-full" />}
                  </div>
                  <p className="text-sm text-gray-400 mt-0.5">{n.message}</p>
                  <p className="text-xs text-gray-600 mt-1">{new Date(n.date).toLocaleString()}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
