import { useState, useEffect, useRef, Component, ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import Header from './Header';
import Footer from './Footer';
import ProductCard from './ProductCard';
import { Play, Pause, Zap, Music, BookOpen, Video, Mic, Trophy, Globe, Users, DollarSign, TrendingUp, ArrowRight, Headphones, Radio, Star, ChevronRight, ChevronLeft, Clock, ShieldCheck, BarChart3, CreditCard, MoreVertical, Heart, Shuffle, SkipBack, SkipForward, Repeat, SlidersHorizontal } from 'lucide-react';
import { usePlayer } from './GlobalPlayer';
import { asArray } from '@/lib/utils';
import FeaturedPerformancesGrid from './home/FeaturedPerformancesGrid';
import DefaultBookCover from './home/DefaultBookCover';
import AudiobookCard from './home/AudiobookCard';
import DefaultVideoThumbnail from './home/DefaultVideoThumbnail';
import PersonalizedSections from './home/PersonalizedSections';

// Lightweight section-level error boundary — if a section crashes, show nothing
class SectionErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

const ARTIST_IMAGES = [
  'https://d64gsuwffb70l.cloudfront.net/69bdd0721a1fe097ab8615d8_1774047821550_5abc0a11.png',
  'https://d64gsuwffb70l.cloudfront.net/69bdd0721a1fe097ab8615d8_1774047791621_1ee31d4b.jpg',
  'https://d64gsuwffb70l.cloudfront.net/69bdd0721a1fe097ab8615d8_1774047793741_84240e78.jpg',
  'https://d64gsuwffb70l.cloudfront.net/69bdd0721a1fe097ab8615d8_1774047794965_c692c0d2.jpg',
];

const DISTRIBUTION_PLATFORMS = [
  'Spotify', 'Apple Music', 'YouTube Music', 'Amazon Music', 'TikTok', 'Instagram',
  'Deezer', 'Tidal', 'Boomplay', 'Audiomack', 'Anghami', 'JioSaavn',
  'Pandora', 'iHeartRadio', 'SoundCloud', 'Bandcamp', 'Beatport', 'Qobuz',
  'KKBOX', 'Gaana', 'Napster', 'Tencent Music', 'NetEase', 'Traxsource',
  'Facebook Music', 'Snapchat Sounds', 'Shazam', 'Ditto', 'Resso'
];

const STATS = [
  { icon: Users, label: 'Active Creators', value: '12,500+', color: '#00D9FF' },
  { icon: Globe, label: 'Countries', value: '140+', color: '#9D4EDD' },
  { icon: DollarSign, label: 'Creator Payouts', value: '$2.8M+', color: '#00F5A0' },
  { icon: TrendingUp, label: 'Monthly Streams', value: '45M+', color: '#FFB800' },
];

// ── Mock fallbacks — shown until real content is uploaded so sections never sit empty.
// (ProductCard renders a styled placeholder when `image` is missing.)
const MOCK_NEW_RELEASES = [
  { id: 'nr1', handle: 'heaven-gates',   title: 'Heaven Gates',   vendor: 'Prophet Elijah', product_type: 'Music', price: 0,    genre: 'Gospel' },
  { id: 'nr2', handle: 'afro-vibration', title: 'Afro Vibration', vendor: 'Kojo Mensah',    product_type: 'Music', price: 199,  genre: 'Afrobeats' },
  { id: 'nr3', handle: 'midnight-jazz',  title: 'Midnight Jazz',  vendor: 'Adaeze Obi',     product_type: 'Music', price: 299,  genre: 'Jazz' },
  { id: 'nr4', handle: 'street-gospel',  title: 'Street Gospel',  vendor: 'MC Zion',        product_type: 'Music', price: 0,    genre: 'Hip-Hop' },
  { id: 'nr5', handle: 'lagos-nights',   title: 'Lagos Nights',   vendor: 'Funmi Adeyemi',  product_type: 'Music', price: 149,  genre: 'RnB' },
  { id: 'nr6', handle: 'electric-soul',  title: 'Electric Soul',  vendor: 'DJ Beacon',      product_type: 'Music', price: 249,  genre: 'EDM' },
  { id: 'nr7', handle: 'yoruba-praise',  title: 'Yoruba Praise',  vendor: 'Sis. Busayo',    product_type: 'Music', price: 0,    genre: 'Gospel' },
  { id: 'nr8', handle: 'highlife-remix', title: 'Highlife Remix', vendor: 'Kwame Asante',   product_type: 'Music', price: 0,    genre: 'Highlife' },
];

const MOCK_BOOKS = [
  { id: 'bk1', handle: 'gospel-of-grace',      title: 'The Gospel of Grace',       author: 'Pastor E. Ofori',     product_type: 'Book', price: 1299, genre: 'Christian Living' },
  { id: 'bk2', handle: 'kingdom-business',     title: 'Kingdom Business Secrets',  author: 'Dr. Faith Mensah',    product_type: 'Book', price: 1899, genre: 'Business' },
  { id: 'bk3', handle: 'midnight-prayers',     title: 'Midnight Prayers',          author: 'Rev. Samuel Asante',  product_type: 'Book', price: 999,  genre: 'Devotional' },
  { id: 'bk4', handle: 'praise-anthology',     title: 'African Praise Anthology',  author: 'Various Authors',     product_type: 'Book', price: 2499, genre: 'Worship' },
  { id: 'bk5', handle: 'prophetic-voice',      title: 'The Prophetic Voice',       author: 'Apostle Grace Oduya', product_type: 'Book', price: 1599, genre: 'Prophecy' },
  { id: 'bk6', handle: 'healing-wings',        title: 'Healing in His Wings',      author: 'Dr. Emmanuel Yaw',    product_type: 'Book', price: 1399, genre: 'Healing' },
  { id: 'bk7', handle: 'digital-christian',    title: 'The Digital Christian',     author: 'Tech Pastor Kwame',   product_type: 'Book', price: 1199, genre: 'Christian Living' },
  { id: 'bk8', handle: 'songs-of-ascent',      title: 'Songs of Ascent',          author: 'Choir Master David',  product_type: 'Book', price: 899,  genre: 'Worship' },
  { id: 'bk9', handle: 'raising-kingdom-kids', title: 'Raising Kingdom Kids',      author: 'Pastor Mary Adofo',   product_type: 'Book', price: 1699, genre: 'Parenting' },
  { id: 'bk10', handle: 'fast-breaks-chains',  title: 'The Fast That Breaks Chains', author: 'Bishop John Asare', product_type: 'Book', price: 1099, genre: 'Devotional' },
];

const MOCK_AUDIOBOOKS = [
  { id: 'ab1', handle: 'grace-audio',     title: 'The Gospel of Grace (Audio)', author: 'Pastor E. Ofori',    product_type: 'Audiobook', price: 1499, genre: 'Christian Living' },
  { id: 'ab2', handle: 'prayers-audio',   title: 'Midnight Prayers (Audio)',    author: 'Rev. Samuel Asante', product_type: 'Audiobook', price: 1199, genre: 'Devotional' },
  { id: 'ab3', handle: 'prophetic-audio', title: 'The Prophetic Voice (Audio)', author: 'Apostle Grace Oduya', product_type: 'Audiobook', price: 1799, genre: 'Prophecy' },
  { id: 'ab4', handle: 'kingdom-audio',   title: 'Kingdom Business (Audio)',    author: 'Dr. Faith Mensah',   product_type: 'Audiobook', price: 1999, genre: 'Business' },
  { id: 'ab5', handle: 'healing-audio',   title: 'Healing in His Wings (Audio)', author: 'Dr. Emmanuel Yaw',  product_type: 'Audiobook', price: 1599, genre: 'Healing' },
  { id: 'ab6', handle: 'ascent-audio',    title: 'Songs of Ascent (Audio)',     author: 'Choir Master David', product_type: 'Audiobook', price: 1299, genre: 'Worship' },
];

const MOCK_ARTISTS = [
  { name: 'Prophet Elijah', genre: 'Gospel',    slug: 'prophet-elijah', streams_count: 1284000, country_code: 'NG', verified: true },
  { name: 'Kojo Mensah',    genre: 'Afrobeats', slug: 'kojo-mensah',    streams_count: 892000,  country_code: 'GH', verified: true },
  { name: 'Adaeze Obi',     genre: 'Jazz',      slug: 'adaeze-obi',     streams_count: 453000,  country_code: 'NG', verified: true },
  { name: 'Zawadi Kamau',   genre: 'Afrobeats', slug: 'zawadi-kamau',   streams_count: 734000,  country_code: 'KE', verified: true },
  { name: 'Sipho Dlamini',  genre: 'Blues',     slug: 'sipho-dlamini',  streams_count: 287000,  country_code: 'ZA', verified: true },
  { name: 'Funmi Adeyemi',  genre: 'RnB',       slug: 'funmi-adeyemi',  streams_count: 678000,  country_code: 'NG', verified: true },
];

const MOCK_TOP_CREATORS = [
  { user_id: 'tc1', name: 'Grace Adele',   level: 'Diamond',  xp: 48200 },
  { user_id: 'tc2', name: 'Kojo Mensah',   level: 'Platinum', xp: 39100 },
  { user_id: 'tc3', name: 'Prophet Elijah', level: 'Gold',    xp: 31500 },
];

// ── Language discovery data ───────────────────────────────────────────────────

const ALL_LANGUAGES = [
  { lang: 'English',    flag: '🇬🇧', desc: 'Global'       },
  { lang: 'French',     flag: '🇫🇷', desc: 'Francophone'  },
  { lang: 'Spanish',    flag: '🇪🇸', desc: 'Hispanic'     },
  { lang: 'Arabic',     flag: '🇸🇦', desc: 'Middle East'  },
  { lang: 'Pidgin',     flag: '🌍',  desc: 'West Africa'  },
  { lang: 'Yoruba',     flag: '🌍',  desc: 'Nigeria'      },
  { lang: 'Igbo',       flag: '🌍',  desc: 'Nigeria'      },
  { lang: 'Hausa',      flag: '🌍',  desc: 'West Africa'  },
  { lang: 'Swahili',    flag: '🇰🇪', desc: 'East Africa'  },
  { lang: 'Zulu',       flag: '🇿🇦', desc: 'South Africa' },
  { lang: 'Luganda',    flag: '🌍',  desc: 'Uganda'       },
  { lang: 'Bamumbu',    flag: '🌍',  desc: 'Cameroon'     },
  { lang: 'Bamileke',   flag: '🌍',  desc: 'Cameroon'     },
  { lang: 'Twi',        flag: '🇬🇭', desc: 'Ghana'        },
  { lang: 'German',     flag: '🇩🇪', desc: ''             },
  { lang: 'Norwegian',  flag: '🇳🇴', desc: ''             },
  { lang: 'Swedish',    flag: '🇸🇪', desc: ''             },
  { lang: 'Portuguese', flag: '🇧🇷', desc: 'Brazil'       },
  { lang: 'Russian',    flag: '🇷🇺', desc: ''             },
  { lang: 'Chinese',    flag: '🇨🇳', desc: ''             },
  { lang: 'Japanese',   flag: '🇯🇵', desc: ''             },
];

const LANG_PRIORITY: Record<string, string[]> = {
  CM: ['Pidgin', 'French', 'Bamumbu', 'Bamileke', 'English'],
  NG: ['Yoruba', 'Igbo', 'Hausa', 'Pidgin', 'English'],
  GH: ['Twi', 'English', 'Ewe', 'Ga'],
  KE: ['Swahili', 'English'],
  ZA: ['Zulu', 'English', 'Xhosa', 'Afrikaans'],
  UG: ['Luganda', 'English', 'Swahili'],
  TZ: ['Swahili', 'English'],
  NO: ['Norwegian', 'English'],
  SE: ['Swedish', 'English'],
  US: ['English', 'Spanish'],
  GB: ['English'],
  FR: ['French', 'English'],
  DE: ['German', 'English'],
  ES: ['Spanish', 'English'],
  BR: ['Portuguese', 'Spanish'],
  SA: ['Arabic', 'English'],
  EG: ['Arabic', 'English'],
  CN: ['Chinese', 'English'],
  JP: ['Japanese', 'English'],
  RU: ['Russian', 'English'],
};

function getPriorityLanguages(country: string) {
  const priorities = LANG_PRIORITY[country] ?? ['English'];
  const head = priorities
    .map(p => ALL_LANGUAGES.find(l => l.lang === p))
    .filter(Boolean) as typeof ALL_LANGUAGES;
  const tail = ALL_LANGUAGES.filter(l => !priorities.includes(l.lang));
  return [...head, ...tail].slice(0, 11);
}

// ── Equalizer (decorative waveform) ───────────────────────────────────────────
const EQ_PATTERN = [30, 55, 40, 78, 52, 88, 44, 66, 34, 72, 50, 90, 40, 60, 28, 82, 56, 46, 70, 38, 62, 36, 76, 48];
function Equalizer({ color, bars = 20, className = '' }: { color: string; bars?: number; className?: string }) {
  return (
    <div className={`flex items-end gap-[2px] h-7 ${className}`} aria-hidden>
      {Array.from({ length: bars }).map((_, i) => {
        const h = EQ_PATTERN[i % EQ_PATTERN.length];
        return (
          <span
            key={i}
            className="flex-1 rounded-full"
            style={{ height: `${h}%`, backgroundColor: color, opacity: 0.35 + h / 160 }}
          />
        );
      })}
    </div>
  );
}

const AVATAR_GRADS = ['from-[#9D4EDD] to-[#00D9FF]', 'from-[#FF6B00] to-[#FFB800]', 'from-[#00F5A0] to-[#00D9FF]', 'from-[#FF3B6B] to-[#9D4EDD]'];
function AvatarStack({ count = 3 }: { count?: number }) {
  return (
    <div className="flex -space-x-2" aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <span key={i} className={`w-5 h-5 rounded-full bg-gradient-to-br ${AVATAR_GRADS[i % AVATAR_GRADS.length]} border-2 border-[#0D1635]`} />
      ))}
    </div>
  );
}


