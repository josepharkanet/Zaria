/* Elixir self-contained wishlist (localStorage). No app dependency.
   - Hearts on product cards (.elx-heart[data-handle]) toggle saved state.
   - Persists across the site; updates any [data-elx-wishlist-count] badges.
   - The Saved page (sections/elx-wishlist-page.liquid) reads window.ElxWishlist. */
(function () {
  var KEY = 'elx_wishlist';

  function read() {
    try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; }
  }
  function write(list) {
    try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) {}
    updateCount();
    document.dispatchEvent(new CustomEvent('elx:wishlist:change', { detail: { list: list } }));
  }
  function has(handle) { return read().indexOf(handle) !== -1; }
  function toggle(handle) {
    if (!handle) return false;
    var list = read();
    var i = list.indexOf(handle);
    if (i === -1) { list.push(handle); } else { list.splice(i, 1); }
    write(list);
    return i === -1; // true if now saved
  }

  function updateCount() {
    var n = read().length;
    var els = document.querySelectorAll('[data-elx-wishlist-count]');
    for (var i = 0; i < els.length; i++) {
      els[i].textContent = n;
      els[i].style.display = n > 0 ? '' : 'none';
    }
  }

  function syncHearts(root) {
    var btns = (root || document).querySelectorAll('.elx-heart[data-handle]');
    for (var i = 0; i < btns.length; i++) {
      var saved = has(btns[i].getAttribute('data-handle'));
      btns[i].classList.toggle('is-saved', saved);
      btns[i].setAttribute('aria-pressed', saved ? 'true' : 'false');
    }
  }

  // Toggle handler. Registered in the CAPTURE phase (last arg = true) so it runs
  // BEFORE any product-carousel / card-link handler can swallow, drag-cancel, or
  // re-order the click. This is what makes the heart respond identically inside
  // the Featured-collections carousels (Newly Added / Best Sellers) and in plain
  // grids (Men / Women / Unisex).
  function onHeartClick(e) {
    var btn = e.target.closest && e.target.closest('.elx-heart[data-handle]');
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    var nowSaved = toggle(btn.getAttribute('data-handle'));
    btn.classList.toggle('is-saved', nowSaved);
    btn.setAttribute('aria-pressed', nowSaved ? 'true' : 'false');
    btn.classList.add('elx-heart--pulse');
    setTimeout(function () { btn.classList.remove('elx-heart--pulse'); }, 300);
  }
  document.addEventListener('click', onHeartClick, true);   // capture
  document.addEventListener('touchend', function (e) {       // mobile safety net
    var btn = e.target.closest && e.target.closest('.elx-heart[data-handle]');
    if (btn) { onHeartClick(e); }
  }, true);

  document.addEventListener('elx:wishlist:change', function () { syncHearts(); });
  // keep in sync across tabs
  window.addEventListener('storage', function (e) { if (e.key === KEY) { syncHearts(); updateCount(); } });

  // Product carousels (scroll-carousel / featured-collections-carousel) upgrade
  // and re-render their cells AFTER first paint, which can drop the is-saved
  // class set on load. Re-apply saved state whenever new hearts get injected.
  var reSyncTimer = null;
  function scheduleSync() {
    if (reSyncTimer) return;
    reSyncTimer = setTimeout(function () { reSyncTimer = null; syncHearts(); updateCount(); }, 80);
  }
  if ('MutationObserver' in window) {
    new MutationObserver(function (muts) {
      for (var i = 0; i < muts.length; i++) {
        var added = muts[i].addedNodes;
        for (var j = 0; j < added.length; j++) {
          var n = added[j];
          if (n.nodeType === 1 &&
              ((n.matches && n.matches('.elx-heart[data-handle]')) ||
               (n.querySelector && n.querySelector('.elx-heart[data-handle]')))) {
            scheduleSync();
            return;
          }
        }
      }
    }).observe(document.documentElement, { childList: true, subtree: true });
  }

  function init(root) { syncHearts(root); updateCount(); }
  if (document.readyState !== 'loading') { init(); }
  else { document.addEventListener('DOMContentLoaded', function () { init(); }); }
  window.addEventListener('load', function () { syncHearts(); updateCount(); });
  document.addEventListener('shopify:section:load', function (e) { init(e.target); });

  // Product carousels (Newly Added / Best Sellers) can finish laying out their
  // cells AFTER our first sync, leaving already-saved hearts unmarked — they then
  // show as an unsaved outline, and clicking just un-saves them, looking like
  // "nothing happens". Re-assert saved state a few times post-load and whenever a
  // carousel scrolls new cards into view or settles.
  [300, 900, 2000].forEach(function (ms) { setTimeout(function () { syncHearts(); }, ms); });
  var carouselSyncTimer = null;
  function carouselResync() {
    if (carouselSyncTimer) return;
    carouselSyncTimer = setTimeout(function () { carouselSyncTimer = null; syncHearts(); }, 100);
  }
  document.addEventListener('scroll', function (e) {
    var t = e.target;
    if (t && t.tagName && /CAROUSEL/.test(t.tagName)) carouselResync();
  }, true); // capture — carousel scroll events don't bubble
  ['carousel:change', 'carousel:settle', 'carousel:slide-change'].forEach(function (evt) {
    document.addEventListener(evt, carouselResync, true);
  });

  window.ElxWishlist = { read: read, has: has, toggle: toggle, KEY: KEY };
})();
