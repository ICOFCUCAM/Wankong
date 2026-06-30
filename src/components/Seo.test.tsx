import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import Seo from '@/components/Seo';

describe('Seo', () => {
  it('sets a page-specific document title', () => {
    render(<Seo title="Music" />);
    expect(document.title).toContain('Music');
    expect(document.title).toContain('WANKONG');
  });

  it('upserts description and Open Graph / Twitter meta tags', () => {
    render(<Seo title="Books" description="read everything" />);
    const desc = document.head.querySelector('meta[name="description"]');
    const ogTitle = document.head.querySelector('meta[property="og:title"]');
    const ogImage = document.head.querySelector('meta[property="og:image"]');
    const twCard = document.head.querySelector('meta[name="twitter:card"]');
    expect(desc?.getAttribute('content')).toBe('read everything');
    expect(ogTitle?.getAttribute('content')).toContain('Books');
    expect(ogImage?.getAttribute('content')).toContain('og-image.jpg');
    expect(twCard?.getAttribute('content')).toBe('summary_large_image');
  });

  it('honors noIndex by emitting a noindex robots tag', () => {
    render(<Seo title="Checkout" noIndex />);
    const robots = document.head.querySelector('meta[name="robots"]');
    expect(robots?.getAttribute('content')).toContain('noindex');
  });
});
