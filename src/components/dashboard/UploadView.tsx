import React, { useState } from 'react';
import { useApp } from '@/store/AppContext';
import UploadMusicSingle        from '@/components/upload/UploadMusicSingle';
import UploadMusicEP            from '@/components/upload/UploadMusicEP';
import UploadMusicAlbum         from '@/components/upload/UploadMusicAlbum';
import UploadAudiobook          from '@/components/upload/UploadAudiobook';
import UploadPodcast            from '@/components/upload/UploadPodcast';
import UploadCompetitionPerformance from '@/components/upload/UploadCompetitionPerformance';
import UploadBook               from '@/components/upload/UploadBook';

// ── Release type definitions ───────────────────────────────────────────────────

type ReleaseType =
  | 'single'
  | 'ep'
  | 'album'
  | 'audiobook'
  | 'podcast'
  | 'competition'
  | 'book';

interface ReleaseTypeOption {
  id:          ReleaseType;
  label:       string;
  description: string;
  icon:        string;
  badge?:      string;
}

const RELEASE_TYPES: ReleaseTypeOption[] = [
  {
    id:          'single',
    label:       'Single',
    description: 'One track released to all major music platforms',
    icon:        '🎵',
  },
  {
    id:          'ep',
    label:       'EP',
    description: '2–6 track extended play with full distribution',
    icon:        '💿',
  },
  {
    id:          'album',
    label:       'Album',
    description: 'Full album — up to 50 tracks, worldwide distribution',
    icon:        '🎶',
    badge:       'Up to 50 tracks',
  },
  {
    id:          'audiobook',
    label:       'Audiobook',
    description: 'Chapter-by-chapter narrated book with pricing controls',
    icon:        '🎧',
  },
  {
    id:          'podcast',
    label:       'Podcast',
    description: 'Publish an episode to Spotify, Apple Podcasts & more',
    icon:        '🎙️',
  },
  {
    id:          'competition',
    label:       'Competition Performance',
    description: 'Submit a 2–8 min video for AI scoring and public voting',
    icon:        '🏆',
    badge:       'AI Scored',
  },
  {
    id:          'book',
    label:       'Book',
    description: 'eBook, softcover and hardcover with flexible sourcing',
    icon:        '📚',
  },
];

// ── Routing controller ─────────────────────────────────────────────────────────

export default function UploadView() {
  const { setCurrentPage } = useApp();

  const [releaseType, setReleaseType] = useState<ReleaseType | null>(null);
  const [submitted,   setSubmitted]   = useState(false);
  const [submittedType, setSubmittedType] = useState<string>('');

  const handleSuccess = (typeName: string) => {
    setSubmittedType(typeName);
    setSubmitted(true);
  };

  // ── Success screen ──────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="max-w-xl mx-auto py-20 text-center space-y-6">
        <div className="w-24 h-24 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto">
          <svg className="w-12 h-12 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div>
          <h2 className="text-3xl font-bold text-white">{submittedType} Submitted!</h2>
          <p className="text-gray-400 mt-2">Your release has been submitted for distribution. You can track per-platform status in your distribution dashboard.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => setCurrentPage('distribution')}
            className="bg-[#9D4EDD] hover:bg-[#7C3AED] text-white font-semibold px-6 py-3 rounded-xl transition-colors"
          >
            View Distribution Status
          </button>
          <button
            onClick={() => { setSubmitted(false); setReleaseType(null); }}
            className="bg-gray-800 hover:bg-gray-700 text-white font-semibold px-6 py-3 rounded-xl transition-colors border border-gray-700"
          >
            Upload Another
          </button>
        </div>
      </div>
    );
  }

  // ── Release type selector ───────────────────────────────────────────────────
  if (releaseType === null) {
    return (
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Upload & Distribute</h1>
          <p className="text-gray-400 mt-1">Choose a release type to get started. All formats support global distribution.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {RELEASE_TYPES.map(type => (
            <button
              key={type.id}
              onClick={() => setReleaseType(type.id)}
              className="relative text-left bg-gray-900/50 border border-gray-800 hover:border-[#9D4EDD]/60 hover:bg-gray-900/80 rounded-2xl p-6 transition-all group"
            >
              {type.badge && (
                <span className="absolute top-4 right-4 bg-[#9D4EDD]/20 text-[#C9B3F5] text-xs font-medium px-2 py-0.5 rounded-full border border-[#9D4EDD]/30">
                  {type.badge}
                </span>
              )}
              <div className="text-3xl mb-4">{type.icon}</div>
              <h3 className="text-white font-semibold text-lg group-hover:text-[#C9B3F5] transition-colors">{type.label}</h3>
              <p className="text-gray-400 text-sm mt-1 leading-relaxed">{type.description}</p>
              <div className="mt-4 flex items-center gap-1 text-xs text-[#B794F4] opacity-0 group-hover:opacity-100 transition-opacity">
                <span>Get started</span>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </div>
            </button>
          ))}
        </div>

        {/* Info callout */}
        <div className="bg-[#9D4EDD]/5 border border-[#9D4EDD]/20 rounded-2xl p-5 flex gap-4">
          <div className="text-2xl shrink-0">ℹ️</div>
          <div>
            <p className="text-sm font-semibold text-[#C9B3F5]">All releases include</p>
            <ul className="text-xs text-gray-400 mt-1 space-y-0.5">
              <li>• Auto ISRC generation if you don't have one</li>
              <li>• Royalty split management (artist, producer, label, and more)</li>
              <li>• Per-platform distribution toggle</li>
              <li>• Distribution status tracking dashboard</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  // ── Upload form for selected type ───────────────────────────────────────────

  const selectedOption = RELEASE_TYPES.find(t => t.id === releaseType)!;

  const handleBack = () => setReleaseType(null);

  const commonProps = { onSuccess: () => handleSuccess(selectedOption.label) };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back button + breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleBack}
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Back
        </button>
        <span className="text-gray-700">/</span>
        <span className="text-sm text-gray-300">{selectedOption.icon} {selectedOption.label}</span>
      </div>

      {/* Route to correct specialized component */}
      {releaseType === 'single'      && <UploadMusicSingle              {...commonProps} />}
      {releaseType === 'ep'          && <UploadMusicEP                  {...commonProps} />}
      {releaseType === 'album'       && <UploadMusicAlbum               {...commonProps} />}
      {releaseType === 'audiobook'   && <UploadAudiobook                {...commonProps} />}
      {releaseType === 'podcast'     && <UploadPodcast                  {...commonProps} />}
      {releaseType === 'competition' && <UploadCompetitionPerformance   {...commonProps} />}
      {releaseType === 'book'        && <UploadBook                     {...commonProps} />}
    </div>
  );
}
