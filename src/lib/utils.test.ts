import { describe, it, expect } from 'vitest';
import { asArray, cn } from '@/lib/utils';

describe('asArray', () => {
  it('passes real arrays through unchanged', () => {
    expect(asArray([1, 2, 3])).toEqual([1, 2, 3]);
    expect(asArray([])).toEqual([]);
  });

  it('coerces null / undefined to []', () => {
    expect(asArray(null)).toEqual([]);
    expect(asArray(undefined)).toEqual([]);
  });

  // This is the white-screen bug class: a paused Supabase project returns a
  // non-array error body, and .map/.filter on it used to crash the render.
  it('coerces a non-array error object to []', () => {
    expect(asArray({ message: 'project is paused' })).toEqual([]);
  });

  it('coerces an HTML/string body to []', () => {
    expect(asArray('<html>503</html>')).toEqual([]);
  });

  it('keeps later .map safe on any shape', () => {
    expect(() => asArray<{ x: number }>({ not: 'an array' }).map(i => i.x)).not.toThrow();
  });
});

describe('cn', () => {
  it('merges and dedupes tailwind classes', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4');
    expect(cn('text-white', false && 'hidden', 'font-bold')).toBe('text-white font-bold');
  });
});
