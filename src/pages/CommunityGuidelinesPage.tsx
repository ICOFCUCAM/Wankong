import React from 'react';
import { Link } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const PROHIBITED = [
  {
    title: 'Copyright Violations',
    color: '#FF6B00',
    icon: '©',
    desc: 'Uploading music, books, videos, or any content that you do not own or hold a valid licence for is strictly prohibited. This includes samples, cover songs without mechanical licences, and reposted commercial releases.',
  },
  {
    title: 'Hate Speech',
    color: '#FF6B00',
    icon: '⚠',
    desc: 'Content that attacks or dehumanises individuals or groups on the basis of race, ethnicity, religion, gender identity, sexual orientation, disability, national origin, or caste will be removed immediately.',
  },
  {
    title: 'Illegal Material',
    color: '#FF6B00',
    icon: '✕',
    desc: 'Any content that is illegal under applicable law — including content depicting child abuse, promoting terrorism, facilitating crime, or violating local regulations — will be removed and reported to relevant authorities.',
  },
  {
    title: 'Fraudulent Uploads',
    color: '#FFB800',
    icon: '⚡',
    desc: 'Misrepresenting authorship, falsely claiming rights to content, uploading AI-generated works without disclosure where required, or fabricating performer credits constitutes fraud and will result in account action.',
  },
  {
    title: 'Bot Voting & Vote Manipulation',
    color: '#FFB800',
    icon: '🤖',
    desc: 'Using automated tools, purchased votes, coordinated vote rings, or any other mechanism to artificially inflate competition standings violates the integrity of Talent Arena and all competitions on WANKONG.',
  },
  {
    title: 'Impersonation',
    color: '#FFB800',
    icon: '👤',
    desc: 'Creating an account or uploading content that impersonates another creator, artist, public figure, or organisation is prohibited. This includes misleading profile names, avatars, and bios.',
  },
  {
    title: 'Spam & Unsolicited Promotion',
    color: '#9D4EDD',
    icon: '📢',
    desc: 'Mass-posting unsolicited promotional content, sending automated messages, or flooding comments and profiles with repetitive promotional material is prohibited.',
  },
];

const CREATOR_RESPONSIBILITIES = [
  {
    title: 'Original Content',
    body: 'Submit only content you have created or hold valid rights to distribute. If your work includes samples or covers, ensure you have obtained the necessary licences before uploading.',
  },
  {
    title: 'Accurate Metadata',
    body: 'Title, artist name, genre, language, and release year must be accurate. Misleading metadata — designed to game discovery algorithms or search results — is a policy violation.',
  },
  {
    title: 'Fair Competition Conduct',
    body: 'In Talent Arena competitions, compete on the merit of your work. Do not solicit votes through deceptive means, coordinate vote rings, or attempt to identify and target opposing competitors.',
  },
  {
    title: 'Timely Response to Moderation',
    body: 'If WANKONG contacts you regarding a content or conduct issue, respond within 14 days. Failure to engage with moderation communications may be treated as acceptance of the finding.',
  },
];

const ENFORCEMENT_LADDER = [
  {
    step: '1',
    action: 'Warning',
    color: '#FFB800',
    desc: 'A formal written warning is issued to the account. The warning details which guideline was violated and what corrective action is expected. A first warning is typically accompanied by education resources.',
  },
  {
    step: '2',
    action: 'Content Removal',
    color: '#FF6B00',
    desc: 'The offending content is removed from the platform. The creator is notified with a reason. Removed content may be eligible for reinstatement following a successful appeal if the violation is resolved.',
  },
  {
    step: '3',
    action: 'Account Suspension',
    color: '#9D4EDD',
    desc: 'For repeated or serious violations, the account is temporarily suspended. During suspension, the creator cannot upload, earn, vote, or participate in competitions. The suspension period varies by severity.',
  },
  {
    step: '4',
    action: 'Permanent Ban',
    color: '#FF6B00',
    desc: 'Accounts found guilty of severe violations — such as CSAM, terrorism content, repeat copyright infringement, or sustained manipulation campaigns — are permanently removed with no right of appeal.',
  },
];

