// Image URLs
export const IMAGES = {
  hero: 'https://d64gsuwffb70l.cloudfront.net/69bdd0721a1fe097ab8615d8_1774047590438_0a152d8a.png',
  creators: [
    'https://d64gsuwffb70l.cloudfront.net/69bde649669788a66318d897_1774053194842_4e7d08fa.png',
    'https://d64gsuwffb70l.cloudfront.net/69bde649669788a66318d897_1774053186152_a5879d67.jpg',
    'https://d64gsuwffb70l.cloudfront.net/69bde649669788a66318d897_1774053262911_338b602f.png',
    'https://d64gsuwffb70l.cloudfront.net/69bde649669788a66318d897_1774053195174_1f65915a.png',
    'https://d64gsuwffb70l.cloudfront.net/69bde649669788a66318d897_1774053279433_076743a5.jpg',
    'https://d64gsuwffb70l.cloudfront.net/69bde649669788a66318d897_1774053281195_3603bc91.jpg',
    'https://d64gsuwffb70l.cloudfront.net/69bde649669788a66318d897_1774053285720_db058b51.jpg',
    'https://d64gsuwffb70l.cloudfront.net/69bde649669788a66318d897_1774053288237_83c81ac1.png',
  ],
  albums: [
    'https://d64gsuwffb70l.cloudfront.net/69bde649669788a66318d897_1774053314367_c35ab590.jpg',
    'https://d64gsuwffb70l.cloudfront.net/69bde649669788a66318d897_1774053317838_445c1653.jpg',
    'https://d64gsuwffb70l.cloudfront.net/69bde649669788a66318d897_1774053319978_3606005c.jpg',
    'https://d64gsuwffb70l.cloudfront.net/69bde649669788a66318d897_1774053336943_5453fd20.png',
    'https://d64gsuwffb70l.cloudfront.net/69bde649669788a66318d897_1774053333688_d4dd31da.png',
    'https://d64gsuwffb70l.cloudfront.net/69bde649669788a66318d897_1774053321694_21dd71b1.jpg',
  ],
  thumbnails: [
    'https://d64gsuwffb70l.cloudfront.net/69bde649669788a66318d897_1774053362630_93b47696.png',
    'https://d64gsuwffb70l.cloudfront.net/69bde649669788a66318d897_1774053354252_6b0e039f.jpg',
    'https://d64gsuwffb70l.cloudfront.net/69bde649669788a66318d897_1774053364952_67a6522e.jpg',
    'https://d64gsuwffb70l.cloudfront.net/69bde649669788a66318d897_1774053357848_39a24c42.jpg',
  ],
};

export type UserRole = 'viewer' | 'creator' | 'singer_artist' | 'admin' | 'moderator' | 'finance_manager' | 'distribution_manager' | 'marketing_manager' | 'analytics_manager';
export type ContentType = 'book' | 'music' | 'video' | 'podcast' | 'article' | 'course';
export type ViewPage = 'home' | 'marketplace' | 'competitions' | 'dashboard' | 'wallet' | 'admin' | 'distribution' | 'analytics' | 'upload' | 'settings' | 'notifications' | 'library';

export interface Creator {
  id: string;
  name: string;
  username: string;
  avatar: string;
  verified: boolean;
  followers: number;
  earnings: number;
  country: string;
  category: string;
  bio: string;
}

export interface ContentItem {
  id: string;
  title: string;
  creator: string;
  creatorAvatar: string;
  type: ContentType;
  thumbnail: string;
  price: number;
  isPaid: boolean;
  views: number;
  likes: number;
  category: string;
  tags: string[];
  description: string;
  createdAt: string;
}

export interface Competition {
  id: string;
  name: string;
  type: 'weekly' | 'monthly' | 'special';
  category: string;
  prizePool: number;
  startDate: string;
  endDate: string;
  status: 'upcoming' | 'active' | 'voting' | 'completed';
  entries: number;
  sponsor: string;
  banner: string;
}

export interface Transaction {
  id: string;
  type: string;
  amount: number;
  currency: string;
  status: string;
  description: string;
  date: string;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  date: string;
}

// Categories
export const CATEGORIES = ['All', 'Music', 'Video', 'Podcast', 'Book', 'Course', 'Article', 'Product'];
export const COUNTRIES = ['All', 'Nigeria', 'Kenya', 'Ghana', 'South Africa', 'USA', 'UK', 'Japan', 'Mexico', 'Senegal'];

// Stats for dashboard
export const PLATFORM_STATS = {
  totalCreators: 12450,
  totalContent: 89200,
  totalRevenue: 4560000,
  activeCompetitions: 8,
  totalPayouts: 2340000,
  activeSubscriptions: 45600,
  countriesServed: 42,
  monthlyActiveUsers: 890000,
};

export function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
}
