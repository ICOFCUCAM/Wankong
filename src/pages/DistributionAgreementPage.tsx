import React from 'react';
import { Link } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const SECTIONS = [
  {
    id: 'about',
    title: '1. About Music Distribution on WANKONG',
    color: '#00D9FF',
    body: `WANKONG is a global creator marketplace — not a Digital Service Provider (DSP) such as Spotify or Apple Music. WANKONG's distribution service prepares your music metadata, audio files, and artwork to the precise technical specifications required by major streaming platforms, then delivers your release to its distribution partners for global publication.

When you use WANKONG Distribution, you are contracting with WANKONG to act as your distribution facilitator. WANKONG prepares and delivers your release; the actual placement on streaming platforms is handled via WANKONG's distribution partners.`,
  },
  {
    id: 'partners',
    title: '2. Distribution Partners',
    color: '#9D4EDD',
    custom: (
      <div className="space-y-4">
        <p className="text-white/70 text-sm leading-relaxed">
          WANKONG works with established distribution partners to place your music across major digital service
          providers worldwide. Current distribution partners include:
        </p>
        <div className="bg-white/5 border border-white/10 rounded-xl p-5">
          <div className="flex items-center gap-4 flex-wrap">
            {[
              { name: 'Ditto Music', detail: 'Primary global distribution partner — delivers to 200+ streaming platforms' },
            ].map((p) => (
              <div key={p.name} className="flex-1 min-w-0">
                <p className="text-white font-semibold">{p.name}</p>
                <p className="text-white/55 text-sm">{p.detail}</p>
              </div>
            ))}
          </div>
        </div>
        <p className="text-white/60 text-sm">
          WANKONG may add or change distribution partners at any time. Creators will be notified of any change
          that materially affects their distribution reach. Platforms reached via partners include: Spotify,
          Apple Music, Amazon Music, YouTube Music, Tidal, Deezer, TikTok, and 190+ more.
        </p>
      </div>
    ),
  },
  {
    id: 'creator-responsibilities',
    title: '3. Creator Responsibilities',
    color: '#FFB800',
    custom: (
      <div className="space-y-3">
        {[
          { title: 'Metadata Accuracy', desc: 'You are responsible for providing accurate track titles, artist names, album titles, genre classifications, release dates, and ISRC/UPC codes. Errors in metadata may result in rejection by DSPs or delayed publication.' },
          { title: 'Copyright Ownership', desc: 'You represent and warrant that you own or hold a valid licence for all audio, lyrics, and artwork submitted for distribution. This includes mechanical rights, master rights, and any samples used.' },
          { title: 'Territory Rights', desc: 'You must specify the territories in which you hold distribution rights, or explicitly grant worldwide rights. If your rights are limited to specific territories, you must declare this at submission.' },
          { title: 'Explicit Content Flagging', desc: 'If your release contains explicit lyrics or themes, you must flag it as explicit at submission. Failure to flag explicit content may result in takedown after DSP review.' },
        ].map((item) => (
          <div key={item.title} className="bg-white/5 border border-white/10 rounded-xl p-4">
            <p className="font-semibold text-[#FFB800] mb-1">{item.title}</p>
            <p className="text-white/60 text-sm leading-relaxed">{item.desc}</p>
          </div>
        ))}
      </div>
    ),
  },
  {
    id: 'rights-declaration',
    title: '4. Rights Declaration',
    color: '#00F5A0',
    body: `By submitting content for distribution, you confirm and declare under penalty of account termination and potential legal liability that:

(a) You are the original creator of the submitted recording, or hold an exclusive or non-exclusive licence that permits digital distribution.
(b) You have obtained all necessary mechanical licences for any compositions included in your recording that you did not write.
(c) You hold cleared rights to any samples, interpolations, or third-party audio incorporated in the recording.
(d) The artwork, bio, and metadata you submit do not infringe any third-party intellectual property rights.
(e) Distribution of this content in the territories you have selected is not prohibited by any law or agreement.

WANKONG does not independently verify rights declarations but reserves the right to audit them and to act on any credible third-party claim.`,
  },
  {
    id: 'royalty-reporting',
    title: '5. Royalty Reporting',
    color: '#00D9FF',
    body: `Royalties generated from DSP streams and downloads are reported through WANKONG's distribution partner dashboards. WANKONG provides a summary earnings view within the Creator Dashboard at /dashboard/earnings.

DSPs typically report streaming data with a delay of 30–60 days. Royalty statements are made available monthly. WANKONG does not guarantee specific reporting timelines as these depend on individual DSP reporting schedules.

For detailed per-DSP royalty breakdowns, creators may access their distribution partner's dedicated reporting portal using credentials provided at signup.`,
  },
  {
    id: 'distribution-timeline',
    title: '6. Distribution Timeline',
    color: '#9D4EDD',
    custom: (
      <div className="space-y-4">
        <p className="text-white/70 text-sm leading-relaxed">
          Once your release is approved by WANKONG's content review team, distribution to streaming platforms
          typically completes within the following timeframe:
        </p>
        <div className="bg-white/5 border border-[#9D4EDD]/30 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[#9D4EDD] font-bold text-2xl">2–7</p>
              <p className="text-white/60 text-sm">Business days after approval</p>
            </div>
            <div className="text-right text-white/50 text-sm space-y-1">
              <p>Major DSPs (Spotify, Apple): typically 2–3 days</p>
              <p>Secondary DSPs: 3–7 days</p>
              <p>TikTok / Snapchat: up to 7 days</p>
            </div>
          </div>
        </div>
        <p className="text-white/55 text-sm">
          WANKONG recommends scheduling releases at least 7 business days in advance to allow for review and
          distribution processing. Rush delivery is not guaranteed. Public release dates set in the past will
          default to the earliest available date.
        </p>
      </div>
    ),
  },
  {
    id: 'takedown-rights',
    title: '7. Takedown Rights',
    color: '#FF6B00',
    body: `WANKONG reserves the right to remove content from distribution at any time if:

(a) The content is found to violate WANKONG's Community Guidelines or Content Policies.
(b) A valid third-party copyright claim is filed against the content.
(c) DSPs reject or remove the content from their platforms due to policy violations.
(d) The creator's account is suspended or terminated.
(e) WANKONG receives a valid legal request or court order relating to the content.

Creators may also request voluntary takedown of their own content by submitting a takedown request to distribution@wankong.com. Takedowns typically complete within 5–10 business days, though WANKONG is not responsible for streams that occur before a takedown is fully processed across all DSPs.`,
  },
  {
    id: 'revenue-share',
    title: '8. Revenue Share',
    color: '#00F5A0',
    custom: (
      <div className="space-y-5">
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="bg-[#00F5A0]/10 border border-[#00F5A0]/30 rounded-xl p-5 text-center">
            <p className="text-white/50 text-xs uppercase tracking-widest mb-2">Platform Streams (WANKONG)</p>
            <p className="text-3xl font-bold text-[#00F5A0]">70%</p>
            <p className="text-white/60 text-sm mt-1">to Creator</p>
            <p className="text-[#00F5A0]/50 text-sm">30% Platform Commission</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-5 text-center">
            <p className="text-white/50 text-xs uppercase tracking-widest mb-2">DSP Royalties (External)</p>
            <p className="text-3xl font-bold text-white">Direct</p>
            <p className="text-white/60 text-sm mt-1">Paid via Distribution Partner</p>
            <p className="text-white/40 text-sm">Per partner's revenue share terms</p>
          </div>
        </div>
        <p className="text-white/65 text-sm leading-relaxed">
          Royalties generated from external DSP streams (Spotify, Apple Music, etc.) are paid directly to
          creators via the distribution partner's payment system. WANKONG does not take a commission on external
          DSP royalties. Platform commission (30%) applies only to streams on WANKONG itself.
        </p>
      </div>
    ),
  },
  {
    id: 'territory-rights',
    title: '9. Territory Rights',
    color: '#FFB800',
    body: `At the time of submission, you must indicate whether you are granting WANKONG worldwide distribution rights or restricting distribution to specific territories.

If you select worldwide rights, WANKONG will distribute your content to all countries and regions supported by its distribution partners. If you restrict territories, your music will only be made available in those specified regions.

You represent and warrant that your territorial rights declaration is accurate. If it is later determined that your rights in a territory were not valid, WANKONG will remove the content from that territory and you will be liable for any costs arising from the incorrect declaration.

Territory rights can be updated after initial submission by contacting distribution@wankong.com, subject to DSP processing timelines.`,
  },
  {
    id: 'liability',
    title: '10. Limitation of Liability',
    color: '#9D4EDD',
    body: `WANKONG acts as a distribution facilitator and is not responsible for:

(a) Errors, delays, or rejections caused by DSPs or distribution partners.
(b) Incorrect royalty calculations or reporting delays caused by DSPs.
(c) Content takedowns initiated by DSPs based on their own internal policies.
(d) Loss of earnings resulting from technical failures outside WANKONG's reasonable control, including internet outages, DSP system failures, or force majeure events.
(e) Legal claims arising from rights declarations that were inaccurate at the time of submission.

In no event shall WANKONG's total liability to a creator in connection with distribution services exceed the total platform commission earned from that creator's content in the preceding 12 months.`,
  },
];

