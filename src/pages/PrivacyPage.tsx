import React, { useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const SECTIONS = [
  {
    id: 'collect',
    title: '1. Information We Collect',
    content: `We collect information you provide directly to us, such as when you create an account, upload content, or contact us for support. This includes: name, email address, profile information, payment details (processed securely via Stripe), uploaded audio/video files, and metadata about your music releases. We also automatically collect certain information when you use the Service, including log data, device information, IP address, browser type, and usage data through cookies and similar technologies.`,
  },
  {
    id: 'use',
    title: '2. How We Use Your Information',
    content: `We use the information we collect to: provide, maintain, and improve the Service; process transactions and send related information; send promotional communications (with your consent); respond to comments and questions; monitor and analyze usage trends; detect and prevent fraudulent activity; and comply with legal obligations. We do not sell your personal information to third parties.`,
  },
  {
    id: 'sharing',
    title: '3. Information Sharing',
    content: `We may share your information with: (a) Service providers who perform services on our behalf (e.g., payment processing, cloud storage, analytics); (b) distribution partners (streaming platforms) for the purposes of releasing your music; (c) law enforcement or government authorities when required by law; (d) other parties with your consent. Artist display names, submitted tracks, and competition entries are publicly visible on the platform by default.`,
  },
  {
    id: 'cookies',
    title: '4. Cookies & Tracking',
    content: `We use cookies and similar tracking technologies to track activity on our Service and to hold certain information. Cookies are files with a small amount of data that are sent to your browser from a website. You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent. However, some features of the Service may not function properly without cookies. We use analytics services (such as Plausible Analytics) that are privacy-friendly and do not track you across websites.`,
  },
  {
    id: 'retention',
    title: '5. Data Retention',
    content: `We retain your personal information for as long as your account is active or as needed to provide the Service. You may request deletion of your account and associated data at any time by contacting privacy@wankong.com. Note that we may retain certain information for legal, accounting, or legitimate business purposes even after account deletion. Uploaded music files are retained for the duration of any active distribution agreements.`,
  },
  {
    id: 'security',
    title: '6. Security',
    content: `We take reasonable measures to protect your information from unauthorized access, use, alteration, or destruction. All data is encrypted in transit (TLS 1.3) and at rest. Payment information is processed by Stripe and never stored on our servers. Access to personal data is limited to employees and contractors who need it to perform their job functions. However, no security system is impenetrable and we cannot guarantee the absolute security of our systems.`,
  },
  {
    id: 'rights',
    title: '7. Your Rights',
    content: `Depending on your location, you may have the following rights regarding your personal data: Right to access — request a copy of the data we hold about you. Right to rectification — request correction of inaccurate data. Right to erasure — request deletion of your personal data. Right to portability — receive your data in a machine-readable format. Right to object — object to processing of your data for marketing purposes. To exercise any of these rights, contact privacy@wankong.com.`,
  },
  {
    id: 'children',
    title: '8. Children\'s Privacy',
    content: `The Service is not directed to individuals under the age of 13 (or 16 in the EU). We do not knowingly collect personal information from children. If we become aware that a child has provided us with personal information, we will take steps to delete such information. If you become aware that a child has provided us with personal information, please contact privacy@wankong.com.`,
  },
  {
    id: 'international',
    title: '9. International Transfers',
    content: `Your information may be transferred to — and processed in — countries other than the country in which you are resident. These countries may have data protection laws that are different from the laws of your country. By using the Service, you consent to this transfer. We implement appropriate safeguards to ensure your information remains protected in accordance with this Privacy Policy.`,
  },
  {
    id: 'changes',
    title: '10. Changes to This Policy',
    content: `We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "last updated" date. You are advised to review this Privacy Policy periodically for any changes. Changes to this Privacy Policy are effective when posted.`,
  },
  {
    id: 'contact',
    title: '11. Contact Us',
    content: `If you have any questions about this Privacy Policy or our data practices, please contact our Data Protection Officer at privacy@wankong.com or by post at: Wankong Inc., 1 Faith Avenue, Lagos Island, Lagos, Nigeria.`,
  },
];

export default function PrivacyPage() {
  const [active, setActive] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-[#0B0814]">
      <Header />

      <div className="max-w-4xl mx-auto px-4 lg:px-8 py-16">
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 text-gray-400 text-sm px-4 py-1.5 rounded-full mb-5">
            🔒 Legal
          </div>
          <h1 className="text-4xl font-black text-white mb-3">Privacy Policy</h1>
          <p className="text-gray-400">Last updated: April 1, 2025</p>
        </div>

        <div className="bg-[#00D9FF]/5 border border-[#00D9FF]/20 rounded-2xl p-5 mb-10 text-sm text-gray-300">
          Your privacy is fundamental to us. This policy explains exactly what data we collect, how we use it, and your rights over it.
        </div>

        <div className="space-y-2">
          {SECTIONS.map(s => (
            <div key={s.id} className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
              <button
                onClick={() => setActive(active === s.id ? null : s.id)}
                className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-white/5 transition-colors"
              >
                <span className="font-medium text-white text-sm">{s.title}</span>
                <span className={`text-gray-400 transition-transform ${active === s.id ? 'rotate-180' : ''}`}>▼</span>
              </button>
              {active === s.id && (
                <div className="px-6 pb-5">
                  <p className="text-gray-300 text-sm leading-relaxed">{s.content}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-10 text-center">
          <p className="text-gray-500 text-sm">
            Privacy questions? Contact <a href="mailto:privacy@wankong.com" className="text-[#00D9FF] hover:underline">privacy@wankong.com</a>
          </p>
        </div>
      </div>

      <Footer />
    </div>
  );
}
