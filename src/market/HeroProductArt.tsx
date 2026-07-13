import React from 'react';

// Hand-drawn SVG product art for the hero's floating cards. Everything is
// coded (no external images) so the hero always renders — headphones, phone,
// laptop, drone and TV each get a realistic little illustration with
// gradients, highlights and a branded backdrop.

export type ArtKind = 'headphones' | 'phone' | 'laptop' | 'drone' | 'tv';

function ArtHeadphones() {
  return (
    <svg viewBox="0 0 120 90" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="hpBg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#252D3A" /><stop offset="1" stopColor="#0C1017" />
        </linearGradient>
        <linearGradient id="hpCup" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#454C58" /><stop offset="0.5" stopColor="#262B33" /><stop offset="1" stopColor="#12151A" />
        </linearGradient>
        <linearGradient id="hpBand" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4E5560" /><stop offset="1" stopColor="#23272E" />
        </linearGradient>
      </defs>
      <rect width="120" height="90" fill="url(#hpBg)" />
      <ellipse cx="60" cy="26" rx="48" ry="24" fill="#3B82F6" opacity="0.09" />
      {/* headband */}
      <path d="M33 58 C33 22 87 22 87 58" stroke="url(#hpBand)" strokeWidth="8" fill="none" strokeLinecap="round" />
      <path d="M35 56 C35 26 85 26 85 56" stroke="#6B7280" strokeWidth="1.4" fill="none" strokeLinecap="round" opacity="0.55" />
      {/* yokes */}
      <path d="M33 52 L33 60" stroke="#3A404A" strokeWidth="5" strokeLinecap="round" />
      <path d="M87 52 L87 60" stroke="#3A404A" strokeWidth="5" strokeLinecap="round" />
      {/* ear cups */}
      <rect x="22" y="52" width="22" height="28" rx="10" fill="url(#hpCup)" />
      <rect x="76" y="52" width="22" height="28" rx="10" fill="url(#hpCup)" />
      {/* cushions */}
      <rect x="26" y="56" width="14" height="20" rx="7" fill="#0B0D10" />
      <rect x="80" y="56" width="14" height="20" rx="7" fill="#0B0D10" />
      {/* subtle highlights */}
      <path d="M26 58 q-1 8 2 16" stroke="#8B93A0" strokeWidth="1" fill="none" opacity="0.35" strokeLinecap="round" />
      <path d="M80 58 q-1 8 2 16" stroke="#8B93A0" strokeWidth="1" fill="none" opacity="0.35" strokeLinecap="round" />
    </svg>
  );
}

function ArtPhone() {
  return (
    <svg viewBox="0 0 120 90" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="ipBg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#E3E6EA" /><stop offset="1" stopColor="#ADB2B9" />
        </linearGradient>
        <linearGradient id="ipBody" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#F4F5F7" /><stop offset="0.5" stopColor="#D6D9DD" /><stop offset="1" stopColor="#AEB3BA" />
        </linearGradient>
      </defs>
      <rect width="120" height="90" fill="url(#ipBg)" />
      {/* titanium back */}
      <rect x="43" y="5" width="34" height="80" rx="8" fill="url(#ipBody)" stroke="#878C93" strokeWidth="0.9" />
      <rect x="44.2" y="6.2" width="31.6" height="77.6" rx="7" fill="none" stroke="#FFFFFF" strokeWidth="0.7" opacity="0.6" />
      {/* camera plateau */}
      <rect x="47" y="9" width="15" height="15" rx="4.5" fill="#CDD0D5" stroke="#9BA0A7" strokeWidth="0.7" />
      {/* lenses */}
      <circle cx="51" cy="13" r="3" fill="#191C21" /><circle cx="51" cy="13" r="1.6" fill="#2B3242" /><circle cx="50.3" cy="12.3" r="0.6" fill="#7EA2FF" />
      <circle cx="51" cy="20" r="3" fill="#191C21" /><circle cx="51" cy="20" r="1.6" fill="#2B3242" /><circle cx="50.3" cy="19.3" r="0.6" fill="#7EA2FF" />
      <circle cx="58" cy="16.5" r="3" fill="#191C21" /><circle cx="58" cy="16.5" r="1.6" fill="#2B3242" /><circle cx="57.3" cy="15.8" r="0.6" fill="#7EA2FF" />
      {/* flash + lidar */}
      <circle cx="58" cy="11.2" r="1.2" fill="#F2E5BC" /><circle cx="58" cy="21.8" r="1" fill="#3A3F46" />
      {/* apple mark */}
      <circle cx="60" cy="50" r="3" fill="#9CA2A9" opacity="0.75" />
      <circle cx="61.4" cy="48.6" r="1.3" fill="url(#ipBody)" />
      {/* side buttons */}
      <rect x="41.8" y="22" width="1.4" height="7" rx="0.7" fill="#8E939A" />
      <rect x="41.8" y="32" width="1.4" height="11" rx="0.7" fill="#8E939A" />
    </svg>
  );
}

