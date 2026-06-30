import React from 'react';
import { Link } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import {
  ArrowRight, Upload, HardDrive, ShieldCheck, Send,
  Globe, Music, CheckCircle, FileText,
} from 'lucide-react';

// ── Distribution architecture pipeline ───────────────────────────────────────

const PIPELINE = [
  {
    icon:    <Upload className="w-5 h-5" />,
    colour:  '#9D4EDD',
    step:    '01',
    title:   'Upload to WANKONG',
    desc:    'Artist uploads WAV/FLAC/MP3 audio and cover artwork. File stored securely in WANKONG cloud storage.',
  },
  {
    icon:    <HardDrive className="w-5 h-5" />,
    colour:  '#00D9FF',
    step:    '02',
    title:   'Stored Locally',
    desc:    'Track becomes immediately streamable on the WANKONG platform. Listeners can preview and access based on your release settings.',
  },
  {
    icon:    <ShieldCheck className="w-5 h-5" />,
    colour:  '#00F5A0',
    step:    '03',
    title:   'Admin Review & Approval',
    desc:    'WANKONG editorial team reviews audio quality, metadata completeness, and content compliance before forwarding to distribution.',
  },
  {
    icon:    <Send className="w-5 h-5" />,
    colour:  '#FFB800',
    step:    '04',
    title:   'Export to Ditto Music',
    desc:    'Approved releases are packaged into a metadata bundle — audio file, artwork, ISRC, and release info — and delivered to Ditto Music.',
  },
  {
    icon:    <Globe className="w-5 h-5" />,
    colour:  '#FF6B00',
    step:    '05',
    title:   'Global Distribution',
    desc:    'Ditto delivers your release to 200+ streaming platforms including Spotify, Apple Music, YouTube Music, Deezer, Tidal, and more.',
  },
  {
    icon:    <Music className="w-5 h-5" />,
    colour:  '#9D4EDD',
    step:    '06',
    title:   'Remains on WANKONG',
    desc:    'The original recording stays fully streamable on WANKONG. Streams count toward your WANKONG earnings independently from DSP royalties.',
  },
];

// ── License sections ──────────────────────────────────────────────────────────

