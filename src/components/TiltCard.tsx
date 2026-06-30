import React, { useRef, useCallback } from 'react';

interface TiltCardProps {
  children: React.ReactNode;
  className?: string;
  /** max tilt in degrees (default 7) */
  max?: number;
  /** glow tint, any CSS color (default cyan) */
  glow?: string;
  style?: React.CSSProperties;
}

const fine =
  typeof window !== 'undefined' &&
  window.matchMedia?.('(hover: hover) and (pointer: fine)').matches &&
  !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * Premium card shell: mouse-tracked 3D tilt, a cursor-following ambient glow,
 * and an inner highlight/shadow. Pure presentation — wrap any card content
 * (links, buttons stay fully interactive). No-ops on touch / reduced-motion.
 */
export default function TiltCard({ children, className = '', max = 7, glow = 'rgba(0,217,255,0.35)', style }: TiltCardProps) {
  const inner = useRef<HTMLDivElement>(null);
  const raf = useRef<number>();

  const onMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!fine || !inner.current) return;
    const el = inner.current;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;   // 0..1
    const py = (e.clientY - r.top) / r.height;   // 0..1
    if (raf.current) cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => {
      const rx = (0.5 - py) * max * 2;
      const ry = (px - 0.5) * max * 2;
      el.style.transform = `perspective(900px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) translateZ(0)`;
      el.style.setProperty('--gx', `${(px * 100).toFixed(1)}%`);
      el.style.setProperty('--gy', `${(py * 100).toFixed(1)}%`);
      el.style.setProperty('--glow-o', '1');
    });
  }, [max]);

  const onLeave = useCallback(() => {
    const el = inner.current;
    if (!el) return;
    if (raf.current) cancelAnimationFrame(raf.current);
    el.style.transform = 'perspective(900px) rotateX(0deg) rotateY(0deg) translateZ(0)';
    el.style.setProperty('--glow-o', '0');
  }, []);

  return (
    <div onMouseMove={onMove} onMouseLeave={onLeave} style={{ perspective: 900, ...style }} className={className}>
      <div
        ref={inner}
        className="tilt-inner relative h-full w-full rounded-[inherit] transition-transform duration-300 ease-out will-change-transform"
        style={{ ['--glow' as any]: glow }}
      >
        {/* cursor-following ambient glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-20 rounded-[inherit] transition-opacity duration-300"
          style={{
            opacity: 'var(--glow-o,0)' as any,
            background: 'radial-gradient(420px circle at var(--gx,50%) var(--gy,50%), var(--glow), transparent 42%)',
            mixBlendMode: 'screen',
          }}
        />
        {/* inner highlight + shadow for depth */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-20 rounded-[inherit]"
          style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), inset 0 -20px 40px -30px rgba(0,0,0,0.7)' }}
        />
        {children}
      </div>
    </div>
  );
}
