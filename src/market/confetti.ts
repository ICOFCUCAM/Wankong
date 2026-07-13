// Tiny self-contained confetti burst — a moment of delight when a shopper
// saves a deal. No dependencies, cleans up after itself, respects
// prefers-reduced-motion.

export function confettiBurst(x: number, y: number) {
  if (typeof window === 'undefined') return;
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:9999';
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  if (!ctx) { canvas.remove(); return; }

  const colors = ['#2563EB', '#06B6D4', '#7C3AED', '#F59E0B', '#10B981', '#EC4899'];
  const parts = Array.from({ length: 46 }, () => ({
    x, y,
    vx: (Math.random() - 0.5) * 9,
    vy: Math.random() * -9 - 3,
    r: Math.random() * 5 + 3,
    c: colors[Math.floor(Math.random() * colors.length)],
    rot: Math.random() * Math.PI * 2,
    vr: (Math.random() - 0.5) * 0.4,
  }));

  const start = performance.now();
  const DUR = 1100;
  let raf = 0;
  const tick = (now: number) => {
    const elapsed = now - start;
    const alpha = Math.max(0, 1 - elapsed / DUR);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const p of parts) {
      p.vy += 0.32; p.x += p.vx; p.y += p.vy; p.rot += p.vr;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.c;
      ctx.fillRect(-p.r / 2, -p.r / 2, p.r, p.r * 0.6);
      ctx.restore();
    }
    if (elapsed < DUR) raf = requestAnimationFrame(tick);
    else { cancelAnimationFrame(raf); canvas.remove(); }
  };
  raf = requestAnimationFrame(tick);
}
