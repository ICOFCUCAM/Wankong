import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ArtistFollowButton from '@/components/ArtistFollowButton';
import CreatorLevelBadge from '@/components/CreatorLevelBadge';

interface Artist {
  id: string;
  user_id: string;
  slug: string;
  name: string;
  bio: string;
  photo_url: string;
  banner_url: string;
  verified: boolean;
  genre: string;
  country: string;
  streams_count: number;
  followers_count: number;
}

const GENRE_GRADIENTS: Record<string, string> = {
  Gospel:    'from-purple-900 via-[#1E1235] to-[#0B0814]',
  Afrobeats: 'from-orange-900 via-yellow-900 to-[#0B0814]',
  'Hip-Hop': 'from-gray-800 via-gray-900 to-[#0B0814]',
  Classical: 'from-amber-900 via-yellow-900 to-[#0B0814]',
  Jazz:      'from-blue-900 via-cyan-900 to-[#0B0814]',
  'R&B':     'from-pink-900 via-purple-900 to-[#0B0814]',
  Praise:    'from-[#9D4EDD]/40 via-[#1E1235] to-[#0B0814]',
  Worship:   'from-[#00D9FF]/20 via-[#1E1235] to-[#0B0814]',
};

function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

export default function ArtistPublicPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const [artist, setArtist] = useState<Artist | null>(null);
  const [artistDbId, setArtistDbId] = useState<string>(''); // artists.id (not user_id)
  const [tracks, setTracks] = useState<any[]>([]);
  const [releases, setReleases] = useState<any[]>([]);
  const [competitionEntries, setCompetitionEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'releases' | 'competition' | 'about' | 'support'>('releases');
  const [followCount, setFollowCount] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<string | undefined>();
  const [creatorLevel, setCreatorLevel] = useState<string>('Bronze');
  const [membershipTiers, setMembershipTiers] = useState<any[]>([]);
  const [subscribing, setSubscribing] = useState<string | null>(null);

  // Get current user session
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id);
    });
  }, []);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);

    supabase
      .from('artists')
      .select('*')
      .eq('slug', slug)
      .single()
      .then(async ({ data: artistData, error }) => {
        if (error || !artistData) {
          setLoading(false);
          return;
        }
        setArtist(artistData);
        setArtistDbId(artistData.id);
        setFollowCount(artistData.followers ?? artistData.followers_count ?? 0);

        const userId = artistData.user_id;

        // Fetch creator level for this artist
        const { data: levelData } = await supabase
          .from('creator_levels')
          .select('level')
          .eq('user_id', userId)
          .maybeSingle();
        if (levelData) setCreatorLevel(levelData.level);

        const [tracksRes, releasesRes, entriesRes] = await Promise.all([
          supabase
            .from('tracks')
            .select('id, title, artwork_url, genre, audio_url, created_at')
            .eq('artist_id', userId)
            .order('created_at', { ascending: false })
            .limit(30),
          supabase
            .from('distribution_releases')
            .select('id, status, created_at, tracks(title, artwork_url)')
            .eq('tracks.artist_id', userId)
            .order('created_at', { ascending: false })
            .limit(20),
          supabase
            .from('competition_entries_v2')
            .select('id, title, thumbnail_url, votes_count, room_id, status, created_at')
            .eq('user_id', userId)
            .in('status', ['live', 'approved', 'winner'])
            .order('votes_count', { ascending: false })
            .limit(12),
        ]);

        setTracks(tracksRes.data ?? []);
        setReleases(releasesRes.data ?? []);
        setCompetitionEntries(entriesRes.data ?? []);

        // Fetch active membership tiers for this artist
        const { data: tiersData } = await supabase
          .from('membership_tiers')
          .select('*')
          .eq('creator_id', userId)
          .eq('is_active', true)
          .order('price_usd', { ascending: true });
        setMembershipTiers(tiersData ?? []);

        setLoading(false);
      });
  }, [slug]);

  const handleSubscribe = async (tierId: string, tierName: string, priceUsd: number) => {
    if (!currentUserId) { navigate('/auth/login'); return; }
    setSubscribing(tierId);
    try {
      const res = await fetch('/api/create-subscription', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ tierId, userId: currentUserId }),
      });
      if (res.ok) {
        const { url } = await res.json();
        if (url) { window.location.href = url; return; }
      }
      alert('Unable to start subscription. Please try again or contact support.');
    } catch {
      alert('Subscription failed. Please try again.');
    } finally {
      setSubscribing(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0814]">
        <Header />
        <div className="animate-pulse max-w-5xl mx-auto px-4 py-10 space-y-6">
          <div className="h-56 rounded-2xl bg-white/5" />
          <div className="flex gap-5">
            <div className="w-32 h-32 rounded-full bg-white/10" />
            <div className="flex-1 space-y-3 pt-4">
              <div className="h-7 w-52 bg-white/10 rounded" />
              <div className="h-4 w-36 bg-white/5 rounded" />
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!artist) {
    return (
      <div className="min-h-screen bg-[#0B0814] flex flex-col items-center justify-center gap-4">
        <Header />
        <p className="text-2xl font-bold text-white">Artist not found</p>
        <Link to="/" className="text-[#00D9FF] hover:underline">Back to homepage</Link>
      </div>
    );
  }

  const gradient = GENRE_GRADIENTS[artist.genre] ?? 'from-[#9D4EDD]/30 via-[#0B0814] to-[#0B0814]';
  const totalReleases = releases.length + tracks.length;

  const STATUS_COLORS: Record<string, string> = {
    queued:                    'text-gray-400 bg-gray-400/10 border-gray-400/20',
    pending_admin_review:      'text-[#FFB800] bg-[#FFB800]/10 border-[#FFB800]/20',
    approved_for_distribution: 'text-[#00F5A0] bg-[#00F5A0]/10 border-[#00F5A0]/20',
    live:                      'text-[#00D9FF] bg-[#00D9FF]/10 border-[#00D9FF]/20',
    rejected:                  'text-red-400 bg-red-400/10 border-red-400/20',
  };

  return (
    <div className="min-h-screen bg-[#0B0814] text-white">
      <Header />

      {/* Hero Banner */}
      <div className={`relative h-60 sm:h-72 bg-gradient-to-br ${gradient} overflow-hidden`}>
        {artist.banner_url && (
          <img
            src={artist.banner_url}
            alt=""
            className="absolute inset-0 w-full h-full object-cover opacity-25"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B0814] via-[#0B0814]/40 to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(0,217,255,0.08),transparent_60%)]" />
      </div>

      <div className="max-w-5xl mx-auto px-4 lg:px-8">
        {/* Profile row */}
        <div className="relative -mt-20 mb-8 flex flex-col sm:flex-row items-start sm:items-end gap-5">
          <div className="relative shrink-0">
            {artist.photo_url ? (
              <img
                src={artist.photo_url}
                alt={artist.name}
                className="w-32 h-32 sm:w-36 sm:h-36 rounded-full border-4 border-[#0B0814] object-cover bg-white/10 shadow-2xl"
                onError={e => {
                  (e.target as HTMLImageElement).src =
                    `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(artist.name)}`;
                }}
              />
            ) : (
              <div
                className="w-32 h-32 sm:w-36 sm:h-36 rounded-full border-4 border-[#0B0814] bg-gradient-to-br from-[#9D4EDD] to-[#00D9FF] flex items-center justify-center shadow-2xl"
              >
                <span className="text-4xl font-black text-white">
                  {artist.name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            {artist.verified && (
              <span className="absolute bottom-1 right-1 w-7 h-7 bg-[#00D9FF] rounded-full flex items-center justify-center border-2 border-[#0B0814] shadow">
                <svg className="w-3.5 h-3.5 text-[#0B0814]" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </span>
            )}
          </div>

          <div className="flex-1 pb-2">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl sm:text-3xl font-black text-white">{artist.name}</h1>
                  {artist.verified && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-[#00D9FF]/10 text-[#00D9FF] border border-[#00D9FF]/20 font-medium">
                      Verified Artist
                    </span>
                  )}
                </div>
                {artist.genre && (
                  <p className="text-gray-400 text-sm mt-0.5">{artist.genre}{artist.country ? ` · ${artist.country}` : ''}</p>
                )}
              </div>
              <div className="sm:ml-auto flex items-center gap-3">
                <CreatorLevelBadge level={creatorLevel} />
                {artistDbId && (
                  <ArtistFollowButton
                    artistId={artistDbId}
                    userId={currentUserId}
                  />
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-6 mt-4 text-sm flex-wrap">
              <div>
                <p className="font-bold text-white text-lg">{fmt(artist.total_streams ?? artist.streams_count ?? artist.streams ?? 0)}</p>
                <p className="text-gray-500 text-xs">Streams</p>
              </div>
              <div>
                <p className="font-bold text-white text-lg">{fmt(followCount)}</p>
                <p className="text-gray-500 text-xs">Followers</p>
              </div>
              <div>
                <p className="font-bold text-white text-lg">{totalReleases}</p>
                <p className="text-gray-500 text-xs">Releases</p>
              </div>
              <div>
                <p className="font-bold text-[#FFB800] text-lg">
                  {fmt(competitionEntries.reduce((sum, e) => sum + (e.votes_count ?? 0), 0))}
                </p>
                <p className="text-gray-500 text-xs">Competition Votes</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-white/10 mb-8 overflow-x-auto">
          {(['releases', 'competition', 'about', 'support'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-3 text-sm font-medium capitalize transition-colors border-b-2 -mb-px whitespace-nowrap ${
                tab === t
                  ? 'border-[#00D9FF] text-[#00D9FF]'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              {t === 'releases'
                ? `Releases (${totalReleases})`
                : t === 'competition'
                ? `Competition Videos (${competitionEntries.length})`
                : t === 'support'
                ? `Support${membershipTiers.length > 0 ? ` (${membershipTiers.length})` : ''}`
                : 'About'}
            </button>
          ))}
        </div>

        {/* Releases Tab */}
        {tab === 'releases' && (
          <div className="pb-16">
            {releases.length === 0 && tracks.length === 0 ? (
              <div className="text-center py-20 text-gray-500">No releases yet.</div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
                {releases.map(r => (
                  <div key={r.id} className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-white/20 transition-all group">
                    <div className="aspect-square overflow-hidden bg-white/5">
                      {r.artwork_url ? (
                        <img
                          src={r.artwork_url}
                          alt={r.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-[#9D4EDD]/30 to-[#00D9FF]/20 flex items-center justify-center">
                          <svg className="w-10 h-10 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="font-semibold text-white text-sm truncate">{r.title}</p>
                      <div className="flex items-center justify-between mt-1.5">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border capitalize font-medium ${STATUS_COLORS[r.status] ?? STATUS_COLORS['queued']}`}>
                          {(r.status ?? 'queued').replace(/_/g, ' ')}
                        </span>
                        {r.platform_count > 0 && (
                          <span className="text-[10px] text-gray-500">{r.platform_count} platforms</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {tracks.map(t => (
                  <div key={t.id} className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-white/20 transition-all group">
                    <div className="aspect-square overflow-hidden bg-white/5">
                      {t.artwork_url ? (
                        <img src={t.artwork_url} alt={t.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-[#FFB800]/20 to-[#FF6B00]/10 flex items-center justify-center">
                          <svg className="w-10 h-10 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="font-semibold text-white text-sm truncate">{t.title}</p>
                      <div className="flex items-center justify-between mt-1.5">
                        {t.genre && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#00D9FF]/10 text-[#00D9FF] border border-[#00D9FF]/20">
                            {t.genre}
                          </span>
                        )}
                        <span className="text-[10px] text-gray-500">{t.language?.toUpperCase() ?? ''}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Competition Tab */}
        {tab === 'competition' && (
          <div className="pb-16">
            {competitionEntries.length === 0 ? (
              <div className="text-center py-20 text-gray-500">No competition videos yet.</div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
                {competitionEntries.map(entry => (
                  <Link
                    key={entry.id}
                    to={`/talent-arena/room/${entry.room_id}`}
                    className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-[#9D4EDD]/40 transition-all group"
                  >
                    <div className="aspect-video relative overflow-hidden bg-white/5">
                      {entry.thumbnail_url ? (
                        <img
                          src={entry.thumbnail_url}
                          alt={entry.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-[#9D4EDD]/30 to-[#00D9FF]/10 flex items-center justify-center">
                          <svg className="w-10 h-10 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 10l4.553-2.069A1 1 0 0121 8.882v6.236a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
                        <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
                          <svg className="w-5 h-5 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </div>
                      </div>
                      <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur rounded-lg px-2 py-1 flex items-center gap-1">
                        <svg className="w-3 h-3 text-[#FF6B00]" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        <span className="text-[10px] text-white font-bold">{fmt(entry.votes_count ?? 0)}</span>
                      </div>
                    </div>
                    <div className="p-3">
                      <p className="font-semibold text-white text-sm truncate">{entry.title}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* About Tab */}
        {tab === 'about' && (
          <div className="max-w-2xl pb-16 space-y-4">
            {artist.bio ? (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <p className="text-xs text-gray-500 uppercase tracking-widest mb-3">Biography</p>
                <p className="text-gray-300 leading-relaxed whitespace-pre-line">{artist.bio}</p>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">No bio available.</div>
            )}
            <div className="grid grid-cols-2 gap-4">
              {artist.genre && (
                <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                  <p className="text-xs text-gray-500 mb-1">Genre</p>
                  <p className="text-white font-medium">{artist.genre}</p>
                </div>
              )}
              {artist.country && (
                <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                  <p className="text-xs text-gray-500 mb-1">Country</p>
                  <p className="text-white font-medium">{artist.country}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Support / Membership Tiers Tab */}
        {tab === 'support' && (
          <div className="max-w-2xl pb-16">
            {membershipTiers.length === 0 ? (
              <div className="text-center py-20 text-gray-500">
                <div className="text-5xl mb-4">⭐</div>
                <p className="text-lg">No membership tiers available yet.</p>
                <p className="text-sm mt-2 text-gray-600">Check back later to support this artist.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-gray-400 text-sm mb-6">
                  Support <span className="text-white font-semibold">{artist.name}</span> with a monthly membership
                  and unlock exclusive perks.
                </p>
                {membershipTiers.map((tier: any) => (
                  <div
                    key={tier.id}
                    className="rounded-2xl border p-5"
                    style={{ background: `${tier.color}08`, borderColor: `${tier.color}30` }}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-black text-lg" style={{ color: tier.color }}>{tier.name}</h3>
                        <p className="text-gray-400 text-sm">${tier.price_usd}/month</p>
                      </div>
                      <button
                        onClick={() => handleSubscribe(tier.id, tier.name, tier.price_usd)}
                        disabled={subscribing === tier.id}
                        className="px-5 py-2.5 rounded-xl font-bold text-sm text-white transition-opacity hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
                        style={{ background: `linear-gradient(135deg, ${tier.color}, #9D4EDD)` }}
                      >
                        {subscribing === tier.id ? (
                          <>
                            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            Processing…
                          </>
                        ) : (
                          <>⭐ Subscribe</>
                        )}
                      </button>
                    </div>
                    {tier.description && (
                      <p className="text-gray-400 text-sm mb-3">{tier.description}</p>
                    )}
                    {tier.perks && tier.perks.length > 0 && (
                      <ul className="space-y-1.5">
                        {tier.perks.map((perk: string, i: number) => (
                          <li key={i} className="flex items-center gap-2 text-sm text-gray-300">
                            <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20" style={{ color: tier.color }}>
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            {perk}
                          </li>
                        ))}
                      </ul>
                    )}
                    <p className="text-xs text-gray-600 mt-3">
                      {tier.subscriber_count ?? 0} active subscriber{(tier.subscriber_count ?? 0) !== 1 ? 's' : ''}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
