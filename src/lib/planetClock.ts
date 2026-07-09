/**
 * THE PULSE — Phase 3: follow-the-sun theatre.
 *
 * Two honest clocks:
 *  • primeTimeRegion() — which world city is in cultural prime time (~21:00
 *    local) right now. The homepage stages itself around it: the hero carries
 *    a "Right now on Earth" line and the globe explorer opens on that
 *    region's continent.
 *  • localDayPhase() — the VISITOR's own time of day, driving the page's
 *    ambient sky light (dawn gold → daylight → dusk pink → midnight violet).
 */

export interface PrimeRegion {
  city: string;
  flag: string;
  tz: number; // approximate UTC offset in hours (no DST — vibe, not schedule)
  continent: 'Africa' | 'Europe' | 'Asia' | 'Americas' | 'Global';
  vibe: string;
  accent: string;
}

const REGIONS: PrimeRegion[] = [
  { city: 'Auckland',    flag: '🇳🇿', tz: 12,   continent: 'Asia',     vibe: 'Island pop is rising',      accent: '#00F5A0' },
  { city: 'Sydney',      flag: '🇦🇺', tz: 10,   continent: 'Asia',     vibe: 'Indie sets are live',       accent: '#00D9FF' },
  { city: 'Seoul',       flag: '🇰🇷', tz: 9,    continent: 'Asia',     vibe: 'K-Pop is surging',          accent: '#FF006E' },
  { city: 'Shanghai',    flag: '🇨🇳', tz: 8,    continent: 'Asia',     vibe: 'C-Pop charts are moving',   accent: '#FFB800' },
  { city: 'Jakarta',     flag: '🇮🇩', tz: 7,    continent: 'Asia',     vibe: 'Dangdut nights begin',      accent: '#FF6B00' },
  { city: 'Mumbai',      flag: '🇮🇳', tz: 5.5,  continent: 'Asia',     vibe: 'Bollywood beats peak',      accent: '#9D4EDD' },
  { city: 'Dubai',       flag: '🇦🇪', tz: 4,    continent: 'Asia',     vibe: 'Khaleeji pop takes over',   accent: '#FFB800' },
  { city: 'Nairobi',     flag: '🇰🇪', tz: 3,    continent: 'Africa',   vibe: 'Gengetone is heating up',   accent: '#00F5A0' },
  { city: 'Lagos',       flag: '🇳🇬', tz: 1,    continent: 'Africa',   vibe: 'Afrobeats owns the night',  accent: '#FF6B00' },
  { city: 'London',      flag: '🇬🇧', tz: 0,    continent: 'Europe',   vibe: 'UK drill & pop collide',    accent: '#00D9FF' },
  { city: 'São Paulo',   flag: '🇧🇷', tz: -3,   continent: 'Americas', vibe: 'Funk carioca is pumping',   accent: '#00F5A0' },
  { city: 'New York',    flag: '🇺🇸', tz: -5,   continent: 'Americas', vibe: 'Hip-hop rules the evening', accent: '#9D4EDD' },
  { city: 'Mexico City', flag: '🇲🇽', tz: -6,   continent: 'Americas', vibe: 'Corridos are exploding',    accent: '#FFB800' },
  { city: 'Los Angeles', flag: '🇺🇸', tz: -8,   continent: 'Americas', vibe: 'Pop sessions run late',     accent: '#FF006E' },
];

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export interface PrimeTimeNow extends PrimeRegion {
  /** e.g. "Friday night in Seoul" */
  line: string;
}

export function primeTimeRegion(now: Date = new Date()): PrimeTimeNow {
  const utcH = now.getUTCHours() + now.getUTCMinutes() / 60;
  let best = REGIONS[0];
  let bestD = Infinity;
  for (const r of REGIONS) {
    const local = (utcH + r.tz + 24) % 24;
    const d = Math.abs(local - 21);
    const wrap = Math.min(d, 24 - d);
    if (wrap < bestD) { bestD = wrap; best = r; }
  }
  const localDate = new Date(now.getTime() + best.tz * 3600_000);
  const weekday = DAYS[localDate.getUTCDay()];
  const localHour = localDate.getUTCHours();
  const moment = localHour >= 22 || localHour < 4 ? 'late night' : localHour >= 17 ? 'night' : 'evening';
  return { ...best, line: `${weekday} ${moment} in ${best.city}` };
}

export interface DayPhase {
  name: 'dawn' | 'day' | 'dusk' | 'night';
  /** rgb triplet for the ambient sky glow */
  rgb: string;
  /** glow strength 0..1 */
  intensity: number;
}

export function localDayPhase(now: Date = new Date()): DayPhase {
  const h = now.getHours() + now.getMinutes() / 60;
  if (h >= 5 && h < 8)   return { name: 'dawn',  rgb: '255,184,0',   intensity: 0.14 };
  if (h >= 8 && h < 17)  return { name: 'day',   rgb: '0,217,255',   intensity: 0.08 };
  if (h >= 17 && h < 20) return { name: 'dusk',  rgb: '255,59,154',  intensity: 0.13 };
  return                        { name: 'night', rgb: '157,78,221',  intensity: 0.16 };
}
