import { describe, it, expect } from 'vitest';
import BlogListLib from '../blog/lib/blog-list.js';

const { esc, sortByDateDesc, postMarkup } = BlogListLib;

describe('esc', () => {
  it('escapes HTML-significant characters', () => {
    expect(esc('<a href="x">&</a>')).toBe('&lt;a href=&quot;x&quot;&gt;&amp;&lt;/a&gt;');
  });

  it('coerces non-strings', () => {
    expect(esc(42)).toBe('42');
    expect(esc(null)).toBe('null');
  });

  it('leaves plain text untouched', () => {
    expect(esc('hello world')).toBe('hello world');
  });
});

describe('sortByDateDesc', () => {
  it('orders posts newest-first', () => {
    const posts = [{ date: '2024-01-01' }, { date: '2026-06-30' }, { date: '2025-03-10' }];
    expect(sortByDateDesc(posts).map(p => p.date)).toEqual(['2026-06-30', '2025-03-10', '2024-01-01']);
  });

  it('sorts in place and returns the same array', () => {
    const posts = [{ date: '2024-01-01' }, { date: '2026-06-30' }];
    expect(sortByDateDesc(posts)).toBe(posts);
  });

  it('treats missing dates as empty (sorted last)', () => {
    const posts = [{ slug: 'a' }, { slug: 'b', date: '2025-01-01' }];
    expect(sortByDateDesc(posts).map(p => p.slug)).toEqual(['b', 'a']);
  });
});

describe('postMarkup', () => {
  it('renders slug, title, date, tags and reading time', () => {
    const html = postMarkup({ slug: 'my-post', title: 'My Post', date: '2026-06-30', tags: ['ai', 'ml'], readingTime: 4 });
    expect(html).toContain('href="/blog/my-post"');
    expect(html).toContain('<span class="title">My Post</span>');
    expect(html).toContain('<span class="date">2026-06-30</span>');
    expect(html).toContain('<span class="tag">#ai</span>');
    expect(html).toContain('<span class="tag">#ml</span>');
    expect(html).toContain('<span>· 4 min</span>');
  });

  it('omits reading time when not provided', () => {
    expect(postMarkup({ slug: 's', title: 't', date: '', tags: [] })).not.toContain('min</span>');
  });

  it('handles missing tags and date gracefully', () => {
    const html = postMarkup({ slug: 's', title: 't' });
    expect(html).toContain('<span class="date"></span>');
    expect(html).not.toContain('class="tag"');
  });

  it('escapes user-controlled fields to prevent HTML injection', () => {
    const html = postMarkup({ slug: 'x', title: '<img src=x onerror=alert(1)>', tags: ['<b>'] });
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(html).toContain('#&lt;b&gt;');
    expect(html).not.toContain('<img src=x');
  });
});