function ArtLaptop() {
  return (
    <svg viewBox="0 0 120 90" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="mbBg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#343B45" /><stop offset="1" stopColor="#15181D" />
        </linearGradient>
        <radialGradient id="mbNeb1" cx="0.25" cy="0.85" r="0.9">
          <stop offset="0" stopColor="#7C3AED" stopOpacity="0.85" /><stop offset="1" stopColor="#7C3AED" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="mbNeb2" cx="0.85" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#F472B6" stopOpacity="0.7" /><stop offset="1" stopColor="#F472B6" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="mbNeb3" cx="0.6" cy="0.9" r="0.7">
          <stop offset="0" stopColor="#F59E0B" stopOpacity="0.55" /><stop offset="1" stopColor="#F59E0B" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="mbAlu" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#D2D6DB" /><stop offset="1" stopColor="#8D939B" />
        </linearGradient>
      </defs>
      <rect width="120" height="90" fill="url(#mbBg)" />
      {/* lid / screen */}
      <rect x="27" y="9" width="66" height="46" rx="4" fill="#0A0B0E" stroke="#3D434C" strokeWidth="1" />
      <rect x="30" y="12" width="60" height="40" rx="1.5" fill="#0B0D18" />
      <rect x="30" y="12" width="60" height="40" rx="1.5" fill="url(#mbNeb1)" />
      <rect x="30" y="12" width="60" height="40" rx="1.5" fill="url(#mbNeb2)" />
      <rect x="30" y="12" width="60" height="40" rx="1.5" fill="url(#mbNeb3)" />
      {/* notch */}
      <rect x="54" y="12" width="12" height="2.4" rx="1.2" fill="#0A0B0E" />
      {/* base */}
      <path d="M20 55 h80 l5.5 8.5 q1.4 2.8 -2.6 2.8 H17.1 q-4 0 -2.6 -2.8 Z" fill="url(#mbAlu)" />
      <path d="M52 55 h16 q0 2.6 -2 2.6 h-12 q-2 0 -2 -2.6 Z" fill="#7A8089" />
      <rect x="22" y="61" width="76" height="1" rx="0.5" fill="#6E747D" opacity="0.6" />
    </svg>
  );
}

function ArtDrone() {
  return (
    <svg viewBox="0 0 120 90" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="drBg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3F4650" /><stop offset="1" stopColor="#1B1F26" />
        </linearGradient>
        <linearGradient id="drBody" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#AEB4BC" /><stop offset="0.5" stopColor="#7C838C" /><stop offset="1" stopColor="#4E545D" />
        </linearGradient>
      </defs>
      <rect width="120" height="90" fill="url(#drBg)" />
      <ellipse cx="60" cy="80" rx="34" ry="4" fill="#000" opacity="0.25" />
      {/* propellers */}
      {[[27, 26], [93, 26], [31, 62], [89, 62]].map(([x, y], i) => (
        <g key={i}>
          <ellipse cx={x} cy={y} rx="15" ry="2.6" fill="#C9CDD3" opacity="0.5" transform={`rotate(18 ${x} ${y})`} />
          <ellipse cx={x} cy={y} rx="15" ry="2.6" fill="#C9CDD3" opacity="0.35" transform={`rotate(-22 ${x} ${y})`} />
          <circle cx={x} cy={y} r="2.4" fill="#2E333B" />
        </g>
      ))}
      {/* arms */}
      <path d="M48 42 L29 27 M72 42 L91 27 M48 50 L33 61 M72 50 L87 61" stroke="#5D646E" strokeWidth="4" strokeLinecap="round" />
      {/* body */}
      <rect x="44" y="36" width="32" height="18" rx="7" fill="url(#drBody)" />
      <rect x="46" y="38" width="28" height="5" rx="2.5" fill="#FFFFFF" opacity="0.22" />
      {/* gimbal camera */}
      <circle cx="48" cy="53" r="5" fill="#22262C" />
      <circle cx="48" cy="53" r="2.4" fill="#101318" /><circle cx="47.2" cy="52.2" r="0.9" fill="#4C9AFF" />
      {/* sensors + lights */}
      <circle cx="58" cy="55" r="1.2" fill="#14171B" /><circle cx="64" cy="55" r="1.2" fill="#14171B" />
      <circle cx="30" cy="63" r="1.1" fill="#EF4444" /><circle cx="90" cy="63" r="1.1" fill="#22C55E" />
    </svg>
  );
}

