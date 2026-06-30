import React from 'react';
import { useParams } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

type PartnerType = {
  title: string;
  subtitle: string;
  color: string;
  description: string;
  benefits: string[];
  requirements: string[];
  cta: string;
  email: string;
};

const PARTNER_TYPES: Record<string, PartnerType> = {
  government: {
    title: 'WANKONG for Governments',
    subtitle: 'Cultural content platform for public media and cultural ministries',
    color: '#00D9FF',
    description: 'WANKONG partners with government cultural ministries, public broadcasters, and national heritage institutions to digitise, distribute, and preserve national creative output. We provide a sovereign-friendly platform for cultural content — music, oral histories, literature, and performing arts — reaching citizens and diaspora worldwide.',
    benefits: [
      'Dedicated government content portal with ministry branding options',
      'Distribution of national cultural archives to global audiences',
      'Public media integration for radio and television catalogues',
      'Multilingual publishing pipeline supporting 16 languages and growing',
      'Audience analytics by region, language, and content category',
      'Compliance with data sovereignty requirements',
    ],
    requirements: [
      'Recognised government entity or official cultural institution',
      'Verified ownership or stewardship of submitted content',
      'Designated technical and editorial point of contact',
      'Willingness to engage in a 90-day onboarding programme',
    ],
    cta: 'Contact Government Partnerships',
    email: 'government@wankong.com',
  },
  universities: {
    title: 'WANKONG for Universities',
    subtitle: 'Educational audiobooks, multilingual content, and student creator support',
    color: '#9D4EDD',
    description: 'WANKONG partners with universities and higher education institutions to build multilingual digital libraries, support student creators, and publish academic and educational audiobooks accessible to students across Africa and the diaspora. Our platform helps universities reach students in their native languages.',
    benefits: [
      'Educational audiobook hosting and distribution to enrolled students',
      'Student creator programme — upload, distribute, and earn from original work',
      'Multilingual content discovery supporting local language curricula',
      'Institutional account with faculty-managed content moderation',
      'Research partnership opportunities with WANKONG data science team',
      'Revenue share on content sold to external audiences',
    ],
    requirements: [
      'Accredited higher education institution',
      'Designated academic content coordinator',
      'Institutional email domain for faculty and student authentication',
      'Commitment to WANKONG content quality standards',
    ],
    cta: 'Contact University Partnerships',
    email: 'universities@wankong.com',
  },
  churches: {
    title: 'WANKONG for Churches',
    subtitle: 'Gospel music distribution, worship videos, and congregation streaming',
    color: '#FFB800',
    description: 'WANKONG supports faith communities by providing a dignified, high-quality platform for gospel music distribution, worship video streaming, and sermon audiobooks. Whether you are an individual choir, a local congregation, or a national denomination, WANKONG helps your ministry reach listeners around the world.',
    benefits: [
      'Dedicated gospel and worship content category with discovery features',
      'Worship video streaming with live congregation access options',
      'Gospel music distribution to Spotify, Apple Music, and 190+ platforms',
      'Sermon audiobook publishing with chapter-by-chapter access',
      'Church account with ministry administrator controls',
      'Community features for congregation engagement and announcements',
    ],
    requirements: [
      'Registered religious organisation or faith community',
      'Original music, sermons, or worship content to distribute',
      'Compliance with WANKONG Community Guidelines',
      'Designated ministry content contact',
    ],
    cta: 'Contact Faith Partnerships',
    email: 'churches@wankong.com',
  },
  publishers: {
    title: 'WANKONG for Publishers',
    subtitle: 'Book distribution, translation pipeline, and audiobook conversion',
    color: '#00F5A0',
    description: 'WANKONG is the leading platform for African and diaspora literary content. We partner with publishers to distribute eBooks and audiobooks globally, offering translation pipeline services and AI-assisted audiobook conversion to help publishers scale their multilingual catalogue.',
    benefits: [
      'Global eBook and audiobook distribution via WANKONG marketplace',
      'Translation pipeline — human-verified translation into supported languages',
      'AI-assisted audiobook narration with creator approval workflow',
      'Dedicated publisher portal with per-title sales analytics',
      'ONIX metadata import for large catalogue onboarding',
      'Monthly royalty statements at 70/30 creator-publisher split',
    ],
    requirements: [
      'Registered publishing entity with rights to distribute in target territories',
      'EPUB, PDF, or audio files with complete metadata',
      'Minimum 5 titles for initial onboarding',
      'Agreement to WANKONG Distribution Agreement',
    ],
    cta: 'Contact Publisher Partnerships',
    email: 'publishers@wankong.com',
  },
  labels: {
    title: 'WANKONG for Record Labels',
    subtitle: 'Music distribution, artist management, and royalty tracking',
    color: '#FF6B00',
    description: 'WANKONG is the distribution and discovery platform for independent and established record labels. We help labels bring their full artist rosters to streaming platforms globally, manage royalty splits, track per-artist earnings, and leverage Talent Arena competitions to grow artist audiences.',
    benefits: [
      'Bulk catalogue upload with automated ISRC and UPC generation',
      'Dedicated label dashboard with per-artist streaming and earnings analytics',
      'Custom royalty splits between label and artist — flexible configurations',
      'Priority placement in WANKONG editorial playlists and curated collections',
      'Talent Arena label sponsorship — fund and brand your own competition rooms',
      'Distribution to 190+ DSPs via WANKONG\'s distribution partners',
    ],
    requirements: [
      'Registered legal entity holding music publishing and master rights',
      'Minimum 10 tracks at initial onboarding',
      'Complete metadata: ISRC codes, artist credits, liner notes',
      'Agreement to WANKONG Distribution Agreement and Label Terms',
    ],
    cta: 'Contact Label Partnerships',
    email: 'labels@wankong.com',
  },
};

