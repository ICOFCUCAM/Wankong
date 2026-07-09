/**
 * WANKONG book-cover engine.
 *
 * One shared source of truth for generated book covers — used by the author
 * BookCoverGenerator UI (front + back) and to produce the homepage mock
 * covers. Pure SVG string builders + a browser rasterizer to PNG so a
 * generated cover can be uploaded as a real product image.
 */

export type Motif = 'waves' | 'orbits' | 'bars' | 'peaks' | 'grid' | 'sun' | 'petals';

export interface CoverTheme {
  id: string;
  name: string;
  top: string;
  bottom: string;
  accent: string;
  accent2: string;
  motif: Motif;
}

export const BOOK_COVER_THEMES: CoverTheme[] = [
  { id: 'tide',     name: 'Ocean Tide',   top: '#10394A', bottom: '#05131B', accent: '#34C6E6', accent2: '#7BE0F5', motif: 'waves' },
  { id: 'ember',    name: 'Gold Ember',   top: '#3A2F08', bottom: '#0E0B02', accent: '#F5C542', accent2: '#FFE08A', motif: 'bars' },
  { id: 'crimson',  name: 'Crimson Peak', top: '#3A0E1A', bottom: '#120308', accent: '#FF4D6D', accent2: '#FF8FA3', motif: 'peaks' },
  { id: 'orchid',   name: 'Orchid Verse', top: '#2E0E3E', bottom: '#0C0414', accent: '#B57BE8', accent2: '#D9B8F5', motif: 'waves' },
  { id: 'cosmos',   name: 'Cosmos',       top: '#10204A', bottom: '#040A1A', accent: '#5B8CFF', accent2: '#9DB8FF', motif: 'orbits' },
  { id: 'jade',     name: 'Jade Dawn',    top: '#0A3A2A', bottom: '#03130D', accent: '#34E0A0', accent2: '#7BF5C8', motif: 'sun' },
  { id: 'rose',     name: 'Rose Bloom',   top: '#3A0E28', bottom: '#140510', accent: '#FF5DA2', accent2: '#FFA3CE', motif: 'petals' },
  { id: 'amber',    name: 'Amber Sun',    top: '#3A2408', bottom: '#120A02', accent: '#FFA63D', accent2: '#FFCB85', motif: 'sun' },
  { id: 'slate',    name: 'Blue Slate',   top: '#16294A', bottom: '#060C18', accent: '#6E94E6', accent2: '#A8C0FF', motif: 'grid' },
];

const GENRE_THEME: Record<string, string> = {
  'fiction': 'tide', 'non-fiction': 'slate', 'business': 'ember',
  'thriller': 'crimson', 'poetry': 'orchid', 'sci-fi': 'cosmos',
  'sci-fi & fantasy': 'cosmos', 'self-help': 'jade', 'romance': 'rose',
  'parenting': 'amber', 'children': 'amber', 'religion & spirituality': 'orchid',
  'biography': 'slate',
};

export function themeForGenre(genre?: string): CoverTheme {
  const id = genre ? GENRE_THEME[genre.toLowerCase()] : undefined;
  return BOOK_COVER_THEMES.find(t => t.id === id) ?? BOOK_COVER_THEMES[0];
}

export function getTheme(themeId?: string, genre?: string): CoverTheme {
  if (themeId) {
    const t = BOOK_COVER_THEMES.find(x => x.id === themeId);
    if (t) return t;
  }
  return themeForGenre(genre);
}

// ── helpers ──────────────────────────────────────────────────────────────────
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function wrap(text: string, limit: number, maxLines: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    if (cur && (cur.length + 1 + w.length) > limit) { lines.push(cur); cur = w; }
    else cur = cur ? `${cur} ${w}` : w;
    if (lines.length >= maxLines) break;
  }
  if (cur && lines.length < maxLines) lines.push(cur);
  if (lines.length === maxLines && words.join(' ').length > lines.join(' ').length) {
    lines[maxLines - 1] = lines[maxLines - 1].replace(/.{1}$/, '…');
  }
  return lines.length ? lines : [text];
}