const LICENSE_SECTIONS = [
  {
    title: 'Grant of License',
    content: `By uploading music, audio, video, books, performances, or other creative content to WANKONG, you confirm that you are the rightful owner of the content or have obtained all necessary permissions required to distribute it.

You grant WANKONG a worldwide, non-exclusive, royalty-free license to:

• Host your content on the WANKONG platform
• Stream your content to listeners
• Display your content in playlists, competitions, discovery sections, and promotional placements
• Allow users to preview or access your content according to platform settings
• Sell or distribute your content where you enable paid access
• Deliver your content to digital distribution partners including Ditto Music and other streaming services selected by you
• Promote your content across social media platforms, marketing campaigns, and partner networks
• Store and process metadata, artwork, and associated release information
• Generate preview clips and short promotional excerpts`,
  },
  {
    title: 'License Duration',
    content: `This license remains active while your content is available on WANKONG and may be withdrawn by removing your content from the platform, unless distribution has already been completed with third-party partners.

You understand that distributed releases may remain live on external streaming platforms even after removal from WANKONG due to distributor processing timelines. Takedown requests to third-party platforms may take 7–30 business days to process.`,
  },
  {
    title: 'Ownership & Rights',
    content: `You retain full ownership of your master recordings and publishing rights unless explicitly assigned through a separate written agreement.

WANKONG does not claim ownership of your content. This is a non-exclusive license — you may continue distributing your content independently elsewhere.`,
  },
  {
    title: 'Content Warranties',
    content: `You confirm that your submitted content:

• Does not infringe any copyright, trademark, or intellectual property rights
• Does not contain unauthorized samples or interpolations without clearance
• Does not violate any third-party rights, privacy rights, or contractual obligations
• Does not include restricted, illegal, or prohibited material under applicable law
• Has not been previously submitted to an exclusive distribution agreement that would prevent distribution through WANKONG`,
  },
  {
    title: 'Distribution Authorization',
    content: `If your release is submitted for distribution through WANKONG to external streaming platforms, you authorize WANKONG to:

• Prepare metadata packages, artwork bundles, and audio delivery files required by those distributors
• Submit your release information and files to Ditto Music and partner distribution networks
• Register ISRC codes and UPC barcodes on your behalf where required
• Process royalty collection through DSP reporting pipelines`,
  },
  {
    title: 'Revenue & Royalties',
    content: `WANKONG streams generate earnings at the platform's current per-stream rate, distributed based on your configured royalty split (default: 70% artist / 30% platform).

Royalties from external streaming platforms (Spotify, Apple Music, etc.) are reported directly by Ditto Music. DSP reporting typically has a 30–60 day delay. WANKONG provides monthly earnings statements for platform streams.`,
  },
  {
    title: 'Non-Exclusive Terms',
    content: `This agreement is non-exclusive. You may simultaneously distribute your content through other channels, direct submissions, or competing platforms.

WANKONG does not require exclusivity. You are free to release your music independently, through other distributors, or directly to streaming services, in addition to your WANKONG distribution.`,
  },
  {
    title: 'License Version',
    content: `This is WANKONG Creator Content License Agreement Version 1.0, effective from the date of content submission.

WANKONG reserves the right to update these terms. Material changes will be communicated to creators before taking effect. Continued use of the platform after notice constitutes acceptance of updated terms.`,
  },
];

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ContentLicensePage() {
  return (
    <div className="min-h-screen bg-[#0B0814] text-white flex flex-col">
      <Header />

      <main className="flex-1">

        {/* Hero */}
        <section className="border-b border-white/8 py-16 px-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-[#9D4EDD]/20 flex items-center justify-center">
                <FileText className="w-5 h-5 text-[#9D4EDD]" />
              </div>
              <span className="text-xs font-bold text-[#9D4EDD] uppercase tracking-widest">Legal · Version 1.0</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black mb-4 leading-tight">
              WANKONG Creator<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#9D4EDD] to-[#00D9FF]">
                Content License Agreement
              </span>
            </h1>
            <p className="text-white/60 text-lg max-w-2xl leading-relaxed">
              A non-exclusive worldwide license. You keep ownership.
              WANKONG handles the infrastructure, distribution, and promotion.
            </p>
            <div className="flex flex-wrap items-center gap-3 mt-6">
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#00F5A0]/10 border border-[#00F5A0]/20 text-[#00F5A0] text-xs font-semibold">
                <CheckCircle className="w-3.5 h-3.5" /> Non-Exclusive
              </span>
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#00D9FF]/10 border border-[#00D9FF]/20 text-[#00D9FF] text-xs font-semibold">
                <CheckCircle className="w-3.5 h-3.5" /> You Retain Ownership
              </span>
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#9D4EDD]/10 border border-[#9D4EDD]/20 text-[#9D4EDD] text-xs font-semibold">
                <CheckCircle className="w-3.5 h-3.5" /> Worldwide Distribution
              </span>
            </div>
          </div>
        </section>

        {/* Distribution Architecture */}
        <section className="py-16 px-4 border-b border-white/8">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-black text-white mb-2">How Distribution Works</h2>
            <p className="text-gray-400 text-sm mb-10">
              When you upload to WANKONG, your track follows this pipeline from local storage to global streaming platforms.
            </p>

            <div className="space-y-0">
              {PIPELINE.map((item, idx) => (
                <div key={item.step} className="flex items-start gap-4">
                  {/* Connector line */}
                  <div className="flex flex-col items-center shrink-0">
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
                      style={{ background: `${item.colour}18`, color: item.colour, border: `1px solid ${item.colour}30` }}
                    >
                      {item.icon}
                    </div>
                    {idx < PIPELINE.length - 1 && (
                      <div className="w-px flex-1 my-1" style={{ background: `${item.colour}30`, minHeight: '2rem' }} />
                    )}
                  </div>

                  {/* Content */}
                  <div className="pb-8 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-black tracking-widest" style={{ color: item.colour }}>
                        STEP {item.step}
                      </span>
                    </div>
                    <h3 className="text-white font-bold text-base mb-1">{item.title}</h3>
                    <p className="text-gray-400 text-sm leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Key callout */}
            <div className="mt-4 p-5 rounded-2xl bg-gradient-to-br from-[#9D4EDD]/10 to-[#00D9FF]/10 border border-[#9D4EDD]/20">
              <p className="text-white font-semibold text-sm mb-1">Your audio on WANKONG is never deleted during distribution.</p>
              <p className="text-gray-400 text-sm">
                The same master recording that your listeners stream on WANKONG is the file delivered to Ditto Music.
                Distribution to external platforms does not affect playback on WANKONG.
              </p>
            </div>
          </div>
        </section>

        {/* License Text */}
        <section className="py-16 px-4">
          <div className="max-w-4xl mx-auto space-y-10">
            <h2 className="text-2xl font-black text-white">Full License Agreement</h2>

            {LICENSE_SECTIONS.map((section, idx) => (
              <div
                key={idx}
                className="border-l-2 pl-6"
                style={{ borderColor: idx % 2 === 0 ? '#9D4EDD40' : '#00D9FF40' }}
              >
                <h3 className="text-white font-bold text-lg mb-3">{section.title}</h3>
                <div className="text-gray-400 text-sm leading-relaxed whitespace-pre-line">
                  {section.content}
                </div>
              </div>
            ))}

            {/* Version stamp */}
            <div className="flex items-center gap-2 pt-4 border-t border-white/8">
              <span className="text-xs text-gray-600">WANKONG Creator Content License Agreement</span>
              <span className="text-xs text-gray-700">·</span>
              <span className="text-xs font-bold text-gray-500">Version 1.0</span>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-12 px-4 border-t border-white/8 bg-gradient-to-br from-[#9D4EDD]/5 to-[#00D9FF]/5">
          <div className="max-w-xl mx-auto text-center space-y-4">
            <h2 className="text-xl font-black text-white">Ready to distribute?</h2>
            <p className="text-gray-400 text-sm">
              You accept this agreement when you submit content for distribution.
              Your ownership and rights are always protected.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Link
                to="/upload/distribute"
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#9D4EDD] to-[#00D9FF] text-white font-bold rounded-xl hover:opacity-90 transition-opacity"
              >
                <Upload className="w-4 h-4" /> Distribute Your Music
              </Link>
              <Link
                to="/distribution-agreement"
                className="flex items-center gap-2 px-6 py-3 bg-white/5 border border-white/10 text-gray-300 rounded-xl hover:bg-white/10 transition-colors"
              >
                Distribution Terms <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>

      </main>

      <Footer />
    </div>
  );
}
