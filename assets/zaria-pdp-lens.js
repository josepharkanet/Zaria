/*
  Zaria: the glass inside the full-screen picture viewer.

  It belongs in the zoomed view, not on the product page itself. Hovering the picture shows a
  round pane of it at the file's own resolution, counted in DEVICE pixels: nearly every screen
  this shop is read on draws two device pixels for each CSS pixel, so a picture that looks
  one-to-one in CSS is already being doubled on the glass. Counting in CSS is what made the
  beadwork still look soft after the first attempt at this.

  So the magnification is sourceWidth / (drawnWidth x devicePixelRatio). One file pixel lands
  on one screen pixel, which is as sharp as a picture can ever be shown, and never a step
  further. Where there is less than about a sixth to gain, the glass does not appear at all,
  because enlarging a file past itself shows bigger pixels and no more beadwork.

  It stands down while the picture is zoomed by pinch or wheel, which the viewer marks with
  `is-zoomed`: then the whole picture is already magnified and two magnifications stacked on
  each other help nobody.

  Pointer only. On a touch screen the pinch does this job with two fingers.

  This lives in an asset rather than inline because Shopify's theme check parses a snippet's
  <script> as markup and reads a run of comparisons as unclosed tags.
*/
(function () {
  if (!window.matchMedia || !window.matchMedia('(hover:hover) and (pointer:fine)').matches) return;

  function bind() {
    var lb = document.getElementById('zaria-quickzoom');
    if (!lb || lb.hasAttribute('data-zqz-lensed')) return;
    var clip = lb.querySelector('[data-zqz-clip]');
    var img = lb.querySelector('[data-zqz-img]');
    var lens = lb.querySelector('[data-zqz-lens]');
    if (!clip || !img || !lens) return;
    lb.setAttribute('data-zqz-lensed', '1');

    var GAIN = 1.16;               /* below this there is nothing worth showing */
    var armed = false, mag = 1, dw = 0, dh = 0, ox = 0, oy = 0;

    function hide() { lens.classList.remove('is-on'); }

    function arm() {
      armed = false;
      if (!img.naturalWidth || !img.naturalHeight) return;
      var r = clip.getBoundingClientRect();
      if (!r.width || !r.height) return;
      /* the viewer fits the whole picture inside the frame, so it is letterboxed */
      var k = Math.min(r.width / img.naturalWidth, r.height / img.naturalHeight);
      if (!k) return;
      dw = img.naturalWidth * k;
      dh = img.naturalHeight * k;
      ox = (r.width - dw) / 2;
      oy = (r.height - dh) / 2;
      var dpr = window.devicePixelRatio || 1;
      mag = img.naturalWidth / (dw * dpr);     /* one file pixel on one screen pixel */
      if (mag < GAIN) return;
      lens.style.backgroundImage = 'url("' + (img.currentSrc || img.src) + '")';
      lens.style.backgroundSize = Math.round(dw * mag) + 'px ' + Math.round(dh * mag) + 'px';
      armed = true;
    }

    function move(e) {
      if (lb.classList.contains('is-zoomed')) { hide(); return; }
      if (!armed) { arm(); if (!armed) { hide(); return; } }
      var r = clip.getBoundingClientRect();
      var x = e.clientX - r.left;
      var y = e.clientY - r.top;
      var outside = x < ox || y < oy || x > ox + dw || y > oy + dh;
      if (outside) { hide(); return; }
      var size = lens.offsetWidth || 260;
      /* the glass is placed against the frame, and the frame may not start at the clip */
      var fr = lens.offsetParent ? lens.offsetParent.getBoundingClientRect() : r;
      var lx = e.clientX - fr.left - size / 2;
      var ly = e.clientY - fr.top - size / 2;
      lens.style.transform = 'translate3d(' + lx + 'px,' + ly + 'px,0)';
      lens.style.backgroundPosition = (size / 2 - (x - ox) * mag) + 'px ' + (size / 2 - (y - oy) * mag) + 'px';
      lens.classList.add('is-on');
    }

    clip.addEventListener('mousemove', move);
    clip.addEventListener('mouseleave', hide);
    lb.addEventListener('mouseleave', hide);
    img.addEventListener('load', function () { armed = false; });
    window.addEventListener('resize', function () { armed = false; });
    /* a new picture, a close, or a zoom all want measuring again */
    lb.addEventListener('click', function () { armed = false; });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
  document.addEventListener('shopify:section:load', bind);
})();