const PLATFORM_VALUES = [
  { title: 'Creativity', desc: 'WANKONG exists to amplify voices. We celebrate artistic diversity, experimentation, and authentic expression from creators worldwide.' },
  { title: 'Authenticity', desc: 'We believe in real music, real stories, and real competition. Manufactured engagement undermines trust for everyone on the platform.' },
  { title: 'Fair Competition', desc: 'Talent Arena is built on merit. Every creator deserves a level playing field where talent — not bot networks — determines success.' },
  { title: 'Multilingual Inclusion', desc: 'WANKONG serves creators and listeners in 16 languages. No language community is less valid. We actively promote minority-language content.' },
];

export default function CommunityGuidelinesPage() {
  return (
    <div className="min-h-screen bg-[#0B0814] text-white flex flex-col">
      <Header />

      <main className="flex-1">
        {/* Hero */}
        <section className="border-b border-white/10 py-16">
          <div className="max-w-4xl mx-auto px-4 lg:px-8">
            <p className="text-[#00D9FF] text-sm font-semibold uppercase tracking-widest mb-3">Platform Policy</p>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Community Guidelines</h1>
            <p className="text-white/60 text-lg">Last updated: April 2026</p>
            <p className="mt-6 text-white/80 text-lg leading-relaxed">
              WANKONG is a global platform for creators and listeners from every background, language, and tradition. These
              guidelines define the conduct we expect from everyone on the platform — creators, listeners, and partners —
              and explain how we enforce them.
            </p>
          </div>
        </section>

        <div className="max-w-4xl mx-auto px-4 lg:px-8 py-16 space-y-16">

          {/* 1. Community Standards */}
          <section>
            <h2 className="text-2xl font-bold mb-6 text-[#00D9FF]">1. Our Community Standards</h2>
            <p className="text-white/75 leading-relaxed mb-4">
              WANKONG serves creators and audiences across music, books, audiobooks, videos, and live competitions. Our
              community is global, multilingual, and multi-faith — and these guidelines apply equally to all, regardless
              of background, religion, language, or genre.
            </p>
            <p className="text-white/75 leading-relaxed mb-4">
              These are not religion-specific standards. They are universal standards of respect, honesty, and fair
              participation. A gospel choir, a hip-hop producer, a Yoruba audiobook author, and a Francophone filmmaker
              are all held to the same rules.
            </p>
            <p className="text-white/75 leading-relaxed">
              These guidelines exist to protect the integrity of the platform, the safety of creators, and the trust of
              our global audience. Violation of these guidelines may result in content removal, account suspension, or
              permanent banning.
            </p>
          </section>

          {/* 2. Prohibited Content */}
          <section>
            <h2 className="text-2xl font-bold mb-8 text-[#00D9FF]">2. Prohibited Content</h2>
            <p className="text-white/75 leading-relaxed mb-6">
              The following types of content and behaviour are not permitted on WANKONG under any circumstances:
            </p>
            <div className="space-y-4">
              {PROHIBITED.map((item) => (
                <div
                  key={item.title}
                  className="bg-white/5 border border-white/10 rounded-xl p-5 flex gap-4 hover:border-white/20 transition-colors"
                >
                  <div
                    className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm"
                    style={{ backgroundColor: `${item.color}20`, color: item.color, border: `1px solid ${item.color}40` }}
                  >
                    {item.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold text-white mb-1">{item.title}</h3>
                    <p className="text-white/60 text-sm leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 3. Creator Responsibilities */}
          <section>
            <h2 className="text-2xl font-bold mb-8 text-[#00D9FF]">3. Creator Responsibilities</h2>
            <div className="grid md:grid-cols-2 gap-5">
              {CREATOR_RESPONSIBILITIES.map((r, i) => (
                <div key={r.title} className="bg-white/5 border border-white/10 rounded-xl p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-[#00D9FF] font-bold text-lg">{i + 1}.</span>
                    <h3 className="font-semibold text-white">{r.title}</h3>
                  </div>
                  <p className="text-white/60 text-sm leading-relaxed">{r.body}</p>
                </div>
              ))}
            </div>
          </section>

          {/* 4. Enforcement Ladder */}
          <section>
            <h2 className="text-2xl font-bold mb-8 text-[#00D9FF]">4. Moderation Enforcement Ladder</h2>
            <p className="text-white/75 leading-relaxed mb-8">
              WANKONG applies a progressive enforcement model. The severity of the action we take is proportional to the
              seriousness of the violation and the creator's history on the platform.
            </p>
            <div className="relative">
              <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-white/10" />
              <div className="space-y-6">
                {ENFORCEMENT_LADDER.map((e) => (
                  <div key={e.step} className="relative flex gap-5 pl-2">
                    <div
                      className="relative z-10 flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border-2"
                      style={{ backgroundColor: `${e.color}20`, borderColor: e.color, color: e.color }}
                    >
                      {e.step}
                    </div>
                    <div className="flex-1 bg-white/5 border border-white/10 rounded-xl p-5 hover:border-white/20 transition-colors">
                      <h3 className="font-bold mb-2" style={{ color: e.color }}>{e.action}</h3>
                      <p className="text-white/65 text-sm leading-relaxed">{e.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* 5. Appeals */}
          <section>
            <h2 className="text-2xl font-bold mb-6 text-[#00D9FF]">5. Appeals Process</h2>
            <p className="text-white/75 leading-relaxed mb-4">
              If you believe a moderation decision was made in error, you have the right to appeal. To submit an appeal:
            </p>
            <ol className="space-y-3 mb-6">
              {[
                'Email appeals@wankong.com within 14 days of receiving the moderation notice.',
                'Include your account username or email, the content ID or description in question, and the reason you believe the decision was incorrect.',
                'Provide any evidence supporting your appeal — such as licence documentation, original recordings, or copyright certificates.',
                'WANKONG\'s moderation team will review your appeal and respond within 5–10 business days.',
                'Appeal decisions are final for Warnings and Content Removals. Permanent ban appeals are reviewed by a senior panel.',
              ].map((step, i) => (
                <li key={i} className="flex gap-4 text-white/70 text-sm">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#9D4EDD]/20 border border-[#9D4EDD]/40 text-[#9D4EDD] text-xs flex items-center justify-center font-bold">
                    {i + 1}
                  </span>
                  <span className="leading-relaxed">{step}</span>
                </li>
              ))}
            </ol>
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <p className="text-white/60 text-sm">
                Appeals email:{' '}
                <a href="mailto:appeals@wankong.com" className="text-[#00D9FF] hover:underline">
                  appeals@wankong.com
                </a>
              </p>
            </div>
          </section>

          {/* 6. Reporting */}
          <section>
            <h2 className="text-2xl font-bold mb-4 text-[#00D9FF]">6. Reporting Content</h2>
            <p className="text-white/75 leading-relaxed mb-6">
              If you encounter content or behaviour that violates these guidelines, please report it. WANKONG reviews all
              reports and acts on valid concerns within 48–72 hours.
            </p>
            <Link
              to="/report"
              className="inline-flex items-center gap-3 px-6 py-3 bg-[#FF6B00] hover:bg-[#FF6B00]/90 text-white font-semibold rounded-xl transition-colors"
            >
              Report Content →
            </Link>
          </section>

          {/* 7. Platform Values */}
          <section>
            <h2 className="text-2xl font-bold mb-8 text-[#00D9FF]">7. Platform Values</h2>
            <div className="grid md:grid-cols-2 gap-5">
              {PLATFORM_VALUES.map((v) => (
                <div key={v.title} className="bg-gradient-to-br from-white/5 to-transparent border border-white/10 rounded-xl p-5">
                  <h3 className="font-bold text-[#00F5A0] mb-2">{v.title}</h3>
                  <p className="text-white/65 text-sm leading-relaxed">{v.desc}</p>
                </div>
              ))}
            </div>
          </section>

        </div>
      </main>

      <Footer />
    </div>
  );
}
