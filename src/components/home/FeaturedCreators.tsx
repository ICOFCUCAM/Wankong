import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useApp } from '@/store/AppContext';

interface Creator {
  id: string;
  name: string;
  username: string;
  avatar: string;
  verified: boolean;
  followers: number;
  bio: string;
  category: string;
}

function formatNumber(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

export default function FeaturedCreators() {
  const { setShowAuthModal, setAuthMode, isAuthenticated } = useApp();
  const [following, setFollowing]   = useState<Set<string>>(new Set());
  const [creators,  setCreators]    = useState<Creator[]>([]);
  const [loading,   setLoading]     = useState(true);

  useEffect(() => {
    supabase
      .from('profiles')
      .select('id, display_name, username, avatar_url, bio, follower_count, role, verified')
      .in('role', ['artist', 'author', 'creator'])
      .order('follower_count', { ascending: false })
      .limit(8)
      .then(({ data }) => {
        if (data && data.length > 0) {
          setCreators(data.map((p: any) => ({
            id:        p.id,
            name:      p.display_name ?? p.username ?? 'Creator',
            username:  p.username ?? '',
            avatar:    p.avatar_url ?? `https://api.dicebear.com/7.x/initials/svg?seed=${p.id}`,
            verified:  p.verified ?? false,
            followers: p.follower_count ?? 0,
            bio:       p.bio ?? '',
            category:  p.role === 'artist' ? 'Music' : p.role === 'author' ? 'Books' : 'Creator',
          })));
        }
        setLoading(false);
      });
  }, []);

  const toggleFollow = (id: string) => {
    if (!isAuthenticated) { setAuthMode('register'); setShowAuthModal(true); return; }
    setFollowing(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  if (loading) {
    return (
      <section className="py-20 px-4 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-white mb-3">Featured Creators</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-gray-900/50 border border-gray-800 rounded-2xl overflow-hidden animate-pulse">
              <div className="h-24 bg-white/5" />
              <div className="pt-10 pb-5 px-4 space-y-3">
                <div className="h-4 bg-white/5 rounded w-1/2 mx-auto" />
                <div className="h-3 bg-white/5 rounded w-2/3 mx-auto" />
                <div className="h-8 bg-white/5 rounded" />
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (creators.length === 0) return null;

  return (
    <section className="py-20 px-4 lg:px-8 max-w-7xl mx-auto">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold text-white mb-3">Featured Creators</h2>
        <p className="text-gray-400 max-w-2xl mx-auto">Join thousands of creators who are building their empires on WANKONG. From Afrobeats to tech podcasts, our platform supports every creative vision.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {creators.map(creator => (
          <div key={creator.id} className="group bg-gray-900/50 border border-gray-800 rounded-2xl overflow-hidden hover:border-[#9D4EDD]/30 transition-all hover:-translate-y-1">
            <div className="relative">
              <div className="h-24 bg-gradient-to-r from-[#9D4EDD]/30 to-purple-600/30" />
              <img src={creator.avatar} alt={creator.name} className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-16 h-16 rounded-full object-cover border-4 border-gray-900" />
            </div>
            <div className="pt-10 pb-5 px-4 text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <h3 className="font-semibold text-white">{creator.name}</h3>
                {creator.verified && (
                  <svg className="w-4 h-4 text-[#B794F4]" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                )}
              </div>
              <p className="text-sm text-gray-400 mb-1">@{creator.username}</p>
              <p className="text-xs text-gray-500 mb-3 line-clamp-2">{creator.bio || 'Creator on WANKONG'}</p>
              <div className="flex items-center justify-center gap-4 mb-4 text-xs">
                <div>
                  <p className="font-semibold text-white">{formatNumber(creator.followers)}</p>
                  <p className="text-gray-500">Followers</p>
                </div>
                <div className="w-px h-8 bg-gray-700" />
                <div>
                  <p className="font-semibold text-emerald-400">{creator.category}</p>
                  <p className="text-gray-500">Category</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => toggleFollow(creator.id)} className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${following.has(creator.id) ? 'bg-gray-800 text-gray-300 border border-gray-600' : 'bg-[#9D4EDD] hover:bg-[#7C3AED] text-white'}`}>
                  {following.has(creator.id) ? 'Following' : 'Follow'}
                </button>
                <button className="p-2 bg-gray-800 rounded-xl text-gray-400 hover:text-white transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
