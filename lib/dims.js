/*
 * Terminal dimension math (cols × rows), shared by the home and blog pages.
 *
 * Loads as a plain global script in the browser (window.DimsLib) and is
 * require()-able in Node for tests.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.DimsLib = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // term-body padding accounts for the 56px horizontal / 52px vertical chrome
  function computeDims(clientWidth, clientHeight, charW, lineH) {
    const cols = Math.max(20, Math.round((clientWidth - 56) / charW));
    const rows = Math.max(8, Math.round((clientHeight - 52) / lineH));
    return { cols, rows };
  }

  return { computeDims };
});
