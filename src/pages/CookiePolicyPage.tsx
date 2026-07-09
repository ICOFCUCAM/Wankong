import React from 'react';
import { Link } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const COOKIE_TYPES = [
  {
    name: 'Analytics Cookies',
    color: '#00D9FF',
    description:
      'These cookies help us understand how visitors interact with WANKONG. They collect information such as pages visited, time spent on pages, traffic sources, and error messages. All data is aggregated and anonymised.',
    examples: ['Page view counts', 'Session duration', 'Traffic source attribution', 'Feature usage heatmaps'],
  },
  {
    name: 'Authentication Cookies',
    color: '#9D4EDD',
    description:
      'These cookies are essential for keeping you logged into your WANKONG account. They are set by Supabase Auth when you sign in and are required for the platform to function securely.',
    examples: ['Session tokens', 'Refresh tokens', 'User ID persistence', 'Role-based access flags'],
  },
  {
    name: 'Language Preference Cookies',
    color: '#FFB800',
    description:
      'WANKONG supports 16 languages. These cookies remember your chosen language and content discovery preferences so you do not have to re-select them on every visit.',
    examples: ['Interface language (EN, FR, ES, AR, SW, YO…)', 'Content language filter', 'Region preference'],
  },
  {
    name: 'Performance Cookies',
    color: '#00F5A0',
    description:
      'These cookies optimise platform performance by caching player state, audio/video buffering preferences, and content delivery settings for your device and connection speed.',
    examples: ['Player volume and quality settings', 'Buffering strategy', 'Autoplay preferences', 'CDN routing'],
  },
];

const HOW_WE_USE = [
  {
    title: 'Session Management',
    body: 'Authentication cookies maintain your logged-in session across pages and after browser restarts. Without these, you would need to re-enter your credentials on every page load.',
  },
  {
    title: 'Analytics & Platform Improvement',
    body: 'Analytics cookies feed into our internal dashboards so we can identify which features creators and listeners use most, detect errors early, and prioritise improvements to the platform.',
  },
  {
    title: 'Language Preference',
    body: 'When you select a language or content region, we store that preference in a cookie so the platform greets you in the right language on your next visit and surfaces content in your chosen languages by default.',
  },
  {
    title: 'Player State',
    body: "Performance cookies remember your media player settings — volume, playback quality, autoplay — so you don't have to reconfigure them every session.",
  },
];

const THIRD_PARTY = [
  {
    provider: 'Supabase Auth',
    purpose: 'Authentication and session management. Supabase places secure HTTP-only cookies to validate your identity without exposing credentials to JavaScript.',
    link: 'https://supabase.com/privacy',
  },
  {
    provider: 'Analytics Providers',
    purpose: 'WANKONG uses privacy-respecting analytics tools to measure platform usage. These providers may set first-party or third-party cookies to help us count unique visitors and measure engagement.',
    link: null,
  },
];

