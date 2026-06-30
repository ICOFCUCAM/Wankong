import { useState, useEffect, useRef, Component, ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import Header from './Header';
import Footer from './Footer';
import ProductCard from './ProductCard';
import TiltCard from './TiltCard';
import { Play, Pause, Zap, Music, BookOpen, Video, Mic, Trophy, Globe, Users, DollarSign, TrendingUp, ArrowRight, Headphones, Radio, Star, ChevronRight, ChevronLeft, Clock, ShieldCheck, BarChart3, CreditCard, MoreVertical, Heart, Shuffle, SkipBack, SkipForward, Repeat, SlidersHorizontal, Megaphone, Palette, Scissors, Wand2, Quote, Check, ChevronDown, UploadCloud, Rocket, Youtube, Facebook, Disc, Sparkles, Languages } from 'lucide-react';
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
  { id: 'nr1', image: '/covers/nr1.svg', handle: 'neon-seoul',     title: 'Neon Seoul',     vendor: 'HARU',           product_type: 'Music', price: 0,    genre: 'K-Pop' },
  { id: 'nr2', image: '/covers/nr2.svg', handle: 'afro-vibration', title: 'Afro Vibration', vendor: 'Kojo Mensah',    product_type: 'Music', price: 199,  genre: 'Afrobeats' },
  { id: 'nr3', image: '/covers/nr3.svg', handle: 'midnight-jazz',  title: 'Midnight Jazz',  vendor: 'Adaeze Obi',     product_type: 'Music', price: 299,  genre: 'Jazz' },
  { id: 'nr4', image: '/covers/nr4.svg', handle: 'favela-funk',    title: 'Favela Funk',    vendor: 'MC Luana',       product_type: 'Music', price: 0,    genre: 'Hip-Hop' },
  { id: 'nr5', image: '/covers/nr5.svg', handle: 'corazon-latino', title: 'Corazón Latino', vendor: 'Valentina Cruz', product_type: 'Music', price: 149,  genre: 'Latin' },
  { id: 'nr6', image: '/covers/nr6.svg', handle: 'electric-soul',  title: 'Electric Soul',  vendor: 'DJ Beacon',      product_type: 'Music', price: 249,  genre: 'EDM' },
  { id: 'nr7', image: '/covers/nr7.svg', handle: 'london-fog',     title: 'London Fog',     vendor: 'Ava Sterling',   product_type: 'Music', price: 0,    genre: 'Pop' },
  { id: 'nr8', image: '/covers/nr8.svg', handle: 'highlife-remix', title: 'Highlife Remix', vendor: 'Kwame Asante',   product_type: 'Music', price: 0,    genre: 'Highlife' },
];

const MOCK_BOOKS = [
  { id: 'bk1', image: '/covers/bk1.svg', handle: 'the-silent-tide',     title: 'The Silent Tide',          author: 'Mara Lindqvist',     product_type: 'Book', price: 1299, genre: 'Fiction' },
  { id: 'bk2', image: '/covers/bk2.svg', handle: 'scale-or-fail',       title: 'Scale or Fail',            author: 'Dr. Faith Mensah',   product_type: 'Book', price: 1899, genre: 'Business' },
  { id: 'bk3', image: '/covers/bk3.svg', handle: 'midnight-in-tokyo',   title: 'Midnight in Tokyo',        author: 'Kenji Nakamura',     product_type: 'Book', price: 999,  genre: 'Thriller' },
  { id: 'bk4', image: '/covers/bk4.svg', handle: 'world-poetry',        title: 'World Poetry Anthology',   author: 'Various Authors',    product_type: 'Book', price: 2499, genre: 'Poetry' },
  { id: 'bk5', image: '/covers/bk5.svg', handle: 'the-quantum-garden',  title: 'The Quantum Garden',       author: 'Aisha Rahman',       product_type: 'Book', price: 1599, genre: 'Sci-Fi' },
  { id: 'bk6', image: '/covers/bk6.svg', handle: 'mindful-mornings',    title: 'Mindful Mornings',         author: 'Dr. Emmanuel Yaw',   product_type: 'Book', price: 1399, genre: 'Self-Help' },
  { id: 'bk7', image: '/covers/bk7.svg', handle: 'the-startup-diaries', title: 'The Startup Diaries',      author: 'Lucas Bennett',      product_type: 'Book', price: 1199, genre: 'Business' },
  { id: 'bk8', image: '/covers/bk8.svg', handle: 'paris-after-dark',    title: 'Paris After Dark',         author: 'Camille Laurent',    product_type: 'Book', price: 899,  genre: 'Romance' },
  { id: 'bk9', image: '/covers/bk9.svg', handle: 'raising-bright-kids', title: 'Raising Bright Kids',      author: 'Mary Adofo',         product_type: 'Book', price: 1699, genre: 'Parenting' },
  { id: 'bk10', image: '/covers/bk10.svg', handle: 'breaking-the-chain', title: 'Breaking the Chain',      author: 'Sofia Rossi',        product_type: 'Book', price: 1099, genre: 'Non-Fiction' },
];

const MOCK_AUDIOBOOKS = [
  { id: 'ab1', image: '/covers/ab1.svg', handle: 'silent-tide-audio',  title: 'The Silent Tide (Audio)',   author: 'Mara Lindqvist',    product_type: 'Audiobook', price: 1499, genre: 'Fiction' },
  { id: 'ab2', image: '/covers/ab2.svg', handle: 'tokyo-audio',        title: 'Midnight in Tokyo (Audio)', author: 'Kenji Nakamura',    product_type: 'Audiobook', price: 1199, genre: 'Thriller' },
  { id: 'ab3', image: '/covers/ab3.svg', handle: 'quantum-audio',      title: 'The Quantum Garden (Audio)', author: 'Aisha Rahman',     product_type: 'Audiobook', price: 1799, genre: 'Sci-Fi' },
  { id: 'ab4', image: '/covers/ab4.svg', handle: 'scale-audio',        title: 'Scale or Fail (Audio)',     author: 'Dr. Faith Mensah',  product_type: 'Audiobook', price: 1999, genre: 'Business' },
  { id: 'ab5', image: '/covers/ab5.svg', handle: 'mindful-audio',      title: 'Mindful Mornings (Audio)',  author: 'Dr. Emmanuel Yaw',  product_type: 'Audiobook', price: 1599, genre: 'Self-Help' },
  { id: 'ab6', image: '/covers/ab6.svg', handle: 'paris-audio',        title: 'Paris After Dark (Audio)',  author: 'Camille Laurent',   product_type: 'Audiobook', price: 1299, genre: 'Romance' },
];

