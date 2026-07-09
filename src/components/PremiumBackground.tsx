/**
 * Shared premium atmosphere — base vignette, drifting aurora, starfield, grain.
 * Fixed behind page content. Drop near the top of any page's root element
 * (the page wrapper should establish a stacking context, e.g. `relative`).
 * Animations are defined in index.css (wk-aurora*, wk-stars, wk-noise) and
 * already respect prefers-reduced-motion.
 */
export default function PremiumBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_-10%,rgba(157,78,221,0.14),transparent_55%)]" />
      <div className="absolute -top-1/4 -left-1/4 w-[60vw] h-[60vw] rounded-full blur-[130px] opacity-[0.20] wk-aurora" style={{ background: 'radial-gradient(circle, #9D4EDD, transparent 60%)' }} />
      <div className="absolute top-1/3 -right-1/4 w-[55vw] h-[55vw] rounded-full blur-[130px] opacity-[0.16] wk-aurora-2" style={{ background: 'radial-gradient(circle, #00D9FF, transparent 60%)' }} />
      <div className="absolute bottom-0 left-1/4 w-[50vw] h-[50vw] rounded-full blur-[130px] opacity-[0.12] wk-aurora-3" style={{ background: 'radial-gradient(circle, #FF3B6B, transparent 60%)' }} />
      <div className="absolute top-1/2 left-1/3 w-[45vw] h-[45vw] rounded-full blur-[150px] opacity-[0.10] wk-aurora-4" style={{ background: 'radial-gradient(circle, #2D6BFF, transparent 60%)' }} />
      <div className="absolute inset-0 wk-stars opacity-25" />
      <div className="absolute inset-0 wk-noise" />
    </div>
  );
}