function ArtTv() {
  return (
    <svg viewBox="0 0 120 90" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="tvBg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1B1E25" /><stop offset="1" stopColor="#0C0E12" />
        </linearGradient>
        <linearGradient id="tvScr" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#4C1D95" /><stop offset="0.4" stopColor="#7C3AED" /><stop offset="0.7" stopColor="#DB2777" /><stop offset="1" stopColor="#312E81" />
        </linearGradient>
      </defs>
      <rect width="120" height="90" fill="url(#tvBg)" />
      {/* panel */}
      <rect x="11" y="9" width="98" height="56" rx="2.5" fill="#08090C" />
      <rect x="14" y="12" width="92" height="50" rx="1" fill="url(#tvScr)" />
      {/* abstract waves on screen */}
      <path d="M14 46 C36 34 52 56 74 42 C90 32 100 40 106 34 V62 H14 Z" fill="#F0ABFC" opacity="0.28" />
      <path d="M14 54 C40 44 66 60 106 46 V62 H14 Z" fill="#60A5FA" opacity="0.3" />
      <circle cx="86" cy="26" r="9" fill="#FDE68A" opacity="0.5" />
      {/* glare */}
      <path d="M22 12 L48 12 L30 62 L14 62 Z" fill="#FFFFFF" opacity="0.05" />
      {/* stand */}
      <rect x="55" y="65" width="10" height="6" fill="#23262C" />
      <rect x="38" y="71" width="44" height="3.4" rx="1.7" fill="#2E3238" />
    </svg>
  );
}

export function ProductArt({ kind }: { kind: ArtKind }) {
  switch (kind) {
    case 'headphones': return <ArtHeadphones />;
    case 'phone':      return <ArtPhone />;
    case 'laptop':     return <ArtLaptop />;
    case 'drone':      return <ArtDrone />;
    case 'tv':         return <ArtTv />;
  }
}

// Tiny vendor logo marks (simplified glyphs) shown next to the vendor name.
export function VendorMark({ vendor }: { vendor: string }) {
  const v = vendor.toLowerCase();
  if (v === 'amazon') {
    return (
      <svg viewBox="0 0 14 14" className="w-3.5 h-3.5 shrink-0">
        <text x="7" y="8.5" textAnchor="middle" fontSize="9" fontWeight="800" fill="#232F3E" fontFamily="Arial, sans-serif">a</text>
        <path d="M2.4 9.4 Q7 13 11.2 9.9" stroke="#FF9900" strokeWidth="1.4" fill="none" strokeLinecap="round" />
        <path d="M11.6 9.2 L11.4 10.9 L10 10.2" fill="#FF9900" />
      </svg>
    );
  }
  if (v === 'apple') {
    return (
      <svg viewBox="0 0 14 14" className="w-3.5 h-3.5 shrink-0" fill="#1D1D1F">
        <path d="M9.2 7.3c0-1.3 1.1-1.9 1.1-1.9-.6-.9-1.6-1-1.9-1-.8-.1-1.6.5-2 .5-.4 0-1-.5-1.7-.5-.9 0-1.7.5-2.1 1.3-.9 1.6-.2 3.9.6 5.2.4.6.9 1.3 1.6 1.3.6 0 .9-.4 1.6-.4.7 0 1 .4 1.7.4.7 0 1.1-.6 1.6-1.2.5-.7.7-1.4.7-1.4s-1.2-.5-1.2-2.3z" />
        <path d="M8 3.6c.4-.4.6-1 .5-1.6-.5 0-1.1.3-1.5.8-.3.4-.6 1-.5 1.6.6 0 1.2-.4 1.5-.8z" />
      </svg>
    );
  }
  if (v === 'best buy') {
    return (
      <svg viewBox="0 0 14 14" className="w-3.5 h-3.5 shrink-0">
        <path d="M1.5 5.2 L8.6 1.8 L12.5 3.8 V11.5 H1.5 Z" fill="#FFE000" stroke="#1C252C" strokeWidth="0.6" />
        <circle cx="9.8" cy="4.4" r="0.9" fill="#1C252C" />
      </svg>
    );
  }
  if (v === 'walmart') {
    return (
      <svg viewBox="0 0 14 14" className="w-3.5 h-3.5 shrink-0" fill="#FFC220">
        {[0, 60, 120, 180, 240, 300].map(a => (
          <rect key={a} x="6.2" y="1" width="1.6" height="4" rx="0.8" transform={`rotate(${a} 7 7)`} />
        ))}
      </svg>
    );
  }
  return null;
}
