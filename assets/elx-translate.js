/* Elixir live-translate mode.
 *
 * Loaded ONLY when the URL carries ?elxt=<edit key> (see theme.liquid). Click
 * any text on the page, type the Arabic, Save — the worker matches the English
 * against every translatable string on the store and registers the Arabic for
 * each occurrence. Browse the ENGLISH site while translating: matching is by
 * the English source text.
 *
 * The edit key is only held in the URL and sent as a header; the worker
 * rejects saves without it, and the Shopify credentials never leave the worker.
 */
(function () {
  var params = new URLSearchParams(location.search);
  var stored = null;
  try { stored = sessionStorage.getItem('elxtKey'); } catch (e) {}
  if (stored === 'go') stored = null;
  // Logged-in admins get the real key injected by theme.liquid; the ?elxt=
  // value and the remembered key are the fallbacks.
  var KEY = window.ELX_TRANSLATE_KEY || params.get('elxt') || stored;
  if (!KEY) return;
  if (KEY === 'go') {
    // Pretty /translate entry without an admin login: explain, don't arm.
    var gs = document.createElement('style');
    gs.textContent = '.elxt-banner{position:fixed;top:0;left:0;right:0;z-index:99999;' +
      'background:#1a1a1a;color:#fff;font:13px/1.4 sans-serif;padding:8px 16px;' +
      'text-align:center;letter-spacing:.04em}.elxt-banner b{color:#B87253}';
    document.head.appendChild(gs);
    var gate = document.createElement('div');
    gate.className = 'elxt-banner';
    gate.innerHTML = '<b>Translate mode</b> — for store admins only. ' +
      '<a href="/account/login" style="color:#B87253;font-weight:600">Log in</a>,' +
      ' then open <b>/translate</b> again.';
    document.body.appendChild(gate);
    return;
  }
  try { sessionStorage.setItem('elxtKey', KEY); } catch (e) {}
  var WORKER = params.get('elxw') || window.ELX_TRANSLATE_WORKER || 'https://elixir-translate.arkanet.workers.dev';
  var MODE = 'translate';
  try { MODE = sessionStorage.getItem('elxtMode') || 'translate'; } catch (e) {}

  var css = [
    '.elxt-banner{position:fixed;top:0;left:0;right:0;z-index:99999;background:#1a1a1a;color:#fff;',
    'font:13px/1.4 sans-serif;padding:8px 16px;text-align:center;letter-spacing:.04em}',
    '.elxt-banner b{color:#B87253}',
    '.elxt-hover{outline:2px dashed #B87253 !important;outline-offset:2px;cursor:pointer !important}',
    '.elxt-panel{position:fixed;bottom:16px;left:50%;transform:translateX(-50%);z-index:99999;',
    'width:min(680px,calc(100vw - 24px));background:#fff;color:#1a1a1a;border:1px solid #ddd;',
    'border-radius:12px;box-shadow:0 18px 50px rgba(0,0,0,.35);padding:16px;font:14px/1.5 sans-serif}',
    '.elxt-panel .en{max-height:110px;overflow:auto;background:#f7f5f2;border-radius:8px;padding:10px;',
    'margin:0 0 10px;white-space:pre-wrap}',
    '.elxt-panel textarea{width:100%;min-height:90px;box-sizing:border-box;padding:10px;border:1px solid #ccc;',
    'border-radius:8px;font:15px/1.6 inherit;direction:rtl}',
    '.elxt-row{display:flex;gap:8px;justify-content:flex-end;margin-top:10px;align-items:center}',
    '.elxt-status{margin-right:auto;font-size:12px;color:#666}',
    '.elxt-btn{border:0;border-radius:8px;padding:9px 18px;font:600 13px sans-serif;cursor:pointer}',
    '.elxt-save{background:#B87253;color:#fff}.elxt-close{background:#eee;color:#333}',
    '.elxt-banner .elxt-btn{margin-left:10px;padding:4px 12px;font-size:12px;vertical-align:middle}',
    '.elxt-banner .elxt-ghost{background:#3a3a3a;color:#fff}',
    '.elxt-banner .elxt-ghost:hover{background:#4a4a4a}',
  ].join('');
  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  var banner = document.createElement('div');
  banner.className = 'elxt-banner';
  banner.innerHTML = '<b>Translate mode</b> <span class="elxt-state"></span>' +
    '<button type="button" class="elxt-btn elxt-ghost elxt-mode"></button>' +
    '<button type="button" class="elxt-btn elxt-ghost elxt-exit">✕ Exit</button>';
  document.body.appendChild(banner);

  var panel = null, hovered = null;

  var stateEl = banner.querySelector('.elxt-state');
  var modeBtn = banner.querySelector('.elxt-mode');
  function setMode(m) {
    MODE = m;
    try { sessionStorage.setItem('elxtMode', m); } catch (e) {}
    if (m === 'translate') {
      stateEl.textContent = '— click any text, type the Arabic, Save.';
      modeBtn.textContent = '🧭 Browse the site';
    } else {
      stateEl.textContent = '— links work normally; it follows you to every page.';
      modeBtn.textContent = '✏️ Translate this page';
      if (hovered) { hovered.classList.remove('elxt-hover'); hovered = null; }
      if (panel) { panel.remove(); panel = null; }
    }
  }
  modeBtn.onclick = function () { setMode(MODE === 'translate' ? 'browse' : 'translate'); };
  banner.querySelector('.elxt-exit').onclick = function () {
    try { sessionStorage.removeItem('elxtKey'); sessionStorage.removeItem('elxtMode'); } catch (e) {}
    location.href = location.pathname;
  };
  setMode(MODE);

  function leaf(el) {
    // clickable if it has visible text and no block children carrying their own text
    if (!el || el.closest('.elxt-panel,.elxt-banner,script,style')) return null;
    var t = (el.innerText || '').trim();
    if (t.length < 2 || t.length > 4000) return null;
    return el;
  }

  document.addEventListener('mouseover', function (e) {
    if (MODE !== 'translate') return;
    var el = leaf(e.target);
    if (hovered && hovered !== el) hovered.classList.remove('elxt-hover');
    if (el) { el.classList.add('elxt-hover'); hovered = el; }
  }, true);

  document.addEventListener('click', function (e) {
    if (MODE !== 'translate') return;
    if (e.target.closest && e.target.closest('.elxt-banner')) return;
    var el = leaf(e.target);
    if (!el) return;
    e.preventDefault(); e.stopPropagation();
    open(el);
  }, true);

  function open(el) {
    var english = (el.innerText || '').trim();
    if (panel) panel.remove();
    panel = document.createElement('div');
    panel.className = 'elxt-panel';
    panel.innerHTML =
      '<div class="en"></div>' +
      '<textarea placeholder="اكتب الترجمة العربية هنا…"></textarea>' +
      '<div class="elxt-row"><span class="elxt-status"></span>' +
      '<button class="elxt-btn elxt-close">Close</button>' +
      '<button class="elxt-btn elxt-save">Save translation</button></div>';
    panel.querySelector('.en').textContent = english;
    document.body.appendChild(panel);
    var ta = panel.querySelector('textarea');
    ta.focus();
    panel.querySelector('.elxt-close').onclick = function () { panel.remove(); panel = null; };
    panel.querySelector('.elxt-save').onclick = function () {
      var arabic = ta.value.trim();
      var status = panel.querySelector('.elxt-status');
      if (!arabic) { status.textContent = 'Type the Arabic first.'; return; }
      status.textContent = 'Saving… (first save can take ~20s while the index builds)';
      fetch(WORKER + '/save', {
        method: 'POST',
        headers: {'Content-Type': 'application/json', 'x-elx-key': KEY},
        body: JSON.stringify({english: english, arabic: arabic, locale: 'ar'}),
      }).then(function (r) { return r.json(); }).then(function (j) {
        if (j.ok) {
          status.textContent = '✓ Saved — applied to ' + (j.registered || 1) + ' place(s). Visible on /ar shortly.';
          el.style.outlineColor = '#2e7d32';
        } else {
          status.textContent = '✗ ' + (j.message || 'Failed');
        }
      }).catch(function (err) { status.textContent = '✗ ' + err.message; });
    };
  }
})();
