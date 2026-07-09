import React, { useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

type FAQ = { question: string; answer: string };
type Section = { id: string; title: string; faqs: FAQ[] };

const SECTIONS: Section[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    faqs: [
      {
        question: 'How do I create an account?',
        answer:
          'Sign up with your email at wankong.com. You\'ll receive a confirmation email — click the link inside to verify your address and activate your account.',
      },
      {
        question: 'How do I set up my creator profile?',
        answer:
          'Go to your Dashboard after logging in and complete your profile. Add your display name, bio, profile photo, and creator category. A complete profile helps fans discover your work.',
      },
      {
        question: 'What is WANKONG?',
        answer:
          'A global creator marketplace for music, books, audiobooks, videos, and competitions — supporting creators across Africa and the world. We help creators publish, distribute, and earn from their work while fans discover authentic content in 16 languages.',
      },
    ],
  },
  {
    id: 'uploading',
    title: 'Uploading Content',
    faqs: [
      {
        question: 'What audio formats are supported?',
        answer: 'WAV, FLAC, and MP3 files up to 500MB. For best quality, we recommend WAV or FLAC at 44.1kHz/24-bit.',
      },
      {
        question: 'What video formats are accepted for competitions?',
        answer:
          'MP4 and MOV files, between 2–8 minutes in length, up to 500MB. Videos should be recorded in good lighting with clear audio for the best chance of a high AI score.',
      },
      {
        question: 'What book formats are supported?',
        answer:
          'PDF, EPUB, and MOBI files. EPUB is recommended for the best reading experience across devices. Ensure your file includes proper metadata (title, author, ISBN if available).',
      },
      {
        question: 'How long does review take?',
        answer:
          'Content is usually reviewed within 24–48 hours. During high-volume periods it may take up to 72 hours. You\'ll receive an email notification when your content is approved or if changes are needed.',
      },
    ],
  },
  {
    id: 'competitions',
    title: 'Joining Competitions',
    faqs: [
      {
        question: 'How do I enter the Talent Arena?',
        answer:
          'Go to Talent Arena > Submit Your Performance. Enter during an open competition room. Upload your performance video (MP4 or MOV, 2–8 minutes) and complete the submission form. You can only submit one entry per competition room.',
      },
      {
        question: 'How is the winner selected?',
        answer:
          'Using a weighted formula: AI Score (60%) + Community Votes (40%). The AI evaluates technical performance quality, while community votes reflect audience engagement. Both components are required for a final ranking.',
      },
      {
        question: 'Can I vote for my own entry?',
        answer:
          'No. Self-voting is detected by our system and automatically disqualified. Accounts found to be coordinating self-vote campaigns may face suspension.',
      },
    ],
  },
  {
    id: 'payouts',
    title: 'Receiving Payouts',
    faqs: [
      {
        question: 'What is the minimum withdrawal amount?',
        answer:
          '$10 USD. Balances below this threshold carry over to the following month. There is no maximum withdrawal limit.',
      },
      {
        question: 'What payment methods are supported?',
        answer:
          'PayPal, Bank Transfer, M-Pesa, MTN MoMo, and Orange Money. Mobile money options are available for creators in supported African markets. Availability may vary by country.',
      },
      {
        question: 'How long does withdrawal processing take?',
        answer:
          '5–7 business days from the time you submit your withdrawal request. You will receive a confirmation email once the payout has been dispatched.',
      },
    ],
  },
  {
    id: 'language',
    title: 'Language Discovery',
    faqs: [
      {
        question: 'How does language filtering work?',
        answer:
          'Click any language on the homepage or Music by Language section to see content in that language. The platform will filter music, books, and audiobooks to show only content tagged with your selected language.',
      },
      {
        question: 'How many languages are supported?',
        answer:
          'Currently 16 languages including English, French, Yoruba, Swahili, Arabic, Hausa, Igbo, Amharic, Portuguese, Spanish, Zulu, Twi, Somali, Wolof, Lingala, and Afrikaans.',
      },
    ],
  },
  {
    id: 'distribution',
    title: 'Distribution',
    faqs: [
      {
        question: 'What does "distribution preparation" mean?',
        answer:
          'WANKONG prepares your metadata and audio for submission to distribution partners like Ditto Music who deliver to Spotify, Apple Music, Tidal, Amazon Music, and 150+ other streaming platforms worldwide.',
      },
      {
        question: 'Is WANKONG itself a streaming platform?',
        answer:
          'No. WANKONG is a creator marketplace and publishing platform. We prepare and route your music to streaming platforms via distribution partners. You can also stream music directly on the WANKONG platform to your fans.',
      },
    ],
  },
  {
    id: 'technical',
    title: 'Technical Issues',
    faqs: [
      {
        question: 'My upload failed — what do I do?',
        answer:
          'Check your file size (max 500MB), format (WAV, FLAC, MP3 for audio; MP4, MOV for video; PDF, EPUB, MOBI for books), and internet connection. Try again or contact support@wankong.com with details of the error message you received.',
      },
      {
        question: 'How do I contact support?',
        answer:
          'Email support@wankong.com or use the report form at wankong.com/report. Our team typically responds within 24 hours. For urgent issues, include "URGENT" in your subject line.',
      },
    ],
  },
];

