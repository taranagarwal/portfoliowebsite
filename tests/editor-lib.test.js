import { describe, it, expect } from 'vitest';
import EditorLib from '../blog/lib/editor-lib.js';

const {
  esc, escAttr, slugify, today, utf8ToB64,
  inlineMd, blockMd, normalizeHtml, markdownToHtml,
  parseFrontmatter, buildPostHtml,
} = EditorLib;

// build a DOM element from an HTML string for the node-based helpers
function el(html, tag = 'div') {
  const d = document.createElement(tag);
  d.innerHTML = html;
  return d;
}

describe('esc / escAttr', () => {
  it('esc escapes &, <, >, and double quotes', () => {
    expect(esc('<b class="x">&</b>')).toBe('&lt;b class=&quot;x&quot;&gt;&amp;&lt;/b&gt;');
  });

  it('escAttr additionally escapes single quotes', () => {
    expect(escAttr("it's <ok>")).toBe('it&#39;s &lt;ok&gt;');
  });
});

describe('slugify', () => {
  it('lowercases and hyphenates', () => {
    expect(slugify('Hello World')).toBe('hello-world');
  });

  it('strips punctuation and collapses separators', () => {
    expect(slugify('  Foo!!  Bar??  ')).toBe('foo-bar');
  });

  it('trims leading/trailing hyphens', () => {
    expect(slugify('---edge---')).toBe('edge');
  });

  it('caps length at 60 characters', () => {
    expect(slugify('a'.repeat(100)).length).toBe(60);
  });

  it('falls back to "untitled" when nothing survives', () => {
    expect(slugify('!!!')).toBe('untitled');
    expect(slugify('')).toBe('untitled');
  });
});

