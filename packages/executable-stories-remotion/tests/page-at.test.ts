import { describe, expect, it } from 'vitest';
import { pageAt } from '../src/zoom.js';

describe('pageAt', () => {
  const pages = [
    { t: 0, url: 'http://localhost:5173/' },
    { t: 3000, url: 'https://shop.example.com/checkout?step=2' },
  ];

  it('shows the latest address that has loaded, without its scheme', () => {
    expect(pageAt(pages, 0)).toBe('localhost:5173/');
    expect(pageAt(pages, 2999)).toBe('localhost:5173/');
    expect(pageAt(pages, 3000)).toBe('shop.example.com/checkout?step=2');
  });

  it('shows nothing without pages', () => {
    expect(pageAt(undefined, 100)).toBeUndefined();
  });
});
