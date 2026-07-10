/*
 * Shared helpers for the public blog index (/blog).
 *
 * Loads as a plain global script in the browser (window.BlogListLib) and is
 * require()-able in Node for tests.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.BlogListLib = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function esc(s) {
    return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  }

  // sort posts newest-first, in place; safe with missing dates
  function sortByDateDesc(posts) {
    return posts.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }

  // render a single post entry's anchor markup for the list
  function postMarkup(p) {
    const tags = (p.tags || []).map(t => '<span class="tag">#' + esc(t) + '</span>').join(' ');
    const rt = p.readingTime ? '<span>· ' + p.readingTime + ' min</span>' : '';
    return '<a class="post" href="/blog/' + esc(p.slug) + '">'
      + '<div class="post-top"><span class="fileicon">▸</span><span class="title">' + esc(p.title) + '</span><span class="arrow">↗</span></div>'
      + '<div class="post-meta"><span class="date">' + esc(p.date || '') + '</span>' + tags + rt + '</div></a>';
  }

  return { esc, sortByDateDesc, postMarkup };
});