export default function DistributionAgreementPage() {
  return (
    <div className="min-h-screen bg-[#0B0814] text-white flex flex-col">
      <Header />

      <main className="flex-1">
        {/* Hero */}
        <section className="border-b border-white/10 py-16">
          <div className="max-w-4xl mx-auto px-4 lg:px-8">
            <p className="text-[#00D9FF] text-sm font-semibold uppercase tracking-widest mb-3">Distribution</p>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Distribution Agreement</h1>
            <p className="text-white/60 text-lg">Last updated: April 2026</p>
            <p className="mt-6 text-white/80 text-lg leading-relaxed">
              This Distribution Agreement governs the relationship between WANKONG and creators who use the
              WANKONG Distribution service to publish their music to streaming platforms globally.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/upload/distribute" className="px-4 py-2 bg-[#00D9FF]/10 border border-[#00D9FF]/30 text-[#00D9FF] rounded-lg text-sm hover:bg-[#00D9FF]/20 transition-colors">
                Start Distributing
              </Link>
              <Link to="/distribution/releases" className="px-4 py-2 bg-white/5 border border-white/10 text-white/70 rounded-lg text-sm hover:bg-white/10 transition-colors">
                My Releases
              </Link>
            </div>
          </div>
        </section>

        {/* TOC */}
        <div className="border-b border-white/10">
          <div className="max-w-4xl mx-auto px-4 lg:px-8 py-6">
            <div className="flex flex-wrap gap-2">
              {SECTIONS.map((s) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className="text-xs px-3 py-1.5 bg-white/5 border border-white/10 rounded-full text-white/60 hover:text-white hover:border-white/30 transition-colors"
                >
                  {s.title.split('. ')[1]}
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 lg:px-8 py-16 space-y-12">
          {SECTIONS.map((section) => (
            <section key={section.id} id={section.id} className="scroll-mt-20">
              <h2 className="text-2xl font-bold mb-6" style={{ color: section.color }}>
                {section.title}
              </h2>
              {section.body && (
                <div className="text-white/70 text-sm leading-relaxed whitespace-pre-line">{section.body}</div>
              )}
              {section.custom}
            </section>
          ))}

          <div className="border-t border-white/10 pt-8">
            <p className="text-white/50 text-sm text-center mb-4">
              Distribution enquiries: &nbsp;
              <a href="mailto:distribution@wankong.com" className="text-[#00D9FF] hover:underline">
                distribution@wankong.com
              </a>
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
