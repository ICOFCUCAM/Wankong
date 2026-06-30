import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, Search, Library, Music2 } from 'lucide-react';
import { usePlayer } from '@/components/GlobalPlayer';

const TABS = [
  { to: '/',       label: 'Home',    Icon: Home    },
  { to: '/search', label: 'Search',  Icon: Search  },
  { to: '/library',label: 'Library', Icon: Library },
] as const;

export default function MobileBottomNav() {
  const { currentTrack, setShowNowPlaying } = usePlayer();
  const location = useLocation();

  // Don't render on admin or auth pages
  if (location.pathname.startsWith('/admin') || location.pathname.startsWith('/auth')) return null;

  // Reserve extra bottom padding when player is visible — handled via pb-24 on pages
  const playerOffset = currentTrack ? 'bottom-[80px]' : 'bottom-0';

  return (
    <nav className={`fixed ${playerOffset} left-0 right-0 z-30 md:hidden bg-[#0B0814]/95 backdrop-blur-2xl border-t border-white/10 safe-area-inset-bottom`}>
      <div className="flex items-center">
        {TABS.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center gap-1 py-3 transition-colors ${
                isActive ? 'text-[#00D9FF]' : 'text-white/40 hover:text-white/70'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110' : ''}`} />
                <span className="text-[10px] font-semibold">{label}</span>
              </>
            )}
          </NavLink>
        ))}

        {/* Player tab */}
        <button
          onClick={() => setShowNowPlaying(true)}
          disabled={!currentTrack}
          className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors ${
            currentTrack ? 'text-white/40 hover:text-white/70' : 'text-white/15'
          }`}
        >
          <div className="relative">
            <Music2 className="w-5 h-5" />
            {currentTrack && (
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#00D9FF] animate-pulse" />
            )}
          </div>
          <span className="text-[10px] font-semibold">Player</span>
        </button>
      </div>
    </nav>
  );
}
