import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ProductCard from '@/components/ProductCard';

interface AuthorData {
  id: string;
  displayName: string;
  username: string;
  bio: string;
  avatar: string;
  country: string;
  language: string;
  followers: number;
  totalBooks: number;
  totalReads: number;
}

export default function AuthorProfile() {
  const { id } = useParams<{ id: string }>();
  const [author, setAuthor] = useState<AuthorData | null>(null);
  const [books, setBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'books' | 'about'>('books');
  const [following, setFollowing] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);

    Promise.all([
      supabase.from('profiles').select('*').eq('id', id).single(),
      supabase
        .from('ecom_products')
        .select('*')
        .eq('status', 'active')
        .or(`vendor.ilike.%${id}%,author.ilike.%${id}%`)
        .limit(20),
    ]).then(([profileRes, booksRes]) => {
      if (profileRes.data) {
        const p = profileRes.data;
        setAuthor({
          id: p.id,
          displayName: p.display_name || p.full_name || 'Unknown Author',
          username: p.username || p.id,
          bio: p.bio || '',
          avatar: p.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${p.display_name || p.full_name || 'A'}`,
          country: p.country || '',
          language: p.language || 'en',
          followers: p.followers_count || 0,
          totalBooks: (booksRes.data || []).length,
          totalReads: p.total_reads || 0,
        });
      } else {
        // Fallback: treat id as author name and fetch books
        supabase
          .from('ecom_products')
          .select('*')
          .eq('status', 'active')
          .or(`vendor.ilike.%${id}%,author.ilike.%${id}%`)
          .limit(20)
          .then(({ data }) => {
            const bookList = data || [];
            const firstBook = bookList[0];
            setAuthor({
              id: id!,
              displayName: firstBook?.author || firstBook?.vendor || id!,
              username: id!,
              bio: '',
              avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${id}`,
              country: '',
              language: firstBook?.language || 'en',
              followers: 0,
              totalBooks: bookList.length,
              totalReads: 0,
            });
            setBooks(bookList);
            setLoading(false);
          });
        return;
      }
      setBooks((booksRes.data || []).map(p => ({
        ...p,
        image: p.images?.[0] || p.cover_art,
        price: p.variants?.[0]?.price ?? p.price,
      })));
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0814]">
        <Header />
        <div className="max-w-5xl mx-auto px-4 py-16">
          <div className="animate-pulse space-y-6">
            <div className="flex items-center gap-6">
              <div className="w-32 h-32 rounded-full bg-gray-800" />
              <div className="space-y-3 flex-1">
                <div className="h-8 bg-gray-800 rounded w-64" />
                <div className="h-4 bg-gray-800 rounded w-40" />
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="bg-gray-900/50 rounded-xl aspect-[3/4] animate-pulse" />
              ))}
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!author) {
    return (
      <div className="min-h-screen bg-[#0B0814] flex items-center justify-center">
        <Header />
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-2">Author not found</h2>
          <Link to="/" className="text-[#B794F4] hover:text-[#C9B3F5]">Back to homepage</Link>
        </div>
      </div>
    );
  }

  const LANG_NAMES: Record<string, string> = {
    en: 'English', fr: 'French', sw: 'Swahili', yo: 'Yoruba',
    ig: 'Igbo', ha: 'Hausa', zu: 'Zulu', ar: 'Arabic', pt: 'Portuguese',
  };

  return (
    <div className="min-h-screen bg-[#0B0814]">
      <Header />

      {/* Cover Banner */}
      <div className="h-48 sm:h-64 bg-gradient-to-br from-amber-900/40 via-gray-900 to-[#1E1235]/30 relative">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0djZoNnYtNmgtNnptMC0xMnY2aDZ2LTZoLTZ6bS0xMiAxMnY2aDZ2LTZoLTZ6bTAtMTJ2Nmg2di02aC02eiIvPjwvZz48L2c+PC9zdmc+')] opacity-20" />
      </div>

      <div className="max-w-5xl mx-auto px-4 lg:px-8">
        {/* Profile Info */}
        <div className="relative -mt-16 mb-8 flex flex-col sm:flex-row items-start sm:items-end gap-5">
          <img
            src={author.avatar}
            alt={author.displayName}
            className="w-32 h-32 rounded-2xl border-4 border-[#0B0814] object-cover bg-gray-800 flex-shrink-0"
            onError={e => { (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${author.displayName}`; }}
          />
          <div className="flex-1 pb-2">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div>
                <h1 className="text-2xl font-bold text-white">{author.displayName}</h1>
                <p className="text-gray-400 text-sm">@{author.username}</p>
              </div>
              <div className="sm:ml-auto flex items-center gap-2">
                <button
                  onClick={() => setFollowing(!following)}
                  className={`px-5 py-2 rounded-xl font-medium text-sm transition-colors ${following ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-amber-600 hover:bg-amber-700 text-white'}`}
                >
                  {following ? 'Following' : 'Follow'}
                </button>
                <Link
                  to={`/search?q=${encodeURIComponent(author.displayName)}`}
                  className="px-4 py-2 rounded-xl bg-gray-800 text-gray-300 hover:bg-gray-700 text-sm transition-colors"
                >
                  More
                </Link>
              </div>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-6 mt-4 text-sm">
              <div className="text-center">
                <p className="font-bold text-white">{author.totalBooks}</p>
                <p className="text-gray-400 text-xs">Books</p>
              </div>
              <div className="text-center">
                <p className="font-bold text-white">{(author.followers / 1000).toFixed(1)}K</p>
                <p className="text-gray-400 text-xs">Followers</p>
              </div>
              <div className="text-center">
                <p className="font-bold text-white">{(author.totalReads / 1000).toFixed(1)}K</p>
                <p className="text-gray-400 text-xs">Reads</p>
              </div>
              {author.country && (
                <div className="flex items-center gap-1 text-gray-400">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  <span className="text-xs">{author.country}</span>
                </div>
              )}
              {author.language && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  {LANG_NAMES[author.language] || author.language}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-gray-800 mb-8">
          {(['books', 'about'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-3 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${activeTab === tab ? 'border-amber-500 text-white' : 'border-transparent text-gray-400 hover:text-gray-200'}`}
            >
              {tab === 'books' ? `Books (${books.length})` : 'About'}
            </button>
          ))}
        </div>

        {/* Books Tab */}
        {activeTab === 'books' && (
          books.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5 pb-16">
              {books.map(book => (
                <ProductCard key={book.id} product={book} />
              ))}
            </div>
          ) : (
            <div className="text-center py-20 pb-32">
              <svg className="w-16 h-16 text-gray-700 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
              <p className="text-gray-400">No books published yet</p>
            </div>
          )
        )}

        {/* About Tab */}
        {activeTab === 'about' && (
          <div className="max-w-2xl pb-16">
            {author.bio ? (
              <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
                <h3 className="text-sm font-medium text-gray-400 mb-3 uppercase tracking-wider">About</h3>
                <p className="text-gray-300 leading-relaxed whitespace-pre-line">{author.bio}</p>
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500">No bio available</p>
              </div>
            )}

            <div className="mt-6 grid grid-cols-2 gap-4">
              {author.country && (
                <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
                  <p className="text-xs text-gray-500 mb-1">Country</p>
                  <p className="text-white font-medium">{author.country}</p>
                </div>
              )}
              {author.language && (
                <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
                  <p className="text-xs text-gray-500 mb-1">Primary Language</p>
                  <p className="text-white font-medium">{LANG_NAMES[author.language] || author.language}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