const MOCK_ARTISTS = [
  { name: 'HARU',           genre: 'K-Pop',     slug: 'haru',           streams_count: 2840000, country_code: 'KR', verified: true },
  { name: 'Kojo Mensah',    genre: 'Afrobeats', slug: 'kojo-mensah',    streams_count: 892000,  country_code: 'GH', verified: true },
  { name: 'Valentina Cruz', genre: 'Latin',     slug: 'valentina-cruz', streams_count: 1530000, country_code: 'MX', verified: true },
  { name: 'Ava Sterling',   genre: 'Pop',       slug: 'ava-sterling',   streams_count: 1184000, country_code: 'GB', verified: true },
  { name: 'Sipho Dlamini',  genre: 'Blues',     slug: 'sipho-dlamini',  streams_count: 287000,  country_code: 'ZA', verified: true },
  { name: 'Lucas Bennett',  genre: 'Indie',     slug: 'lucas-bennett',  streams_count: 678000,  country_code: 'US', verified: true },
];

const MOCK_TOP_CREATORS = [
  { user_id: 'tc1', name: 'Valentina Cruz', level: 'Diamond',  xp: 48200 },
  { user_id: 'tc2', name: 'HARU',           level: 'Platinum', xp: 39100 },
  { user_id: 'tc3', name: 'Kojo Mensah',    level: 'Gold',     xp: 31500 },
];

// ── Talent Arena: one challenge song, many individual video entries ───────────
const ARENA_CHALLENGE = {
  title: 'Midnight Jazz',
  artist: 'Adaeze Obi',
  genre: 'Jazz',
  cover: 'from-[#0E7C9E] to-[#06222F]',
  prize: '$5,000',
};

interface ArenaEntry {
  id: string; name: string; flag: string; take: string;
  votes: number; youtubeId: string; platforms: string[];
}
// Entries are creator videos auto-published to social channels (YouTube, TikTok,
// etc.) and embedded here to play directly on WANKONG.
const ARENA_ENTRIES: ArenaEntry[] = [
  { id: 'e1', name: 'Liam Carter',   flag: '🇺🇸', take: 'Vocal Cover',   votes: 64218, youtubeId: 'JGwWNGJdvx8', platforms: ['youtube', 'tiktok', 'spotify'] },
  { id: 'e2', name: 'Min-ji Park',   flag: '🇰🇷', take: 'Dance Cover',   votes: 62224, youtubeId: 'gdZLi9oWNZg', platforms: ['youtube', 'tiktok'] },
  { id: 'e3', name: 'Sofia Almeida', flag: '🇧🇷', take: 'Acoustic',      votes: 48910, youtubeId: 'kJQP7kiw5Fk', platforms: ['youtube', 'facebook', 'spotify'] },
  { id: 'e4', name: 'Kwame Boateng', flag: '🇬🇭', take: 'Afro Remix',    votes: 39145, youtubeId: '60ItHLz5WEA', platforms: ['tiktok', 'youtube'] },
  { id: 'e5', name: 'Aiko Tanaka',   flag: '🇯🇵', take: 'Lo-fi Flip',    votes: 31502, youtubeId: 'OPf0YbXqDm0', platforms: ['youtube', 'spotify'] },
  { id: 'e6', name: 'Diego Morales', flag: '🇲🇽', take: 'Latin Version', votes: 27488, youtubeId: 'kffacxfA7G4', platforms: ['tiktok', 'facebook'] },
];

const PLATFORMS: Record<string, { label: string; bg: string; href: string; Icon: typeof Youtube }> = {
  youtube:  { label: 'YouTube',  bg: '#FF0000', href: 'https://youtube.com',       Icon: Youtube },
  tiktok:   { label: 'TikTok',   bg: '#111827', href: 'https://tiktok.com',        Icon: Music },
  facebook: { label: 'Facebook', bg: '#1877F2', href: 'https://facebook.com',      Icon: Facebook },
  spotify:  { label: 'Spotify',  bg: '#1DB954', href: 'https://open.spotify.com',  Icon: Disc },
};

function WatchLinks({ platforms }: { platforms: string[] }) {
  return (
    <div className="flex items-center gap-1.5">
      {platforms.map(p => {
        const m = PLATFORMS[p];
        if (!m) return null;
        const Icon = m.Icon;
        return (
          <a
            key={p}
            href={m.href}
            target="_blank"
            rel="noopener noreferrer"
            title={`Watch on ${m.label}`}
            aria-label={`Watch on ${m.label}`}
            onClick={e => e.stopPropagation()}
            className="w-6 h-6 rounded-md flex items-center justify-center hover:scale-110 transition-transform"
            style={{ background: m.bg }}
          >
            <Icon className="w-3.5 h-3.5 text-white" />
          </a>
        );
      })}
    </div>
  );
}

// ── Live ecosystem ticker — makes WANKONG feel like a living OS ───────────────
const LIVE_ACTIVITY: { flag: string; who: string; text: string; accent: string }[] = [
  { flag: '🇳🇬', who: 'An artist in Lagos', text: 'uploaded a new album',        accent: '#00D9FF' },
  { flag: '🇰🇷', who: 'A creator in Seoul', text: 'entered the Talent Arena',     accent: '#9D4EDD' },
  { flag: '🇰🇪', who: 'A reader in Nairobi', text: 'bought an audiobook',          accent: '#00F5A0' },
  { flag: '🇧🇷', who: 'A producer in Rio',  text: 'hit 1M streams',               accent: '#FFB800' },
  { flag: '🇯🇵', who: 'A host in Tokyo',    text: 'released a podcast',           accent: '#FF006E' },
  { flag: '🇺🇸', who: 'An artist in LA',    text: 'distributed to 30+ platforms', accent: '#00D9FF' },
  { flag: '🇿🇦', who: 'A singer in Cape Town', text: 'won this week’s arena', accent: '#FFB800' },
  { flag: '🇬🇧', who: 'An author in London', text: 'published a new book',         accent: '#9D4EDD' },
  { flag: '🇲🇽', who: 'A band in Mexico City', text: 'gained 10K fans',           accent: '#00F5A0' },
  { flag: '🇬🇭', who: 'A creator in Accra',  text: 'went live on the arena',      accent: '#FF6B00' },
];
const EDGE_FADE = {
  maskImage: 'linear-gradient(90deg, transparent, #000 6%, #000 94%, transparent)',
  WebkitMaskImage: 'linear-gradient(90deg, transparent, #000 6%, #000 94%, transparent)',
} as React.CSSProperties;

