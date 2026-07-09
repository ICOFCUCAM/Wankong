import React, { useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { supabase } from '@/lib/supabase';

const REPORT_TYPES = [
  'Copyright Infringement',
  'Hate Speech',
  'Spam/Fraud',
  'Illegal Content',
  'Bot Voting',
  'Impersonation',
  'Other',
];

const AFTER_STEPS = [
  { icon: '🔍', text: 'We review all reports within 48–72 hours of submission.' },
  { icon: '🚫', text: 'Valid reports result in content removal or account action.' },
  { icon: '📬', text: "You'll be contacted if we need more information to investigate." },
];

export default function ReportContentPage() {
  const [url, setUrl] = useState('');
  const [reportType, setReportType] = useState('');
  const [description, setDescription] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!url.trim()) {
      setError('Please provide the content URL or ID.');
      return;
    }
    if (!reportType) {
      setError('Please select a report type.');
      return;
    }
    if (description.trim().length < 20) {
      setError('Please provide a description of at least 20 characters.');
      return;
    }

    setSubmitting(true);
    try {
      const { error: dbError } = await supabase.from('content_reports').insert([
        {
          url: url.trim(),
          type: reportType,
          description: description.trim(),
          reporter_email: email.trim() || null,
          status: 'pending',
          created_at: new Date().toISOString(),
        },
      ]);

      if (dbError) throw dbError;
      setSubmitted(true);
    } catch (err) {
      console.error(err);
      setError('Something went wrong. Please try again or email safety@wankong.com.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0814] text-white flex flex-col">
      <Header />

      <main className="flex-1">
        {/* Header */}
        <section className="border-b border-white/10 py-16">
          <div className="max-w-3xl mx-auto px-4 lg:px-8">
            <p className="text-[#FF6B00] text-sm font-semibold uppercase tracking-widest mb-3">Support</p>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Report Content</h1>
            <p className="text-white/70 text-lg leading-relaxed">
              Help us keep WANKONG safe and fair for all creators.
            </p>
          </div>
        </section>

        <div className="max-w-3xl mx-auto px-4 lg:px-8 py-16 space-y-12">

          {submitted ? (
            /* Success state */
            <div className="bg-[#00F5A0]/5 border border-[#00F5A0]/30 rounded-2xl px-8 py-12 text-center">
              <div className="w-16 h-16 rounded-full bg-[#00F5A0]/10 border border-[#00F5A0]/30 flex items-center justify-center mx-auto mb-6">
                <span className="text-3xl">✅</span>
              </div>
              <h2 className="text-2xl font-bold text-[#00F5A0] mb-3">Report Submitted</h2>
              <p className="text-white/70 leading-relaxed">
                Thank you for your report. We&apos;ll review it within 48–72 hours. If we need more information,
                we&apos;ll reach out to the email you provided.
              </p>
              <button
                onClick={() => {
                  setSubmitted(false);
                  setUrl('');
                  setReportType('');
                  setDescription('');
                  setEmail('');
                }}
                className="mt-6 px-6 py-2.5 bg-white/10 border border-white/10 rounded-xl text-sm font-semibold hover:bg-white/15 transition-colors"
              >
                Submit Another Report
              </button>
            </div>
          ) : (
            /* Report form */
            <section>
              <h2 className="text-xl font-bold mb-6 text-white">Submit a Report</h2>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-5 py-3 mb-6 text-red-300 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* URL or ID */}
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">
                    Content URL or ID <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://wankong.com/track/... or content ID"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-[#FF6B00]/50 transition-colors"
                  />
                </div>

                {/* Report type */}
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">
                    Report Type <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={reportType}
                    onChange={(e) => setReportType(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#FF6B00]/50 transition-colors appearance-none"
                  >
                    <option value="" className="bg-[#0B0814]">Select report type…</option>
                    {REPORT_TYPES.map((t) => (
                      <option key={t} value={t} className="bg-[#0B0814]">{t}</option>
                    ))}
                  </select>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">
                    Description <span className="text-red-400">*</span>
                    <span className="text-white/30 font-normal ml-2">(min 20 characters)</span>
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe the issue in detail. Include any context that will help our team investigate."
                    rows={5}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-[#FF6B00]/50 transition-colors resize-none"
                  />
                  <p className="text-white/30 text-xs mt-1">{description.length} / 20 minimum characters</p>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">
                    Your Email <span className="text-white/30 font-normal">(optional — so we can follow up)</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-[#FF6B00]/50 transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 rounded-xl font-semibold text-white bg-[#FF6B00] hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Submitting…' : 'Submit Report'}
                </button>
              </form>
            </section>
          )}

          {/* What happens after reporting */}
          <section>
            <h2 className="text-xl font-bold mb-6 text-white">What Happens After You Report</h2>
            <div className="space-y-3">
              {AFTER_STEPS.map((step, i) => (
                <div key={i} className="flex gap-4 items-start bg-white/5 border border-white/10 rounded-xl px-5 py-4">
                  <span className="text-xl flex-shrink-0">{step.icon}</span>
                  <p className="text-white/70 text-sm leading-relaxed">{step.text}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Emergency */}
          <section className="bg-red-500/5 border border-red-500/20 rounded-2xl px-6 py-5">
            <h3 className="text-red-400 font-semibold mb-2">Emergency — Immediate Threat</h3>
            <p className="text-white/65 text-sm leading-relaxed">
              If this content represents an immediate threat to life or safety, please contact your local emergency
              services. You may also reach our safety team directly at{' '}
              <a href="mailto:safety@wankong.com" className="text-red-400 hover:underline font-medium">
                safety@wankong.com
              </a>{' '}
              — this inbox is monitored around the clock.
            </p>
          </section>

        </div>
      </main>

      <Footer />
    </div>
  );
}
