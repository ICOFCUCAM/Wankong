import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

/**
 * THE PULSE — Phase 2: the bloodstream.
 *
 * Real platform events become visible circulation: when something actually
 * happens (a product goes live, a competition entry is published, an Arena
 * Drop is scheduled), a point of light is born near the LIVE ticker, travels
 * down the page, and lands on the section where the new thing now lives —
 * which glows briefly as the card "arrives".
 *
 * Sources are Supabase realtime changes on publicly-readable rows, so the
 * stream only ever shows what a visitor could see anyway. Everything is
 * WAAPI + compositor properties; no React re-renders. Skipped entirely under
 * prefers-reduced-motion.
 */

interface PulseEvent {
  targetId: string;                 // section element id to land on
  color: string;                    // light color
  ticker?: { flag: string; who: string; text: string; accent: string };
}

const reduced = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

function flashTarget(el: Element, color: string) {
  const r = el.getBoundingClientRect();
  const glow = document.createElement('div');
  glow.style.cssText = [
    'position:fixed', 'pointer-events:none', 'z-index:35', 'border-radius:24px',
    `left:${r.left + 8}px`, `top:${r.top + 8}px`,
    `width:${r.width - 16}px`, `height:${Math.min(r.height, window.innerHeight) - 16}px`,
    `box-shadow:inset 0 0 0 1px ${color}55, 0 0 80px -20px ${color}aa`,
    'opacity:0', 'transition:opacity .35s ease',
  ].join(';');
  document.body.appendChild(glow);
  requestAnimationFrame(() => { glow.style.opacity = '1'; });
  setTimeout(() => { glow.style.opacity = '0'; setTimeout(() => glow.remove(), 400); }, 900);
}

function travelLight(ev: PulseEvent) {
  if (reduced()) return;
  const target = document.getElementById(ev.targetId);
  if (!target) return;

  // Birth point: the LIVE ticker badge if visible, else under the header
  const born = { x: window.innerWidth * 0.08, y: Math.min(140, window.innerHeight * 0.18) };
  const tr = target.getBoundingClientRect();
  // If the target is far below the viewport, land at the bottom edge instead
  const landY = Math.min(Math.max(tr.top + 40, 120), window.innerHeight - 60);
  const landX = tr.left + tr.width * 0.5;

  const dot = document.createElement('div');
  dot.style.cssText = [
    'position:fixed', 'left:0', 'top:0', 'z-index:36', 'pointer-events:none',
    'width:10px', 'height:10px', 'border-radius:9999px',
    `background:${ev.color}`,
    `box-shadow:0 0 10px 2px ${ev.color}, 0 0 34px 10px ${ev.color}66`,
  ].join(';');
  document.body.appendChild(dot);

  const midX = (born.x + landX) / 2 + (landX > born.x ? 60 : -60);
  const midY = (born.y + landY) / 2 - 40;
  const anim = dot.animate(
    [
      { transform: `translate(${born.x}px, ${born.y}px) scale(0.4)`, opacity: 0 },
      { transform: `translate(${born.x}px, ${born.y}px) scale(1.2)`, opacity: 1, offset: 0.12 },
      { transform: `translate(${midX}px, ${midY}px) scale(1)`, opacity: 1, offset: 0.55 },
      { transform: `translate(${landX}px, ${landY}px) scale(1.6)`, opacity: 1, offset: 0.94 },
      { transform: `translate(${landX}px, ${landY}px) scale(2.6)`, opacity: 0 },
    ],
    { duration: 1700, easing: 'cubic-bezier(.35,.1,.25,1)' },
  );
  anim.onfinish = () => { dot.remove(); flashTarget(target, ev.color); };

  if (ev.ticker) window.dispatchEvent(new CustomEvent('wk:ticker', { detail: ev.ticker }));
}

export default function Bloodstream() {
  useEffect(() => {
    // Allow a manual demo trigger (used by tests/previews; harmless in prod)
    const demo = () => travelLight({
      targetId: 'sec-new-releases', color: '#00D9FF',
      ticker: { flag: '🌍', who: 'A creator', text: 'just released a new drop', accent: '#00D9FF' },
    });
    window.addEventListener('wk:bloodstream-demo', demo);

    const channel = supabase
      .channel('wk-bloodstream')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ecom_products' }, (payload: any) => {
        const row = payload.new ?? {};
        if (row.status && row.status !== 'active') return;
        travelLight({
          targetId: 'sec-new-releases', color: '#00D9FF',
          ticker: { flag: '🌍', who: row.vendor || 'A creator', text: `just released “${row.title ?? 'a new drop'}”`, accent: '#00D9FF' },
        });
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'competition_entries_v2' }, (payload: any) => {
        const row = payload.new ?? {};
        if (!row.visible_on_home) return;
        travelLight({
          targetId: 'sec-arena', color: '#FFB800',
          ticker: { flag: '🏆', who: row.performer_name || 'A creator', text: 'just went live in the Arena', accent: '#FFB800' },
        });
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'arena_drops' }, (payload: any) => {
        const row = payload.new ?? {};
        travelLight({
          targetId: 'sec-arena', color: '#FF6B00',
          ticker: { flag: '⚡', who: 'Arena Drop', text: `“${row.song_title ?? 'a new challenge'}” has been scheduled`, accent: '#FF6B00' },
        });
      })
      .subscribe();

    return () => {
      window.removeEventListener('wk:bloodstream-demo', demo);
      supabase.removeChannel(channel);
    };
  }, []);

  return null;
}
