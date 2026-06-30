import { useState, useEffect, useRef, Component, ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import Header from './Header';
import Footer from './Footer';
import ProductCard from './ProductCard';
import { Play, Pause, Zap, Music, BookOpen, Video, Mic, Trophy, Globe, Users, DollarSign, TrendingUp, ArrowRight, Headphones, Radio, Star, ChevronRight, ChevronLeft, Clock, ShieldCheck, BarChart3, CreditCard, MoreVertical, Heart, Shuffle, SkipBack, SkipForward, Repeat, SlidersHorizontal, Megaphone, Palette, Scissors, Wand2, Quote } from 'lucide-react';
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
  { id: 'nr1', image: '/covers/nr1.svg', handle: 'heaven-gates',   title: 'Heaven Gates',   vendor: 'Prophet Elijah', product_type: 'Music', price: 0,    genre: 'Gospel' },
  { id: 'nr2', image: '/covers/nr2.svg', handle: 'afro-vibration', title: 'Afro Vibration', vendor: 'Kojo Mensah',    product_type: 'Music', price: 199,  genre: 'Afrobeats' },
  { id: 'nr3', image: '/covers/nr3.svg', handle: 'midnight-jazz',  title: 'Midnight Jazz',  vendor: 'Adaeze Obi',     product_type: 'Music', price: 299,  genre: 'Jazz' },
  { id: 'nr4', image: '/covers/nr4.svg', handle: 'street-gospel',  title: 'Street Gospel',  vendor: 'MC Zion',        product_type: 'Music', price: 0,    genre: 'Hip-Hop' },
  { id: 'nr5', image: '/covers/nr5.svg', handle: 'lagos-nights',   title: 'Lagos Nights',   vendor: 'Funmi Adeyemi',  product_type: 'Music', price: 149,  genre: 'RnB' },
  { id: 'nr6', image: '/covers/nr6.svg', handle: 'electric-soul',  title: 'Electric Soul',  vendor: 'DJ Beacon',      product_type: 'Music', price: 249,  genre: 'EDM' },
  { id: 'nr7', image: '/covers/nr7.svg', handle: 'yoruba-praise',  title: 'Yoruba Praise',  vendor: 'Sis. Busayo',    product_type: 'Music', price: 0,    genre: 'Gospel' },
  { id: 'nr8', image: '/covers/nr8.svg', handle: 'highlife-remix', title: 'Highlife Remix', vendor: 'Kwame Asante',   product_type: 'Music', price: 0,    genre: 'Highlife' },
];

const MOCK_BOOKS = [
  { id: 'bk1', image: '/covers/bk1.svg', handle: 'gospel-of-grace',      title: 'The Gospel of Grace',       author: 'Pastor E. Ofori',     product_type: 'Book', price: 1299, genre: 'Christian Living' },
  { id: 'bk2', image: '/covers/bk2.svg', handle: 'kingdom-business',     title: 'Kingdom Business Secrets',  author: 'Dr. Faith Mensah',    product_type: 'Book', price: 1899, genre: 'Business' },
  { id: 'bk3', image: '/covers/bk3.svg', handle: 'midnight-prayers',     title: 'Midnight Prayers',          author: 'Rev. Samuel Asante',  product_type: 'Book', price: 999,  genre: 'Devotional' },
  { id: 'bk4', image: '/covers/bk4.svg', handle: 'praise-anthology',     title: 'African Praise Anthology',  author: 'Various Authors',     product_type: 'Book', price: 2499, genre: 'Worship' },
  { id: 'bk5', image: '/covers/bk5.svg', handle: 'prophetic-voice',      title: 'The Prophetic Voice',       author: 'Apostle Grace Oduya', product_type: 'Book', price: 1599, genre: 'Prophecy' },
  { id: 'bk6', image: '/covers/bk6.svg', handle: 'healing-wings',        title: 'Healing in His Wings',      author: 'Dr. Emmanuel Yaw',    product_type: 'Book', price: 1399, genre: 'Healing' },
  { id: 'bk7', image: '/covers/bk7.svg', handle: 'digital-christian',    title: 'The Digital Christian',     author: 'Tech Pastor Kwame',   product_type: 'Book', price: 1199, genre: 'Christian Living' },
  { id: 'bk8', image: '/covers/bk8.svg', handle: 'songs-of-ascent',      title: 'Songs of Ascent',          author: 'Choir Master David',  product_type: 'Book', price: 899,  genre: 'Worship' },
  { id: 'bk9', image: '/covers/bk9.svg', handle: 'raising-kingdom-kids', title: 'Raising Kingdom Kids',      author: 'Pastor Mary Adofo',   product_type: 'Book', price: 1699, genre: 'Parenting' },
  { id: 'bk10', image: '/covers/bk10.svg', handle: 'fast-breaks-chains',  title: 'The Fast That Breaks Chains', author: 'Bishop John Asare', product_type: 'Book', price: 1099, genre: 'Devotional' },
];

