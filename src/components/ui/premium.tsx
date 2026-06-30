import React, { useEffect, useRef, useState, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

/**
 * WANKONG shared premium primitives.
 *
 * A small design-system layer so every screen can reach the homepage bar
 * (near-black #0B0814 base, glassmorphism, brand cyan/purple gradients,
 * shimmer skeletons, scroll-reveal motion) without re-implementing it.
 *
 * Brand tokens live in tailwind.config.ts: brand-cyan, brand-purple,
 * ink (page bg), surface / surface-2 (elevated layers).
 */

// ── GlassCard ──────────────────────────────────────────────────────────────
// Frosted panel matching the homepage card treatment.
export function GlassCard({
  children,
  className,
  hover = false,
  as: Tag = 'div',
  ...rest
}: {
  children?: ReactNode;
  className?: string;
  hover?: boolean;
  as?: React.ElementType;
} & React.HTMLAttributes<HTMLElement>) {
  return (
    <Tag
      className={cn(
        'rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm',
        hover && 'transition-all duration-300 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.07]',
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
}

// ── Skeleton ───────────────────────────────────────────────────────────────
// Shimmer placeholder. Compose several to build content-shaped loaders.
export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn('relative overflow-hidden rounded-lg bg-white/5', className)}>
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/10 to-transparent" />
    </div>
  );
}

// ── BrandButton ────────────────────────────────────────────────────────────
// Primary = brand gradient, secondary = glass, ghost = text-only.
// Renders an <a>/<Link> when `to`/`href` is provided, else a <button>.
type BrandButtonProps = {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  to?: string;
  href?: string;
  className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>;

const BTN_SIZES = {
  sm: 'px-4 py-2 text-xs',
  md: 'px-5 py-2.5 text-sm',
  lg: 'px-6 py-3 text-base',
};

const BTN_VARIANTS = {
  primary: 'bg-gradient-to-r from-brand-purple to-brand-cyan text-white hover:opacity-90 shadow-lg shadow-brand-purple/20',
  secondary: 'bg-white/5 border border-white/15 text-white hover:bg-white/10',
  ghost: 'text-white/70 hover:text-white',
};

export function BrandButton({
  children, variant = 'primary', size = 'md', to, href, className, ...rest
}: BrandButtonProps) {
  const classes = cn(
    'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all',
    BTN_SIZES[size], BTN_VARIANTS[variant], className,
  );
  if (to) return <Link to={to} className={classes}>{children}</Link>;
  if (href) return <a href={href} className={classes}>{children}</a>;
  return <button className={classes} {...rest}>{children}</button>;
}

// ── SectionHeading ─────────────────────────────────────────────────────────
export function SectionHeading({
  eyebrow, title, subtitle, align = 'left', accent = '#00D9FF', className,
}: {
  eyebrow?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  align?: 'left' | 'center';
  accent?: string;
  className?: string;
}) {
  return (
    <div className={cn(align === 'center' ? 'text-center' : 'text-left', className)}>
      {eyebrow && (
        <span
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-3"
          style={{ background: `${accent}1A`, color: accent, border: `1px solid ${accent}33` }}
        >
          {eyebrow}
        </span>
      )}
      <h2 className="text-3xl md:text-4xl font-black text-white mb-2">{title}</h2>
      {subtitle && <p className="text-white/45 text-sm">{subtitle}</p>}
    </div>
  );
}

// ── EmptyState ─────────────────────────────────────────────────────────────
export function EmptyState({
  icon, title, description, action, className,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center text-center py-16 px-6', className)}>
      {icon && (
        <div className="w-16 h-16 mb-5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/30">
          {icon}
        </div>
      )}
      <h3 className="text-white text-lg font-bold mb-2">{title}</h3>
      {description && <p className="text-white/45 text-sm max-w-sm mb-6">{description}</p>}
      {action}
    </div>
  );
}

// ── Reveal ─────────────────────────────────────────────────────────────────
// Scroll-into-view fade/rise. Respects prefers-reduced-motion.
export function Reveal({
  children, delay = 0, className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const reduce = typeof window !== 'undefined'
      && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { setShown(true); return; }
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setShown(true); io.disconnect(); } },
      { threshold: 0.12 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={cn('transition-all duration-700 ease-out', className)}
      style={{
        transitionDelay: `${delay}ms`,
        opacity: shown ? 1 : 0,
        transform: shown ? 'none' : 'translateY(16px)',
      }}
    >
      {children}
    </div>
  );
}