function LiveActivityTicker() {
  return (
    <div className="relative border-y border-white/8 bg-white/[0.02] backdrop-blur-sm">
      <div className="flex items-center gap-3 py-2.5 px-4 max-w-7xl mx-auto">
        <span className="flex items-center gap-1.5 shrink-0 text-[#00F5A0] text-[11px] font-bold uppercase tracking-wider">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00F5A0] animate-pulse" /> Live
        </span>
        <div className="relative flex-1 overflow-hidden" style={EDGE_FADE}>
          <div className="flex items-center gap-10 wk-ticker whitespace-nowrap w-max">
            {[...LIVE_ACTIVITY, ...LIVE_ACTIVITY].map((a, i) => (
              <span key={i} className="inline-flex items-center gap-2 text-sm text-white/65">
                <span className="text-base">{a.flag}</span>
                <span><b className="text-white font-semibold">{a.who}</b> {a.text}</span>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: a.accent, boxShadow: `0 0 6px ${a.accent}` }} />
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

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
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // Talent Arena — live individual competition (mock real-time)
  const [entryVotes, setEntryVotes] = useState<Record<string, number>>(
    () => Object.fromEntries(ARENA_ENTRIES.map(e => [e.id, e.votes])),
  );
  const [votedEntry, setVotedEntry] = useState<string | null>(null);
  const [playingEntry, setPlayingEntry] = useState<string | null>(null); // which entry's YouTube is playing inline
  const [battleCountdown, setBattleCountdown] = useState(8073); // seconds remaining

  // Real published competition entries — only those that have gone live on the
  // home page (admin-approved → published to WANKONG channels first). Falls back
  // to the showcase mock until real entries exist.
  const [liveArena, setLiveArena] = useState<ArenaEntry[] | null>(null);
  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase
          .from('competition_entries_v2')
          .select('id, performer_name, category, song_title, language, wankong_social_urls, creator_social_urls')
          .eq('visible_on_home', true)
          .order('wankong_published_at', { ascending: false })
          .limit(6);
        const ytId = (url?: string) => url?.match(/(?:v=|youtu\.be\/|embed\/)([\w-]{11})/)?.[1];
        const mapped = asArray<any>(data)
          .map((e): ArenaEntry | null => {
            const urls = { ...(e.wankong_social_urls || {}), ...(e.creator_social_urls || {}) };
            const id = ytId(urls.youtube);
            if (!id) return null; // home cards embed YouTube; skip entries without one
            return {
              id: e.id,
              name: e.performer_name || 'Creator',
              flag: '🌍',
              take: e.category || e.song_title || 'Performance',
              votes: 0,
              youtubeId: id,
              platforms: Object.keys(urls),
            };
          })
          .filter((x): x is ArenaEntry => x !== null);
        if (mapped.length) setLiveArena(mapped);
      } catch { /* keep mock */ }
    })();
  }, []);
  const arenaEntries = liveArena && liveArena.length ? liveArena : ARENA_ENTRIES;
  useEffect(() => {
    const id = setInterval(() => {
      setEntryVotes(prev => {
        const next = { ...prev };
        // a couple of random entries tick up to feel live
        const ids = ARENA_ENTRIES.map(e => e.id);
        const pick = ids[Math.floor(Math.random() * ids.length)];
        if (Math.random() > 0.4) next[pick] = (next[pick] ?? 0) + 1;
        return next;
      });
      setBattleCountdown(c => (c > 0 ? c - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, []);
  const voteFor = (id: string) => {
    if (votedEntry) return;
    setVotedEntry(id);
    setEntryVotes(prev => ({ ...prev, [id]: (prev[id] ?? 0) + 1 }));
  };

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
      {/* Layered atmosphere — base vignette · drifting aurora · starfield · grain */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_-10%,rgba(157,78,221,0.14),transparent_55%)]" />
        <div className="absolute -top-1/4 -left-1/4 w-[60vw] h-[60vw] rounded-full blur-[130px] opacity-[0.22] wk-aurora" style={{ background: 'radial-gradient(circle, #9D4EDD, transparent 60%)' }} />
        <div className="absolute top-1/3 -right-1/4 w-[55vw] h-[55vw] rounded-full blur-[130px] opacity-[0.18] wk-aurora-2" style={{ background: 'radial-gradient(circle, #00D9FF, transparent 60%)' }} />
        <div className="absolute bottom-0 left-1/4 w-[50vw] h-[50vw] rounded-full blur-[130px] opacity-[0.14] wk-aurora-3" style={{ background: 'radial-gradient(circle, #FF3B6B, transparent 60%)' }} />
        <div className="absolute top-1/2 left-1/3 w-[45vw] h-[45vw] rounded-full blur-[150px] opacity-[0.12] wk-aurora-4" style={{ background: 'radial-gradient(circle, #2D6BFF, transparent 60%)' }} />
        <div className="absolute inset-0 wk-stars opacity-30" />
        <div className="absolute inset-0 wk-noise" />
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
              <h1 className="text-6xl md:text-8xl font-black text-white leading-[0.98] tracking-[-0.03em] mb-6">
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
                  { icon: Sparkles, label: 'AI Creator Tools', color: '#00F5A0' },
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

      {/* ── LIVE ECOSYSTEM TICKER ──────────────────────────────────────────── */}
      <LiveActivityTicker />

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
            <h2 className="text-4xl md:text-5xl font-black tracking-tight text-white mb-2">Explore Music Across the Globe</h2>
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
      <section className="py-12 relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-[420px] -z-10 pointer-events-none bg-[radial-gradient(ellipse_at_50%_0%,rgba(255,107,0,0.10),transparent_70%)]" />
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-gradient-to-br from-[#FFB800] to-[#FF6B00] rounded-xl flex items-center justify-center shadow-lg shadow-[#FFB800]/25">
                <Zap className="w-5 h-5 text-white fill-white" />
              </div>
              <div>
                <h2 className="text-3xl md:text-4xl font-black tracking-tight text-white">Trending Now</h2>
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
                <span className="absolute top-2.5 left-2.5 inline-flex items-center gap-1 px-2 py-0.5 bg-red-500 text-white text-[10px] font-black rounded-full wk-live">
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
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#9D4EDD] to-[#3a1d6e] flex items-center justify-center shrink-0 shadow-lg wk-coverfloat">
                  <Music className="w-5 h-5 text-white/80" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-white font-black text-base leading-tight truncate">Golden Hour</p>
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

      {/* Talent Arena relocated lower (just above Competition Leaderboard) */}

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
      <section className="py-12 relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-[420px] -z-10 pointer-events-none bg-[radial-gradient(ellipse_at_50%_0%,rgba(0,217,255,0.09),transparent_70%)]" />
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-500/15 rounded-xl flex items-center justify-center">
                <Radio className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-3xl md:text-4xl font-black tracking-tight text-white">New Releases</h2>
                <p className="text-white/40 text-sm">Fresh content just dropped</p>
              </div>
            </div>
            <Link to="/collections/music" className="text-[#00D9FF] hover:text-[#00D9FF]/80 text-sm font-medium flex items-center gap-1">
              View All <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          {(() => {
            const items = (newReleases.length ? newReleases : MOCK_NEW_RELEASES) as any[];
            const feat = items[0];
            const rail = items.slice(1, 7);
            const img = (p: any) => p?.image || p?.cover_url || p?.cover_art || '';
            const by  = (p: any) => p?.vendor || p?.artist || p?.author || 'WANKONG';
            const price = (p: any) => { const c = typeof p?.price === 'number' ? p.price : 0; return c === 0 ? 'Free' : `$${(c / 100).toFixed(2)}`; };
            if (!feat) return null;
            return (
            <div className="grid lg:grid-cols-[1.05fr_1fr] gap-5">
              {/* Large feature */}
              <Reveal>
              <TiltCard className="rounded-3xl" max={6} glow="rgba(0,245,160,0.30)">
              <Link to={`/product/${feat.handle ?? ''}`} className="group relative block rounded-3xl overflow-hidden border border-white/10 min-h-[320px] md:min-h-[380px]">
                {img(feat)
                  ? <img src={img(feat)} alt={feat.title} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                  : <div className="absolute inset-0 bg-gradient-to-br from-[#9D4EDD] to-[#00D9FF]" />}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
                <span className="absolute top-4 left-4 px-3 py-1 rounded-full bg-[#00F5A0]/15 border border-[#00F5A0]/30 text-[#00F5A0] text-[11px] font-bold uppercase tracking-wider">● Fresh Drop</span>
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  {feat.genre && <span className="inline-block mb-2 px-2.5 py-0.5 rounded-full bg-white/10 backdrop-blur text-white/80 text-[11px] font-semibold">{feat.genre}</span>}
                  <h3 className="text-white font-black text-2xl md:text-3xl leading-tight mb-1">{feat.title}</h3>
                  <p className="text-white/60 text-sm mb-4">{by(feat)}</p>
                  <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-[#0B0814] font-bold text-sm group-hover:opacity-90 transition-opacity"><Play className="w-4 h-4 fill-[#0B0814]" /> Play now</span>
                </div>
              </Link>
              </TiltCard>
              </Reveal>
              {/* Scrolling rail */}
              <Reveal delay={120}>
              <div className="rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur-sm p-3 flex flex-col">
                <div className="flex items-center justify-between px-2 py-2">
                  <p className="text-white font-bold text-sm">Just landed</p>
                  <span className="text-white/35 text-xs">{rail.length} more</span>
                </div>
                <div className="flex flex-col gap-1 overflow-y-auto pr-1" style={{ maxHeight: 340 }}>
                  {rail.map((p: any, i: number) => (
                    <Link key={p.id ?? i} to={`/product/${p.handle ?? ''}`} className="group flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors">
                      <span className="text-white/30 text-sm font-bold w-5 text-center tabular-nums">{i + 2}</span>
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-white/5 shrink-0">
                        {img(p) && <img src={img(p)} alt={p.title} className="w-full h-full object-cover" loading="lazy" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-white text-sm font-semibold truncate">{p.title}</p>
                        <p className="text-white/40 text-xs truncate">{by(p)}</p>
                      </div>
                      <span className="text-white/50 text-xs font-medium shrink-0">{price(p)}</span>
                      <span className="w-8 h-8 rounded-full bg-white/5 group-hover:bg-[#9D4EDD] flex items-center justify-center transition-colors shrink-0"><Play className="w-3.5 h-3.5 text-white fill-white ml-0.5" /></span>
                    </Link>
                  ))}
                </div>
              </div>
              </Reveal>
            </div>
            );
          })()}
        </div>
      </section>

      {/* ── 5. FEATURED CREATORS ──────────────────────────────────────── */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-violet-500/10 rounded-xl flex items-center justify-center">
                <span className="text-violet-400 text-lg">★</span>
              </div>
              <div>
                <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white">Featured Creators</h2>
                <p className="text-white/40 text-xs">Verified artists on WANKONG</p>
              </div>
            </div>
            <Link to="/collections/music" className="text-[#00D9FF] text-sm hover:underline">See All</Link>
          </div>
          <div className="flex gap-5 overflow-x-auto pb-3 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {(featuredArtists.length ? featuredArtists : MOCK_ARTISTS).map((artist: any, i: number) => {
              const GRADIENTS = ['from-violet-600 to-cyan-500','from-fuchsia-600 to-[#9D4EDD]','from-emerald-500 to-cyan-500','from-orange-500 to-pink-600','from-[#9D4EDD] to-violet-600','from-cyan-500 to-violet-600'];
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
                  <TiltCard className="rounded-2xl" glow="rgba(157,78,221,0.40)">
                  <div className="relative rounded-2xl overflow-hidden">
                    {/* animated gradient border (on hover) */}
                    <div className="pointer-events-none absolute inset-[-60%] wk-spin opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ background: 'conic-gradient(from 0deg, transparent 0%, #9D4EDD 18%, #00D9FF 34%, transparent 52%)' }} />
                    <div className="relative m-[1.5px] rounded-2xl bg-[#120C22] overflow-hidden">
                      {/* banner */}
                      <div className={`relative h-24 bg-gradient-to-br ${GRADIENTS[i % GRADIENTS.length]}`}>
                        <div className="absolute inset-0 opacity-25" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.5) 1px, transparent 1.5px)', backgroundSize: '13px 13px' }} />
                        {live && (
                          <span className="absolute top-2.5 left-2.5 inline-flex items-center gap-1 px-2 py-0.5 bg-red-500 text-white text-[10px] font-black rounded-full wk-live">
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
                  </TiltCard>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── 6. FEATURED PERFORMANCES ──────────────────────────────────── */}
      <SectionErrorBoundary><FeaturedPerformancesGrid /></SectionErrorBoundary>

      {/* ── 7. TRENDING BOOKS ─────────────────────────────────────────── */}
      <section className="py-16 relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-[420px] -z-10 pointer-events-none bg-[radial-gradient(ellipse_at_50%_0%,rgba(255,184,0,0.10),transparent_70%)]" />
        <div className="max-w-7xl mx-auto px-4">
          <Reveal>
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-500/15 rounded-xl flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h2 className="text-3xl md:text-4xl font-black tracking-tight text-white">Trending Books</h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-white/40 text-sm">Top reads in the community this week</p>
                  <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#00F5A0]/10 border border-[#00F5A0]/25 text-[#00F5A0] text-[10px] font-bold">
                    <Languages className="w-2.5 h-2.5" /> AI translation · 16 languages
                  </span>
                </div>
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
            {['All', 'Fiction', 'Business', 'Self-Help', 'Poetry', 'Sci-Fi', 'Romance', 'Biography'].map(genre => (
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
                <h2 className="text-3xl md:text-4xl font-black tracking-tight text-white">Creator Marketplace</h2>
                <p className="text-white/40 text-sm">Hire top creative talent — producers, studios, mixing & more</p>
              </div>
            </div>
            <Link to="/collections/marketplace" className="text-[#00D9FF] hover:text-[#00D9FF]/80 text-sm font-semibold flex items-center gap-1">Browse Services <ArrowRight className="w-4 h-4" /></Link>
          </div>
          </Reveal>

          {/* Floating service bubbles — a constellation of creative talent */}
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-7 md:gap-x-9 py-2">
            {[
              { icon: Music,            label: 'Producers',    count: '1,240 pros',  color: '#00D9FF', big: true,  ai: false },
              { icon: Mic,              label: 'Studios',      count: '480 spaces',  color: '#9D4EDD', big: false, ai: false },
              { icon: SlidersHorizontal,label: 'Mixing',       count: '860 pros',    color: '#00F5A0', big: false, ai: true  },
              { icon: Headphones,       label: 'Mastering',    count: 'AI + 520 pros',color: '#FFB800', big: true,  ai: true  },
              { icon: Scissors,         label: 'Editors',      count: '930 pros',    color: '#FF6B00', big: false, ai: false },
              { icon: Palette,          label: 'Artwork',      count: 'AI + 1,510',  color: '#FF006E', big: true,  ai: true  },
              { icon: Megaphone,        label: 'Marketing',    count: '670 pros',    color: '#00D9FF', big: false, ai: false },
              { icon: Globe,            label: 'Distribution', count: '30+ stores',  color: '#9D4EDD', big: false, ai: false },
            ].map((s, i) => (
              <Reveal key={s.label} delay={i * 50}>
                <Link to="/collections/marketplace" className="group block" aria-label={`${s.label} — ${s.count}`}>
                  <div className="wk-coverfloat" style={{ animationDelay: `${(i % 4) * 0.7}s` }}>
                    <div
                      className={`relative rounded-full border border-white/12 bg-white/[0.04] backdrop-blur-md flex flex-col items-center justify-center gap-1 overflow-hidden transition-all duration-300 group-hover:scale-105 group-hover:border-white/30 ${s.big ? 'w-32 h-32 md:w-36 md:h-36' : 'w-28 h-28 md:w-32 md:h-32'}`}
                      style={{ boxShadow: `0 8px 30px -8px ${s.color}33` }}
                    >
                      <div className="absolute inset-0 rounded-full opacity-70 transition-opacity group-hover:opacity-100" style={{ background: `radial-gradient(circle at 50% 28%, ${s.color}22, transparent 72%)` }} />
                      {s.ai && (
                        <span className="absolute top-3 right-3 z-10 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-white/10 border border-white/15 backdrop-blur text-[8px] font-black tracking-wider text-white/90">
                          <Sparkles className="w-2.5 h-2.5 text-[#00F5A0]" /> AI
                        </span>
                      )}
                      <div className="relative w-11 h-11 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110" style={{ backgroundColor: `${s.color}24` }}>
                        <s.icon className="w-5 h-5" style={{ color: s.color }} />
                      </div>
                      <p className="relative text-white text-[13px] font-bold leading-none mt-0.5">{s.label}</p>
                      <p className="relative text-white/45 text-[10px]">{s.count}</p>
                    </div>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── 8. AUDIOBOOKS ─────────────────────────────────────────────── */}
      <section className="py-12 relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-[420px] -z-10 pointer-events-none bg-[radial-gradient(ellipse_at_50%_0%,rgba(255,0,110,0.09),transparent_70%)]" />
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-orange-500/10 rounded-xl flex items-center justify-center">
                <Headphones className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white">Audiobooks</h2>
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
                <h2 className="text-3xl md:text-4xl font-black tracking-tight text-white">Podcast Studio</h2>
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
              <span className="relative inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-500 text-white text-[10px] font-black rounded-full wk-live">
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
                { title: 'The Creator Economy', host: 'Ava Sterling', dur: '32 min', grad: 'from-[#FF6B00] to-[#FFB800]' },
                { title: 'Global Beat Files', host: 'DJ Beacon', dur: '55 min', grad: 'from-[#00F5A0] to-[#0E9E6E]' },
                { title: 'Studio Sessions', host: 'Valentina C.', dur: '41 min', grad: 'from-[#FF006E] to-[#9D4EDD]' },
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

      {/* ── TALENT ARENA — LIVE COMPETITION (YouTube-embedded entries) ─────── */}
      <section className="py-14 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(255,107,0,0.10),transparent_70%)]" />
        <div className="relative max-w-7xl mx-auto px-4">
          {/* Cinematic stage banner */}
          <Reveal>
          <div className="relative mb-6 rounded-3xl overflow-hidden border border-white/10 bg-gradient-to-b from-[#1a0f04] via-[#0F0A1E] to-[#0B0814]">
            {/* spotlight beams sweeping the stage */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
              <div className="absolute -top-1/2 left-[18%] w-40 h-[180%] rotate-[18deg] blur-2xl opacity-[0.35] wk-spotlight bg-[linear-gradient(to_bottom,rgba(255,184,0,0.55),transparent_72%)]" />
              <div className="absolute -top-1/2 left-[46%] w-48 h-[180%] -rotate-[10deg] blur-2xl opacity-30 wk-spotlight bg-[linear-gradient(to_bottom,rgba(255,107,0,0.5),transparent_72%)]" style={{ animationDelay: '1.4s' }} />
              <div className="absolute -top-1/2 left-[72%] w-40 h-[180%] rotate-[12deg] blur-2xl opacity-[0.28] wk-spotlight bg-[linear-gradient(to_bottom,rgba(157,78,221,0.5),transparent_72%)]" style={{ animationDelay: '2.6s' }} />
              <div className="absolute inset-0 wk-stars opacity-40" />
              {/* stage floor glow */}
              <div className="absolute inset-x-0 bottom-0 h-24 bg-[radial-gradient(ellipse_at_50%_120%,rgba(255,184,0,0.22),transparent_70%)]" />
            </div>
            <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-5 px-6 md:px-9 py-8 md:py-10">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#FF6B00] to-[#FFB800] flex items-center justify-center shadow-xl shadow-[#FF6B00]/30 shrink-0 wk-breathe">
                  <Trophy className="w-7 h-7 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-500 text-white text-[10px] font-black rounded-full wk-live"><span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" /> LIVE NOW</span>
                    <span className="text-[#FFB800] text-[11px] font-bold uppercase tracking-[0.25em]">Global Stage</span>
                  </div>
                  <h2 className="text-3xl md:text-4xl font-black text-white leading-none tracking-tight">Talent Arena</h2>
                  <p className="text-white/45 text-sm mt-1.5 max-w-md">One song. Creators worldwide film their take — watch the performances and vote for the best.</p>
                </div>
              </div>
              <div className="flex items-center gap-5 md:gap-6 md:pr-2">
                <div className="text-left md:text-right">
                  <p className="text-white/40 text-[10px] uppercase tracking-widest">Prize pool</p>
                  <p className="text-2xl md:text-3xl font-black bg-gradient-to-r from-[#FFB800] to-[#FF6B00] bg-clip-text text-transparent tabular-nums">{ARENA_CHALLENGE.prize}</p>
                </div>
                <div className="w-px h-10 bg-white/10 hidden md:block" />
                <div className="text-left md:text-right">
                  <p className="text-white/40 text-[10px] uppercase tracking-widest">Competing</p>
                  <p className="text-2xl md:text-3xl font-black text-white tabular-nums">{arenaEntries.length}</p>
                </div>
                <Link to="/collections/talent-arena" className="ml-1 px-5 py-2.5 rounded-xl bg-white text-[#0B0814] font-bold text-sm hover:bg-white/90 transition-colors whitespace-nowrap flex items-center gap-1.5 shadow-lg">Enter Arena <ArrowRight className="w-4 h-4" /></Link>
              </div>
            </div>
          </div>
          </Reveal>

          {(() => {
            const ranked = arenaEntries
              .map(e => ({ ...e, v: entryVotes[e.id] ?? e.votes }))
              .sort((a, b) => b.v - a.v);
            const total = ranked.reduce((s, e) => s + e.v, 0) || 1;
            const hh = String(Math.floor(battleCountdown / 3600)).padStart(2, '0');
            const mm = String(Math.floor((battleCountdown % 3600) / 60)).padStart(2, '0');
            const ss = String(battleCountdown % 60).padStart(2, '0');
            const RANK = ['#FFB800', '#C0C0C0', '#CD7F32'];
            return (
            <Reveal>
            <div className="rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-transparent backdrop-blur-sm p-5 md:p-7">

              {/* Challenge song + countdown */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-6 border-b border-white/8">
                <div className="flex items-center gap-4">
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${ARENA_CHALLENGE.cover} flex items-center justify-center shrink-0 shadow-lg`}>
                    <Music className="w-7 h-7 text-white/80" />
                  </div>
                  <div>
                    <span className="text-[#FFB800] text-[11px] font-bold uppercase tracking-widest">The Challenge</span>
                    <p className="text-white font-black text-lg leading-tight">{ARENA_CHALLENGE.title}</p>
                    <p className="text-white/45 text-sm">{ARENA_CHALLENGE.artist} · {arenaEntries.length} creators competing</p>
                  </div>
                </div>
                <div className="flex flex-col items-start md:items-end">
                  <span className="text-white/40 text-[11px] uppercase tracking-widest mb-1.5">Voting closes in</span>
                  <div className="flex items-center gap-1.5 font-black text-white text-xl tabular-nums">
                    <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10">{hh}</span><span className="text-white/30">:</span>
                    <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10">{mm}</span><span className="text-white/30">:</span>
                    <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10">{ss}</span>
                  </div>
                </div>
              </div>

              {/* Competitor entries — YouTube videos embedded to play inline */}
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {ranked.map((e, i) => {
                  const pct = Math.round((e.v / total) * 100);
                  const voted = votedEntry === e.id;
                  const playing = playingEntry === e.id;
                  const initials = e.name.split(' ').map(w => w[0]).join('').slice(0, 2);
                  return (
                    <div key={e.id} className="group rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden hover:border-white/20 transition-colors">
                      {/* YouTube embed (click poster to play on the homepage) */}
                      <div className="relative aspect-video bg-black overflow-hidden">
                        {playing ? (
                          <iframe
                            className="absolute inset-0 w-full h-full"
                            src={`https://www.youtube.com/embed/${e.youtubeId}?autoplay=1&rel=0&modestbranding=1`}
                            title={`${e.name} — ${e.take}`}
                            loading="lazy"
                            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                            allowFullScreen
                          />
                        ) : (
                          <button
                            onClick={() => setPlayingEntry(e.id)}
                            className="absolute inset-0 w-full h-full group/yt"
                            aria-label={`Play ${e.name}'s performance`}
                          >
                            <img
                              src={`https://img.youtube.com/vi/${e.youtubeId}/hqdefault.jpg`}
                              alt={`${e.name} performance`}
                              loading="lazy"
                              className="w-full h-full object-cover"
                            />
                            <span className="absolute inset-0 bg-black/30 group-hover/yt:bg-black/15 transition-colors" />
                            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-2xl bg-[#FF0000] flex items-center justify-center shadow-lg group-hover/yt:scale-110 transition-transform">
                              <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                            </span>
                          </button>
                        )}
                        <span className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur text-[12px] font-black pointer-events-none" style={{ color: i < 3 ? RANK[i] : '#fff' }}>#{i + 1}</span>
                        <span className="absolute top-2 right-2 z-10 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur text-white/90 text-[10px] font-semibold pointer-events-none">{e.take}</span>
                        {!playing && <div className="absolute bottom-2 right-2 z-10"><WatchLinks platforms={e.platforms} /></div>}
                      </div>
                      {/* meta + vote */}
                      <div className="p-3.5">
                        <div className="flex items-center gap-2 mb-2.5">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#9D4EDD] to-[#00D9FF] flex items-center justify-center text-white text-[11px] font-bold shrink-0">{initials}</div>
                          <div className="min-w-0 flex-1">
                            <p className="text-white text-sm font-semibold truncate">{e.name} <span className="ml-0.5">{e.flag}</span></p>
                            <p className="text-white/40 text-[11px] tabular-nums">{e.v.toLocaleString()} votes · {pct}%</p>
                          </div>
                        </div>
                        <div className="h-1.5 rounded-full bg-white/5 overflow-hidden mb-3">
                          <div className="h-full bg-gradient-to-r from-[#9D4EDD] to-[#00D9FF] transition-all duration-500" style={{ width: `${pct}%` }} />
                        </div>
                        <button
                          onClick={() => voteFor(e.id)}
                          disabled={votedEntry !== null}
                          className={`w-full py-2 rounded-lg text-sm font-bold transition-all ${voted ? 'bg-[#00F5A0]/15 text-[#00F5A0] border border-[#00F5A0]/30' : votedEntry ? 'bg-white/5 text-white/30 cursor-not-allowed' : 'bg-gradient-to-r from-[#9D4EDD] to-[#00D9FF] text-white hover:opacity-90'}`}
                        >
                          {voted ? '✓ Voted' : votedEntry ? 'Voting closed' : 'Vote'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Submit entry CTA — uploads auto-publish to social channels, then appear here */}
              <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-white/10 bg-gradient-to-r from-[#9D4EDD]/10 to-[#00D9FF]/5 p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF6B00] to-[#FFB800] flex items-center justify-center shrink-0"><Mic className="w-5 h-5 text-white" /></div>
                  <div>
                    <p className="text-white font-bold text-sm">Think you can top this?</p>
                    <p className="text-white/45 text-xs">Record your take on “{ARENA_CHALLENGE.title}” — we auto-publish it to YouTube, TikTok &amp; more, then it shows up right here.</p>
                  </div>
                </div>
                <Link to="/talent-arena/upload" className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#FF6B00] to-[#FFB800] text-white font-bold text-sm hover:opacity-90 transition-opacity whitespace-nowrap flex items-center gap-2"><UploadCloud className="w-4 h-4" /> Submit your entry</Link>
              </div>
            </div>
            </Reveal>
            );
          })()}
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
                <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white">Top Creators This Week</h2>
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
            <h2 className="text-4xl md:text-5xl font-black tracking-tight text-white mb-2">Stories from the community</h2>
            <p className="text-white/40 text-sm">Real creators · real earnings · real reach</p>
          </div>
          </Reveal>

          <div className="grid md:grid-cols-3 gap-5">
            {[
              { quote: 'WANKONG put my album on 30+ platforms in a weekend — and I kept 100% of my royalties.', name: 'Ava Sterling', role: 'Pop Artist', flag: '🇬🇧', stat: '$18K earned', grad: 'from-[#9D4EDD] to-[#00D9FF]' },
              { quote: 'The Talent Arena changed everything. I went from 200 to 60,000 fans after a single live battle.', name: 'Kojo Mensah', role: 'Afrobeats Producer', flag: '🇬🇭', stat: '2.3M streams', grad: 'from-[#FF6B00] to-[#FFB800]' },
              { quote: 'I published my book and audiobook in three languages. Sales tripled in the first month.', name: 'Dr. Faith Mensah', role: 'Author', flag: '🇰🇪', stat: '4.2K readers', grad: 'from-[#00F5A0] to-[#0E9E6E]' },
            ].map((t, i) => (
              <Reveal key={t.name} delay={i * 90}>
                <TiltCard className="h-full rounded-2xl" max={5} glow="rgba(157,78,221,0.28)">
                <div className="group relative h-full rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm p-6 hover:border-white/20 transition-colors duration-300 overflow-hidden">
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
                </TiltCard>
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

      {/* ── PRESS / FEATURED ──────────────────────────────────────────── */}
      <section className="py-10 border-y border-white/5">
        <div className="max-w-7xl mx-auto px-4">
          <p className="text-center text-white/30 text-xs uppercase tracking-[0.2em] mb-5">Trusted &amp; featured across the industry</p>
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
            {['Billboard', 'Rolling Stone', 'TechCrunch', 'Pitchfork', 'The Distributor', 'Creator Weekly'].map(n => (
              <span key={n} className="text-white/35 hover:text-white/60 transition-colors font-bold text-base md:text-lg tracking-tight">{n}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ──────────────────────────────────────────────── */}
      <section className="py-16 relative">
        <div className="max-w-7xl mx-auto px-4">
          <Reveal>
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#00D9FF]/10 border border-[#00D9FF]/20 rounded-full text-[#00D9FF] text-xs font-semibold mb-3">How it works</div>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight text-white mb-2">From upload to payout in 3 steps</h2>
            <p className="text-white/40 text-sm">Go global — without the gatekeepers.</p>
          </div>
          </Reveal>
          <div className="grid md:grid-cols-3 gap-8 relative">
            <div className="hidden md:block absolute top-12 left-[17%] right-[17%] h-px bg-gradient-to-r from-[#9D4EDD]/40 via-[#00D9FF]/40 to-[#00F5A0]/40" />
            {[
              { icon: UploadCloud, title: 'Upload', desc: 'Drop your music, books, audiobooks or videos. Add cover art, languages and pricing.', grad: 'from-[#9D4EDD] to-[#6D2EBD]' },
              { icon: Rocket,      title: 'Distribute', desc: 'Our AI engine delivers to 30+ stores — Spotify, Apple, TikTok, YouTube and more.', grad: 'from-[#00D9FF] to-[#0E7C9E]' },
              { icon: DollarSign,  title: 'Get Paid', desc: 'Track streams in real time and keep 100% of your royalties, paid out worldwide.', grad: 'from-[#00F5A0] to-[#0E9E6E]' },
            ].map((s, i) => (
              <Reveal key={s.title} delay={i * 110}>
                <div className="relative text-center">
                  <div className={`relative mx-auto w-24 h-24 rounded-2xl bg-gradient-to-br ${s.grad} flex items-center justify-center mb-5 shadow-xl`}>
                    <s.icon className="w-10 h-10 text-white" />
                    <span className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-white text-[#0B0814] font-black flex items-center justify-center text-sm shadow">{i + 1}</span>
                  </div>
                  <h3 className="text-white font-bold text-lg mb-2">{s.title}</h3>
                  <p className="text-white/45 text-sm max-w-xs mx-auto leading-relaxed">{s.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ───────────────────────────────────────────────────── */}
      <section className="py-16 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(157,78,221,0.08),transparent_70%)]" />
        <div className="relative max-w-7xl mx-auto px-4">
          <Reveal>
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#FFB800]/10 border border-[#FFB800]/20 rounded-full text-[#FFB800] text-xs font-semibold mb-3">Pricing</div>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight text-white mb-2">Simple, creator-first pricing</h2>
            <p className="text-white/40 text-sm">Keep 100% of your royalties — always.</p>
          </div>
          </Reveal>
          <div className="grid md:grid-cols-3 gap-5 max-w-5xl mx-auto items-stretch">
            {[
              { name: 'Starter', price: '$0', sub: 'Forever free', featured: false, cta: 'Start Free', accent: '#00D9FF', features: ['Upload unlimited tracks', 'Sell on the WANKONG store', 'Basic analytics', 'Community support'] },
              { name: 'Pro', price: '$9', sub: 'per month', featured: true, cta: 'Go Pro', accent: '#9D4EDD', features: ['Everything in Starter', 'Distribute to 30+ platforms', 'Real-time royalty tracking', 'Talent Arena entry', 'Priority support'] },
              { name: 'Label', price: '$29', sub: 'per month', featured: false, cta: 'Contact Sales', accent: '#FFB800', features: ['Everything in Pro', 'Multi-artist roster', 'Royalty splits & teams', 'Custom branding', 'Dedicated manager'] },
            ].map((p, i) => (
              <Reveal key={p.name} delay={i * 90} className="h-full">
                <div className={`relative h-full rounded-2xl p-6 flex flex-col transition-all duration-300 hover:-translate-y-1.5 ${p.featured ? 'border-2 border-[#9D4EDD]/60 bg-gradient-to-b from-[#9D4EDD]/12 to-transparent shadow-xl shadow-[#9D4EDD]/15' : 'border border-white/10 bg-white/[0.03]'}`}>
                  {p.featured && <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-[#9D4EDD] to-[#00D9FF] text-white text-[10px] font-black rounded-full uppercase tracking-wide">Most Popular</span>}
                  <p className="text-white font-bold text-lg">{p.name}</p>
                  <div className="flex items-baseline gap-1 mt-2 mb-1">
                    <span className="text-4xl font-black text-white">{p.price}</span>
                    <span className="text-white/40 text-sm">/{p.sub.includes('month') ? 'mo' : 'free'}</span>
                  </div>
                  <p className="text-white/40 text-xs mb-5">{p.sub}</p>
                  <ul className="space-y-2.5 mb-6 flex-1">
                    {p.features.map(f => (
                      <li key={f} className="flex items-start gap-2 text-sm text-white/70">
                        <Check className="w-4 h-4 mt-0.5 shrink-0" style={{ color: p.accent }} />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link to="/pricing" className={`mt-auto block text-center py-3 rounded-xl font-bold text-sm transition-all ${p.featured ? 'bg-gradient-to-r from-[#9D4EDD] to-[#00D9FF] text-white hover:opacity-90' : 'bg-white/5 border border-white/15 text-white hover:bg-white/10'}`}>{p.cta}</Link>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────────────────────── */}
      <section className="py-16">
        <div className="max-w-3xl mx-auto px-4">
          <Reveal>
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#00F5A0]/10 border border-[#00F5A0]/20 rounded-full text-[#00F5A0] text-xs font-semibold mb-3">FAQ</div>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight text-white mb-2">Questions? Answered.</h2>
            <p className="text-white/40 text-sm">Everything you need to know before you start.</p>
          </div>
          </Reveal>
          <div className="space-y-3">
            {[
              { q: 'Do I keep my royalties?', a: 'Yes — 100%. WANKONG never takes a cut of your streaming or sales royalties. You only pay your plan fee.' },
              { q: 'Which platforms do you distribute to?', a: 'Spotify, Apple Music, YouTube Music, TikTok, Amazon Music, Deezer, Tidal, Boomplay and 20+ more — over 30 stores worldwide.' },
              { q: 'Can I publish books and audiobooks too?', a: 'Absolutely. WANKONG is a full creator marketplace — music, eBooks, audiobooks, videos and podcasts, in multiple languages.' },
              { q: 'How fast do I get paid?', a: 'Royalties are tracked in real time and paid out monthly via Stripe, M-Pesa, MTN MoMo and more.' },
              { q: 'What is the Talent Arena?', a: 'Live, global head-to-head competitions where fans vote for their favorite creators. Winners earn prizes and massive exposure.' },
            ].map((f, i) => (
              <Reveal key={i} delay={i * 60}>
                <div className="rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden">
                  <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="w-full flex items-center justify-between gap-4 p-5 text-left hover:bg-white/[0.02] transition-colors">
                    <span className="text-white font-semibold text-sm md:text-base">{f.q}</span>
                    <ChevronDown className={`w-5 h-5 text-white/50 shrink-0 transition-transform duration-300 ${openFaq === i ? 'rotate-180' : ''}`} />
                  </button>
                  <div className={`grid transition-all duration-300 ease-out ${openFaq === i ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                    <div className="overflow-hidden">
                      <p className="px-5 pb-5 text-white/50 text-sm leading-relaxed">{f.a}</p>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── 11. DISTRIBUTION CTA ──────────────────────────────────────── */}
      <section className="py-16 relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-[420px] -z-10 pointer-events-none bg-[radial-gradient(ellipse_at_50%_0%,rgba(45,107,255,0.10),transparent_70%)]" />
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