export default function CookiePolicyPage() {
  return (
    <div className="min-h-screen bg-[#0B0814] text-white flex flex-col">
      <Header />

      <main className="flex-1">
        {/* Hero */}
        <section className="border-b border-white/10 py-16">
          <div className="max-w-4xl mx-auto px-4 lg:px-8">
            <p className="text-[#00D9FF] text-sm font-semibold uppercase tracking-widest mb-3">Legal</p>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Cookie Policy</h1>
            <p className="text-white/60 text-lg">Last updated: April 2026</p>
            <p className="mt-6 text-white/80 text-lg leading-relaxed">
              This Cookie Policy explains what cookies are, the types we use on the WANKONG platform, how we use them,
              and how you can control your cookie preferences.
            </p>
          </div>
        </section>

        <div className="max-w-4xl mx-auto px-4 lg:px-8 py-16 space-y-16">

          {/* 1. What are cookies */}
          <section>
            <h2 className="text-2xl font-bold mb-4 text-[#00D9FF]">1. What Are Cookies?</h2>
            <p className="text-white/75 leading-relaxed mb-4">
              Cookies are small text files placed on your device — computer, tablet, or mobile phone — when you visit a
              website. They are universally used to make websites work efficiently and to give site operators useful
              information about how their platform is being used.
            </p>
            <p className="text-white/75 leading-relaxed mb-4">
              Cookies are not harmful. They cannot run programs, carry viruses, or access other files on your device.
              They simply store a small amount of data that the website can read on your next visit.
            </p>
            <p className="text-white/75 leading-relaxed">
              WANKONG uses cookies for purposes that include keeping you logged in, remembering your language settings,
              understanding how the platform is used, and optimising the media player experience.
            </p>
          </section>

          {/* 2. Types we use */}
          <section>
            <h2 className="text-2xl font-bold mb-8 text-[#00D9FF]">2. Types of Cookies We Use</h2>
            <div className="grid md:grid-cols-2 gap-6">
              {COOKIE_TYPES.map((ct) => (
                <div
                  key={ct.name}
                  className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-colors"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: ct.color }}
                    />
                    <h3 className="font-bold text-white">{ct.name}</h3>
                  </div>
                  <p className="text-white/65 text-sm leading-relaxed mb-4">{ct.description}</p>
                  <ul className="space-y-1">
                    {ct.examples.map((ex) => (
                      <li key={ex} className="text-white/50 text-xs flex items-center gap-2">
                        <span style={{ color: ct.color }}>•</span> {ex}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>

          {/* 3. How we use them */}
          <section>
            <h2 className="text-2xl font-bold mb-8 text-[#00D9FF]">3. How We Use Cookies</h2>
            <div className="space-y-6">
              {HOW_WE_USE.map((item, i) => (
                <div key={item.title} className="flex gap-5">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#00D9FF]/10 border border-[#00D9FF]/30 flex items-center justify-center text-[#00D9FF] font-bold text-sm">
                    {i + 1}
                  </div>
                  <div>
                    <h3 className="font-semibold text-white mb-2">{item.title}</h3>
                    <p className="text-white/65 leading-relaxed text-sm">{item.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 4. Third-party cookies */}
          <section>
            <h2 className="text-2xl font-bold mb-6 text-[#00D9FF]">4. Third-Party Cookies</h2>
            <p className="text-white/75 leading-relaxed mb-6">
              In addition to our own cookies, some third-party services integrated into WANKONG may set their own
              cookies on your device. We only work with trusted partners and have reviewed their cookie practices.
            </p>
            <div className="space-y-4">
              {THIRD_PARTY.map((tp) => (
                <div key={tp.provider} className="bg-white/5 border border-white/10 rounded-xl p-5">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-[#9D4EDD]">{tp.provider}</h3>
                    {tp.link && (
                      <a
                        href={tp.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-[#00D9FF] hover:underline"
                      >
                        Privacy Policy →
                      </a>
                    )}
                  </div>
                  <p className="text-white/65 text-sm leading-relaxed">{tp.purpose}</p>
                </div>
              ))}
            </div>
          </section>

          {/* 5. How to control cookies */}
          <section>
            <h2 className="text-2xl font-bold mb-6 text-[#00D9FF]">5. How to Control Cookies</h2>
            <p className="text-white/75 leading-relaxed mb-6">
              You have the right to accept or decline cookies. Most web browsers automatically accept cookies, but you
              can modify your browser settings to decline cookies if you prefer. Note that disabling certain cookies
              may affect your ability to use some features of WANKONG, including staying logged in.
            </p>
            <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
              <h3 className="font-semibold text-white mb-2">Browser Cookie Settings</h3>
              {[
                { browser: 'Google Chrome', path: 'Settings → Privacy and Security → Cookies and other site data' },
                { browser: 'Mozilla Firefox', path: 'Settings → Privacy & Security → Cookies and Site Data' },
                { browser: 'Safari', path: 'Preferences → Privacy → Manage Website Data' },
                { browser: 'Microsoft Edge', path: 'Settings → Cookies and site permissions → Cookies and site data' },
              ].map((b) => (
                <div key={b.browser} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                  <span className="text-white font-medium text-sm w-40 flex-shrink-0">{b.browser}</span>
                  <span className="text-white/55 text-sm">{b.path}</span>
                </div>
              ))}
            </div>
            <p className="text-white/60 text-sm mt-4">
              You can also opt out of analytics-related cookies by adjusting your privacy preferences within your
              WANKONG account settings at any time.
            </p>
          </section>

          {/* 6. Cookie consent */}
          <section className="bg-gradient-to-r from-[#00D9FF]/10 to-[#9D4EDD]/10 border border-[#00D9FF]/20 rounded-2xl p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">6. Cookie Consent</h2>
            <p className="text-white/80 leading-relaxed max-w-2xl mx-auto text-lg">
              By using WANKONG, you accept our cookie policy. Continued use of the platform after being informed of
              this policy constitutes your agreement to the use of cookies as described herein.
            </p>
            <p className="text-white/55 text-sm mt-4">
              You may withdraw consent at any time by clearing cookies in your browser or adjusting your account
              preferences. Withdrawal of consent does not affect the lawfulness of processing prior to withdrawal.
            </p>
          </section>

          {/* 7. Contact */}
          <section>
            <h2 className="text-2xl font-bold mb-4 text-[#00D9FF]">7. Cookie Questions &amp; Contact</h2>
            <p className="text-white/75 leading-relaxed mb-4">
              If you have any questions about our use of cookies or this Cookie Policy, please contact our privacy team:
            </p>
            <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-2">
              <p className="text-white/80">
                <span className="text-white/50 mr-2">Email:</span>
                <a href="mailto:privacy@wankong.com" className="text-[#00D9FF] hover:underline">
                  privacy@wankong.com
                </a>
              </p>
              <p className="text-white/80">
                <span className="text-white/50 mr-2">Privacy Policy:</span>
                <Link to="/privacy-policy" className="text-[#00D9FF] hover:underline">
                  /privacy-policy
                </Link>
              </p>
              <p className="text-white/80">
                <span className="text-white/50 mr-2">Terms of Service:</span>
                <Link to="/terms-of-service" className="text-[#00D9FF] hover:underline">
                  /terms-of-service
                </Link>
              </p>
            </div>
          </section>

        </div>
      </main>

      <Footer />
    </div>
  );
}
