/*
 * Shared, dependency-free helpers for the blog editor.
 *
 * Loads as a plain global script in the browser (window.EditorLib) so the site
 * keeps working with no build step, and is require()-able in Node for tests.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.EditorLib = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function esc(s) {
    return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  }
  function escAttr(s) {
    return esc(s).replace(/'/g, '&#39;');
  }
  function slugify(s) {
    return String(s).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'untitled';
  }
  function today(d) {
    d = d || new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function utf8ToB64(str) {
    const b = new TextEncoder().encode(str);
    let s = '';
    b.forEach(x => s += String.fromCharCode(x));
    return btoa(s);
  }

  /* ---------- HTML <-> Markdown ---------- */
  function inlineMd(node) {
    let s = '';
    node.childNodes.forEach(n => {
      if (n.nodeType === 3) s += n.textContent;
      else if (/^(STRONG|B)$/.test(n.nodeName)) s += '**' + inlineMd(n) + '**';
      else if (/^(EM|I)$/.test(n.nodeName)) s += '*' + inlineMd(n) + '*';
      else if (n.nodeName === 'CODE') s += '`' + n.textContent + '`';
      else if (n.nodeName === 'A') s += '[' + inlineMd(n) + '](' + n.getAttribute('href') + ')';
      else if (n.nodeName === 'IMG') s += '![' + (n.alt || '') + '](' + (n.getAttribute('data-path') || n.src) + ')';
      else if (n.nodeName === 'BR') s += '\n';
      else s += inlineMd(n);
    });
    return s;
  }
  function blockMd(node) {
    if (node.nodeType === 3) return node.textContent.trim();
    switch (node.nodeName) {
      case 'H1': return '# ' + inlineMd(node);
      case 'H2': return '## ' + inlineMd(node);
      case 'H3': return '### ' + inlineMd(node);
      case 'BLOCKQUOTE': return '> ' + inlineMd(node);
      case 'PRE': return '```\n' + node.textContent.replace(/\n+$/, '') + '\n```';
      case 'UL': return [...node.children].map(li => '- ' + inlineMd(li)).join('\n');
      case 'OL': return [...node.children].map((li, i) => (i + 1) + '. ' + inlineMd(li)).join('\n');
      case 'IMG': return '![' + (node.alt || '') + '](' + (node.getAttribute('data-path') || node.src) + ')';
      default: return inlineMd(node);
    }
  }
  // collapse contenteditable's mix of <div>/<p>/<br>/empty-blocks into uniform <p> blocks
  function normalizeHtml(root) {
    const out = [];
    let buf = '';
    const keep = /^(H1|H2|H3|BLOCKQUOTE|PRE|UL|OL)$/;
    const flush = () => { const t = buf.replace(/<[^>]*>/g, '').trim(); if (t || /<img/i.test(buf)) out.push('<p>' + buf.trim() + '</p>'); buf = ''; };
    root.childNodes.forEach(node => {
      if (node.nodeType === 3) { buf += esc(node.textContent); return; }
      if (node.nodeType !== 1) return;
      const tag = node.nodeName;
      if (tag === 'BR') { flush(); return; }
      if (keep.test(tag)) { flush(); out.push(node.outerHTML); return; }
      if (tag === 'IMG') { flush(); out.push('<p>' + node.outerHTML + '</p>'); return; }
      if (tag === 'DIV' || tag === 'P') {
        flush();
        node.innerHTML.split(/<br\s*\/?>/i).forEach(part => {
          const t = part.replace(/<[^>]*>/g, '').trim();
          if (t || /<img/i.test(part)) out.push('<p>' + part.trim() + '</p>');
        });
        return;
      }
      buf += node.outerHTML; // inline element (strong/em/a/code/span)
    });
    flush();
    return out.join('');
  }

  function markdownToHtml(src) {
    src = src.replace(/\r/g, '').replace(/^---\n[\s\S]*?\n---\n?/, '');
    const lines = src.split('\n');
    let out = '';
    let i = 0;
    const inline = t => esc(t)
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img alt="$1" src="$2" data-path="$2">')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code>$1</code>');
    while (i < lines.length) {
      const l = lines[i];
      if (/^```/.test(l)) { const c = []; i++; while (i < lines.length && !/^```/.test(lines[i])) { c.push(lines[i]); i++; } i++; out += '<pre>' + esc(c.join('\n')) + '</pre>'; continue; }
      if (/^###\s/.test(l)) { out += '<h3>' + inline(l.slice(4)) + '</h3>'; i++; continue; }
      if (/^##\s/.test(l)) { out += '<h2>' + inline(l.slice(3)) + '</h2>'; i++; continue; }
      if (/^#\s/.test(l)) { out += '<h1>' + inline(l.slice(2)) + '</h1>'; i++; continue; }
      if (/^>\s?/.test(l)) { const q = []; while (i < lines.length && /^>\s?/.test(lines[i])) { q.push(lines[i].replace(/^>\s?/, '')); i++; } out += '<blockquote>' + inline(q.join(' ')) + '</blockquote>'; continue; }
      if (/^[-*]\s/.test(l)) { const it = []; while (i < lines.length && /^[-*]\s/.test(lines[i])) { it.push('<li>' + inline(lines[i].replace(/^[-*]\s/, '')) + '</li>'); i++; } out += '<ul>' + it.join('') + '</ul>'; continue; }
      if (l.trim() === '') { i++; continue; }
      const p = [l]; i++;
      while (i < lines.length && lines[i].trim() !== '' && !/^(#|>|```|[-*]\s)/.test(lines[i])) { p.push(lines[i]); i++; }
      out += '<p>' + inline(p.join(' ')) + '</p>';
    }
    return out;
  }

  // parse a markdown file's YAML-ish frontmatter block into a flat key/value map
  function parseFrontmatter(md) {
    const fm = (String(md).match(/^---\n([\s\S]*?)\n---/) || [])[1] || '';
    const meta = {};
    fm.split('\n').forEach(line => { const i = line.indexOf(':'); if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim(); });
    return meta;
  }

  // build the standalone, pre-rendered post page. `assets` supplies the large
  // static strings (POST_CSS/FAVICON/FOLDER) that live in the editor page.
  function buildPostHtml(meta, bodyHtml, assets) {
    assets = assets || {};
    const POST_CSS = assets.POST_CSS || '';
    const FAVICON = assets.FAVICON || '';
    const FOLDER = assets.FOLDER || '';
    const url = 'https://taranagarwal.com/blog/' + meta.slug;
    const tags = (meta.tags || []).map(t => '#' + t).join(' ');
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${esc(meta.title)} — Taran Agarwal</title>
<meta name="description" content="${escAttr(meta.excerpt)}" />
<meta name="author" content="Taran Agarwal" />
<meta name="theme-color" content="#07080a" />
<link rel="canonical" href="${url}" />
<meta property="og:type" content="article" />
<meta property="og:title" content="${escAttr(meta.title)}" />
<meta property="og:description" content="${escAttr(meta.excerpt)}" />
<meta property="og:url" content="${url}" />
<meta property="article:published_time" content="${meta.date}" />
<link rel="icon" href="${FAVICON}" />
<style>${POST_CSS}</style>
</head>
<body>
  <div class="bg-grid"></div><div class="bg-glow"></div>
  <main><div class="stage"><div class="terminal">
    <div class="term-bar"><div class="dots"><span class="dot r"></span><span class="dot y"></span><span class="dot g"></span></div>
      <span class="term-title">${FOLDER} taranagarwal — -zsh — blog/${esc(meta.slug)}</span></div>
    <div class="term-body">
      <a class="backlink" href="/blog">← cd ../blog</a>
      <article class="article">
        <h1>${esc(meta.title)}</h1>
        <div class="submeta"><span>${esc(meta.date)}</span><span class="tags">${esc(tags)}</span><span>· ${meta.readingTime} min read</span></div>
        ${bodyHtml}
      </article>
      <div class="foot"><a href="/blog">← all posts</a><a href="/">taranagarwal.com</a></div>
    </div>
  </div></div></main>
</body>
</html>`;
  }

  return {
    esc, escAttr, slugify, today, utf8ToB64,
    inlineMd, blockMd, normalizeHtml, markdownToHtml,
    parseFrontmatter, buildPostHtml,
  };
});
