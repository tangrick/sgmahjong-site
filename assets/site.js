// SG Mahjong site: small, dependency-free motion helpers.
(function () {
  'use strict';
  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var finePointer = window.matchMedia('(pointer: fine)');

  // Start entrance animations after first paint.
  function markLoaded() { root.classList.add('loaded'); }
  requestAnimationFrame(function () { requestAnimationFrame(markLoaded); });
  setTimeout(markLoaded, 120); // in case rAF is paused (background tab)

  // Header border once scrolled.
  var header = document.querySelector('header.top');

  // Reveal on scroll (one-shot).
  var revealTargets = document.querySelectorAll('.reveal, .ladder, .lp, .hand-fan');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });
    revealTargets.forEach(function (el) { io.observe(el); });
  } else {
    revealTargets.forEach(function (el) { el.classList.add('in'); });
  }

  // Count-up numbers.
  var counters = document.querySelectorAll('[data-count]');
  if ('IntersectionObserver' in window && !reduce.matches) {
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        cio.unobserve(e.target);
        var el = e.target, end = +el.dataset.count, t0 = performance.now(), dur = 1200;
        (function tick(t) {
          var k = Math.min(1, (t - t0) / dur);
          el.textContent = Math.round(end * (1 - Math.pow(1 - k, 3)));
          if (k < 1) requestAnimationFrame(tick);
        })(t0);
      });
    }, { threshold: 0.6 });
    counters.forEach(function (el) { cio.observe(el); });
  }

  // Scroll parallax for [data-depth] and hero stage tilt.
  var layers = Array.prototype.slice.call(document.querySelectorAll('[data-depth]'));
  var stage = document.getElementById('stage');
  var ipad = stage && stage.querySelector('.ipad-wrap');
  var iphone = stage && stage.querySelector('.iphone-wrap');
  var mx = 0, my = 0, ticking = false;

  function frame() {
    ticking = false;
    var y = window.scrollY;
    if (header) header.classList.toggle('scrolled', y > 8);
    if (reduce.matches) return;
    var vh = window.innerHeight;
    layers.forEach(function (el) {
      var depth = parseFloat(el.dataset.depth) || 0;
      var r = el.parentElement.getBoundingClientRect();
      var offset = (r.top + r.height / 2 - vh / 2);
      el.style.transform = 'translate3d(' + (mx * depth * -40).toFixed(1) + 'px,' + (offset * depth).toFixed(1) + 'px,0)';
    });
    if (ipad && y < vh * 1.2) {
      var p = Math.min(1, y / vh);
      ipad.style.transform = 'rotateY(' + (-14 + p * 14 + mx * 6).toFixed(2) + 'deg) rotateX(' + (6 - p * 6 - my * 4).toFixed(2) + 'deg) translateY(' + (p * -40).toFixed(1) + 'px)';
      iphone.style.transform = 'rotateY(' + (-8 + p * 8 + mx * 8).toFixed(2) + 'deg) rotateX(' + (4 - my * 5).toFixed(2) + 'deg) translateZ(60px) translateY(' + (p * -110).toFixed(1) + 'px)';
    }
  }
  function request() { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }
  window.addEventListener('scroll', request, { passive: true });
  window.addEventListener('resize', request);
  if (finePointer.matches) {
    window.addEventListener('pointermove', function (e) {
      if (window.scrollY > window.innerHeight) return;
      mx = e.clientX / window.innerWidth - 0.5;
      my = e.clientY / window.innerHeight - 0.5;
      request();
    }, { passive: true });
  }
  reduce.addEventListener && reduce.addEventListener('change', function () {
    layers.forEach(function (el) { el.style.transform = ''; });
    if (ipad) { ipad.style.transform = ''; iphone.style.transform = ''; }
    request();
  });
  frame();

  // Sticky story: highlight the step in the middle of the screen.
  var steps = document.querySelectorAll('.story-step');
  var screens = document.querySelectorAll('.story-stage .screen');
  var marks = document.querySelectorAll('.story-progress .tile');
  if (steps.length && 'IntersectionObserver' in window) {
    var sio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var i = +e.target.dataset.step;
        steps.forEach(function (s, j) { s.classList.toggle('active', j === i); });
        screens.forEach(function (s, j) { s.classList.toggle('active', j === i); });
        marks.forEach(function (m, j) { m.classList.toggle('on', j <= i); });
      });
    }, { rootMargin: '-45% 0px -45% 0px' });
    steps.forEach(function (s) { sio.observe(s); });
  }

  // Leaderboard preview tabs (WAI-ARIA tabs pattern) with gentle auto-cycle.
  var lb = document.getElementById('lb');
  if (lb) {
    var tabs = Array.prototype.slice.call(lb.querySelectorAll('[role="tab"]'));
    var thumb = lb.querySelector('.thumb');
    var current = 0, timer = null, userTouched = false, visible = false;
    function select(i, focus) {
      current = (i + tabs.length) % tabs.length;
      tabs.forEach(function (t, j) {
        var on = j === current;
        t.setAttribute('aria-selected', on);
        t.tabIndex = on ? 0 : -1;
        var panel = document.getElementById(t.getAttribute('aria-controls'));
        panel.hidden = !on;
        panel.classList.toggle('show', on);
      });
      thumb.style.transform = 'translateX(calc(' + current * 100 + '% + ' + current * 4 + 'px))';
      if (focus) tabs[current].focus();
    }
    function stop() { userTouched = true; clearInterval(timer); timer = null; }
    function start() {
      if (userTouched || reduce.matches || timer || !visible) return;
      timer = setInterval(function () { select(current + 1); }, 4200);
    }
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { stop(); select(i); });
      t.addEventListener('keydown', function (e) {
        var k = e.key;
        if (k === 'ArrowRight' || k === 'ArrowLeft' || k === 'Home' || k === 'End') {
          e.preventDefault(); stop();
          select(k === 'Home' ? 0 : k === 'End' ? tabs.length - 1 : current + (k === 'ArrowRight' ? 1 : -1), true);
        }
      });
    });
    lb.addEventListener('pointerenter', function () { clearInterval(timer); timer = null; });
    lb.addEventListener('pointerleave', start);
    lb.addEventListener('focusin', stop);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
        if (visible) start(); else { clearInterval(timer); timer = null; }
      }, { threshold: 0.4 }).observe(lb);
    }
  }

  // Screenshot gallery: device toggle and arrows.
  var railBtns = document.querySelectorAll('.gallery-tabs button');
  function activeRail() { return document.querySelector('.rail:not([hidden])'); }
  railBtns.forEach(function (b) {
    b.addEventListener('click', function () {
      railBtns.forEach(function (o) { o.setAttribute('aria-pressed', o === b); });
      document.querySelectorAll('.rail').forEach(function (r) { r.hidden = !r.classList.contains(b.dataset.rail); });
      activeRail().scrollLeft = 0;
    });
  });
  document.querySelectorAll('.rail-nav button').forEach(function (b) {
    b.addEventListener('click', function () {
      var rail = activeRail(), fig = rail.querySelector('figure');
      rail.scrollBy({ left: +b.dataset.dir * (fig.offsetWidth + 28), behavior: reduce.matches ? 'auto' : 'smooth' });
    });
  });

  // Support page: live FAQ filter with highlights.
  var search = document.getElementById('faq-search');
  if (search) {
    var items = Array.prototype.slice.call(document.querySelectorAll('details.q'));
    var groups = document.querySelectorAll('.faq-group');
    var empty = document.getElementById('no-results');
    var status = document.getElementById('faq-status');
    items.forEach(function (d) {
      d.dataset.text = norm(d.textContent);
      d.querySelector('summary').dataset.label = d.querySelector('summary').textContent;
    });
    function norm(t) { return t.toLowerCase().replace(/[\u2010\u2011\-]/g, ''); }
    function esc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
    function filter() {
      var raw = search.value.trim(), q = norm(raw), shown = 0;
      items.forEach(function (d) {
        var sum = d.querySelector('summary');
        var hit = !q || d.dataset.text.indexOf(q) !== -1;
        d.hidden = !hit;
        if (hit) shown++;
        sum.textContent = sum.dataset.label;
        if (d.dataset.auto && (!q || !hit)) { d.open = false; delete d.dataset.auto; }
        if (q && hit) {
          var re = new RegExp('(' + esc(raw) + ')', 'ig');
          sum.innerHTML = sum.dataset.label.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(re, '<mark>$1</mark>');
          if (d.dataset.text.indexOf(q) !== -1 && norm(sum.textContent).indexOf(q) === -1 && !d.open) { d.open = true; d.dataset.auto = '1'; }
        }
      });
      groups.forEach(function (g) { g.hidden = !g.querySelector('details.q:not([hidden])'); });
      empty.hidden = shown !== 0;
      status.textContent = q ? shown + (shown === 1 ? ' answer' : ' answers') + ' found' : '';
    }
    search.addEventListener('input', filter);

    // Highlight the current group in the side nav.
    var navLinks = document.querySelectorAll('.faq-nav a');
    if (navLinks.length && 'IntersectionObserver' in window) {
      var nio = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          navLinks.forEach(function (a) { a.classList.toggle('on', a.getAttribute('href') === '#' + e.target.id); });
        });
      }, { rootMargin: '-30% 0px -60% 0px' });
      groups.forEach(function (g) { nio.observe(g); });
    }
    // Open a question linked by hash.
    if (location.hash) {
      var target = document.querySelector(location.hash);
      if (target && target.tagName === 'DETAILS') target.open = true;
    }
  }
})();
