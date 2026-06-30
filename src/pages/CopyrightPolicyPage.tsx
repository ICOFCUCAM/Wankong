import React from 'react';
import { Link } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const REPORTING_REQUIREMENTS = [
  'A description of the copyrighted work you claim has been infringed',
  'The URL or specific location of the infringing content on WANKONG',
  'Your full name and contact information (email, phone)',
  'A statement of good faith belief that the use is not authorised by the copyright owner',
  'A statement that the information in your notice is accurate, under penalty of perjury',
  'Your physical or electronic signature',
];

const MUSICAL_RULES = [
  { icon: '🎵', rule: 'Cover songs require a mechanical licence before uploading or distributing.' },
  { icon: '🎛️', rule: 'Samples require written clearance from the original rights holder.' },
  { icon: '🔀', rule: 'Remixes must credit the original artist and obtain remix permission if distributing commercially.' },
  { icon: '🎤', rule: 'Karaoke or re-recorded versions require a separate sync and mechanical licence.' },
];

export default function CopyrightPolicyPage() {
  return (
    <div className="min-h-screen bg-[#0B0814] text-white flex flex-col">
      <Header />

      <main className="flex-1">
        {/* Hero */}
        <section className="border-b border-white/10 py-16">
          <div className="max-w-4xl mx-auto px-4 lg:px-8">
            <p className="text-[#FFB800] text-sm font-semibold uppercase tracking-widest mb-3">Legal</p>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Copyright Policy</h1>
            <p className="text-white/60 text-lg">Last updated: April 2026</p>
            <p className="mt-6 text-white/80 text-lg leading-relaxed">
              We respect intellectual property rights and require all creators to do the same. This policy explains how
              WANKONG handles copyright, how to report infringement, and the consequences for repeat violations.
            </p>
          </div>
        </section>

        <div className="max-w-4xl mx-auto px-4 lg:px-8 py-16 space-y-16">

          {/* 1. WANKONG's Commitment */}
          <section>
            <h2 className="text-2xl font-bold mb-4 text-[#FFB800]">1. WANKONG's Commitment to Copyright</h2>
            <p className="text-white/75 leading-relaxed">
              We respect intellectual property rights and require all creators to do the same. WANKONG actively works
              to prevent copyright infringement on our platform and provides clear procedures for rights holders to
              report violations. We comply with the Digital Millennium Copyright Act (DMCA) and equivalent international
              intellectual property laws.
            </p>
          </section>

          {/* 2. Creator Responsibility */}
          <section>
            <h2 className="text-2xl font-bold mb-4 text-[#FFB800]">2. Creator Responsibility</h2>
            <div className="bg-white/5 border border-white/10 rounded-2xl px-6 py-5">
              <p className="text-white/75 leading-relaxed mb-4">
                All content you upload to WANKONG must be owned by you or properly licensed. By uploading content, you
                confirm that:
              </p>
              <ul className="space-y-3">
                {[
                  'You own the copyright to all uploaded content, or have obtained the necessary licences and permissions.',
                  'Your content does not infringe the intellectual property rights of any third party.',
                  'Any samples, beats, or instrumentals used are properly cleared.',
                  'Cover songs are properly licensed via a mechanical licence before distribution.',
                  'You have the right to grant WANKONG the licence required to host and stream your content.',
                ].map((item, i) => (
                  <li key={i} className="flex gap-3 text-sm text-white/70">
                    <span className="text-[#FFB800] mt-0.5 flex-shrink-0">&#10003;</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* 3. Reporting Infringement */}
          <section>
            <h2 className="text-2xl font-bold mb-4 text-[#FFB800]">3. Reporting Infringement</h2>
            <p className="text-white/75 leading-relaxed mb-5">
              If you believe your copyrighted work has been uploaded to WANKONG without your permission, please submit
              a copyright infringement notice to our designated copyright agent:
            </p>
            <div className="bg-[#FFB800]/5 border border-[#FFB800]/20 rounded-2xl px-6 py-4 mb-5 flex items-center gap-3">
              <span className="text-xl">📧</span>
              <a href="mailto:copyright@wankong.com" className="text-[#FFB800] hover:underline font-semibold">
                copyright@wankong.com
              </a>
            </div>
            <p className="text-white/70 text-sm mb-4">Your notice must include all of the following:</p>
            <div className="space-y-3">
              {REPORTING_REQUIREMENTS.map((req, i) => (
                <div key={i} className="flex gap-4 items-start bg-white/5 border border-white/10 rounded-xl px-5 py-3">
                  <span className="w-6 h-6 rounded-full bg-[#FFB800]/10 border border-[#FFB800]/30 flex items-center justify-center text-[#FFB800] text-xs font-bold flex-shrink-0">
                    {i + 1}
                  </span>
                  <p className="text-white/70 text-sm leading-relaxed">{req}</p>
                </div>
              ))}
            </div>
          </section>

          {/* 4. Takedown Procedure */}
          <section>
            <h2 className="text-2xl font-bold mb-4 text-[#FFB800]">4. Takedown Procedure</h2>
            <div className="bg-white/5 border border-white/10 rounded-2xl px-6 py-5">
              <p className="text-white/75 leading-relaxed">
                Upon receiving a valid copyright infringement notice, WANKONG will review the claim within{' '}
                <span className="text-[#FFB800] font-semibold">48 hours</span>. If the claim is valid and the content
                is found to infringe copyright, the content will be removed from the platform and the uploader will be
                notified. Invalid or incomplete notices may be disregarded. WANKONG will not be liable for any removal
                carried out in good faith in response to a copyright notice.
              </p>
            </div>
          </section>

          {/* 5. Counter-Notice Procedure */}
          <section>
            <h2 className="text-2xl font-bold mb-4 text-[#FFB800]">5. Counter-Notice Procedure</h2>
            <div className="bg-white/5 border border-white/10 rounded-2xl px-6 py-5">
              <p className="text-white/75 leading-relaxed mb-4">
                If you believe your content was removed incorrectly — for example due to a misidentification or a
                notice filed in bad faith — you may file a counter-notice within a{' '}
                <span className="text-[#FFB800] font-semibold">14-day window</span> from the removal date. Send your
                counter-notice to{' '}
                <a href="mailto:copyright@wankong.com" className="text-[#FFB800] hover:underline">
                  copyright@wankong.com
                </a>{' '}
                and include:
              </p>
              <ul className="space-y-2">
                {[
                  'Your name and contact information',
                  'Identification of the removed content and its prior location',
                  'A statement under penalty of perjury that you believe the removal was a mistake',
                  'Your consent to the jurisdiction of the appropriate federal court',
                  'Your physical or electronic signature',
                ].map((item, i) => (
                  <li key={i} className="flex gap-3 text-sm text-white/70">
                    <span className="text-[#FFB800] mt-0.5 flex-shrink-0">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* 6. Repeat Offender Policy */}
          <section>
            <h2 className="text-2xl font-bold mb-4 text-[#FFB800]">6. Repeat Offender Policy</h2>
            <div className="bg-red-500/5 border border-red-500/20 rounded-2xl px-6 py-5">
              <p className="text-white/80 leading-relaxed mb-3">
                WANKONG applies a <span className="text-red-400 font-semibold">three-strikes policy</span> to copyright
                infringement:
              </p>
              <ul className="space-y-2">
                {[
                  'Strike 1: Warning + content removal. Educational notice sent to account.',
                  'Strike 2: 30-day content upload suspension + content removal.',
                  'Strike 3: Permanent account ban + forfeiture of all accumulated earnings.',
                ].map((item, i) => (
                  <li key={i} className="flex gap-3 text-sm text-white/70">
                    <span className="text-red-400 mt-0.5 flex-shrink-0">✕</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* 7. Content Removal Timeline */}
          <section>
            <h2 className="text-2xl font-bold mb-4 text-[#FFB800]">7. Content Removal Timeline</h2>
            <div className="bg-white/5 border border-white/10 rounded-2xl px-6 py-5 flex items-center gap-4">
              <span className="text-3xl">⏱️</span>
              <div>
                <p className="text-white font-semibold">48–72 hours</p>
                <p className="text-white/60 text-sm">
                  Valid copyright claims are reviewed and actioned within 48–72 hours of receipt. Complex cases
                  involving counter-notices may take up to 14 business days to resolve.
                </p>
              </div>
            </div>
          </section>

          {/* 8. Safe Harbour */}
          <section>
            <h2 className="text-2xl font-bold mb-4 text-[#FFB800]">8. Safe Harbour</h2>
            <p className="text-white/75 leading-relaxed">
              WANKONG operates under safe harbour provisions as a platform hosting user-generated content. This means
              WANKONG is not liable for infringing content uploaded by users, provided we act promptly upon receiving
              valid takedown notices and do not have actual knowledge of infringement. Safe harbour protection depends
              on our compliance with copyright takedown procedures — which we take seriously.
            </p>
          </section>

          {/* 9. Musical Works */}
          <section>
            <h2 className="text-2xl font-bold mb-6 text-[#FFB800]">9. Musical Works — Specific Rules</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {MUSICAL_RULES.map((item, i) => (
                <div
                  key={i}
                  className="bg-white/5 border border-white/10 rounded-2xl p-5 flex gap-4 items-start hover:border-white/20 transition-colors"
                >
                  <span className="text-2xl flex-shrink-0">{item.icon}</span>
                  <p className="text-white/70 text-sm leading-relaxed">{item.rule}</p>
                </div>
              ))}
            </div>
          </section>

          {/* 10. Formal DMCA Procedure */}
          <section>
            <h2 className="text-2xl font-bold mb-4 text-[#FFB800]">10. Formal DMCA Procedure</h2>
            <div className="bg-white/5 border border-white/10 rounded-2xl px-6 py-5">
              <p className="text-white/75 leading-relaxed mb-4">
                For formal DMCA takedown requests and US-specific copyright procedures, please refer to our dedicated
                DMCA Policy page. This page contains the formal agent designation, jurisdiction statements, and
                counter-notice procedures required under US law.
              </p>
              <Link
                to="/dmca-policy"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#FFB800]/10 border border-[#FFB800]/30 text-[#FFB800] rounded-xl text-sm font-semibold hover:bg-[#FFB800]/15 transition-colors"
              >
                View DMCA Policy &#8594;
              </Link>
            </div>
          </section>

          {/* Contact */}
          <section className="bg-white/5 border border-white/10 rounded-2xl px-6 py-5 text-center">
            <p className="text-white/70 text-sm mb-2">Copyright concerns or licensing enquiries?</p>
            <a href="mailto:copyright@wankong.com" className="text-[#FFB800] hover:underline font-semibold">
              copyright@wankong.com
            </a>
          </section>

        </div>
      </main>

      <Footer />
    </div>
  );
}
