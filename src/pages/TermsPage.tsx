import React, { useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const SECTIONS = [
  {
    id: 'acceptance',
    title: '1. Acceptance of Terms',
    content: `By accessing or using the Wankong platform ("Service"), you agree to be bound by these Terms of Service ("Terms"). If you disagree with any part of these Terms, you may not access the Service. These Terms apply to all visitors, users, and others who access the Service.`,
  },
  {
    id: 'accounts',
    title: '2. User Accounts',
    content: `When you create an account with us, you must provide accurate, complete, and current information. You are responsible for safeguarding the password that you use to access the Service and for any activities or actions under your password. You agree not to disclose your password to any third party. You must notify us immediately upon becoming aware of any breach of security or unauthorized use of your account.`,
  },
  {
    id: 'content',
    title: '3. User Content',
    content: `Our Service allows you to post, link, store, share, and otherwise make available certain information, text, graphics, videos, or other material ("Content"). You retain all rights to your Content. By submitting Content, you grant Wankong a worldwide, non-exclusive, royalty-free license to use, display, reproduce, and distribute your Content on the platform. You represent and warrant that your Content does not violate any third-party intellectual property rights, is not defamatory, and complies with all applicable laws.`,
  },
  {
    id: 'distribution',
    title: '4. Music Distribution',
    content: `Artists who submit music for distribution through Wankong warrant that they own or control all rights necessary to grant Wankong the right to distribute such content. Wankong is not liable for any copyright claims arising from distributed content. Artists are responsible for obtaining all necessary mechanical licenses, sync licenses, and clearances. Royalties are calculated based on verified stream counts and paid out monthly, subject to a minimum threshold of $10.`,
  },
  {
    id: 'competitions',
    title: '5. Competition Rules',
    content: `Competitions on the Wankong platform are open to registered users with verified artist accounts. Each user may submit one entry per competition unless otherwise stated. Voting is subject to duplicate detection (IP and session-based). Wankong reserves the right to disqualify entries that violate content guidelines, are submitted with fraudulent votes, or that do not meet quality standards determined by our AI evaluation pipeline and admin team. Prize decisions are final.`,
  },
  {
    id: 'prohibited',
    title: '6. Prohibited Uses',
    content: `You may not use the Service to: (a) upload content that infringes any intellectual property rights; (b) transmit spam, chain letters, or other unsolicited communications; (c) impersonate any person or entity; (d) engage in any conduct that restricts or inhibits any other user from using or enjoying the Service; (e) attempt to gain unauthorized access to any portion of the Service; (f) use automated tools to generate fraudulent votes or activity; (g) upload explicit, violent, or hate-speech content.`,
  },
  {
    id: 'termination',
    title: '7. Termination',
    content: `We may terminate or suspend your account immediately, without prior notice or liability, for any reason including without limitation if you breach the Terms. Upon termination, your right to use the Service will cease immediately. All provisions of the Terms which by their nature should survive termination shall survive termination, including, without limitation, ownership provisions, warranty disclaimers, indemnity, and limitations of liability.`,
  },
  {
    id: 'disclaimer',
    title: '8. Disclaimer',
    content: `The Service is provided on an "AS IS" and "AS AVAILABLE" basis without any warranties of any kind, either express or implied. Wankong does not warrant that the Service will be uninterrupted, timely, secure, or error-free. The Service is not intended to substitute for professional legal, financial, or other advice.`,
  },
  {
    id: 'limitation',
    title: '9. Limitation of Liability',
    content: `In no event shall Wankong, its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your access to or use of (or inability to access or use) the Service.`,
  },
  {
    id: 'governing',
    title: '10. Governing Law',
    content: `These Terms shall be governed and construed in accordance with the laws of the Federal Republic of Nigeria, without regard to its conflict of law provisions. Any disputes arising under these Terms shall be resolved in the courts of Lagos State, Nigeria.`,
  },
  {
    id: 'changes',
    title: '11. Changes to Terms',
    content: `We reserve the right, at our sole discretion, to modify or replace these Terms at any time. If a revision is material we will try to provide at least 30 days' notice prior to any new terms taking effect. What constitutes a material change will be determined at our sole discretion. By continuing to access or use our Service after those revisions become effective, you agree to be bound by the revised terms.`,
  },
  {
    id: 'contact',
    title: '12. Contact',
    content: `If you have any questions about these Terms, please contact us at legal@wankong.com.`,
  },
];

export default function TermsPage() {
  const [active, setActive] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-[#0B0814]">
      <Header />

      <div className="max-w-4xl mx-auto px-4 lg:px-8 py-16">
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 text-gray-400 text-sm px-4 py-1.5 rounded-full mb-5">
            ⚖️ Legal
          </div>
          <h1 className="text-4xl font-black text-white mb-3">Terms of Service</h1>
          <p className="text-gray-400">Last updated: April 1, 2025</p>
        </div>

        <div className="bg-[#FFB800]/5 border border-[#FFB800]/20 rounded-2xl p-5 mb-10 text-sm text-gray-300">
          Please read these Terms of Service carefully before using the Wankong platform. By using Wankong, you agree to these terms.
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
            Questions? Contact <a href="mailto:legal@wankong.com" className="text-[#00D9FF] hover:underline">legal@wankong.com</a>
          </p>
        </div>
      </div>

      <Footer />
    </div>
  );
}