export default function HelpCenterPage() {
  const [openSection, setOpenSection] = useState<string | null>(null);
  const [openQuestion, setOpenQuestion] = useState<string | null>(null);

  const toggleSection = (sectionId: string) => {
    if (openSection === sectionId) {
      setOpenSection(null);
      setOpenQuestion(null);
    } else {
      setOpenSection(sectionId);
      setOpenQuestion(null);
    }
  };

  const toggleQuestion = (key: string) => {
    setOpenQuestion(openQuestion === key ? null : key);
  };

  return (
    <div className="min-h-screen bg-[#0B0814] text-white flex flex-col">
      <Header />

      <main className="flex-1">
        {/* Hero */}
        <section className="border-b border-white/10 py-16">
          <div className="max-w-3xl mx-auto px-4 lg:px-8 text-center">
            <p className="text-[#00D9FF] text-sm font-semibold uppercase tracking-widest mb-3">Support</p>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Help Center</h1>
            <p className="text-white/70 text-lg leading-relaxed">
              Find answers to common questions about WANKONG. Browse by topic or scroll to explore.
            </p>
          </div>
        </section>

        <div className="max-w-3xl mx-auto px-4 lg:px-8 py-16">

          {/* Accordion sections */}
          <div className="space-y-3 mb-16">
            {SECTIONS.map((section) => {
              const isSectionOpen = openSection === section.id;
              return (
                <div
                  key={section.id}
                  className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden"
                >
                  {/* Section header */}
                  <button
                    onClick={() => toggleSection(section.id)}
                    className="w-full flex items-center justify-between px-6 py-5 text-left hover:bg-white/5 transition-colors"
                  >
                    <span className="font-semibold text-white">{section.title}</span>
                    <span className="text-white/40 text-sm ml-4 flex-shrink-0">
                      {isSectionOpen ? '▲' : '▼'}
                    </span>
                  </button>

                  {/* Questions inside section */}
                  {isSectionOpen && (
                    <div className="border-t border-white/10">
                      {section.faqs.map((faq, idx) => {
                        const questionKey = `${section.id}-${idx}`;
                        const isOpen = openQuestion === questionKey;
                        return (
                          <div key={questionKey} className="border-b border-white/5 last:border-b-0">
                            <button
                              onClick={() => toggleQuestion(questionKey)}
                              className="w-full flex items-start justify-between px-6 py-4 text-left hover:bg-white/5 transition-colors"
                            >
                              <span className="text-sm text-white/80 leading-relaxed pr-4">{faq.question}</span>
                              <span className="text-[#00D9FF] text-xs flex-shrink-0 mt-0.5">
                                {isOpen ? '▲' : '▼'}
                              </span>
                            </button>
                            {isOpen && (
                              <div className="px-6 pb-5">
                                <p className="text-white/60 text-sm leading-relaxed">{faq.answer}</p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Still need help */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
            <h2 className="text-white font-semibold text-xl mb-2">Still need help?</h2>
            <p className="text-white/50 text-sm mb-6">
              Our support team typically responds within 24 hours.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <a
                href="mailto:support@wankong.com"
                className="px-6 py-2.5 bg-[#00D9FF] text-[#0B0814] rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                Email Support
              </a>
              <a
                href="/report"
                className="px-6 py-2.5 bg-white/10 border border-white/10 text-white rounded-xl text-sm font-semibold hover:bg-white/15 transition-colors"
              >
                Report Content
              </a>
            </div>
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
}