export default function AppLayout() {
  const [trendingProducts, setTrendingProducts] = useState<any[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<any[]>([]);
  const [newReleases, setNewReleases] = useState<any[]>([]);
  const [trendingBooks, setTrendingBooks] = useState<any[]>([]);
  const [audiobooks, setAudiobooks] = useState<any[]>([]);
  const [collections, setCollections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [featuredArtists, setFeaturedArtists] = useState<any[]>([]);
  const [topCreators, setTopCreators] = useState<any[]>([]);
  const [langMode, setLangMode] = useState<'region' | 'global'>('region');

  // Detect user country from browser locale for language priority
  const userCountry = (() => {
    try { return (navigator.language || 'en-US').split('-')[1]?.toUpperCase() ?? 'US'; }
    catch { return 'US'; }
  })();
  const priorityLanguages = getPriorityLanguages(userCountry);

  // Video player state
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const [videoModalOpen, setVideoModalOpen] = useState(false);

  // Audio player state
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(32); // start mid-track for realism
  const [audioTick, setAudioTick] = useState<ReturnType<typeof setInterval> | null>(null);

  // Live vote counter (Supabase realtime feeds this)
  const [liveVotes, setLiveVotes] = useState(11612);

  const navigate = useNavigate();
  const { recentlyPlayed, play: playerPlay } = usePlayer();
  const booksScrollRef = useRef<HTMLDivElement>(null); // kept for legacy compatibility
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoWrapRef = useRef<HTMLDivElement>(null);
  const [viewCount, setViewCount] = useState(60318);
  const [confetti, setConfetti] = useState(false);
  const [tracksDistributed, setTracksDistributed] = useState(1247);

  // Auto-play video when scrolled into view
  useEffect(() => {
    if (!videoWrapRef.current || !videoRef.current) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        videoRef.current?.play().catch(() => {});
        setVideoPlaying(true);
      } else {
        videoRef.current?.pause();
        setVideoPlaying(false);
      }
    }, { threshold: 0.5 });
    obs.observe(videoWrapRef.current);
    return () => obs.disconnect();
  }, []);


  // Confetti burst on mount for winner card
  useEffect(() => {
    const id = setTimeout(() => setConfetti(true), 800);
    return () => clearTimeout(id);
  }, []);

  const scrollBooks = (dir: 'left' | 'right') => {
    if (!booksScrollRef.current) return;
    booksScrollRef.current.scrollBy({ left: dir === 'right' ? 600 : -600, behavior: 'smooth' });
  };

  const langScrollRef = useRef<HTMLDivElement>(null);
  const trendScrollRef = useRef<HTMLDivElement>(null);
  const scrollRow = (ref: { current: HTMLDivElement | null }, dir: 'left' | 'right') => {
    ref.current?.scrollBy({ left: dir === 'right' ? 560 : -560, behavior: 'smooth' });
  };

  const toggleAudio = () => {
    if (audioPlaying) {
      if (audioTick) clearInterval(audioTick);
      setAudioTick(null);
      setAudioPlaying(false);
    } else {
      setAudioPlaying(true);
      const id = setInterval(() => {
        setAudioProgress(p => {
          if (p >= 100) { clearInterval(id); setAudioPlaying(false); return 0; }
          return p + 0.4;
        });
      }, 200);
      setAudioTick(id);
    }
  };

  const toggleVideo = () => {
    if (!videoRef.current) return;
    if (videoPlaying) { videoRef.current.pause(); setVideoPlaying(false); }
    else { videoRef.current.play().catch(() => {}); setVideoPlaying(true); }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
      const { data: cols } = await supabase
        .from('ecom_collections')
        .select('*')
        .eq('is_visible', true);
      const colsArr = asArray<any>(cols);
      setCollections(colsArr);

      const trendingCol = colsArr.find(c => c.handle === 'trending');
      if (trendingCol) {
        const { data: links } = await supabase
          .from('ecom_product_collections')
          .select('product_id, position')
          .eq('collection_id', trendingCol.id)
          .order('position');
        if (links && links.length > 0) {
          const ids = links.map(l => l.product_id);
          const { data: prods } = await supabase
            .from('ecom_products')
            .select('*, variants:ecom_product_variants(*)')
            .in('id', ids)
            .eq('status', 'active');
          const sorted = ids.map(id => prods?.find(p => p.id === id)).filter(Boolean);
          setTrendingProducts(sorted);
        }
      }

      const featuredCol = colsArr.find(c => c.handle === 'featured');
      if (featuredCol) {
        const { data: links } = await supabase
          .from('ecom_product_collections')
          .select('product_id, position')
          .eq('collection_id', featuredCol.id)
          .order('position');
        if (links && links.length > 0) {
          const ids = links.map(l => l.product_id);
          const { data: prods } = await supabase
            .from('ecom_products')
            .select('*, variants:ecom_product_variants(*)')
            .in('id', ids)
            .eq('status', 'active');
          const sorted = ids.map(id => prods?.find(p => p.id === id)).filter(Boolean);
          setFeaturedProducts(sorted);
        }
      }

      // New Releases — direct query sorted by creation date DESC (all content types)
      const { data: newProds } = await supabase
        .from('ecom_products')
        .select('*, variants:ecom_product_variants(*)')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(10);
      if (newProds && newProds.length > 0) setNewReleases(newProds);

      // Books — try 'books' collection, fall back to type filter
      const booksCol = colsArr.find((c: any) => c.handle === 'books');
      if (booksCol) {
        const { data: bLinks } = await supabase
          .from('ecom_product_collections')
          .select('product_id, position')
          .eq('collection_id', booksCol.id)
          .order('position')
          .limit(12);
        if (bLinks && bLinks.length > 0) {
          const ids = bLinks.map((l: any) => l.product_id);
          const { data: bProds } = await supabase
            .from('ecom_products')
            .select('*, variants:ecom_product_variants(*)')
            .in('id', ids)
            .eq('status', 'active');
          const sorted = ids.map((id: string) => bProds?.find((p: any) => p.id === id)).filter(Boolean);
          if (sorted.length > 0) setTrendingBooks(sorted);
        }
      }

      // Audiobooks — direct query by product_type
      const { data: abProds } = await supabase
        .from('ecom_products')
        .select('*, variants:ecom_product_variants(*)')
        .eq('status', 'active')
        .ilike('product_type', 'Audiobook%')
        .order('created_at', { ascending: false })
        .limit(10);
      if (abProds && abProds.length > 0) setAudiobooks(abProds);

      // Featured Artists — verified, ordered by stream count; falls back to mock below
      const { data: liveArtists } = await supabase
        .from('artists')
        .select('name, genre, slug, streams_count, country_code, verified')
        .order('streams_count', { ascending: false })
        .limit(6);
      if (liveArtists && liveArtists.length > 0) setFeaturedArtists(liveArtists);

      // Top Creators This Week — top 3 by XP, enriched with artist name
      const { data: liveCreators } = await supabase
        .from('creator_levels')
        .select('user_id, level, xp')
        .order('xp', { ascending: false })
        .limit(3);
      if (liveCreators && liveCreators.length > 0) {
        const uids = liveCreators.map((c: any) => c.user_id);
        const { data: artistNames } = await supabase
          .from('artists')
          .select('user_id, name')
          .in('user_id', uids);
        const nameMap = Object.fromEntries((artistNames ?? []).map((a: any) => [a.user_id, a.name]));
        setTopCreators(liveCreators.map((c: any) => ({ ...c, name: nameMap[c.user_id] ?? 'Creator' })));
      }

      // Seed live vote counter with real total
      const { count: voteCount } = await supabase
        .from('competition_votes')
        .select('id', { count: 'exact', head: true });
      if (voteCount !== null) setLiveVotes(voteCount);

      // Real tracks distributed count
      const { count: distCount } = await supabase
        .from('distribution_releases')
        .select('id', { count: 'exact', head: true })
        .in('status', ['live', 'distributed', 'sent_to_ditto', 'submitted_to_ditto', 'approved', 'approved_for_distribution']);
      if (distCount !== null) setTracksDistributed(distCount);

      // Top product stream count for featured card
      const { data: topProduct } = await supabase
        .from('ecom_products')
        .select('stream_count')
        .eq('status', 'active')
        .order('stream_count', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (topProduct?.stream_count != null) setViewCount(topProduct.stream_count);

      setLoading(false);
      } catch {
        setLoading(false);
      }
    };
    fetchData();

    // Realtime: live vote counter for Talent Winner card
    let voteChannel: ReturnType<typeof supabase.channel> | null = null;
    try {
      voteChannel = supabase
        .channel('homepage-votes')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'competition_votes' }, () => {
          setLiveVotes(v => v + 1);
        })
        .subscribe();
    } catch { /* silent — Supabase not configured */ }

    return () => { if (voteChannel) supabase.removeChannel(voteChannel); };
  }, []);

  const contentCollections = collections.filter(c => ['music', 'videos', 'books', 'podcasts'].includes(c.handle));

  const getCollectionIcon = (handle: string) => {
    switch (handle) {
      case 'music': return <Music className="w-8 h-8" />;
      case 'videos': return <Video className="w-8 h-8" />;
      case 'books': return <BookOpen className="w-8 h-8" />;
      case 'podcasts': return <Mic className="w-8 h-8" />;
      default: return <Zap className="w-8 h-8" />;
    }
  };

  const getCollectionGradient = (handle: string) => {
    switch (handle) {
      case 'music': return 'from-[#9D4EDD] to-[#00D9FF]';
      case 'videos': return 'from-[#00D9FF] to-[#00F5A0]';
      case 'books': return 'from-[#FFB800] to-[#FF6B00]';
      case 'podcasts': return 'from-[#FF006E] to-[#9D4EDD]';
      default: return 'from-[#00D9FF] to-[#9D4EDD]';
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0814] pb-20">
      <Header />

      {/* ── 1. HERO ──────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-[#0B0814]">
        {/* Hero band — image confined here (not the stats area) */}
        <div className="relative min-h-[560px] lg:min-h-[620px] flex items-center">
          {/* Hero image on the right — cover crops the black frame; edges feathered into the bg */}
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-full lg:w-[54%] h-[440px] lg:h-[520px] pointer-events-none select-none">
            <img
              src="/wankong.png"
              alt="WANKONG — Create, Distribute, Get Paid"
              className="w-full h-full object-cover object-[56%_50%]"
              loading="eager"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0B0814] via-transparent to-transparent" />
            <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[#0B0814] to-transparent" />
            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#0B0814] to-transparent" />
          </div>

          <div className="relative max-w-7xl mx-auto w-full px-4 pt-12 pb-10 md:pt-16">
            <div className="max-w-xl">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full mb-6 backdrop-blur-sm">
                <div className="w-2 h-2 bg-[#9D4EDD] rounded-full animate-pulse shadow-[0_0_8px_#9D4EDD]" />
                <span className="text-white/80 text-sm font-medium">The Global Creator Economy</span>
              </div>
              <h1 className="text-5xl md:text-7xl font-black text-white leading-[1.04] mb-6">
                Create. Distribute.
                <br />
                <span className="bg-gradient-to-r from-[#00D9FF] via-[#9D4EDD] to-[#FF4D9D] bg-clip-text text-transparent">
                  Get Paid.
                </span>
              </h1>
              <p className="text-lg md:text-xl text-white/60 mb-8 max-w-lg">
                The ultimate platform for creators to upload, distribute and monetize music, videos, books, audiobooks and more.
              </p>

              {/* Feature row */}
              <div className="flex flex-wrap gap-x-7 gap-y-3 mb-9">
                {[
                  { icon: Globe, label: '30+ Platforms', color: '#00D9FF' },
                  { icon: ShieldCheck, label: '100% Ownership', color: '#00F5A0' },
                  { icon: BarChart3, label: 'Real-time Analytics', color: '#9D4EDD' },
                  { icon: CreditCard, label: 'Global Payments', color: '#FFB800' },
                ].map(({ icon: Icon, label, color }) => (
                  <div key={label} className="flex items-center gap-2 text-white/75 text-sm font-medium">
                    <Icon className="w-4 h-4" style={{ color }} />
                    {label}
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-4">
                <button
                  onClick={() => navigate('/collections/featured')}
                  className="px-7 py-3.5 bg-gradient-to-r from-[#9D4EDD] to-[#6D2EBD] text-white font-bold rounded-xl hover:opacity-90 transition-all transform hover:scale-[1.03] flex items-center gap-2 shadow-lg shadow-[#9D4EDD]/30"
                >
                  Start Creating Now
                  <ArrowRight className="w-5 h-5" />
                </button>
                <button
                  onClick={() => navigate('/collections/marketplace')}
                  className="px-7 py-3.5 bg-white/[0.06] border border-white/15 text-white font-bold rounded-xl hover:bg-white/10 transition-all flex items-center gap-2"
                >
                  <Play className="w-5 h-5 text-[#9D4EDD]" />
                  Explore the Platform
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Stats — single bordered card, icon-left */}
        <div className="relative max-w-7xl mx-auto px-4 pb-14">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm grid grid-cols-2 md:grid-cols-4 divide-y divide-white/10 md:divide-y-0 md:divide-x">
            {[
              { icon: Users, label: 'Active Creators', value: '12,500+', color: '#00D9FF' },
              { icon: Globe, label: 'Countries', value: '140+', color: '#9D4EDD' },
              { icon: DollarSign, label: 'Creator Payouts', value: '$2.8M+', color: '#00F5A0' },
              { icon: TrendingUp, label: 'Monthly Streams', value: '45M+', color: '#FFB800' },
            ].map((stat, i) => (
              <div key={i} className="flex items-center gap-4 p-5 md:p-6">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${stat.color}1A` }}>
                  <stat.icon className="w-5 h-5" style={{ color: stat.color }} />
                </div>
                <div className="min-w-0">
                  <p className="text-2xl md:text-3xl font-black text-white leading-none mb-1">{stat.value}</p>
                  <p className="text-white/40 text-sm truncate">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PERSONALIZED SECTIONS (for you / follow feed / trending genre) ── */}
      <SectionErrorBoundary>
        <PersonalizedSections />
      </SectionErrorBoundary>

      {/* ── 2. MUSIC BY LANGUAGE — FLAGSHIP DISCOVERY ──────────────────────── */}
      <section className="py-12 relative overflow-hidden border-t border-white/5">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(157,78,221,0.07),transparent_70%)]" />
        <div className="relative max-w-7xl mx-auto px-4">

          {/* Header + toggle */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-7">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#9D4EDD]/10 border border-[#9D4EDD]/20 rounded-full text-[#9D4EDD] text-xs font-semibold">
                  <Globe className="w-3 h-3" /> Music by Language
                </div>
                <Equalizer color="#9D4EDD" bars={26} className="w-28 hidden sm:flex opacity-60 h-5" />
              </div>
              <h2 className="text-2xl md:text-3xl font-black text-white mb-1">
                {langMode === 'region' ? 'Music Near You' : 'Global Music Discovery'}
              </h2>
              <p className="text-white/40 text-sm">
                {langMode === 'region'
                  ? 'Prioritised for your region — tap any language to explore'
                  : 'Browse music from every culture worldwide 🌍'}
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {/* Region / Global toggle pill */}
              <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-full p-1">
                <button
                  onClick={() => setLangMode('region')}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${langMode === 'region' ? 'bg-white text-[#0B0814] shadow-lg' : 'text-white/40 hover:text-white/70'}`}
                >
                  My Region
                </button>
                <button
                  onClick={() => setLangMode('global')}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${langMode === 'global' ? 'bg-white text-[#0B0814] shadow-lg' : 'text-white/40 hover:text-white/70'}`}
                >
                  Global
                </button>
              </div>
              {/* Carousel arrows */}
              <div className="hidden sm:flex items-center gap-1.5">
                <button onClick={() => scrollRow(langScrollRef, 'left')} aria-label="Scroll left" className="w-9 h-9 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/70 transition-colors">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button onClick={() => scrollRow(langScrollRef, 'right')} aria-label="Scroll right" className="w-9 h-9 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/70 transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Language cards — horizontal scroll */}
          <div
            ref={langScrollRef}
            className="flex gap-3 overflow-x-auto pb-3 snap-x [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
          >
            {(langMode === 'region' ? priorityLanguages : ALL_LANGUAGES.slice(0, 11)).map(({ lang, flag, desc }, i) => (
              <Link
                key={lang}
                to={`/music/language/${lang.toLowerCase()}`}
                className="group shrink-0 w-44 snap-start bg-[#0D1635] border border-white/8 hover:border-[#9D4EDD]/50 hover:bg-[#9D4EDD]/8 rounded-2xl p-4 transition-all duration-200"
              >
                <div className="flex items-center gap-3 mb-3.5">
                  <div className="w-11 h-11 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-2xl leading-none shrink-0">
                    {flag}
                  </div>
                  <div className="min-w-0">
                    <p className="text-white font-bold text-sm leading-tight truncate">{lang}</p>
                    <p className="text-white/40 text-xs truncate">{desc || 'Worldwide'}</p>
                  </div>
                </div>
                <Equalizer color={i % 2 === 0 ? '#00F5A0' : '#00D9FF'} bars={16} className="opacity-80 group-hover:opacity-100 transition-opacity" />
              </Link>
            ))}
            {/* All Languages card */}
            <Link
              to="/collections/music"
              className="shrink-0 w-44 snap-start flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-[#9D4EDD]/25 to-[#00D9FF]/15 border border-[#9D4EDD]/40 hover:border-[#9D4EDD]/70 rounded-2xl p-4 transition-all"
            >
              <div className="w-11 h-11 rounded-full bg-white/10 flex items-center justify-center">
                <Globe className="w-6 h-6 text-white" />
              </div>
              <p className="text-white font-bold text-sm">All Languages</p>
              <p className="text-white/60 text-xs">Explore All</p>
            </Link>
          </div>

          {/* Browse CTA */}
          <div className="text-center mt-7">
            <Link
              to="/collections/music"
              className="inline-flex items-center gap-2 px-7 py-3 bg-gradient-to-r from-[#9D4EDD] to-[#00D9FF] text-white text-sm font-bold rounded-xl hover:opacity-90 transition-all shadow-lg shadow-[#9D4EDD]/20"
            >
              Browse Free Music <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Trending Now — Creator Dashboard ─────────────────────────────── */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-gradient-to-br from-[#FFB800] to-[#FF6B00] rounded-xl flex items-center justify-center shadow-lg shadow-[#FFB800]/25">
                <Zap className="w-5 h-5 text-white fill-white" />
              </div>
              <div>
                <h2 className="text-2xl md:text-3xl font-black text-white">Trending Now</h2>
                <p className="text-white/40 text-sm">What's hot on WANKONG this week</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link to="/collections/featured" className="text-[#00D9FF] hover:text-[#00D9FF]/80 text-sm font-semibold flex items-center gap-1">
                View All <ArrowRight className="w-4 h-4" />
              </Link>
              <div className="hidden sm:flex items-center gap-2">
                <button onClick={() => scrollRow(trendScrollRef, 'left')} aria-label="Previous" className="w-9 h-9 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 transition-colors"><ChevronLeft className="w-4 h-4" /></button>
                <button onClick={() => scrollRow(trendScrollRef, 'right')} aria-label="Next" className="w-9 h-9 rounded-full border border-[#9D4EDD]/60 bg-[#9D4EDD]/10 hover:bg-[#9D4EDD]/20 flex items-center justify-center text-white transition-colors"><ArrowRight className="w-4 h-4" /></button>
              </div>
            </div>
          </div>

          <div ref={trendScrollRef} className="grid grid-cols-2 lg:grid-cols-6 gap-4">

            {/* 1. LIVE */}
            <div className="group rounded-2xl overflow-hidden border border-white/10 bg-[#0D1635] flex flex-col hover:-translate-y-1 hover:border-white/20 transition-all duration-300">
              <div className="relative aspect-[16/11] bg-gradient-to-br from-[#3a2033] to-[#0B0814]">
                <img src={ARTIST_IMAGES[2]} alt="" className="absolute inset-0 w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0D1635] via-transparent to-transparent" />
                <span className="absolute top-2.5 left-2.5 inline-flex items-center gap-1 px-2 py-0.5 bg-red-500 text-white text-[10px] font-black rounded-full">
                  <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" /> LIVE
                </span>
                <button className="absolute left-3 bottom-3 w-10 h-10 rounded-full bg-black/40 backdrop-blur border border-white/30 flex items-center justify-center text-white hover:bg-black/60 transition-colors">
                  <Play className="w-4 h-4 fill-current ml-0.5" />
                </button>
              </div>
              <div className="p-3.5 flex-1 flex flex-col">
                <p className="text-white font-bold text-sm leading-tight">Live Performance</p>
                <p className="text-white/50 text-xs mb-3">Afro Soul Session</p>
                <div className="flex items-center justify-between mt-auto">
                  <div className="flex items-center gap-2">
                    <AvatarStack />
                    <span className="text-white/60 text-xs">12.4K watching</span>
                  </div>
                  <Equalizer color="#FF3B6B" bars={4} className="w-5 !h-4" />
                </div>
              </div>
            </div>

            {/* 2. NEW RELEASE */}
            <div className="group rounded-2xl overflow-hidden border border-white/10 bg-[#0D1635] flex flex-col hover:-translate-y-1 hover:border-white/20 transition-all duration-300">
              <div className="relative aspect-[16/11] bg-gradient-to-br from-[#1a2a4a] to-[#070b16] flex items-center justify-center">
                <span className="absolute top-2.5 left-2.5 px-2 py-0.5 bg-[#9D4EDD] text-white text-[10px] font-black rounded-full">NEW RELEASE</span>
                <div className="text-center px-2">
                  <p className="text-white/90 font-black text-base tracking-widest leading-none">ECHOES</p>
                  <p className="text-[#00D9FF] font-bold text-[9px] tracking-[0.25em] mt-1">THE JOURNEY</p>
                </div>
                <button className="absolute left-3 bottom-3 w-10 h-10 rounded-full bg-black/40 backdrop-blur border border-white/30 flex items-center justify-center text-white hover:bg-black/60 transition-colors">
                  <Play className="w-4 h-4 fill-current ml-0.5" />
                </button>
              </div>
              <div className="p-3.5 flex-1 flex flex-col">
                <p className="text-white font-bold text-sm leading-tight">Echoes: The Journey</p>
                <p className="text-white/50 text-xs mb-3">by Skyline Beats</p>
                <div className="flex items-center justify-between mt-auto text-xs">
                  <span className="flex items-center gap-1.5">
                    <span className="flex items-center gap-1 text-[#FFB800]"><Star className="w-3.5 h-3.5 fill-current" /> 4.9</span>
                    <span className="text-white/30">·</span>
                    <span className="text-[#00D9FF]">8.7K Streams</span>
                  </span>
                  <button className="text-white/30 hover:text-white transition-colors"><MoreVertical className="w-4 h-4" /></button>
                </div>
              </div>
            </div>

            {/* 3. NOW PLAYING — wide player */}
            <div className="col-span-2 rounded-2xl border border-white/10 bg-gradient-to-br from-[#1a1230] via-[#15103a] to-[#0D1635] p-4 flex flex-col">
              <span className="self-start inline-flex items-center gap-1.5 px-2.5 py-1 bg-white/10 text-white text-[10px] font-black rounded-full mb-3">
                <SlidersHorizontal className="w-3 h-3" /> NOW PLAYING
              </span>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#9D4EDD] to-[#3a1d6e] flex items-center justify-center shrink-0 shadow-lg">
                  <Music className="w-5 h-5 text-white/80" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-white font-black text-base leading-tight truncate">Holy Ground</p>
                  <p className="text-white/60 text-sm truncate">Grace Adele</p>
                </div>
                <button className="text-white/40 hover:text-[#FF3B6B] transition-colors"><Heart className="w-5 h-5" /></button>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-white/60 mb-3.5">
                <span>02:18</span>
                <div className="flex-1 h-1 bg-white/15 rounded-full overflow-hidden">
                  <div className="h-full w-1/2 bg-gradient-to-r from-[#9D4EDD] to-[#00D9FF] rounded-full" />
                </div>
                <span>04:36</span>
              </div>
              <Equalizer color="#9D4EDD" bars={44} className="opacity-80 !h-8 mb-4" />
              <div className="flex items-center justify-center gap-6 text-white/60">
                <button className="hover:text-white transition-colors"><Shuffle className="w-4 h-4" /></button>
                <button className="hover:text-white transition-colors"><SkipBack className="w-5 h-5 fill-current" /></button>
                <button className="w-12 h-12 rounded-full border-2 border-[#9D4EDD] flex items-center justify-center text-white hover:bg-[#9D4EDD]/20 transition-colors"><Pause className="w-5 h-5 fill-current" /></button>
                <button className="hover:text-white transition-colors"><SkipForward className="w-5 h-5 fill-current" /></button>
                <button className="hover:text-white transition-colors"><Repeat className="w-4 h-4" /></button>
              </div>
            </div>

            {/* 4. TOP ALBUM */}
            <div className="group rounded-2xl overflow-hidden border border-white/10 bg-[#0D1635] flex flex-col hover:-translate-y-1 hover:border-white/20 transition-all duration-300">
              <div className="relative aspect-[16/11] bg-gradient-to-br from-[#2a2548] to-[#0B0814]">
                <img src={ARTIST_IMAGES[0]} alt="" className="absolute inset-0 w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0D1635] via-transparent to-transparent" />
                <span className="absolute top-2.5 left-2.5 px-2 py-0.5 bg-gradient-to-r from-[#FFB800] to-[#FF6B00] text-white text-[10px] font-black rounded-full">TOP ALBUM</span>
                <button className="absolute left-3 bottom-3 w-10 h-10 rounded-full bg-black/40 backdrop-blur border border-white/30 flex items-center justify-center text-white hover:bg-black/60 transition-colors">
                  <Play className="w-4 h-4 fill-current ml-0.5" />
                </button>
              </div>
              <div className="p-3.5 flex-1 flex flex-col">
                <p className="text-white font-bold text-sm leading-tight">Midnight Dreams</p>
                <p className="text-white/50 text-xs mb-3">by Jayden Morris</p>
                <div className="flex items-center justify-between mt-auto text-xs">
                  <span className="flex items-center gap-1.5">
                    <span className="flex items-center gap-1 text-[#FFB800]"><Star className="w-3.5 h-3.5 fill-current" /> 4.8</span>
                    <span className="text-white/30">·</span>
                    <span className="text-[#00D9FF]">15.2K Streams</span>
                  </span>
                  <button className="text-white/30 hover:text-white transition-colors"><MoreVertical className="w-4 h-4" /></button>
                </div>
              </div>
            </div>

            {/* 5. TRENDING PODCAST */}
            <div className="group rounded-2xl overflow-hidden border border-white/10 bg-[#0D1635] flex flex-col hover:-translate-y-1 hover:border-white/20 transition-all duration-300">
              <div className="relative aspect-[16/11] bg-gradient-to-br from-[#2a1d4a] to-[#0B0814] flex items-center justify-center overflow-hidden">
                <Equalizer color="#9D4EDD" bars={22} className="absolute inset-x-3 bottom-2 opacity-40 !h-10" />
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#9D4EDD] to-[#00D9FF] flex items-center justify-center relative z-10 shadow-lg">
                  <Mic className="w-6 h-6 text-white" />
                </div>
                <span className="absolute top-2.5 left-2.5 px-2 py-0.5 bg-[#9D4EDD] text-white text-[10px] font-black rounded-full z-10">TRENDING PODCAST</span>
                <button className="absolute left-3 bottom-3 w-10 h-10 rounded-full bg-black/40 backdrop-blur border border-white/30 flex items-center justify-center text-white hover:bg-black/60 transition-colors z-10">
                  <Play className="w-4 h-4 fill-current ml-0.5" />
                </button>
              </div>
              <div className="p-3.5 flex-1 flex flex-col">
                <p className="text-white font-bold text-sm leading-tight">The Creator's Journey</p>
                <p className="text-white/50 text-xs mb-3">With WANKONG Studios</p>
                <div className="flex items-center justify-between mt-auto">
                  <div className="flex items-center gap-2">
                    <AvatarStack />
                    <span className="text-white/60 text-xs">6.3K Listeners</span>
                  </div>
                  <button className="text-white/30 hover:text-white transition-colors"><MoreVertical className="w-4 h-4" /></button>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Video Modal */}
      {videoModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setVideoModalOpen(false)}>
          <div className="relative w-full max-w-3xl bg-[#0D1635] rounded-2xl overflow-hidden border border-white/10" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <span className="text-white font-semibold text-sm">Featured Global Release · WANKONG</span>
              <button onClick={() => setVideoModalOpen(false)} className="text-white/40 hover:text-white text-xl leading-none transition-colors">✕</button>
            </div>
            <div className="relative bg-black" style={{ paddingBottom: '56.25%' }}>
              <video
                className="absolute inset-0 w-full h-full object-cover"
                poster={ARTIST_IMAGES[1]}
                controls
                autoPlay
                muted
                loop
                playsInline
              />
            </div>
            <div className="p-4 flex items-center justify-between">
              <div>
                <p className="text-white font-bold text-sm">Meta Dreams</p>
                <p className="text-white/40 text-xs">Grace Adele · Manifesto EP</p>
              </div>
              <Link to="/talent-arena" onClick={() => setVideoModalOpen(false)} className="px-4 py-2 bg-gradient-to-r from-[#FFB800] to-[#FF6B00] text-black font-bold text-xs rounded-xl hover:opacity-90 transition-opacity">
                Vote in Competition →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ── 4. NEW RELEASES — HORIZONTAL CAROUSEL ─────────────────────── */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-500/15 rounded-xl flex items-center justify-center">
                <Radio className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">New Releases</h2>
                <p className="text-white/40 text-sm">Fresh content just dropped</p>
              </div>
            </div>
            <Link to="/collections/music" className="text-[#00D9FF] hover:text-[#00D9FF]/80 text-sm font-medium flex items-center gap-1">
              View All <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-3 -mx-4 px-4" style={{ scrollbarWidth: 'none' }}>
            {(newReleases.length ? newReleases : MOCK_NEW_RELEASES).map((product: any) => (
              <div key={product.id} className="shrink-0 w-[200px]">
                <ProductCard product={product} variant="square" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 5. FEATURED CREATORS ──────────────────────────────────────── */}
      <section className="py-12 bg-[#0D1535]">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-violet-500/10 rounded-xl flex items-center justify-center">
                <span className="text-violet-400 text-lg">★</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Featured Creators</h2>
                <p className="text-white/40 text-xs">Verified artists on WANKONG</p>
              </div>
            </div>
            <Link to="/collections/music" className="text-[#00D9FF] text-sm hover:underline">See All</Link>
          </div>
          <div className="flex gap-5 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
            {(featuredArtists.length ? featuredArtists : MOCK_ARTISTS).map((artist: any, i: number) => {
              const GRADIENTS = ['from-violet-600 to-cyan-500','from-violet-700 to-indigo-500','from-emerald-500 to-cyan-500','from-cyan-600 to-violet-600','from-indigo-500 to-violet-600','from-violet-500 to-cyan-600'];
              let flag = '🌍';
              try {
                if (artist.country_code && /^[A-Z]{2}$/i.test(artist.country_code)) {
                  flag = String.fromCodePoint(...[...artist.country_code.toUpperCase()].map((c: string) => 127397 + c.charCodeAt(0)));
                }
              } catch { /* keep default */ }
              const streams = artist.streams_count >= 1000000
                ? `${(artist.streams_count / 1000000).toFixed(1)}M`
                : artist.streams_count >= 1000 ? `${Math.round(artist.streams_count / 1000)}K` : String(artist.streams_count ?? 0);
              return (
                <Link key={artist.slug ?? artist.name} to={`/artists/${artist.slug ?? artist.name.toLowerCase().replace(/\s+/g, '-')}`} className="shrink-0 w-36 group text-center">
                  <div className={`w-24 h-24 mx-auto rounded-full bg-gradient-to-br ${GRADIENTS[i % GRADIENTS.length]} flex items-center justify-center mb-3 group-hover:scale-[1.04] transition-transform shadow-lg shadow-black/40 border border-white/10`}>
                    <span className="text-3xl">{flag}</span>
                  </div>
                  <p className="text-white text-sm font-semibold truncate">{artist.name}</p>
                  <p className="text-cyan-400 text-xs">{artist.genre}</p>
                  <p className="text-white/30 text-xs">{streams} streams</p>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── 6. FEATURED PERFORMANCES ──────────────────────────────────── */}
      <SectionErrorBoundary><FeaturedPerformancesGrid /></SectionErrorBoundary>

      {/* ── 7. TRENDING BOOKS ─────────────────────────────────────────── */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-500/15 rounded-xl flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-white">Trending Books</h2>
                <p className="text-white/40 text-sm">Top reads in the community this week</p>
              </div>
            </div>
            <Link to="/collections/books" className="text-amber-400 hover:text-amber-300 text-sm font-medium flex items-center gap-1 transition-colors">
              See All <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-5 mb-8">
            {(trendingBooks.length ? trendingBooks : MOCK_BOOKS).slice(0, 10).map((product: any) => (
              <ProductCard key={product.id} product={product} variant="portrait" />
            ))}
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
            {['All', 'Devotional', 'Christian Living', 'Worship', 'Business', 'Prophecy', 'Parenting', 'Healing'].map(genre => (
              <Link
                key={genre}
                to={genre === 'All' ? '/collections/books' : `/collections/books?genre=${genre.toLowerCase().replace(/ /g, '-')}`}
                className="shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-all border-white/10 bg-white/5 text-white/50 hover:border-amber-400/40 hover:bg-amber-400/10 hover:text-amber-400"
              >
                {genre}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── 8. AUDIOBOOKS ─────────────────────────────────────────────── */}
      <section className="py-12 bg-[#0D1535]">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-orange-500/10 rounded-xl flex items-center justify-center">
                <Headphones className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Audiobooks</h2>
                <p className="text-white/40 text-xs">Listen while you move</p>
              </div>
            </div>
            <Link to="/collections/audiobooks" className="text-[#00D9FF] text-sm hover:underline">See All</Link>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-3" style={{ scrollbarWidth: 'none' }}>
            {(audiobooks.length ? audiobooks : MOCK_AUDIOBOOKS).map((product: any) => (
              <div key={product.id} className="shrink-0 w-[200px]">
                <ProductCard product={product} variant="square" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 9. COMPETITION LEADERBOARD ────────────────────────────────── */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-[#FFB800]/10 rounded-xl flex items-center justify-center">
                <Trophy className="w-5 h-5 text-[#FFB800]" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Top Creators This Week</h2>
                <p className="text-white/40 text-xs">Ranked by earnings &amp; engagement</p>
              </div>
            </div>
            <Link to="/dashboard/earnings" className="text-[#00D9FF] text-sm hover:underline">Leaderboard</Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(topCreators.length ? topCreators : MOCK_TOP_CREATORS).map((creator: any, i: number) => {
              const LEVEL_COLORS: Record<string, string> = { Bronze: '#CD7F32', Silver: '#C0C0C0', Gold: '#FFB800', Platinum: '#E5E4E2', Diamond: '#00D9FF', 'Global Ambassador': '#9D4EDD' };
              const BADGES = ['👑', '💎', '⭐'];
              const color = LEVEL_COLORS[creator.level] ?? '#FFB800';
              return (
                <div key={creator.user_id ?? creator.name ?? i} className="flex items-center gap-4 bg-white/5 rounded-xl p-4 hover:bg-white/8 transition-all border border-white/8 shadow-md shadow-black/30">
                  <span className="text-2xl font-black" style={{ color }}>#{i + 1}</span>
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center text-lg shrink-0">{BADGES[i] ?? '🌟'}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm truncate">{creator.name ?? 'Creator'}</p>
                    <p className="text-white/40 text-xs">{creator.level}</p>
                  </div>
                  <span className="text-emerald-400 font-bold text-sm shrink-0">{(creator.xp ?? 0).toLocaleString()} XP</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── 10. PLATFORM STATS — SLIM STRIP ───────────────────────────── */}
      <div className="border-t border-b border-white/5 bg-[#080e22] py-5">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2">
            {STATS.map((stat, i) => (
              <span key={i} className="flex items-center gap-2 text-sm">
                <stat.icon className="w-4 h-4 shrink-0" style={{ color: stat.color }} />
                <span className="text-white font-bold">{stat.value}</span>
                <span className="text-white/35">{stat.label}</span>
                {i < STATS.length - 1 && <span className="hidden lg:inline text-white/10 pl-4">•</span>}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── 11. DISTRIBUTION CTA ──────────────────────────────────────── */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#00D9FF]/10 border border-[#00D9FF]/30 rounded-full mb-4">
              <Headphones className="w-4 h-4 text-[#00D9FF]" />
              <span className="text-[#00D9FF] text-sm font-semibold">Music Distribution</span>
            </div>
            <h2 className="text-4xl font-black text-white mb-4">
              Distribute to <span className="text-[#00D9FF]">30+ Platforms</span>
            </h2>
            <p className="text-white/50 max-w-2xl mx-auto">
              Upload once, distribute everywhere. Your music on Spotify, Apple Music, TikTok, and 27+ more platforms. Track royalties in real-time.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-3 mb-8">
            {DISTRIBUTION_PLATFORMS.map((platform, i) => (
              <div key={i} className="px-4 py-2 bg-white/5 border border-white/8 rounded-full text-white/40 text-sm hover:bg-white/10 hover:text-white hover:border-[#00D9FF]/30 transition-all cursor-default">
                {platform}
              </div>
            ))}
          </div>
          <div className="text-center">
            <Link to="/upload/distribute" className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-[#00D9FF] to-[#9D4EDD] text-white font-bold rounded-xl hover:opacity-90 transition-all hover:scale-105">
              Start Distributing <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── 12. CREATOR UPLOAD CTA ────────────────────────────────────── */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#00D9FF]/8 to-[#9D4EDD]/8 border border-white/8 p-8 md:p-16 text-center">
            <div className="absolute inset-0 opacity-40" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(0,217,255,0.07) 0%, transparent 50%), radial-gradient(circle at 80% 50%, rgba(157,78,221,0.07) 0%, transparent 50%)' }} />
            <div className="relative">
              <h2 className="text-4xl md:text-5xl font-black text-white mb-4">
                Ready to <span className="bg-gradient-to-r from-[#00D9FF] to-[#FFB800] bg-clip-text text-transparent">Monetize</span> Your Creativity?
              </h2>
              <p className="text-white/50 text-lg mb-8 max-w-2xl mx-auto">
                Join 12,500+ creators earning from their content. Upload books, music, videos, and podcasts. Get paid through Stripe or Mobile Money.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <button onClick={() => navigate('/upload/distribute')} className="px-8 py-4 bg-gradient-to-r from-[#00D9FF] to-[#9D4EDD] text-white font-bold rounded-xl hover:opacity-90 transition-all hover:scale-105">
                  Start Distributing
                </button>
                <button onClick={() => navigate('/book-upload')} className="px-8 py-4 bg-white/8 border border-white/15 text-white font-bold rounded-xl hover:bg-white/15 transition-all">
                  Upload a Book
                </button>
                <button onClick={() => navigate('/talent-arena')} className="px-8 py-4 bg-white/8 border border-white/15 text-white font-bold rounded-xl hover:bg-white/15 transition-all flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-[#FFB800]" /> Join Talent Arena
                </button>
              </div>
              <div className="mt-8 flex flex-wrap justify-center gap-6 text-white/25 text-sm">
                <span>70% Creator Revenue</span><span>•</span>
                <span>Instant Digital Delivery</span><span>•</span>
                <span>Global Payouts</span><span>•</span>
                <span>Mobile Money Support</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Recently Played (from GlobalPlayer history) ───────────── */}
      {recentlyPlayed.length > 0 && (
        <section className="py-12">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-white/5 rounded-xl flex items-center justify-center">
                  <Clock className="w-4 h-4 text-white/40" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Recently Played</h2>
                  <p className="text-white/30 text-xs">Pick up where you left off</p>
                </div>
              </div>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
              {recentlyPlayed.map(track => {
                const art = track.albumArt || track.cover || '';
                return (
                  <button
                    key={track.id}
                    onClick={() => playerPlay(track)}
                    className="shrink-0 w-36 text-left group hover:bg-white/5 rounded-xl p-2 transition-colors"
                  >
                    <div className="relative w-full aspect-square rounded-lg overflow-hidden mb-2 bg-white/5">
                      {art
                        ? <img src={art} alt={track.title} className="w-full h-full object-cover" />
                        : <div className="w-full h-full bg-gradient-to-br from-[#9D4EDD] to-[#00D9FF] flex items-center justify-center"><Music className="w-8 h-8 text-white/30" /></div>}
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#00D9FF] to-[#9D4EDD] flex items-center justify-center shadow-lg">
                          <Play className="w-4 h-4 text-white fill-white ml-0.5" />
                        </div>
                      </div>
                    </div>
                    <p className="text-white text-xs font-semibold truncate">{track.title}</p>
                    <p className="text-white/40 text-[10px] truncate">{track.artist}</p>
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      )}

      <Footer />
    </div>
  );
}