describe('today', () => {
  it('formats a given date as YYYY-MM-DD with zero padding', () => {
    expect(today(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(today(new Date(2025, 11, 31))).toBe('2025-12-31');
  });
});

describe('utf8ToB64', () => {
  it('base64-encodes ASCII', () => {
    expect(utf8ToB64('hello')).toBe('aGVsbG8=');
  });

  it('encodes multi-byte UTF-8 correctly', () => {
    expect(utf8ToB64('é')).toBe(Buffer.from('é', 'utf8').toString('base64'));
    expect(utf8ToB64('—')).toBe(Buffer.from('—', 'utf8').toString('base64'));
  });
});

describe('inlineMd', () => {
  it('converts strong/em/code to markdown', () => {
    expect(inlineMd(el('<strong>b</strong> <em>i</em> <code>c()</code>'))).toBe('**b** *i* `c()`');
  });

  it('converts links and images (preferring data-path)', () => {
    expect(inlineMd(el('<a href="/x">link</a>'))).toBe('[link](/x)');
    expect(inlineMd(el('<img alt="pic" data-path="/assets/p.png" src="blob:1">'))).toBe('![pic](/assets/p.png)');
  });

  it('turns <br> into a newline', () => {
    expect(inlineMd(el('a<br>b'))).toBe('a\nb');
  });
});

describe('blockMd', () => {
  it('prefixes headings by level', () => {
    expect(blockMd(el('h', 'h1'))).toBe('# h');
    expect(blockMd(el('h', 'h2'))).toBe('## h');
    expect(blockMd(el('h', 'h3'))).toBe('### h');
  });

  it('renders blockquotes and fenced code', () => {
    expect(blockMd(el('quote', 'blockquote'))).toBe('> quote');
    expect(blockMd(el('line1\nline2\n\n', 'pre'))).toBe('```\nline1\nline2\n```');
  });

  it('renders unordered and ordered lists', () => {
    expect(blockMd(el('<li>one</li><li>two</li>', 'ul'))).toBe('- one\n- two');
    expect(blockMd(el('<li>one</li><li>two</li>', 'ol'))).toBe('1. one\n2. two');
  });
});

describe('normalizeHtml', () => {
  it('wraps loose text in a <p>', () => {
    expect(normalizeHtml(el('hello'))).toBe('<p>hello</p>');
  });

  it('preserves block-level tags verbatim', () => {
    expect(normalizeHtml(el('<h2>Title</h2>'))).toBe('<h2>Title</h2>');
  });

  it('splits a div on <br> into separate paragraphs and drops empties', () => {
    expect(normalizeHtml(el('<div>a<br>b<br></div>'))).toBe('<p>a</p><p>b</p>');
  });
});

describe('markdownToHtml', () => {
  it('strips frontmatter before rendering', () => {
    const md = '---\ntitle: t\n---\n\nhello';
    expect(markdownToHtml(md)).toBe('<p>hello</p>');
  });

  it('renders headings, emphasis and inline code', () => {
    expect(markdownToHtml('# Heading')).toBe('<h1>Heading</h1>');
    expect(markdownToHtml('a **b** *c* `d`')).toBe('<p>a <strong>b</strong> <em>c</em> <code>d</code></p>');
  });

  it('renders fenced code blocks with escaped content', () => {
    expect(markdownToHtml('```\n<x> & y\n```')).toBe('<pre>&lt;x&gt; &amp; y</pre>');
  });

  it('renders lists and blockquotes', () => {
    expect(markdownToHtml('- a\n- b')).toBe('<ul><li>a</li><li>b</li></ul>');
    expect(markdownToHtml('> quoted')).toBe('<blockquote>quoted</blockquote>');
  });

  it('renders links and images', () => {
    expect(markdownToHtml('[t](/u)')).toBe('<p><a href="/u">t</a></p>');
    expect(markdownToHtml('![alt](/p.png)')).toBe('<p><img alt="alt" src="/p.png" data-path="/p.png"></p>');
  });
});

describe('markdown round-trip', () => {
  it('inlineMd(markdownToHtml(x)) is stable for basic inline markup', () => {
    const html = markdownToHtml('a **b** and *c*');
    expect(inlineMd(el(html))).toBe('a **b** and *c*');
  });
});

describe('parseFrontmatter', () => {
  it('parses key/value pairs from the frontmatter block', () => {
    const md = '---\ntitle: Hello\ndate: 2026-06-30\ntags: [ai, ml]\n---\n\nbody';
    expect(parseFrontmatter(md)).toEqual({ title: 'Hello', date: '2026-06-30', tags: '[ai, ml]' });
  });

  it('returns an empty object when there is no frontmatter', () => {
    expect(parseFrontmatter('just body text')).toEqual({});
  });

  it('keeps values that themselves contain a colon', () => {
    expect(parseFrontmatter('---\ntitle: a: b\n---')).toEqual({ title: 'a: b' });
  });
});

describe('buildPostHtml', () => {
  const meta = { slug: 'my-post', title: 'My <Post>', date: '2026-06-30', tags: ['ai'], readingTime: 4, excerpt: 'A "quoted" excerpt' };
  const assets = { POST_CSS: 'body{color:red}', FAVICON: 'data:favicon', FOLDER: '<svg></svg>' };

  it('injects the supplied static assets', () => {
    const html = buildPostHtml(meta, '<p>body</p>', assets);
    expect(html).toContain('<style>body{color:red}</style>');
    expect(html).toContain('href="data:favicon"');
    expect(html).toContain('<svg></svg>');
  });

  it('escapes the title in text and attribute contexts', () => {
    const html = buildPostHtml(meta, '<p>body</p>', assets);
    expect(html).toContain('<h1>My &lt;Post&gt;</h1>');
    expect(html).toContain('content="My &lt;Post&gt;"');
    expect(html).toContain('content="A &quot;quoted&quot; excerpt"');
  });

  it('builds the canonical url and embeds the body verbatim', () => {
    const html = buildPostHtml(meta, '<p>hi</p>', assets);
    expect(html).toContain('href="https://taranagarwal.com/blog/my-post"');
    expect(html).toContain('<p>hi</p>');
    expect(html).toContain('· 4 min read');
  });

  it('renders tags with a leading hash', () => {
    expect(buildPostHtml(meta, '', assets)).toContain('class="tags">#ai</span>');
  });

  it('tolerates missing assets', () => {
    expect(() => buildPostHtml(meta, '', undefined)).not.toThrow();
  });
});
