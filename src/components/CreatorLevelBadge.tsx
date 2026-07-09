import React from 'react';

interface CreatorLevelBadgeProps {
  level: string;
  xp?: number;
  showXP?: boolean;
}

const LEVEL_STYLES: Record<string, { bg: string; text: string; gradient?: boolean }> = {
  Bronze: { bg: '#CD7F32', text: '#fff' },
  Silver: { bg: '#C0C0C0', text: '#1a1a1a' },
  Gold: { bg: '#FFB800', text: '#1a1a1a' },
  Platinum: { bg: '#E5E4E2', text: '#1a1a1a' },
  Diamond: { bg: '#00D9FF', text: '#0B0814' },
  GlobalAmbassador: { bg: 'linear-gradient(135deg, #9D4EDD, #FFB800)', text: '#fff', gradient: true },
};

function normalizeLevel(level: string): string {
  const map: Record<string, string> = {
    bronze: 'Bronze',
    silver: 'Silver',
    gold: 'Gold',
    platinum: 'Platinum',
    diamond: 'Diamond',
    globalambassador: 'GlobalAmbassador',
    'global ambassador': 'GlobalAmbassador',
    'global_ambassador': 'GlobalAmbassador',
  };
  return map[level.toLowerCase().replace(/\s+/g, '')] ?? level;
}

const CreatorLevelBadge: React.FC<CreatorLevelBadgeProps> = ({ level, xp, showXP = false }) => {
  const key = normalizeLevel(level);
  const style = LEVEL_STYLES[key] ?? { bg: '#6b7280', text: '#fff' };

  const badgeStyle: React.CSSProperties = style.gradient
    ? { background: style.bg, color: style.text }
    : { backgroundColor: style.bg, color: style.text };

  const displayLabel = key === 'GlobalAmbassador' ? 'Global Ambassador' : key;

  return (
    <div className="inline-flex flex-col items-center gap-1">
      <span
        className="inline-flex items-center px-3 py-0.5 rounded-full text-xs font-semibold tracking-wide whitespace-nowrap select-none"
        style={badgeStyle}
      >
        {displayLabel}
      </span>
      {showXP && xp !== undefined && (
        <span className="text-[11px] text-gray-400 font-medium">
          {xp.toLocaleString()} XP
        </span>
      )}
    </div>
  );
};

export default CreatorLevelBadge;