const DEFAULT_TYPE: PartnerType = {
  title: 'WANKONG Partners',
  subtitle: 'For governments, universities, churches, publishers, and record labels',
  color: '#00D9FF',
  description: 'WANKONG partners with organisations across culture, education, faith, publishing, and music to expand access to global creative content. Explore our partnership programmes.',
  benefits: [
    'Government: /partners/government',
    'Universities: /partners/universities',
    'Churches: /partners/churches',
    'Publishers: /partners/publishers',
    'Record Labels: /partners/labels',
  ],
  requirements: [],
  cta: 'General Partnership Enquiry',
  email: 'partners@wankong.com',
};

export default function PartnersPage() {
  const { type } = useParams<{ type: string }>();
  const partner = (type && PARTNER_TYPES[type]) ? PARTNER_TYPES[type] : DEFAULT_TYPE;

  return (
    <div className="min-h-screen bg-[#0B0814]">
      <Header />

      <div className="max-w-4xl mx-auto px-4 lg:px-8 py-16">
        {/* Header */}
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 text-gray-400 text-sm px-4 py-1.5 rounded-full mb-5">
            Partnerships
          </div>
          <h1 className="text-4xl font-black text-white mb-2">{partner.title}</h1>
          <p className="text-gray-400 text-sm mb-4">{partner.subtitle}</p>
          <p className="text-gray-300 leading-relaxed">{partner.description}</p>
        </div>

        {/* Partner type tabs */}
        <div className="flex flex-wrap gap-2 mb-10">
          {Object.entries(PARTNER_TYPES).map(([key, p]) => (
            <a
              key={key}
              href={`/partners/${key}`}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all border ${
                type === key
                  ? 'text-[#0B0814] border-transparent'
                  : 'bg-white/5 border-white/10 text-gray-300 hover:border-white/20'
              }`}
              style={type === key ? { backgroundColor: p.color, borderColor: p.color } : {}}
            >
              {p.title}
            </a>
          ))}
        </div>

        {/* Benefits */}
        {partner.benefits.length > 0 && (
          <div className="mb-8">
            <h2 className="text-white font-semibold mb-4">Partnership Benefits</h2>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
              <ul className="space-y-3">
                {partner.benefits.map((b, i) => (
                  <li key={i} className="flex gap-3 text-sm text-gray-300">
                    <span className="mt-0.5 shrink-0" style={{ color: partner.color }}>✓</span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Requirements */}
        {partner.requirements.length > 0 && (
          <div className="mb-10">
            <h2 className="text-white font-semibold mb-4">Requirements</h2>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
              <ul className="space-y-3">
                {partner.requirements.map((r, i) => (
                  <li key={i} className="flex gap-3 text-sm text-gray-300">
                    <span className="text-gray-500 mt-0.5 shrink-0">•</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* CTA */}
        <div
          className="rounded-2xl p-6 text-center border"
          style={{ backgroundColor: `${partner.color}10`, borderColor: `${partner.color}30` }}
        >
          <h3 className="text-white font-semibold mb-2">{partner.cta}</h3>
          <p className="text-gray-400 text-sm mb-4">
            Send us an introduction email and we will be in touch within 3 business days.
          </p>
          <a
            href={`mailto:${partner.email}?subject=${encodeURIComponent(partner.cta)}`}
            className="inline-flex px-6 py-2.5 rounded-xl text-sm font-semibold text-[#0B0814] hover:opacity-90 transition-opacity"
            style={{ backgroundColor: partner.color }}
          >
            Email {partner.email}
          </a>
        </div>
      </div>

      <Footer />
    </div>
  );
}
