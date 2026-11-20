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

  It opens at that honest setting and a stepper beside it pulls harder on request - 1.5, 2, 3
  or 4 times beyond - for anyone who would rather see enlarged beadwork than none. The reading
  carries a mark once it is past what the file holds, so nobody is misled about which it is.
  The choice is remembered between pictures and between visits.

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
    var armed = false, mag = 1, base = 1, dw = 0, dh = 0, ox = 0, oy = 0;

    /* How hard the glass pulls. It opens at `1`, which is the sharpest a file can honestly
       give - one file pixel on one screen pixel - and steps up from there when asked. Past
       that first step it is enlarging rather than revealing, and the reading says so instead
       of pretending otherwise. The choice is remembered, because someone who wants a closer
       look at beadwork wants it on the next picture too. */
    var POWERS = [1, 1.5, 2, 3, 4];
    var pow = 0;
    try { var saved = parseInt(localStorage.getItem('zariaGlassPower'), 10);
          if (saved >= 0 && saved < POWERS.length) pow = saved; } catch (e) {}

    var powBox = lb.querySelector('[data-zqz-pow]');
    var powVal = lb.querySelector('[data-zqz-pow-val]');

    function hide() { lens.classList.remove('is-on'); }

    function paintPow() {
      if (!powBox) return;
      powBox.hidden = false;
      var shown = base * POWERS[pow];
      if (powVal) {
        powVal.innerHTML = shown.toFixed(1) + '&times;'
          + (POWERS[pow] > 1 ? ' <span class="beyond">&bull;</span>' : '');
        powVal.title = POWERS[pow] > 1
          ? 'Beyond what the photograph holds, so it will look softer'
          : 'As sharp as this photograph can be shown';
      }
      var btns = powBox.querySelectorAll('[data-zqz-pow-step]');
      for (var i = 0; i < btns.length; i += 1) {
        var d = parseInt(btns[i].getAttribute('data-zqz-pow-step'), 10);
        btns[i].disabled = (pow + d < 0) || (pow + d >= POWERS.length);
      }
    }

    if (powBox) {
      powBox.addEventListener('click', function (e) {
        var b = e.target.closest ? e.target.closest('[data-zqz-pow-step]') : null;
        if (!b || b.disabled) return;
        var next = pow + parseInt(b.getAttribute('data-zqz-pow-step'), 10);
        if (next < 0 || next >= POWERS.length) return;
        pow = next;
        try { localStorage.setItem('zariaGlassPower', String(pow)); } catch (err) {}
        armed = false;
        paintPow();
      });
    }

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
      base = img.naturalWidth / (dw * dpr);    /* one file pixel on one screen pixel */
      mag = base * POWERS[pow];
      paintPow();
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
    /* measure on load rather than waiting for the first hover, so the reading beside the
       stepper is right the moment the picture appears */
    img.addEventListener('load', function () { armed = false; arm(); });
    if (img.complete && img.naturalWidth) arm(); else paintPow();
    window.addEventListener('resize', function () { armed = false; });
    /* a new picture, a close, or a zoom all want measuring again */
    lb.addEventListener('click', function () { armed = false; });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
  document.addEventListener('shopify:section:load', bind);
})();
