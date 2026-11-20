/*
  Zaria: the glass over a product photograph.

  Hovering the picture shows a round pane of it at the FILE'S OWN resolution. The
  magnification is not a number someone chose: it is however much larger the file is than
  the space it is drawn in, so the glass shows real detail and never invented detail. A
  photograph with nothing left to give is passed over and the glass never appears, which is
  every photograph in the catalogue while the largest one in the shop is 1200x1800. Upload the
  originals at full size and the glass starts working on its own, with nothing to switch on.

  Pointer only. On a touch screen the pinch in the full-screen viewer does the same job with
  two fingers, and a glass that followed a finger would sit under it.

  This lives in an asset rather than inline because Shopify's theme check parses a section's
  <script> as markup, and a run of comparisons reads to it as unclosed tags.
*/
(function () {
  if (!window.matchMedia || !window.matchMedia('(hover:hover) and (pointer:fine)').matches) return;

  function bind(stage) {
    var lens = stage.querySelector('[data-zpdp-lens]');
    if (!lens || stage.hasAttribute('data-zpdp-lensed')) return;
    stage.setAttribute('data-zpdp-lensed', '1');

    var full = (stage.getAttribute('data-zoom-gallery') || '').split('|');
    var MINSRC = 1.6;              /* at least 1.6x the drawn size, or there is nothing to magnify */
    var armed = false, zoom = 1, dw = 0, dh = 0;

    function arm() {
      armed = false;
      var im = stage.querySelector('.zpdp__img.is-active') || stage.querySelector('.zpdp__img');
      if (!im || !im.naturalWidth) return;
      var r = stage.getBoundingClientRect();
      if (!r.width || !r.height) return;
      /* the picture is letterboxed into the stage, so find the rectangle it is really drawn in */
      var ar = im.naturalWidth / im.naturalHeight;
      var box = r.width / r.height;
      dw = ar > box ? r.width : r.height * ar;
      dh = ar > box ? r.width / ar : r.height;
      var headroom = im.naturalWidth / dw;
      if (headroom < MINSRC) return;
      zoom = headroom;
      var i = parseInt(im.getAttribute('data-i'), 10) || 0;
      lens.style.backgroundImage = 'url("' + (full[i] || im.currentSrc || im.src) + '")';
      lens.style.backgroundSize = Math.round(dw * zoom) + 'px ' + Math.round(dh * zoom) + 'px';
      armed = true;
    }

    function move(e) {
      if (!armed) { arm(); if (!armed) return; }
      var r = stage.getBoundingClientRect();
      var x = e.clientX - r.left;
      var y = e.clientY - r.top;
      var ox = (r.width - dw) / 2;
      var oy = (r.height - dh) / 2;
      var outside = x < ox || y < oy || x > ox + dw || y > oy + dh;
      if (outside) { lens.classList.remove('is-on'); return; }
      var size = lens.offsetWidth || 210;
      lens.style.transform = 'translate3d(' + (x - size / 2) + 'px,' + (y - size / 2) + 'px,0)';
      lens.style.backgroundPosition = (size / 2 - (x - ox) * zoom) + 'px ' + (size / 2 - (y - oy) * zoom) + 'px';
      lens.classList.add('is-on');
    }

    stage.addEventListener('mouseenter', function () { armed = false; });
    stage.addEventListener('mousemove', move);
    stage.addEventListener('mouseleave', function () { lens.classList.remove('is-on'); });
    /* a different photograph, a resize, or one that has only just arrived, all need measuring again */
    stage.addEventListener('load', function () { armed = false; }, true);
    stage.addEventListener('click', function () { armed = false; });
    window.addEventListener('resize', function () { armed = false; });
  }

  function scan() {
    var stages = document.querySelectorAll('.zpdp__stage');
    for (var i = 0; i < stages.length; i += 1) bind(stages[i]);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scan);
  else scan();
  document.addEventListener('shopify:section:load', scan);
})();
