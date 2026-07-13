import React, { useEffect, useRef, type ReactNode, type ElementType } from 'react';

// Meridian motion primitives — the micro-interactions that make SmartKong
// feel alive: scroll-reveal choreography, magnetic buttons, tilt cards, and
// the horizon-arc section seam. All reduced-motion aware.

// ── Reveal: element rises into view when scrolled to ────────────────────────────
export function Reveal({ as: Tag = 'div', delay = 0, className = '', children }: {
  as?: ElementType; delay?: number; className?: string; children: ReactNode;
}) {
  const ref = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const io = new IntersectionObserver(entries => {
      for (const e of entries) if (e.isIntersecting) { el.classList.add('sk-in'); io.disconnect(); }
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <Tag ref={ref as any} className={`sk-reveal ${className}`} style={delay ? { transitionDelay: `${delay}ms` } : undefined}>
      {children}
    </Tag>
  );
}

// ── Magnetic: pulls gently toward the cursor (Arc-browser feel) ─────────────────
export function Magnetic({ strength = 0.3, className = '', children }: {
  strength?: number; className?: string; children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const move = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left - r.width / 2) * strength;
      const y = (e.clientY - r.top - r.height / 2) * strength;
      el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
    };
    const leave = () => { el.style.transform = ''; };
    el.addEventListener('mousemove', move);
    el.addEventListener('mouseleave', leave);
    return () => { el.removeEventListener('mousemove', move); el.removeEventListener('mouseleave', leave); };
  }, [strength]);
  return <div ref={ref} className={`sk-magnet inline-block ${className}`}>{children}</div>;
}

// ── Tilt: 3D card tilt following the cursor ─────────────────────────────────────
export function Tilt({ max = 7, className = '', children }: { max?: number; className?: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const move = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      const rx = ((e.clientY - r.top) / r.height - 0.5) * -2 * max;
      const ry = ((e.clientX - r.left) / r.width - 0.5) * 2 * max;
      el.style.transform = `perspective(800px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`;
    };
    const leave = () => { el.style.transform = ''; };
    el.addEventListener('mousemove', move);
    el.addEventListener('mouseleave', leave);
    return () => { el.removeEventListener('mousemove', move); el.removeEventListener('mouseleave', leave); };
  }, [max]);
  return <div ref={ref} className={`sk-tilt ${className}`}>{children}</div>;
}

// ── Spotlight: a soft aurora glow that follows the cursor over dark bands ───────
export function Spotlight({ className = '', color = 'rgba(124,58,237,0.18)', children }: {
  className?: string; color?: string; children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const glow = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = ref.current, g = glow.current; if (!el || !g) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const move = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      g.style.opacity = '1';
      g.style.transform = `translate(${(e.clientX - r.left).toFixed(0)}px, ${(e.clientY - r.top).toFixed(0)}px)`;
    };
    const leave = () => { g.style.opacity = '0'; };
    el.addEventListener('mousemove', move);
    el.addEventListener('mouseleave', leave);
    return () => { el.removeEventListener('mousemove', move); el.removeEventListener('mouseleave', leave); };
  }, []);
  return (
    <div ref={ref} className={`relative ${className}`}>
      <div ref={glow} aria-hidden className="pointer-events-none absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2 w-[36rem] h-[36rem] rounded-full opacity-0 transition-opacity duration-500 blur-[80px] z-0"
        style={{ background: `radial-gradient(circle, ${color}, transparent 60%)` }} />
      {children}
    </div>
  );
}

// ── ScrollProgress: a thin aurora meridian tracking page scroll ────────────────
export function ScrollProgress() {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const bar = ref.current; if (!bar) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      const p = max > 0 ? Math.min(1, h.scrollTop / max) : 0;
      bar.style.transform = `scaleX(${p.toFixed(4)})`;
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); if (raf) cancelAnimationFrame(raf); };
  }, []);
  return (
    <div aria-hidden className="fixed top-0 left-0 right-0 z-[60] h-[3px] pointer-events-none">
      <div ref={ref} className="h-full w-full origin-left" style={{ transform: 'scaleX(0)', background: 'linear-gradient(90deg,#2563EB,#7C3AED 55%,#06B6D4)' }} />
    </div>
  );
}

// ── ArcSeam: the meridian horizon between sections — the brand's signature ─────
export function ArcSeam({ from = '#FFFFFF', to, flip = false }: { from?: string; to?: string; flip?: boolean }) {
  return (
    <div aria-hidden className="relative w-full overflow-hidden leading-none" style={{ background: to, transform: flip ? 'scaleY(-1)' : undefined }}>
      <svg viewBox="0 0 1440 90" preserveAspectRatio="none" className="block w-full h-[44px] md:h-[72px]">
        <path d="M0,90 C360,8 1080,8 1440,90 L1440,0 L0,0 Z" fill={from} />
        <path d="M0,90 C360,8 1080,8 1440,90" fill="none" stroke="url(#skArcSeam)" strokeWidth="2" opacity="0.5" />
        <defs>
          <linearGradient id="skArcSeam" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#2563EB" stopOpacity="0" />
            <stop offset="0.5" stopColor="#7C3AED" />
            <stop offset="1" stopColor="#06B6D4" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}
