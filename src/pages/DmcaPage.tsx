import React, { useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function DmcaPage() {
  const [form, setForm] = useState({ name: '', email: '', company: '', workTitle: '', workUrl: '', infringingUrl: '', statement: false, signature: '' });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-[#0B0814]">
      <Header />

      <div className="max-w-4xl mx-auto px-4 lg:px-8 py-16">
        {/* Header */}
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 text-gray-400 text-sm px-4 py-1.5 rounded-full mb-5">
            🛡️ Legal
          </div>
          <h1 className="text-4xl font-black text-white mb-3">DMCA Policy</h1>
          <p className="text-gray-400">Last updated: April 1, 2025</p>
        </div>

        {/* Policy Text */}
        <div className="space-y-8 mb-14">
          <div>
            <h2 className="text-xl font-bold text-white mb-3">Our Commitment to Copyright</h2>
            <p className="text-gray-300 text-sm leading-relaxed">
              Wankong respects the intellectual property rights of others and expects users of the Service to do the same. In accordance with the Digital Millennium Copyright Act of 1998 ("DMCA"), Wankong will respond expeditiously to claims of copyright infringement committed using the Wankong Service, if such claims are reported to us in the proper form.
            </p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white mb-4">Designated Copyright Agent</h2>
            <div className="text-sm text-gray-300 space-y-1">
              <p><span className="text-gray-500">Name:</span> Wankong Legal Department</p>
              <p><span className="text-gray-500">Email:</span> <a href="mailto:dmca@wankong.com" className="text-[#00D9FF] hover:underline">dmca@wankong.com</a></p>
              <p><span className="text-gray-500">Address:</span> 1 Faith Avenue, Lagos Island, Lagos, Nigeria</p>
              <p><span className="text-gray-500">Response time:</span> Within 3 business days</p>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-bold text-white mb-3">Filing a DMCA Takedown Notice</h2>
            <p className="text-gray-300 text-sm leading-relaxed mb-4">
              If you believe that content available on or through the Wankong Service infringes one or more of your copyrights, please submit a written notice ("Takedown Notice") to our Designated Copyright Agent containing all of the following elements:
            </p>
            <ol className="text-gray-300 text-sm space-y-3 list-none">
              {[
                'A physical or electronic signature of a person authorized to act on behalf of the owner of the copyright that has allegedly been infringed.',
                'Identification of the copyrighted work claimed to have been infringed, or, if multiple copyrighted works are covered by a single notification, a representative list of such works.',
                'Identification of the material that is claimed to be infringing or to be the subject of infringing activity and that is to be removed or access to which is to be disabled, and information reasonably sufficient to permit Wankong to locate the material.',
                'Information reasonably sufficient to permit Wankong to contact you, such as your name, address, telephone number, and email address.',
                'A statement that you have a good faith belief that use of the material in the manner complained of is not authorized by the copyright owner, its agent, or the law.',
                'A statement that the information in the notification is accurate, and under penalty of perjury, that you are authorized to act on behalf of the owner of an exclusive right that is allegedly infringed.',
              ].map((item, i) => (
                <li key={i} className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-xs text-gray-400 shrink-0 mt-0.5">{i + 1}</span>
                  <span>{item}</span>
                </li>
              ))}
            </ol>
          </div>

          <div>
            <h2 className="text-xl font-bold text-white mb-3">Counter-Notice</h2>
            <p className="text-gray-300 text-sm leading-relaxed">
              If you believe content was removed in error, you may submit a Counter-Notice to our Designated Copyright Agent. The counter-notice must include: your physical or electronic signature; identification of the material removed; a statement under penalty of perjury that the material was removed by mistake or misidentification; your name, address, and phone number; and a statement consenting to jurisdiction of the Federal District Court in your district.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-white mb-3">Repeat Infringer Policy</h2>
            <p className="text-gray-300 text-sm leading-relaxed">
              In accordance with the DMCA and other applicable law, Wankong has adopted a policy of terminating, in appropriate circumstances, users who are deemed to be repeat infringers. Wankong may also, at its sole discretion, limit access to the Service and/or terminate the accounts of any users who infringe any intellectual property rights of others, whether or not there is any repeat infringement.
            </p>
          </div>
        </div>

        {/* Takedown Form */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h2 className="text-xl font-bold text-white mb-2">Submit a Takedown Request</h2>
          <p className="text-gray-400 text-sm mb-6">Use this form to submit a DMCA takedown notice. You may also email dmca@wankong.com directly.</p>

          {!submitted ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-400 mb-1.5 block">Full Name *</label>
                  <input required value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#00D9FF]/50" placeholder="Your name" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1.5 block">Email Address *</label>
                  <input required type="email" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#00D9FF]/50" placeholder="your@email.com" />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">Company / Organization (if applicable)</label>
                <input value={form.company} onChange={e => setForm(f => ({...f, company: e.target.value}))} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#00D9FF]/50" placeholder="Record label, publisher, etc." />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">Title of Copyrighted Work *</label>
                <input required value={form.workTitle} onChange={e => setForm(f => ({...f, workTitle: e.target.value}))} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#00D9FF]/50" placeholder="Song title, album, etc." />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">URL of Infringing Content on Wankong *</label>
                <input required value={form.infringingUrl} onChange={e => setForm(f => ({...f, infringingUrl: e.target.value}))} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#00D9FF]/50" placeholder="https://wankong.com/..." />
              </div>
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" required checked={form.statement} onChange={e => setForm(f => ({...f, statement: e.target.checked}))} className="mt-1" />
                <span className="text-xs text-gray-400 leading-relaxed">
                  I have a good faith belief that the use of the described material is not authorized by the copyright owner, and I declare under penalty of perjury that the information in this notice is accurate and that I am the copyright owner or authorized to act on behalf of the copyright owner.
                </span>
              </label>
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">Electronic Signature (type your full name) *</label>
                <input required value={form.signature} onChange={e => setForm(f => ({...f, signature: e.target.value}))} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#00D9FF]/50 font-serif italic" placeholder="Your full name" />
              </div>
              <button type="submit" className="w-full py-3 bg-gradient-to-r from-[#00D9FF] to-[#9D4EDD] text-white rounded-xl font-medium hover:opacity-90 transition-opacity">
                Submit Takedown Notice
              </button>
            </form>
          ) : (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">✅</div>
              <h3 className="text-xl font-bold text-white mb-2">Notice Received</h3>
              <p className="text-gray-400 text-sm">We'll review your DMCA notice within 3 business days and respond to <strong>{form.email}</strong>.</p>
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}
