import { describe, it, expect } from 'vitest';
import {
  renderFrontCoverSVG, renderBackCoverSVG, getTheme, themeForGenre, BOOK_COVER_THEMES,
} from '@/lib/bookCover';

describe('bookCover engine', () => {
  it('maps genres to themes and falls back gracefully', () => {
    expect(themeForGenre('Thriller').id).toBe('crimson');
    expect(themeForGenre('Sci-Fi').id).toBe('cosmos');
    expect(themeForGenre(undefined).id).toBe(BOOK_COVER_THEMES[0].id); // default
    expect(getTheme('cosmos').id).toBe('cosmos');
  });

  it('renders a front cover SVG containing title, author and genre', () => {
    const svg = renderFrontCoverSVG({ title: 'The Quantum Garden', author: 'Aisha Rahman', genre: 'Sci-Fi' });
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('Quantum');
    expect(svg).toContain('Aisha Rahman');
    expect(svg).toContain('SCI-FI');
  });

  it('renders a back cover SVG with the synopsis and a default when missing', () => {
    const svg = renderBackCoverSVG({ title: 'The Quantum Garden', author: 'Aisha Rahman', genre: 'Sci-Fi', blurb: 'A botanist discovers a garden that bends time.' });
    expect(svg).toContain('botanist');
    const fallback = renderBackCoverSVG({ title: 'X', author: 'Y' });
    expect(fallback).toContain('synopsis');
  });

  it('escapes user input to keep the SVG well-formed', () => {
    const svg = renderFrontCoverSVG({ title: 'Tom & Jerry <Tales>', author: 'A & B' });
    expect(svg).toContain('Tom &amp; Jerry');
    expect(svg).not.toContain('<Tales>');
  });
});
