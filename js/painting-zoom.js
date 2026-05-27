(function () {
  'use strict';

  var root, stage, imgView, detailsLink, closeBtn, hintEl;
  var scale = 1;
  var tx = 0;
  var ty = 0;
  var minScale = 1;
  var maxScale = 3;
  var dragging = false;
  var lastX = 0;
  var lastY = 0;
  var lastFocus = null;
  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function computeMaxScale(nw) {
    if (prefersReducedMotion) return 1;
    if (!nw || nw < 400) return 1.35;
    if (nw >= 2000) return 5;
    if (nw >= 1400) return 4.5;
    if (nw >= 1000) return 4;
    if (nw >= 700) return 3;
    return 2.25;
  }

  function ensureDOM() {
    if (root) return;
    root = document.createElement('div');
    root.id = 'painting-zoom-root';
    root.className = 'painting-zoom-root';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-label', 'Enlarged painting');
    root.hidden = true;
    root.innerHTML =
      '<div class="painting-zoom-toolbar">' +
      '<button type="button" class="painting-zoom-close" aria-label="Close enlarged view">&times;</button>' +
      '<a class="painting-zoom-details" href="#">Details &amp; pricing</a>' +
      '</div>' +
      '<div class="painting-zoom-stage" tabindex="-1">' +
      '<img class="painting-zoom-img" alt="">' +
      '</div>' +
      '<p class="painting-zoom-hint"></p>';
    document.body.appendChild(root);

    stage = root.querySelector('.painting-zoom-stage');
    imgView = root.querySelector('.painting-zoom-img');
    detailsLink = root.querySelector('.painting-zoom-details');
    closeBtn = root.querySelector('.painting-zoom-close');
    hintEl = root.querySelector('.painting-zoom-hint');

    closeBtn.addEventListener('click', close);
    detailsLink.addEventListener('click', function () {
      close();
    });

    stage.addEventListener('wheel', onWheel, { passive: false });

    imgView.addEventListener('mousedown', startDrag);
    document.addEventListener('mousemove', moveDrag);
    document.addEventListener('mouseup', endDrag);

    imgView.addEventListener('touchstart', touchStart, { passive: true });
    document.addEventListener('touchmove', touchMove, { passive: false });
    document.addEventListener('touchend', touchEnd, { passive: true });

    imgView.addEventListener('dblclick', function () {
      if (prefersReducedMotion) return;
      scale = 1;
      tx = 0;
      ty = 0;
      applyTransform();
    });

    document.addEventListener('keydown', onKey);
  }

  function applyTransform() {
    scale = Math.min(maxScale, Math.max(minScale, scale));
    imgView.style.transform = 'translate(' + tx + 'px,' + ty + 'px) scale(' + scale + ')';
    stage.classList.toggle('painting-zoom-stage--pannable', scale > 1.02);
  }

  function onWheel(e) {
    if (root.hidden || prefersReducedMotion) return;
    e.preventDefault();
    var delta = e.deltaY > 0 ? -0.15 : 0.15;
    scale += delta;
    applyTransform();
  }

  function startDrag(e) {
    if (e.button !== 0 || scale <= 1.02) return;
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
    imgView.classList.add('painting-zoom-img--dragging');
  }

  function moveDrag(e) {
    if (!dragging) return;
    tx += e.clientX - lastX;
    ty += e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;
    applyTransform();
  }

  function endDrag() {
    dragging = false;
    imgView.classList.remove('painting-zoom-img--dragging');
  }

  var touchId = null;
  var touchLastX = 0;
  var touchLastY = 0;

  function touchStart(e) {
    if (e.touches.length !== 1 || scale <= 1.02) return;
    touchId = e.touches[0].identifier;
    touchLastX = e.touches[0].clientX;
    touchLastY = e.touches[0].clientY;
  }

  function touchMove(e) {
    if (touchId === null || e.touches.length !== 1) return;
    var t = e.touches[0];
    if (t.identifier !== touchId) return;
    e.preventDefault();
    tx += t.clientX - touchLastX;
    ty += t.clientY - touchLastY;
    touchLastX = t.clientX;
    touchLastY = t.clientY;
    applyTransform();
  }

  function touchEnd(e) {
    if (touchId === null) return;
    for (var i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === touchId) {
        touchId = null;
        break;
      }
    }
  }

  function onKey(e) {
    if (root.hidden) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
    }
  }

  function open(src, alt, detailsHref) {
    ensureDOM();
    lastFocus = document.activeElement;
    scale = 1;
    tx = 0;
    ty = 0;
    maxScale = 3;
    imgView.style.transform = 'translate(0px,0px) scale(1)';
    imgView.alt = alt || '';
    imgView.removeAttribute('data-zoom-ready');
    imgView.src = src;

    if (detailsHref) {
      detailsLink.href = detailsHref;
      detailsLink.hidden = false;
    } else {
      detailsLink.removeAttribute('href');
      detailsLink.hidden = true;
    }

    root.hidden = false;
    document.body.classList.add('painting-zoom-open');
    closeBtn.focus();

    function applyHints() {
      var nw = imgView.naturalWidth;
      maxScale = computeMaxScale(nw);
      if (prefersReducedMotion) {
        hintEl.textContent = 'Close or press Esc to leave.';
      } else if (maxScale <= 1.35) {
        hintEl.textContent = 'This image is small on file — zoom is limited. Double-click resets. Esc to close.';
      } else {
        hintEl.textContent =
          'Scroll to zoom. Drag to pan when zoomed. Double-click to reset. Esc to close.';
      }
    }

    if (imgView.complete && imgView.naturalWidth) {
      applyHints();
    } else {
      imgView.onload = function () {
        imgView.onload = null;
        applyHints();
        applyTransform();
      };
    }
  }

  function close() {
    if (!root || root.hidden) return;
    root.hidden = true;
    document.body.classList.remove('painting-zoom-open');
    imgView.src = '';
    endDrag();
    touchId = null;
    if (lastFocus && typeof lastFocus.focus === 'function') {
      try {
        lastFocus.focus();
      } catch (err) {}
    }
  }

  document.addEventListener(
    'click',
    function (e) {
      if (e.ctrlKey || e.metaKey || e.button !== 0) return;

      var t = e.target;

      var heroImg = t.closest && t.closest('.hero-carousel .carousel-item img');
      if (heroImg) {
        e.preventDefault();
        e.stopPropagation();
        open(heroImg.currentSrc || heroImg.src, heroImg.alt || '', '');
        return;
      }

      var cardImg = t.closest && t.closest('.collection-card-image img');
      if (cardImg) {
        var card = cardImg.closest('.collection-card');
        if (card) {
          e.preventDefault();
          e.stopPropagation();
          open(cardImg.currentSrc || cardImg.src, cardImg.alt || '', card.getAttribute('href'));
        }
        return;
      }

      var galleryLink = t.closest && t.closest('.site-gallery .container_js > a[href*="item.html"]');
      if (galleryLink) {
        e.preventDefault();
        var gImg = galleryLink.querySelector('img');
        if (!gImg) return;
        open(gImg.currentSrc || gImg.src, gImg.alt || '', galleryLink.getAttribute('href'));
        return;
      }

      var mediaImg = t.closest && t.closest('.media-choice a img');
      if (mediaImg) {
        var mLink = mediaImg.closest('a');
        if (mLink) {
          e.preventDefault();
          open(mediaImg.currentSrc || mediaImg.src, mediaImg.alt || '', mLink.getAttribute('href'));
        }
        return;
      }

      var itemImg = t.closest && t.closest('.item-gallery img');
      if (itemImg) {
        e.preventDefault();
        open(itemImg.currentSrc || itemImg.src, itemImg.alt || '', '');
        return;
      }
    },
    true
  );
})();