const MOCK_AUDIOBOOKS = [
  { id: 'ab1', image: '/covers/ab1.svg', handle: 'grace-audio',     title: 'The Gospel of Grace (Audio)', author: 'Pastor E. Ofori',    product_type: 'Audiobook', price: 1499, genre: 'Christian Living' },
  { id: 'ab2', image: '/covers/ab2.svg', handle: 'prayers-audio',   title: 'Midnight Prayers (Audio)',    author: 'Rev. Samuel Asante', product_type: 'Audiobook', price: 1199, genre: 'Devotional' },
  { id: 'ab3', image: '/covers/ab3.svg', handle: 'prophetic-audio', title: 'The Prophetic Voice (Audio)', author: 'Apostle Grace Oduya', product_type: 'Audiobook', price: 1799, genre: 'Prophecy' },
  { id: 'ab4', image: '/covers/ab4.svg', handle: 'kingdom-audio',   title: 'Kingdom Business (Audio)',    author: 'Dr. Faith Mensah',   product_type: 'Audiobook', price: 1999, genre: 'Business' },
  { id: 'ab5', image: '/covers/ab5.svg', handle: 'healing-audio',   title: 'Healing in His Wings (Audio)', author: 'Dr. Emmanuel Yaw',  product_type: 'Audiobook', price: 1599, genre: 'Healing' },
  { id: 'ab6', image: '/covers/ab6.svg', handle: 'ascent-audio',    title: 'Songs of Ascent (Audio)',     author: 'Choir Master David', product_type: 'Audiobook', price: 1299, genre: 'Worship' },
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

// ── Globe explorer: continents → languages ────────────────────────────────────
const CONTINENTS = [
  { key: 'Africa',   label: 'Africa',   emoji: '🌍' },
  { key: 'Europe',   label: 'Europe',   emoji: '🇪🇺' },
  { key: 'Asia',     label: 'Asia',     emoji: '🌏' },
  { key: 'Americas', label: 'Americas', emoji: '🌎' },
  { key: 'Global',   label: 'Global',   emoji: '🌐' },
] as const;
const CONTINENT_LANGS: Record<string, string[]> = {
  Africa:   ['Pidgin', 'Yoruba', 'Igbo', 'Hausa', 'Swahili', 'Zulu', 'Twi', 'Luganda', 'Bamumbu', 'Bamileke'],
  Europe:   ['English', 'French', 'Spanish', 'German', 'Norwegian', 'Swedish', 'Russian', 'Portuguese'],
  Asia:     ['Arabic', 'Chinese', 'Japanese'],
  Americas: ['English', 'Spanish', 'Portuguese'],
  Global:   ['English', 'French', 'Spanish', 'Arabic', 'Swahili', 'Yoruba', 'Portuguese', 'Chinese'],
};
function langsForContinent(key: string) {
  return (CONTINENT_LANGS[key] ?? CONTINENT_LANGS.Global)
    .map(n => ALL_LANGUAGES.find(l => l.lang === n))
    .filter(Boolean) as typeof ALL_LANGUAGES;
}
const CONTINENT_STATS: Record<string, { langs: number; songs: number; artists: number }> = {
  Global:   { langs: 52, songs: 8.2, artists: 420 },
  Africa:   { langs: 43, songs: 3.1, artists: 180 },
  Europe:   { langs: 24, songs: 2.4, artists: 110 },
  Asia:     { langs: 30, songs: 1.9, artists: 95 },
  Americas: { langs: 18, songs: 1.6, artists: 88 },
};

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

// ── Scroll-reveal + count-up ──────────────────────────────────────────────────
function Reveal({ children, className = '', delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') { setShown(true); return; }
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setShown(true); obs.disconnect(); } }, { threshold: 0.12 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`transition-all duration-700 ease-out ${shown ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'} ${className}`}
    >
      {children}
    </div>
  );
}

function CountUp({ to, prefix = '', suffix = '', decimals = 0, className = '' }: { to: number; prefix?: string; suffix?: string; decimals?: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [val, setVal] = useState(0);
  const started = useRef(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') { setVal(to); return; }
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !started.current) {
        started.current = true;
        const dur = 1600, t0 = performance.now();
        const tick = (t: number) => {
          const p = Math.min(1, (t - t0) / dur);
          setVal(to * (1 - Math.pow(1 - p, 3)));
          if (p < 1) requestAnimationFrame(tick); else setVal(to);
        };
        requestAnimationFrame(tick);
      }
    }, { threshold: 0.5 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [to]);
  const shown = val.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  return <span ref={ref} className={className}>{prefix}{shown}{suffix}</span>;
}

