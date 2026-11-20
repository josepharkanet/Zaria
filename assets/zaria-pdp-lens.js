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
    var armed = false, zoom = 1, dw = 0, dh = 0, ox = 0, oy = 0;

    /* The width of the file the glass will actually draw from. NOT the picture the page
       chose off srcset: on a narrow window that can be the 600-wide copy, and sizing the
       glass by it threw away most of what the file had. The zoom gallery holds each picture
       at its own full width, so read the number out of that URL and fall back to the drawn
       copy only when there is no gallery. */
    function sourceWidth(im, i) {
      var u = full[i] || '';
      var m = u.match(/[?&]width=(\d+)/);
      if (m) return parseInt(m[1], 10);
      return im.naturalWidth || 0;
    }

    function arm() {
      armed = false;
      var im = stage.querySelector('.zpdp__img.is-active') || stage.querySelector('.zpdp__img');
      if (!im || !im.naturalWidth) return;
      var r = stage.getBoundingClientRect();
      if (!r.width || !r.height) return;

      /* Where the picture is REALLY drawn. The stage is 3:4 and the photographs are not, so
         the theme fills the frame and lets the overflow fall outside it: a landscape detail
         shot of 1600x1067 is drawn 707 wide inside a 354 wide stage, and half of it is off
         the sides. Reading the object-fit rather than assuming it is what matters - treating
         a filled frame as a letterboxed one put the glass on the wrong part of the picture
         entirely, which is what it was doing. */
      var fit = 'cover';
      try { fit = window.getComputedStyle(im).objectFit || 'cover'; } catch (e) {}
      var k = fit === 'contain'
        ? Math.min(r.width / im.naturalWidth, r.height / im.naturalHeight)
        : Math.max(r.width / im.naturalWidth, r.height / im.naturalHeight);
      dw = im.naturalWidth * k;
      dh = im.naturalHeight * k;
      ox = (r.width - dw) / 2;        /* negative where the picture overflows the frame */
      oy = (r.height - dh) / 2;

      var i = parseInt(im.getAttribute('data-i'), 10) || 0;
      var sw = sourceWidth(im, i);
      var headroom = sw / dw;
      if (headroom < MINSRC) return;
      zoom = headroom;
      lens.style.backgroundImage = 'url("' + (full[i] || im.currentSrc || im.src) + '")';
      lens.style.backgroundSize = Math.round(dw * zoom) + 'px ' + Math.round(dh * zoom) + 'px';
      armed = true;
    }

    function move(e) {
      if (!armed) { arm(); if (!armed) return; }
      var r = stage.getBoundingClientRect();
      var x = e.clientX - r.left;
      var y = e.clientY - r.top;
      /* only matters where the picture is letterboxed; where it fills the frame, ox and oy
         are negative and every point in the stage is over the picture */
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
