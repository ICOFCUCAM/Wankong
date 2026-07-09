import { Link } from 'react-router-dom';
import { Clock, ArrowLeft } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

interface Props {
  feature?: string;
}

/**
 * Generic "coming soon" page for routes that haven't been fully implemented yet.
 * Shows a banner then links back to /dashboard.
 */
export default function ComingSoonPage({ feature = 'This feature' }: Props) {
  return (
    <div className="min-h-screen bg-[#0B0814] text-white flex flex-col">
      <Header />

      <main className="flex-1 flex items-center justify-center px-4 py-20">
        <div className="text-center max-w-lg">

          {/* Icon */}
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#9D4EDD]/20 to-[#00D9FF]/20 border border-[#00D9FF]/20 flex items-center justify-center mx-auto mb-6">
            <Clock className="w-9 h-9 text-[#00D9FF]" />
          </div>

          {/* Eyebrow */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#00D9FF]/10 border border-[#00D9FF]/20 rounded-full mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00D9FF] animate-pulse" />
            <span className="text-[#00D9FF] text-xs font-semibold uppercase tracking-wider">Coming Soon</span>
          </div>

          <h1 className="text-3xl md:text-4xl font-black text-white mb-3">
            {feature}
          </h1>
          <p className="text-white/50 text-lg mb-2">
            We&apos;re building this feature and it will be available shortly.
          </p>
          <p className="text-white/30 text-sm mb-10">
            Check back soon — new platform features launch every week.
          </p>

          <div className="flex flex-wrap gap-3 justify-center">
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#00D9FF] to-[#9D4EDD] text-white font-bold rounded-xl hover:opacity-90 transition-opacity"
            >
              Go to Dashboard
            </Link>
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 border border-white/10 text-white rounded-xl hover:bg-white/15 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