// ── motifs ───────────────────────────────────────────────────────────────────
function motif(kind: Motif, a: string, a2: string): string {
  switch (kind) {
    case 'waves':
      return [0.10, 0.16, 0.26, 0.5].map((op, i) => {
        const y = 430 + i * 46; const col = i === 3 ? a2 : a;
        return `<path d="M0 ${y} C 150 ${y - 40}, 300 ${y + 40}, 450 ${y - 30} S 600 ${y + 20}, 600 ${y} L600 760 L0 760 Z" fill="${col}" opacity="${op}"/>`;
      }).join('\n');
    case 'orbits':
      return [
        ...[[168, 0.14], [124, 0.20], [80, 0.30]].map(([r, o]) => `<circle cx="300" cy="500" r="${r}" fill="none" stroke="${a}" stroke-width="2" opacity="${o}"/>`),
        `<circle cx="372" cy="438" r="20" fill="${a2}" opacity="0.9"/>`,
        `<circle cx="300" cy="500" r="40" fill="${a}" opacity="0.25"/>`,
        ...[[250, 560, 4, 0.8], [360, 540, 3, 0.7], [230, 470, 3, 0.6], [330, 430, 5, 0.8]].map(([x, y, r, o]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${a2}" opacity="${o}"/>`),
      ].join('\n');
    case 'bars': {
      const xs = [200, 264, 328, 392]; const hs = [120, 190, 150, 250];
      const bars = xs.map((x, i) => {
        const col = i === xs.length - 1 ? a2 : a;
        const op = i === xs.length - 1 ? 0.85 : 0.35 + i * 0.08;
        return `<rect x="${x}" y="${640 - hs[i]}" width="44" height="${hs[i]}" rx="6" fill="${col}" opacity="${op.toFixed(2)}"/>`;
      }).join('\n');
      return `${bars}\n<path d="M210 540 L286 470 L350 510 L430 410" fill="none" stroke="${a2}" stroke-width="4" opacity="0.9" stroke-linecap="round" stroke-linejoin="round"/>\n<circle cx="430" cy="410" r="7" fill="${a2}"/>`;
    }
    case 'peaks':
      return [
        `<polygon points="120,640 240,440 330,560 600,300 600,640" fill="${a}" opacity="0.30"/>`,
        `<polygon points="0,640 180,500 300,580 430,430 600,560 600,640" fill="${a2}" opacity="0.45"/>`,
        `<polygon points="0,640 140,560 280,610 420,540 600,620 600,640" fill="${a}" opacity="0.7"/>`,
      ].join('\n');
    case 'grid': {
      const v = [0, 1, 2, 3, 4].map(i => `<line x1="${180 + i * 60}" y1="400" x2="${180 + i * 60}" y2="620" stroke="${a}" stroke-width="1.5" opacity="0.2"/>`);
      const h = [0, 1, 2, 3, 4].map(j => `<line x1="180" y1="${400 + j * 55}" x2="420" y2="${400 + j * 55}" stroke="${a}" stroke-width="1.5" opacity="0.2"/>`);
      return `${v.join('\n')}\n${h.join('\n')}\n<rect x="240" y="455" width="120" height="110" rx="8" fill="${a2}" opacity="0.85"/>\n<rect x="240" y="455" width="120" height="110" rx="8" fill="none" stroke="${a2}" stroke-width="2"/>`;
    }
    case 'sun': {
      const cx = 300, cy = 560;
      const rays = Array.from({ length: 12 }, (_, k) => {
        const ang = Math.PI + k * (Math.PI / 11);
        return `<line x1="${cx}" y1="${cy}" x2="${(cx + 210 * Math.cos(ang)).toFixed(0)}" y2="${(cy + 210 * Math.sin(ang)).toFixed(0)}" stroke="${a}" stroke-width="3" opacity="0.18"/>`;
      });
      return `${rays.join('\n')}\n<path d="M120 560 A180 180 0 0 1 480 560" fill="none" stroke="${a2}" stroke-width="4" opacity="0.8"/>\n<circle cx="${cx}" cy="${cy}" r="58" fill="${a2}" opacity="0.9"/>\n<circle cx="${cx}" cy="${cy}" r="58" fill="${a}" opacity="0.25"/>`;
    }
    case 'petals': {
      const cx = 300, cy = 510;
      const petals = Array.from({ length: 6 }, (_, k) => {
        const ang = k * (Math.PI / 3);
        const dx = 70 * Math.cos(ang), dy = 70 * Math.sin(ang);
        return `<ellipse cx="${(cx + dx).toFixed(0)}" cy="${(cy + dy).toFixed(0)}" rx="56" ry="26" fill="${a}" opacity="0.30" transform="rotate(${(ang * 180 / Math.PI).toFixed(0)} ${(cx + dx).toFixed(0)} ${(cy + dy).toFixed(0)})"/>`;
      });
      return `${petals.join('\n')}\n<circle cx="${cx}" cy="${cy}" r="34" fill="${a2}" opacity="0.9"/>`;
    }
  }
}

function defs(t: CoverTheme): string {
  return `<defs>
  <linearGradient id="g" x1="0.2" y1="0" x2="0.8" y2="1"><stop offset="0" stop-color="${t.top}"/><stop offset="1" stop-color="${t.bottom}"/></linearGradient>
  <radialGradient id="glow" cx="0.5" cy="0.62" r="0.55"><stop offset="0" stop-color="${t.accent}" stop-opacity="0.30"/><stop offset="1" stop-color="${t.accent}" stop-opacity="0"/></radialGradient>
  <linearGradient id="vig" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset="0.78" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.55"/></linearGradient>
</defs>`;
}

export interface BookCoverInput {
  title: string;
  author: string;
  genre?: string;
  themeId?: string;
  blurb?: string;
  imprint?: string;
}

const SERIF = `font-family="Georgia, 'Times New Roman', serif"`;
const SANS = `font-family="Arial, sans-serif"`;

export function renderFrontCoverSVG(input: BookCoverInput): string {
  const t = getTheme(input.themeId, input.genre);
  const title = (input.title || 'Untitled').trim();
  const author = (input.author || 'Unknown Author').trim();
  const label = (input.genre || t.name).toUpperCase();
  const lines = wrap(title, 12, 3);
  const longest = lines.reduce((m, l) => Math.max(m, l.length), 0);
  const size = longest <= 11 ? 60 : 50;
  const ty = 250 - (lines.length - 1) * 22;
  const tspans = lines.map((l, i) => `<tspan x="300" dy="${i === 0 ? 0 : size + 6}">${esc(l)}</tspan>`).join('');
  const ruleY = ty + (lines.length - 1) * (size + 6) + 40;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="900" viewBox="0 0 600 900" ${SERIF}>
${defs(t)}
<rect width="600" height="900" fill="url(#g)"/>
<rect width="600" height="900" fill="url(#glow)"/>
${motif(t.motif, t.accent, t.accent2)}
<rect width="600" height="900" fill="url(#vig)"/>
<rect x="28" y="28" width="544" height="844" rx="12" fill="none" stroke="${t.accent2}" stroke-width="1.5" opacity="0.35"/>
<text x="300" y="116" fill="${t.accent2}" font-size="17" letter-spacing="6" text-anchor="middle" ${SANS} opacity="0.9">${esc(label)}</text>
<text x="300" y="${ty}" fill="#ffffff" font-size="${size}" font-weight="bold" text-anchor="middle" style="paint-order:stroke">${tspans}</text>
<rect x="262" y="${ruleY}" width="76" height="3" rx="1.5" fill="${t.accent2}" opacity="0.9"/>
<text x="300" y="812" fill="#ffffff" font-size="25" text-anchor="middle" opacity="0.82" ${SANS}>${esc(author)}</text>
<text x="300" y="852" fill="${t.accent2}" font-size="13" letter-spacing="5" text-anchor="middle" ${SANS} font-weight="bold" opacity="0.75">${esc((input.imprint || 'WANKONG BOOKS').toUpperCase())}</text>
</svg>`;
}

export function renderBackCoverSVG(input: BookCoverInput): string {
  const t = getTheme(input.themeId, input.genre);
  const blurb = (input.blurb || 'A compelling new title from an independent author, published worldwide on WANKONG. Add a synopsis to tell readers what to expect.').trim();
  const lines = wrap(blurb, 38, 11);
  const blurbSvg = lines.map((l, i) => `<tspan x="70" dy="${i === 0 ? 0 : 34}">${esc(l)}</tspan>`).join('');
  // simple barcode
  const bars = Array.from({ length: 32 }, (_, i) => {
    const w = (i % 3) + 1;
    const x = 372 + i * 5;
    return `<rect x="${x}" y="792" width="${w}" height="44" fill="#0B0814"/>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="900" viewBox="0 0 600 900" ${SERIF}>
${defs(t)}
<rect width="600" height="900" fill="url(#g)"/>
<rect width="600" height="900" fill="url(#glow)" opacity="0.5"/>
<rect width="600" height="900" fill="url(#vig)"/>
<rect x="28" y="28" width="544" height="844" rx="12" fill="none" stroke="${t.accent2}" stroke-width="1.5" opacity="0.35"/>
<text x="70" y="120" fill="${t.accent2}" font-size="15" letter-spacing="5" ${SANS} opacity="0.9">${esc((input.genre || t.name).toUpperCase())}</text>
<text x="70" y="170" fill="#ffffff" font-size="30" font-weight="bold">${esc((input.title || 'Untitled').trim())}</text>
<rect x="70" y="196" width="64" height="3" rx="1.5" fill="${t.accent2}" opacity="0.9"/>
<text x="70" y="252" fill="#ffffff" font-size="21" opacity="0.85" ${SANS}>${blurbSvg}</text>
<text x="70" y="720" fill="${t.accent2}" font-size="14" letter-spacing="3" ${SANS} opacity="0.85">ABOUT THE AUTHOR</text>
<text x="70" y="752" fill="#ffffff" font-size="20" opacity="0.8" ${SANS}>${esc(input.author || 'Unknown Author')}</text>
<rect x="364" y="780" width="178" height="68" rx="6" fill="#ffffff" opacity="0.92"/>
${bars}
<text x="453" y="862" fill="#ffffff" font-size="11" letter-spacing="2" text-anchor="middle" ${SANS} opacity="0.5">WANKONG · ${esc((input.imprint || 'BOOKS').toUpperCase())}</text>
<text x="70" y="846" fill="${t.accent2}" font-size="13" letter-spacing="5" ${SANS} font-weight="bold" opacity="0.75">WANKONG BOOKS</text>
</svg>`;
}

/** Rasterize an SVG string to a PNG data URL (browser only). */
export async function svgToPngDataURL(svg: string, width = 600, height = 900): Promise<string> {
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.width = width; img.height = height;
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('cover render failed'));
      img.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('no canvas context');
    ctx.drawImage(img, 0, 0, width, height);
    return canvas.toDataURL('image/png');
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function svgToDataURL(svg: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
