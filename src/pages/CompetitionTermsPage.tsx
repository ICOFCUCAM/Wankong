import React from 'react';
import { Link } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const SECTIONS = [
  {
    id: 'eligibility',
    title: '1. Eligibility',
    color: '#00D9FF',
    content: null,
    custom: (
      <ul className="space-y-2 text-white/70 text-sm">
        {[
          'Must be a registered WANKONG user with a verified account.',
          'Must be 16 years of age or older. Users aged 16–17 require documented parental or guardian consent.',
          'WANKONG employees, contractors, and their immediate family members are not eligible to compete.',
          'Participants must reside in a country where entry into such competitions is not prohibited by applicable law.',
          'Accounts flagged for previous voting manipulation or community guideline violations are not eligible until the restriction is lifted.',
        ].map((item, i) => (
          <li key={i} className="flex gap-3">
            <span className="text-[#00D9FF] font-bold flex-shrink-0">•</span>
            {item}
          </li>
        ))}
      </ul>
    ),
  },
  {
    id: 'video-requirements',
    title: '2. Video Requirements',
    color: '#9D4EDD',
    content: null,
    custom: (
      <div className="grid sm:grid-cols-2 gap-4">
        {[
          { label: 'Minimum Duration', value: '2 minutes' },
          { label: 'Maximum Duration', value: '8 minutes' },
          { label: 'Accepted Formats', value: 'MP4, MOV' },
          { label: 'Maximum File Size', value: '500 MB' },
          { label: 'Minimum Resolution', value: '720p (1280×720)' },
          { label: 'Content Requirement', value: 'Original or properly licensed' },
        ].map((r) => (
          <div key={r.label} className="bg-white/5 border border-white/10 rounded-lg p-3 flex justify-between items-center">
            <span className="text-white/50 text-sm">{r.label}</span>
            <span className="text-white font-medium text-sm">{r.value}</span>
          </div>
        ))}
        <div className="sm:col-span-2 bg-[#9D4EDD]/10 border border-[#9D4EDD]/30 rounded-lg p-4 text-sm text-white/70 leading-relaxed">
          All submitted performances must be original works created by the submitting artist, or must include
          documented proof of licence for all third-party musical, lyrical, or visual elements used. Cover
          versions require a valid mechanical licence.
        </div>
      </div>
    ),
  },
  {
    id: 'submission-rules',
    title: '3. Submission Rules',
    color: '#FFB800',
    content: `Each registered user may submit one entry per competition room. Multiple submissions from the same account to the same room will result in all submissions being disqualified. Performer credits must be complete and accurate — misrepresenting the performer, composer, or rights holder constitutes fraud. Submissions must be uploaded directly through the WANKONG platform. Links to external hosting services are not accepted. Submitters are responsible for ensuring their video complies with all platform content policies before submission. Submissions cannot be withdrawn after the competition window closes.`,
    custom: null,
  },
  {
    id: 'voting-rules',
    title: '4. Voting Rules',
    color: '#00F5A0',
    content: null,
    custom: (
      <div className="space-y-4">
        <p className="text-white/70 text-sm leading-relaxed">
          Voting is open to all registered WANKONG users during the active competition window. The following
          rules govern fair and valid voting:
        </p>
        <ul className="space-y-3 text-white/70 text-sm">
          {[
            { rule: 'One vote per user per entry', detail: 'Session-based and account-based deduplication is applied. Duplicate votes from the same session or account are discarded.' },
            { rule: 'Anti-bot measures', detail: 'WANKONG employs rate limiting, CAPTCHA challenges, IP anomaly detection, and behavioural analysis to identify automated voting.' },
            { rule: 'Fan membership vote multipliers', detail: 'Verified fan subscribers may have vote multipliers applied per their subscription tier. Multiplied votes are counted as weighted votes in the ranking formula.' },
            { rule: 'Vote manipulation = disqualification', detail: 'Any entry found to have benefited from coordinated inauthentic voting, purchased votes, or bot-generated votes will be immediately disqualified. The entrant\'s account may be permanently banned.' },
          ].map((v) => (
            <li key={v.rule} className="bg-white/5 border border-white/10 rounded-lg p-4">
              <p className="font-semibold text-[#00F5A0] mb-1">{v.rule}</p>
              <p className="text-white/60 text-sm">{v.detail}</p>
            </li>
          ))}
        </ul>
      </div>
    ),
  },
  {
    id: 'winner-selection',
    title: '5. Winner Selection',
    color: '#FFB800',
    content: null,
    custom: (
      <div className="space-y-6">
        <p className="text-white/70 text-sm leading-relaxed">
          Winners are determined using a transparent weighted formula that combines AI-based performance evaluation
          with public audience voting:
        </p>
        <div className="bg-white/5 border border-[#FFB800]/30 rounded-2xl p-6 text-center">
          <p className="text-white/50 text-sm mb-3 uppercase tracking-widest">Final Score Formula</p>
          <p className="text-2xl font-bold text-[#FFB800] font-mono">
            Score = (AI Score × 0.6) + (Votes/MaxVotes × 100 × 0.4)
          </p>
          <p className="text-white/50 text-sm mt-3">Score range: 0 – 100</p>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <p className="text-[#00D9FF] font-semibold mb-2">AI Score (60% weight)</p>
            <p className="text-white/60 text-sm">Evaluated by WANKONG's AI scoring pipeline on technical performance quality, production value, and engagement metrics. Score range: 0–100.</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <p className="text-[#9D4EDD] font-semibold mb-2">Vote Score (40% weight)</p>
            <p className="text-white/60 text-sm">Normalised against the highest vote count in the competition room. Fan subscription multipliers are applied before normalisation.</p>
          </div>
        </div>
        <p className="text-white/60 text-sm">
          In the event of a tie, the entry with the higher AI score wins. WANKONG reserves the right to conduct
          manual review of entries before publishing final results.
        </p>
      </div>
    ),
  },
  {
    id: 'prize-payout',
    title: '6. Prize Payout',
    color: '#00F5A0',
    content: null,
    custom: (
      <div className="space-y-4">
        <p className="text-white/70 text-sm leading-relaxed">
          Prize amounts are displayed on each competition room's landing page before the competition opens.
        </p>
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { method: 'PayPal', detail: 'Verified PayPal email required. Payments processed within 30 days of room closing.' },
            { method: 'Bank Transfer', detail: 'Valid bank account details required. International wire fees may apply.' },
            { method: 'Mobile Money', detail: 'M-Pesa, MTN MoMo, Orange Money supported for eligible regions.' },
          ].map((m) => (
            <div key={m.method} className="bg-white/5 border border-white/10 rounded-xl p-4">
              <p className="font-semibold text-white mb-2">{m.method}</p>
              <p className="text-white/55 text-xs leading-relaxed">{m.detail}</p>
            </div>
          ))}
        </div>
        <div className="bg-[#00F5A0]/10 border border-[#00F5A0]/30 rounded-xl p-4 text-sm text-white/70">
          <strong className="text-[#00F5A0]">Payout timeline:</strong> Prizes are paid within 30 days of the
          competition room closing and results being confirmed. Winners must have valid payment details on file
          to receive payment. Unclaimed prizes after 60 days are forfeited.
        </div>
      </div>
    ),
  },
  {
    id: 'content-licence',
    title: '7. Content Licence',
    color: '#9D4EDD',
    content: `By submitting an entry to a WANKONG competition, you grant WANKONG a non-exclusive, worldwide, royalty-free licence to display, stream, promote, and distribute clips of the submitted performance for the purposes of marketing the competition and the WANKONG platform. This licence is limited to promotional use and does not transfer ownership of the underlying performance, composition, or recording. You retain full ownership of your creative work. This licence remains in effect for 24 months following the closing of the competition room, after which WANKONG will not use the content in new promotions without your consent.`,
    custom: null,
  },
  {
    id: 'disqualification',
    title: '8. Disqualification Rules',
    color: '#FF6B00',
    content: null,
    custom: (
      <div className="space-y-3">
        <p className="text-white/70 text-sm mb-4">WANKONG reserves the right to disqualify any entry or entrant for the following reasons:</p>
        {[
          'Video does not meet the minimum technical requirements (duration, format, size)',
          'Content violates WANKONG Community Guidelines or contains prohibited material',
          'Evidence of vote manipulation, bot usage, or coordinated inauthentic activity',
          'Inaccurate or fraudulent performer credits or rights declarations',
          'Multiple submissions from the same account to the same room',
          'Harassment or intimidation of other competitors or voters',
          'Failure to respond to a moderation enquiry within 7 days during the competition window',
        ].map((rule, i) => (
          <div key={i} className="flex gap-3 bg-white/5 border border-white/10 rounded-lg p-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#FF6B00]/20 border border-[#FF6B00]/40 text-[#FF6B00] text-xs flex items-center justify-center font-bold">
              {i + 1}
            </span>
            <span className="text-white/65 text-sm">{rule}</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    id: 'dispute-resolution',
    title: '9. Dispute Resolution',
    color: '#00D9FF',
    content: `All disputes regarding competition results, scoring, disqualification decisions, or prize payouts must first be submitted through WANKONG's formal dispute process. To open a dispute, email competitions@wankong.com within 14 days of the relevant decision, including your account details, the competition room ID, and a clear description of the dispute. WANKONG's competition panel will review the dispute within 10 business days and provide a written decision. Competition panel decisions are final. Where disputes cannot be resolved internally, they shall be governed by the laws of the jurisdiction in which WANKONG operates, and parties agree to resolve disputes through binding arbitration rather than litigation, to the maximum extent permitted by applicable law.`,
    custom: null,
  },
];

export default function CompetitionTermsPage() {
  return (
    <div className="min-h-screen bg-[#0B0814] text-white flex flex-col">
      <Header />

      <main className="flex-1">
        {/* Hero */}
        <section className="border-b border-white/10 py-16">
          <div className="max-w-4xl mx-auto px-4 lg:px-8">
            <p className="text-[#FFB800] text-sm font-semibold uppercase tracking-widest mb-3">Talent Arena</p>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Competition Terms</h1>
            <p className="text-white/60 text-lg">Last updated: April 2026</p>
            <p className="mt-6 text-white/80 text-lg leading-relaxed">
              These Competition Terms govern all participation in WANKONG Talent Arena competitions and any other
              competition features on the platform. By entering a competition, you agree to these terms in full.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/talent-arena" className="px-4 py-2 bg-[#FFB800]/10 border border-[#FFB800]/30 text-[#FFB800] rounded-lg text-sm hover:bg-[#FFB800]/20 transition-colors">
                Browse Competitions
              </Link>
              <Link to="/community-guidelines" className="px-4 py-2 bg-white/5 border border-white/10 text-white/70 rounded-lg text-sm hover:bg-white/10 transition-colors">
                Community Guidelines
              </Link>
            </div>
          </div>
        </section>

        <div className="max-w-4xl mx-auto px-4 lg:px-8 py-16 space-y-12">
          {SECTIONS.map((section) => (
            <section key={section.id} id={section.id} className="scroll-mt-20">
              <h2
                className="text-2xl font-bold mb-6"
                style={{ color: section.color }}
              >
                {section.title}
              </h2>
              {section.content && (
                <p className="text-white/70 leading-relaxed text-sm">{section.content}</p>
              )}
              {section.custom}
            </section>
          ))}

          {/* Bottom note */}
          <div className="border-t border-white/10 pt-8 text-center">
            <p className="text-white/50 text-sm mb-4">
              Questions about competitions? Contact the WANKONG competition team.
            </p>
            <a
              href="mailto:competitions@wankong.com"
              className="text-[#00D9FF] hover:underline text-sm"
            >
              competitions@wankong.com
            </a>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
