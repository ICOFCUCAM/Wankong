import React, { useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const ENDPOINTS = [
  { method: 'GET', path: '/v1/tracks', description: 'List published tracks with pagination and filter support' },
  { method: 'GET', path: '/v1/tracks/:id', description: 'Retrieve a single track by ID including metadata and stream URL' },
  { method: 'GET', path: '/v1/artists/:id', description: 'Retrieve an artist profile including biography and discography' },
  { method: 'GET', path: '/v1/books', description: 'List published eBooks and audiobooks in the marketplace' },
  { method: 'GET', path: '/v1/collections/:handle', description: 'Retrieve a curated collection with its items' },
  { method: 'POST', path: '/v1/uploads/track', description: 'Upload a new audio track (requires creator token)' },
  { method: 'POST', path: '/v1/uploads/book', description: 'Upload a new eBook or audiobook (requires creator token)' },
  { method: 'GET', path: '/v1/earnings/summary', description: 'Retrieve creator earnings summary (requires creator token)' },
  { method: 'GET', path: '/v1/competition/rooms', description: 'List active Talent Arena competition rooms' },
  { method: 'GET', path: '/v1/search', description: 'Full-text search across tracks, books, artists, and collections' },
];

const METHOD_COLORS: Record<string, string> = {
  GET: '#00F5A0',
  POST: '#00D9FF',
  PUT: '#FFB800',
  DELETE: '#EF4444',
};

const TIERS = [
  {
    name: 'Free',
    color: '#6B7280',
    limit: '100 requests / day',
    features: ['Read-only endpoints', 'Public content only', 'Community support'],
  },
  {
    name: 'Developer',
    color: '#00D9FF',
    limit: '10,000 requests / day',
    features: ['All read endpoints', 'Creator upload endpoints', 'Earnings read access', 'Email support'],
  },
  {
    name: 'Partner',
    color: '#9D4EDD',
    limit: 'Unlimited (rate-limited)',
    features: ['All endpoints', 'Webhooks', 'Priority technical support', 'Custom SLA', 'Dedicated partner manager'],
  },
];

export default function ApiAccessPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'endpoints' | 'tiers'>('overview');

  return (
    <div className="min-h-screen bg-[#0B0814]">
      <Header />

      <div className="max-w-5xl mx-auto px-4 lg:px-8 py-16">
        {/* Header */}
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 text-gray-400 text-sm px-4 py-1.5 rounded-full mb-5">
            Developer
          </div>
          <h1 className="text-4xl font-black text-white mb-3">API Access</h1>
          <p className="text-gray-400">
            The WANKONG API lets you integrate our content catalogue, search, creator tools, and competition data into your own applications.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 border-b border-white/10 pb-0">
          {(['overview', 'endpoints', 'tiers'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium capitalize rounded-t-lg border-b-2 transition-all ${
                activeTab === tab
                  ? 'border-[#00D9FF] text-[#00D9FF]'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Overview */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h2 className="text-white font-semibold mb-3">Base URL</h2>
              <code className="text-[#00F5A0] text-sm bg-black/30 px-4 py-2 rounded-lg block">
                https://api.wankong.com/v1
              </code>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h2 className="text-white font-semibold mb-3">Authentication</h2>
              <p className="text-gray-300 text-sm mb-3">All API requests require a Bearer token in the Authorization header:</p>
              <code className="text-[#00D9FF] text-sm bg-black/30 px-4 py-2 rounded-lg block whitespace-pre">
                {`Authorization: Bearer YOUR_API_KEY`}
              </code>
              <p className="text-gray-400 text-xs mt-3">API keys are generated in your Developer Dashboard after applying for access.</p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h2 className="text-white font-semibold mb-3">Response Format</h2>
              <p className="text-gray-300 text-sm mb-3">All responses are JSON with a standard envelope:</p>
              <code className="text-[#00F5A0] text-sm bg-black/30 px-4 py-2 rounded-lg block whitespace-pre">
{`{
  "success": true,
  "data": { ... },
  "meta": { "page": 1, "total": 100 },
  "error": null
}`}
              </code>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h2 className="text-white font-semibold mb-4">Getting Started</h2>
              <ol className="space-y-3">
                {[
                  'Create a WANKONG account at wankong.com',
                  'Apply for API access via api@wankong.com',
                  'Receive your API key within 2–3 business days',
                  'Make your first request to /v1/tracks to test authentication',
                  'Review the endpoint reference below and build your integration',
                ].map((step, i) => (
                  <li key={i} className="flex gap-3 text-sm text-gray-300">
                    <span className="w-5 h-5 rounded-full bg-[#00D9FF]/10 border border-[#00D9FF]/30 flex items-center justify-center text-[#00D9FF] text-xs font-bold shrink-0">
                      {i + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        )}

        {/* Endpoints */}
        {activeTab === 'endpoints' && (
          <div className="space-y-2">
            {ENDPOINTS.map(ep => (
              <div key={ep.path} className="bg-white/5 border border-white/10 rounded-xl px-5 py-4 flex flex-wrap items-center gap-3">
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded"
                  style={{
                    backgroundColor: `${METHOD_COLORS[ep.method] || '#6B7280'}15`,
                    color: METHOD_COLORS[ep.method] || '#6B7280',
                  }}
                >
                  {ep.method}
                </span>
                <code className="text-[#00D9FF] text-sm font-mono">{ep.path}</code>
                <span className="text-gray-400 text-sm ml-auto">{ep.description}</span>
              </div>
            ))}
            <p className="text-gray-500 text-xs pt-2">Full OpenAPI specification available after API access approval.</p>
          </div>
        )}

        {/* Tiers */}
        {activeTab === 'tiers' && (
          <div className="grid sm:grid-cols-3 gap-4">
            {TIERS.map(tier => (
              <div
                key={tier.name}
                className="bg-white/5 border border-white/10 rounded-2xl p-5"
                style={{ borderTopColor: tier.color, borderTopWidth: 3 }}
              >
                <h3 className="font-bold text-lg mb-1" style={{ color: tier.color }}>{tier.name}</h3>
                <p className="text-gray-400 text-xs mb-4">{tier.limit}</p>
                <ul className="space-y-2">
                  {tier.features.map(f => (
                    <li key={f} className="flex gap-2 text-sm text-gray-300">
                      <span style={{ color: tier.color }}>✓</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        {/* Apply */}
        <div className="mt-10 bg-[#00D9FF]/5 border border-[#00D9FF]/20 rounded-2xl p-6 text-center">
          <h3 className="text-white font-semibold mb-2">Apply for API Access</h3>
          <p className="text-gray-400 text-sm mb-4">
            Tell us about your project and intended use case. We review all applications within 3 business days.
          </p>
          <a
            href="mailto:api@wankong.com?subject=API Access Application"
            className="inline-flex px-6 py-2.5 bg-[#00D9FF] text-[#0B0814] rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            Email api@wankong.com
          </a>
        </div>
      </div>

      <Footer />
    </div>
  );
}