function LiveWave({ color, bars = 52 }: { color: string; bars?: number }) {
  return (
    <div className="flex items-end gap-[3px] h-full w-full" aria-hidden>
      {Array.from({ length: bars }).map((_, i) => (
        <span
          key={i}
          className="flex-1 rounded-full wk-eqbar"
          style={{ backgroundColor: color, animationDelay: `${(i % 13) * 0.07}s`, animationDuration: `${0.7 + (i % 5) * 0.12}s` }}
        />
      ))}
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
  const [continent, setContinent] = useState<string>('Global');
  const continentLangs = langsForContinent(continent);

  // Talent Arena live battle (mock real-time)
  const [battleVotes, setBattleVotes] = useState({ a: 64218, b: 62224 });
  const [battleCountdown, setBattleCountdown] = useState(8073); // seconds remaining
  useEffect(() => {
    const id = setInterval(() => {
      setBattleVotes(v => ({ a: v.a + (Math.random() > 0.45 ? 1 : 0), b: v.b + (Math.random() > 0.5 ? 1 : 0) }));
      setBattleCountdown(c => (c > 0 ? c - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, []);

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
    <div className="relative min-h-screen bg-[#0B0814] pb-20">
      {/* Aurora / mesh background */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
        <div className="absolute -top-1/4 -left-1/4 w-[60vw] h-[60vw] rounded-full blur-[120px] opacity-25 wk-aurora" style={{ background: 'radial-gradient(circle, #9D4EDD, transparent 60%)' }} />
        <div className="absolute top-1/3 -right-1/4 w-[55vw] h-[55vw] rounded-full blur-[120px] opacity-20 wk-aurora-2" style={{ background: 'radial-gradient(circle, #00D9FF, transparent 60%)' }} />
        <div className="absolute bottom-0 left-1/4 w-[50vw] h-[50vw] rounded-full blur-[120px] opacity-15 wk-aurora-3" style={{ background: 'radial-gradient(circle, #FF3B6B, transparent 60%)' }} />
      </div>
      <div className="relative z-10">
      <Header />

      {/* ── 1. HERO ──────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-[#0B0814]">
        {/* Hero band — image confined here (not the stats area) */}
        <div className="relative min-h-[560px] lg:min-h-[620px] flex items-center">
          {/* Hero image on the right — cover crops the black frame; edges feathered into the bg */}
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-full lg:w-[54%] h-[440px] lg:h-[520px] pointer-events-none select-none">
            <picture className="block w-full h-full">
              <source srcSet="/wankong.webp" type="image/webp" />
              <img
                src="/wankong.png"
                alt="WANKONG — Create, Distribute, Get Paid"
                className="w-full h-full object-cover object-[56%_50%]"
                width={1400}
                height={858}
                loading="eager"
                fetchPriority="high"
              />
            </picture>
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

        {/* Stats — animated count-up, icon-left, with live glow */}
        <div className="relative max-w-7xl mx-auto px-4 pb-14">
          <div className="relative rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm grid grid-cols-2 md:grid-cols-4 divide-y divide-white/10 md:divide-y-0 md:divide-x overflow-hidden">
            <span className="absolute top-3 right-4 z-10 inline-flex items-center gap-1.5 text-[10px] font-bold text-[#00F5A0] uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00F5A0] animate-pulse shadow-[0_0_8px_#00F5A0]" /> Live
            </span>
            {[
              { icon: Users,       label: 'Active Creators', to: 12500, suffix: '+',  color: '#00D9FF' },
              { icon: Globe,       label: 'Countries',       to: 140,   suffix: '+',  color: '#9D4EDD' },
              { icon: DollarSign,  label: 'Creator Payouts', to: 2.8,   prefix: '$', suffix: 'M+', decimals: 1, color: '#00F5A0' },
              { icon: TrendingUp,  label: 'Monthly Streams', to: 45,    suffix: 'M+', color: '#FFB800' },
            ].map((stat, i) => (
              <div key={i} className="group relative flex items-center gap-4 p-5 md:p-6 transition-colors hover:bg-white/[0.04]">
                <div className="absolute -left-6 -top-6 w-24 h-24 rounded-full opacity-0 group-hover:opacity-100 blur-2xl transition-opacity duration-500" style={{ backgroundColor: `${stat.color}26` }} />
                <div className="relative w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110" style={{ backgroundColor: `${stat.color}1A` }}>
                  <stat.icon className="w-5 h-5" style={{ color: stat.color }} />
                </div>
                <div className="relative min-w-0">
                  <p className="text-2xl md:text-3xl font-black text-white leading-none mb-1">
                    <CountUp to={stat.to} prefix={stat.prefix} suffix={stat.suffix} decimals={stat.decimals ?? 0} />
                  </p>
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

      {/* ── 2. MUSIC BY LANGUAGE — GLOBE EXPLORER ─────────────────────────── */}
      <section className="py-14 relative overflow-hidden border-t border-white/5">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(157,78,221,0.08),transparent_70%)]" />
        <div className="relative max-w-7xl mx-auto px-4">
          <Reveal>
          <div className="text-center mb-9">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#9D4EDD]/10 border border-[#9D4EDD]/20 rounded-full text-[#9D4EDD] text-xs font-semibold mb-3">
              <Globe className="w-3 h-3" /> Music by Language
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-white mb-2">Explore Music Across the Globe</h2>
            <p className="text-white/40 text-sm">Tap a continent — discover music in every language 🌍</p>
          </div>
          </Reveal>

          <div className="grid lg:grid-cols-[380px_1fr] gap-10 lg:gap-14 items-center">
            {/* Interactive globe + continent selector */}
            <div className="flex flex-col items-center gap-6">
              <div className="relative w-[300px] h-[300px] max-w-full">
                {/* aurora atmosphere */}
                <div className="absolute inset-[-4%] rounded-full blur-3xl opacity-60 wk-aurora" style={{ background: 'radial-gradient(circle at 50% 46%, rgba(157,78,221,0.5), rgba(0,217,255,0.2) 54%, transparent 72%)' }} />
                {/* a few subtle drifting particles near the rim */}
                {[
                  { t: '14%', l: '22%', c: '#00D9FF', d: '0s' }, { t: '18%', l: '80%', c: '#9D4EDD', d: '1.4s' },
                  { t: '82%', l: '26%', c: '#FF3B9A', d: '2.2s' }, { t: '80%', l: '76%', c: '#00F5A0', d: '0.7s' },
                ].map((p, i) => (
                  <span key={i} className="absolute w-1 h-1 rounded-full wk-float" style={{ top: p.t, left: p.l, backgroundColor: p.c, boxShadow: `0 0 6px ${p.c}`, animationDelay: p.d }} />
                ))}
                {/* dotted Earth sphere — spins, with hotspots glued to their cities */}
                <div className="absolute inset-[5%] rounded-full overflow-hidden border border-white/10 shadow-2xl" style={{ background: 'radial-gradient(circle at 34% 28%, #25407e, #0d1530 58%, #060912 100%)' }}>
                  {/* two seamless world copies that scroll together (map + pins) */}
                  <div className="absolute inset-0 flex wk-spin-strip" style={{ width: '200%' }}>
                    {[0, 1].map(copy => (
                      <div key={copy} className="relative h-full shrink-0" style={{ width: '50%' }}>
                        <div className="absolute inset-0" style={{ backgroundImage: 'url(/world-dots.svg)', backgroundSize: '100% auto', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }} />
                        {[
                          { x: 29.4, y: 38.7, c: '#34E1FF' }, // New York
                          { x: 37.1, y: 56.5, c: '#9D6BFF' }, // São Paulo
                          { x: 49.9, y: 35.7, c: '#34E1FF' }, // London
                          { x: 50.9, y: 48.2, c: '#00F5A0' }, // Lagos
                          { x: 60.2, y: 50.4, c: '#FF3B9A' }, // Nairobi
                          { x: 70.2, y: 44.7, c: '#9D6BFF' }, // Mumbai
                          { x: 85.3, y: 39.6, c: '#34E1FF' }, // Seoul
                          { x: 88.8, y: 40.2, c: '#00F5A0' }, // Tokyo
                        ].map((p, i) => (
                          <span key={i} className="wk-pin" style={{ left: `${p.x}%`, top: `${p.y}%`, ['--c' as never]: p.c, animationDelay: `${i * 0.4}s` }} />
                        ))}
                      </div>
                    ))}
                  </div>
                  {/* fixed sphere shading on top → spin happens underneath */}
                  <div className="absolute inset-0 rounded-full" style={{ background: 'radial-gradient(circle at 32% 26%, rgba(255,255,255,0.22), transparent 44%)' }} />
                  <div className="absolute inset-0 rounded-full" style={{ boxShadow: 'inset -16px -20px 42px rgba(0,0,0,0.72), inset 10px 10px 26px rgba(124,77,255,0.16)' }} />
                  <div className="absolute inset-0 rounded-full ring-1 ring-inset ring-[#00D9FF]/20" />
                </div>
              </div>

              {/* continent selector */}
              <div className="flex flex-wrap justify-center gap-2 max-w-[330px]">
                {CONTINENTS.map(c => (
                  <button
                    key={c.key}
                    onClick={() => setContinent(c.key)}
                    className={`px-4 py-2 rounded-full text-sm font-bold transition-all duration-300 ${continent === c.key ? 'bg-gradient-to-r from-[#9D4EDD] to-[#00D9FF] text-white shadow-lg shadow-[#9D4EDD]/30 scale-105' : 'bg-white/5 border border-white/10 text-white/60 hover:text-white hover:border-white/25'}`}
                  >
                    {c.emoji} {c.label}
                  </button>
                ))}
              </div>

              {/* live per-continent stats */}
              <div key={continent} className="grid grid-cols-3 gap-2.5 w-full max-w-[330px]">
                {[
                  { to: (CONTINENT_STATS[continent] ?? CONTINENT_STATS.Global).langs, suffix: '', label: 'Languages' },
                  { to: (CONTINENT_STATS[continent] ?? CONTINENT_STATS.Global).songs, suffix: 'M', decimals: 1, label: 'Songs' },
                  { to: (CONTINENT_STATS[continent] ?? CONTINENT_STATS.Global).artists, suffix: 'K', label: 'Artists' },
                ].map(s => (
                  <div key={s.label} className="rounded-xl border border-white/10 bg-white/[0.03] backdrop-blur-sm p-2.5 text-center">
                    <p className="text-white font-black text-base leading-none mb-1"><CountUp to={s.to} suffix={s.suffix} decimals={s.decimals ?? 0} /></p>
                    <p className="text-white/40 text-[10px] uppercase tracking-wide">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Language cards for the selected continent — animate in on change */}
            <div key={continent} className="grid grid-cols-2 sm:grid-cols-3 gap-3 self-start">
              {continentLangs.map((l, i) => (
                <Link
                  key={l.lang}
                  to={`/music/language/${l.lang.toLowerCase()}`}
                  style={{ animationDelay: `${i * 55}ms` }}
                  className="wk-fade-up group bg-[#0D1635] border border-white/8 hover:border-[#9D4EDD]/50 hover:bg-[#9D4EDD]/8 rounded-2xl p-4 transition-colors duration-300"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-11 h-11 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-2xl leading-none shrink-0">{l.flag}</div>
                    <div className="min-w-0">
                      <p className="text-white font-bold text-sm leading-tight truncate">{l.lang}</p>
                      <p className="text-white/40 text-xs truncate">{l.desc || 'Worldwide'}</p>
                    </div>
                  </div>
                  <Equalizer color={i % 2 === 0 ? '#00F5A0' : '#00D9FF'} bars={16} className="opacity-80 group-hover:opacity-100 transition-opacity" />
                </Link>
              ))}
            </div>
          </div>

          <div className="text-center mt-10">
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

      {/* ── TALENT ARENA — LIVE BATTLE ─────────────────────────────────────── */}
      <section className="py-14 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(255,107,0,0.10),transparent_70%)]" />
        <div className="relative max-w-7xl mx-auto px-4">
          <Reveal>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#FF6B00] to-[#FFB800] flex items-center justify-center shadow-lg shadow-[#FF6B00]/25">
                <Trophy className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl md:text-3xl font-black text-white">Talent Arena</h2>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-500 text-white text-[10px] font-black rounded-full"><span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" /> LIVE NOW</span>
                </div>
                <p className="text-white/40 text-sm">Global Battle of the Week — vote for your champion</p>
              </div>
            </div>
            <Link to="/collections/talent-arena" className="text-[#FFB800] hover:text-[#FFB800]/80 text-sm font-semibold flex items-center gap-1">Enter Arena <ArrowRight className="w-4 h-4" /></Link>
          </div>
          </Reveal>

          {(() => {
            const total = battleVotes.a + battleVotes.b;
            const pctA = Math.round((battleVotes.a / total) * 100);
            const pctB = 100 - pctA;
            const hh = String(Math.floor(battleCountdown / 3600)).padStart(2, '0');
            const mm = String(Math.floor((battleCountdown % 3600) / 60)).padStart(2, '0');
            const ss = String(battleCountdown % 60).padStart(2, '0');
            const leadA = battleVotes.a >= battleVotes.b;
            return (
            <Reveal>
            <div className="rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-transparent backdrop-blur-sm p-6 md:p-8">
              <div className="flex flex-col items-center mb-7">
                <span className="text-white/40 text-xs uppercase tracking-widest mb-2">Voting closes in</span>
                <div className="flex items-center gap-2 font-black text-white text-2xl md:text-3xl tabular-nums">
                  <span className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">{hh}</span><span className="text-white/30">:</span>
                  <span className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">{mm}</span><span className="text-white/30">:</span>
                  <span className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">{ss}</span>
                </div>
              </div>

              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 md:gap-8">
                <div className="text-center">
                  <div className={`w-24 h-24 md:w-28 md:h-28 mx-auto rounded-full bg-gradient-to-br from-[#00D9FF] to-[#0E7C9E] flex items-center justify-center text-5xl mb-3 border-2 transition-all ${leadA ? 'border-[#FFB800] shadow-lg shadow-[#FFB800]/30' : 'border-white/10'}`}>🇧🇷</div>
                  <p className="text-white font-bold text-base md:text-lg">Brazil</p>
                  <p className="text-white/40 text-xs mb-2">Samba Collective</p>
                  <p className="text-[#00D9FF] font-black text-lg md:text-xl tabular-nums">{battleVotes.a.toLocaleString()}</p>
                  <p className="text-white/30 text-[11px]">votes</p>
                </div>
                <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-gradient-to-br from-[#FF6B00] to-[#FF006E] flex items-center justify-center text-white font-black text-base md:text-lg shadow-lg shadow-[#FF006E]/30">VS</div>
                <div className="text-center">
                  <div className={`w-24 h-24 md:w-28 md:h-28 mx-auto rounded-full bg-gradient-to-br from-[#00F5A0] to-[#0E9E6E] flex items-center justify-center text-5xl mb-3 border-2 transition-all ${!leadA ? 'border-[#FFB800] shadow-lg shadow-[#FFB800]/30' : 'border-white/10'}`}>🇰🇷</div>
                  <p className="text-white font-bold text-base md:text-lg">South Korea</p>
                  <p className="text-white/40 text-xs mb-2">Seoul Wave</p>
                  <p className="text-[#00F5A0] font-black text-lg md:text-xl tabular-nums">{battleVotes.b.toLocaleString()}</p>
                  <p className="text-white/30 text-[11px]">votes</p>
                </div>
              </div>

              <div className="mt-7">
                <div className="flex justify-between text-xs font-bold mb-1.5">
                  <span className="text-[#00D9FF]">{pctA}%</span>
                  <span className="text-white/40 tabular-nums">{total.toLocaleString()} total votes</span>
                  <span className="text-[#00F5A0]">{pctB}%</span>
                </div>
                <div className="h-3 rounded-full overflow-hidden flex bg-white/5">
                  <div className="h-full bg-gradient-to-r from-[#00D9FF] to-[#0E7C9E] transition-all duration-500" style={{ width: `${pctA}%` }} />
                  <div className="h-full bg-gradient-to-r from-[#0E9E6E] to-[#00F5A0] transition-all duration-500" style={{ width: `${pctB}%` }} />
                </div>
              </div>

              <div className="mt-7 flex flex-col sm:flex-row gap-3 justify-center">
                <button onClick={() => setBattleVotes(v => ({ ...v, a: v.a + 1 }))} className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#00D9FF] to-[#0E7C9E] text-white font-bold hover:opacity-90 hover:scale-[1.02] transition-all flex items-center justify-center gap-2"><span className="text-lg">🇧🇷</span> Vote Brazil</button>
                <button onClick={() => setBattleVotes(v => ({ ...v, b: v.b + 1 }))} className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#0E9E6E] to-[#00F5A0] text-white font-bold hover:opacity-90 hover:scale-[1.02] transition-all flex items-center justify-center gap-2"><span className="text-lg">🇰🇷</span> Vote Korea</button>
              </div>
            </div>
            </Reveal>
            );
          })()}

          <Reveal className="mt-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { rank: 1, name: 'Samba Collective', country: '🇧🇷', votes: '64.2K', accent: '#FFB800' },
              { rank: 2, name: 'Seoul Wave',       country: '🇰🇷', votes: '62.2K', accent: '#C0C0C0' },
              { rank: 3, name: 'Naija Allstars',   country: '🇳🇬', votes: '48.9K', accent: '#CD7F32' },
            ].map(c => (
              <div key={c.rank} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3.5 hover:bg-white/[0.06] transition-colors">
                <span className="text-xl font-black w-7" style={{ color: c.accent }}>#{c.rank}</span>
                <span className="text-2xl">{c.country}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-semibold truncate">{c.name}</p>
                  <p className="text-white/40 text-xs">{c.votes} votes</p>
                </div>
                <Trophy className="w-4 h-4" style={{ color: c.accent }} />
              </div>
            ))}
          </div>
          </Reveal>
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
              <div key={product.id} className="shrink-0 w-[200px] transition-transform duration-300 hover:-translate-y-1.5">
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
          <div className="flex gap-5 overflow-x-auto pb-3 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {(featuredArtists.length ? featuredArtists : MOCK_ARTISTS).map((artist: any, i: number) => {
              const GRADIENTS = ['from-violet-600 to-cyan-500','from-fuchsia-600 to-indigo-500','from-emerald-500 to-cyan-500','from-orange-500 to-pink-600','from-indigo-500 to-violet-600','from-cyan-500 to-violet-600'];
              let flag = '🌍';
              try {
                if (artist.country_code && /^[A-Z]{2}$/i.test(artist.country_code)) {
                  flag = String.fromCodePoint(...[...artist.country_code.toUpperCase()].map((c: string) => 127397 + c.charCodeAt(0)));
                }
              } catch { /* keep default */ }
              const streams = artist.streams_count >= 1000000
                ? `${(artist.streams_count / 1000000).toFixed(1)}M`
                : artist.streams_count >= 1000 ? `${Math.round(artist.streams_count / 1000)}K` : String(artist.streams_count ?? 0);
              const rating = (4.6 + (i % 4) * 0.1).toFixed(1);
              const live = i < 2;
              return (
                <div key={artist.slug ?? artist.name} className="shrink-0 w-60 group">
                  <div className="relative rounded-2xl overflow-hidden hover:-translate-y-1.5 transition-transform duration-300">
                    {/* animated gradient border (on hover) */}
                    <div className="pointer-events-none absolute inset-[-60%] wk-spin opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ background: 'conic-gradient(from 0deg, transparent 0%, #9D4EDD 18%, #00D9FF 34%, transparent 52%)' }} />
                    <div className="relative m-[1.5px] rounded-2xl bg-[#120C22] overflow-hidden">
                      {/* banner */}
                      <div className={`relative h-24 bg-gradient-to-br ${GRADIENTS[i % GRADIENTS.length]}`}>
                        <div className="absolute inset-0 opacity-25" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.5) 1px, transparent 1.5px)', backgroundSize: '13px 13px' }} />
                        {live && (
                          <span className="absolute top-2.5 left-2.5 inline-flex items-center gap-1 px-2 py-0.5 bg-red-500 text-white text-[10px] font-black rounded-full">
                            <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" /> LIVE
                          </span>
                        )}
                        <span className="absolute top-2.5 right-2.5 inline-flex items-center gap-1 px-2 py-0.5 bg-black/40 backdrop-blur text-white text-[10px] font-bold rounded-full">🔥 #{i + 1} Trending</span>
                        <div className={`absolute -bottom-7 left-4 w-16 h-16 rounded-full bg-gradient-to-br ${GRADIENTS[i % GRADIENTS.length]} flex items-center justify-center text-3xl border-4 border-[#120C22] shadow-lg`}>{flag}</div>
                      </div>
                      <div className="pt-9 px-4 pb-4">
                        <div className="flex items-center gap-1">
                          <p className="text-white font-bold truncate">{artist.name}</p>
                          {artist.verified && <ShieldCheck className="w-4 h-4 text-[#00D9FF] shrink-0" />}
                        </div>
                        <p className="text-cyan-400 text-xs mb-3">{artist.genre}</p>
                        <div className="flex items-center gap-3 text-xs mb-4">
                          <span className="flex items-center gap-1 text-[#FFB800] font-semibold"><Star className="w-3.5 h-3.5 fill-current" /> {rating}</span>
                          <span className="text-white/30">·</span>
                          <span className="text-white/50 font-medium">{streams} Streams</span>
                        </div>
                        <div className="flex gap-2">
                          <Link to={`/artists/${artist.slug ?? artist.name.toLowerCase().replace(/\s+/g, '-')}`} className="flex-1 py-2 rounded-lg bg-gradient-to-r from-[#9D4EDD] to-[#00D9FF] text-white text-xs font-bold text-center hover:opacity-90 transition-opacity">Follow</Link>
                          <Link to={`/artists/${artist.slug ?? artist.name.toLowerCase().replace(/\s+/g, '-')}`} className="flex-1 py-2 rounded-lg bg-white/5 border border-white/15 text-white text-xs font-bold flex items-center justify-center gap-1 hover:bg-white/10 transition-colors"><Play className="w-3.5 h-3.5 fill-current" /> Listen</Link>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
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
          <Reveal>
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
          </Reveal>
          {/* 3D bookshelf */}
          <div className="relative mb-8">
            <div className="flex gap-7 lg:gap-9 overflow-x-auto pb-12 pt-4 px-3 [perspective:1600px] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              {(trendingBooks.length ? trendingBooks : MOCK_BOOKS).slice(0, 10).map((product: any) => (
                <Link
                  key={product.id}
                  to={product.handle ? `/products/${product.handle}` : '/collections/books'}
                  className="group shrink-0 w-[150px]"
                >
                  <div className="wk-book relative aspect-[2/3] rounded-r-md rounded-l-[3px] overflow-hidden shadow-[12px_14px_28px_rgba(0,0,0,0.55)]">
                    {product.image
                      ? <img src={product.image} alt={product.title} className="w-full h-full object-cover" />
                      : <div className="w-full h-full bg-gradient-to-br from-[#5B2A8A] to-[#1A0E33] flex items-center justify-center"><span className="text-3xl font-black text-white/30">{product.title?.[0] ?? '?'}</span></div>}
                    {/* spine + page edges */}
                    <span className="absolute inset-y-0 left-0 w-3 bg-gradient-to-r from-black/55 to-transparent" />
                    <span className="absolute inset-y-0 right-0 w-1.5 bg-gradient-to-l from-white/15 to-transparent" />
                    <span className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-white/5" />
                  </div>
                  <p className="mt-4 text-white text-xs font-semibold text-center truncate px-1">{product.title}</p>
                  <p className="text-white/40 text-[11px] text-center truncate px-1">{product.author ?? product.vendor ?? 'WANKONG'}</p>
                </Link>
              ))}
            </div>
            {/* shelf board */}
            <div className="mx-2 h-3 rounded-sm bg-gradient-to-b from-[#3a2a18] via-[#241809] to-[#120c05] shadow-[0_12px_26px_rgba(0,0,0,0.6)]" />
            <div className="mx-6 h-2 rounded-b-lg bg-black/40 blur-[2px]" />
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

      {/* ── CREATOR MARKETPLACE ───────────────────────────────────────── */}
      <section className="py-14 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(0,217,255,0.08),transparent_70%)]" />
        <div className="relative max-w-7xl mx-auto px-4">
          <Reveal>
          <div className="flex items-center justify-between mb-7">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#00D9FF] to-[#0E7C9E] flex items-center justify-center shadow-lg shadow-[#00D9FF]/20">
                <Wand2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-2xl md:text-3xl font-black text-white">Creator Marketplace</h2>
                <p className="text-white/40 text-sm">Hire top creative talent — producers, studios, mixing & more</p>
              </div>
            </div>
            <Link to="/collections/marketplace" className="text-[#00D9FF] hover:text-[#00D9FF]/80 text-sm font-semibold flex items-center gap-1">Browse Services <ArrowRight className="w-4 h-4" /></Link>
          </div>
          </Reveal>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: Music,            label: 'Producers',  count: '1,240 pros', color: '#00D9FF' },
              { icon: Mic,              label: 'Studios',    count: '480 spaces', color: '#9D4EDD' },
              { icon: SlidersHorizontal,label: 'Mixing',     count: '860 pros',   color: '#00F5A0' },
              { icon: Headphones,       label: 'Mastering',  count: '520 pros',   color: '#FFB800' },
              { icon: Scissors,         label: 'Editors',    count: '930 pros',   color: '#FF6B00' },
              { icon: Palette,          label: 'Artwork',    count: '1,510 pros', color: '#FF006E' },
              { icon: Megaphone,        label: 'Marketing',  count: '670 pros',   color: '#00D9FF' },
              { icon: Globe,            label: 'Distribution', count: '30+ stores', color: '#9D4EDD' },
            ].map((s, i) => (
              <Reveal key={s.label} delay={i * 50}>
              <Link
                to="/collections/marketplace"
                className="group relative block rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm p-5 overflow-hidden hover:-translate-y-1.5 hover:border-white/25 transition-all duration-300"
              >
                <div className="absolute -right-8 -top-8 w-28 h-28 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ backgroundColor: `${s.color}26` }} />
                <div className="relative w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110" style={{ backgroundColor: `${s.color}1A` }}>
                  <s.icon className="w-6 h-6" style={{ color: s.color }} />
                </div>
                <p className="relative text-white font-bold text-base mb-0.5">{s.label}</p>
                <p className="relative text-white/40 text-xs mb-4">{s.count}</p>
                <span className="relative inline-flex items-center gap-1 text-xs font-semibold transition-colors" style={{ color: s.color }}>
                  Explore <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </span>
              </Link>
              </Reveal>
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
              <div key={product.id} className="shrink-0 w-[200px] transition-transform duration-300 hover:-translate-y-1.5">
                <ProductCard product={product} variant="square" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PODCAST STUDIO ────────────────────────────────────────────── */}
      <section className="py-14 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(255,0,110,0.07),transparent_70%)]" />
        <div className="relative max-w-7xl mx-auto px-4">
          <Reveal>
          <div className="flex items-center justify-between mb-7">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#FF006E] to-[#9D4EDD] flex items-center justify-center shadow-lg shadow-[#FF006E]/20">
                <Mic className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-2xl md:text-3xl font-black text-white">Podcast Studio</h2>
                <p className="text-white/40 text-sm">Live shows, talk &amp; stories from the community</p>
              </div>
            </div>
            <Link to="/collections/podcasts" className="text-[#FF006E] hover:text-[#FF006E]/80 text-sm font-semibold flex items-center gap-1">All Shows <ArrowRight className="w-4 h-4" /></Link>
          </div>
          </Reveal>

          <div className="grid lg:grid-cols-[1.5fr_1fr] gap-5">
            {/* On-air studio */}
            <Reveal>
            <div className="relative rounded-3xl border border-white/10 bg-gradient-to-br from-[#2a0e2e] via-[#1a0e2e] to-[#0F0A1E] p-7 md:p-9 overflow-hidden">
              <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,0,110,0.4) 1px, transparent 1.5px)', backgroundSize: '18px 18px' }} />
              <span className="relative inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-500 text-white text-[10px] font-black rounded-full">
                <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" /> ON AIR
              </span>
              <div className="relative flex items-center gap-5 mt-5 mb-7">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#FF006E] to-[#9D4EDD] flex items-center justify-center shrink-0 shadow-xl">
                  <Mic className="w-9 h-9 text-white" />
                </div>
                <div>
                  <p className="text-white/50 text-xs uppercase tracking-widest mb-1">Now Recording</p>
                  <p className="text-white font-black text-xl md:text-2xl leading-tight">The Creator's Journey</p>
                  <p className="text-white/50 text-sm">with WANKONG Studios · Ep. 42</p>
                </div>
              </div>
              <div className="relative h-20"><LiveWave color="#FF3B9A" bars={56} /></div>
              <div className="relative flex items-center justify-between mt-6">
                <span className="flex items-center gap-2 text-white/60 text-sm"><Headphones className="w-4 h-4" /> 6.3K listening now</span>
                <button className="w-12 h-12 rounded-full bg-white text-[#FF006E] flex items-center justify-center shadow-lg hover:scale-105 transition-transform"><Play className="w-5 h-5 fill-current ml-0.5" /></button>
              </div>
            </div>
            </Reveal>

            {/* Episode list */}
            <div className="flex flex-col gap-3">
              {[
                { title: 'Building in Public', host: 'Ada & Kojo', dur: '48 min', grad: 'from-[#9D4EDD] to-[#00D9FF]' },
                { title: 'Faith & Frequency', host: 'Prophet Elijah', dur: '32 min', grad: 'from-[#FF6B00] to-[#FFB800]' },
                { title: 'The Afrobeat Files', host: 'DJ Beacon', dur: '55 min', grad: 'from-[#00F5A0] to-[#0E9E6E]' },
                { title: 'Studio Sessions', host: 'Funmi A.', dur: '41 min', grad: 'from-[#FF006E] to-[#9D4EDD]' },
              ].map((p, i) => (
                <Reveal key={p.title} delay={i * 60}>
                <Link to="/collections/podcasts" className="group flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3.5 hover:bg-white/[0.06] hover:-translate-y-0.5 transition-all">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${p.grad} flex items-center justify-center shrink-0`}><Radio className="w-5 h-5 text-white" /></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-semibold truncate">{p.title}</p>
                    <p className="text-white/40 text-xs truncate">{p.host} · {p.dur}</p>
                  </div>
                  <span className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/70 group-hover:bg-[#FF006E] group-hover:text-white group-hover:border-transparent transition-colors"><Play className="w-4 h-4 fill-current ml-0.5" /></span>
                </Link>
                </Reveal>
              ))}
            </div>
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

      {/* ── CREATOR STORIES / TESTIMONIALS ────────────────────────────── */}
      <section className="py-16 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(157,78,221,0.07),transparent_70%)]" />
        <div className="relative max-w-7xl mx-auto px-4">
          <Reveal>
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#9D4EDD]/10 border border-[#9D4EDD]/20 rounded-full text-[#9D4EDD] text-xs font-semibold mb-3">
              <Heart className="w-3 h-3 fill-current" /> Loved by Creators
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-white mb-2">Stories from the community</h2>
            <p className="text-white/40 text-sm">Real creators · real earnings · real reach</p>
          </div>
          </Reveal>

          <div className="grid md:grid-cols-3 gap-5">
            {[
              { quote: 'WANKONG put my gospel album on 30+ platforms in a weekend — and I kept 100% of my royalties.', name: 'Grace Adele', role: 'Gospel Artist', flag: '🇳🇬', stat: '$18K earned', grad: 'from-[#9D4EDD] to-[#00D9FF]' },
              { quote: 'The Talent Arena changed everything. I went from 200 to 60,000 fans after a single live battle.', name: 'Kojo Mensah', role: 'Afrobeats Producer', flag: '🇬🇭', stat: '2.3M streams', grad: 'from-[#FF6B00] to-[#FFB800]' },
              { quote: 'I published my book and audiobook in three languages. Sales tripled in the first month.', name: 'Dr. Faith Mensah', role: 'Author', flag: '🇰🇪', stat: '4.2K readers', grad: 'from-[#00F5A0] to-[#0E9E6E]' },
            ].map((t, i) => (
              <Reveal key={t.name} delay={i * 90}>
                <div className="group relative h-full rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm p-6 hover:-translate-y-1.5 hover:border-white/20 transition-all duration-300 overflow-hidden">
                  <div className={`absolute -right-10 -top-10 w-32 h-32 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br ${t.grad}`} />
                  <div className="relative flex items-center justify-between mb-4">
                    <Quote className="w-8 h-8 text-white/15" />
                    <div className="flex gap-0.5">
                      {Array.from({ length: 5 }).map((_, s) => <Star key={s} className="w-3.5 h-3.5 text-[#FFB800] fill-current" />)}
                    </div>
                  </div>
                  <p className="relative text-white/85 text-[15px] leading-relaxed mb-6">“{t.quote}”</p>
                  <div className="relative flex items-center gap-3 mt-auto">
                    <div className={`w-11 h-11 rounded-full bg-gradient-to-br ${t.grad} flex items-center justify-center text-white font-black shrink-0`}>
                      {t.name[0]}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-white font-bold text-sm flex items-center gap-1.5 truncate">{t.name} <span>{t.flag}</span></p>
                      <p className="text-white/40 text-xs truncate">{t.role}</p>
                    </div>
                    <span className="shrink-0 px-2.5 py-1 rounded-full text-[11px] font-bold bg-white/5 border border-white/10 text-[#00F5A0]">{t.stat}</span>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-center">
            {[
              { v: '12,500+', l: 'Creators worldwide' },
              { v: '140+', l: 'Countries' },
              { v: '$2.8M+', l: 'Paid to creators' },
              { v: '4.9★', l: 'Avg. creator rating' },
            ].map((s, i) => (
              <div key={i} className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-white">{s.v}</span>
                <span className="text-white/40 text-sm">{s.l}</span>
                {i < 3 && <span className="hidden sm:inline text-white/15 ml-6">|</span>}
              </div>
            ))}
          </div>
          </Reveal>
        </div>
      </section>

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
          {/* Distribution network visualization */}
          <div className="relative max-w-xl mx-auto mb-8">
            {(() => {
              const platforms = [
                { short: 'Spotify',  color: '#1DB954' },
                { short: 'Apple',    color: '#FA57C1' },
                { short: 'YouTube',  color: '#FF3B3B' },
                { short: 'TikTok',   color: '#25F4EE' },
                { short: 'Amazon',   color: '#FF9900' },
                { short: 'Deezer',   color: '#A238FF' },
                { short: 'Tidal',    color: '#33D1FF' },
                { short: 'Boomplay', color: '#FF6B00' },
              ];
              const cx = 300, cy = 300, R = 222;
              return (
                <svg viewBox="0 0 600 600" className="w-full">
                  <defs>
                    <radialGradient id="wkEngine" cx="0.5" cy="0.38" r="0.65">
                      <stop offset="0" stopColor="#00D9FF" /><stop offset="1" stopColor="#9D4EDD" />
                    </radialGradient>
                  </defs>
                  {platforms.map((p, i) => {
                    const a = (i / platforms.length) * Math.PI * 2 - Math.PI / 2;
                    const x = cx + R * Math.cos(a), y = cy + R * Math.sin(a);
                    return (
                      <g key={p.short}>
                        <line x1={cx} y1={cy} x2={x} y2={y} stroke={p.color} strokeWidth="2.5" strokeOpacity="0.5" strokeDasharray="5 9" strokeLinecap="round" className="wk-flow" style={{ animationDelay: `${i * 0.14}s` }} />
                        <circle cx={x} cy={y} r="40" fill="#0F0A1E" stroke={p.color} strokeWidth="2" />
                        <text x={x} y={y} textAnchor="middle" dominantBaseline="central" fontSize="13" fontWeight="700" fill="#ffffff">{p.short}</text>
                      </g>
                    );
                  })}
                  <circle cx={cx} cy={cy} r="66" className="wk-sonar" fill="none" stroke="#00D9FF" strokeWidth="2" />
                  <circle cx={cx} cy={cy} r="66" fill="url(#wkEngine)" className="wk-engine-pulse" />
                  <circle cx={cx} cy={cy} r="66" fill="none" stroke="#ffffff" strokeOpacity="0.3" strokeWidth="1" />
                  <text x={cx} y={cy - 7} textAnchor="middle" fontSize="16" fontWeight="800" fill="#ffffff">WANKONG</text>
                  <text x={cx} y={cy + 13} textAnchor="middle" fontSize="11" fontWeight="600" fill="#ffffffcc">AI Engine</text>
                </svg>
              );
            })()}
            <p className="text-center text-white/40 text-xs mt-1">Upload once → our AI engine delivers to every platform in real time</p>
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
    </div>
  );
}
