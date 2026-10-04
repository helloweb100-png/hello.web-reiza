/* ══════════════════════════════════════════════════════════════
   REIZA PRIVATE SECURITY — Interacciones y animaciones · v2
   Motor de scroll: Lenis (suave) + escenas ancladas controladas por progreso.
   Módulos independientes: si uno falla, el resto sigue funcionando.
   ══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var root = document.documentElement;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var easeOut = function (t) { return 1 - Math.pow(1 - t, 3); };
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var mqPin = window.matchMedia('(min-width: 1000px) and (min-height: 620px)');   // escenas ancladas (rondines y cadena)
  var mqHero = window.matchMedia('(min-width: 900px) and (min-height: 640px)');   // hero anclado

  /* Constantes del negocio */
  var WA_NUMBER = '523931807719';
  var DEADLINE = new Date('2027-01-01T00:00:00-06:00'); // Registro electrónico de jornada obligatorio
  var WORLD_B64 = 'AAAAAAf+B/4AAAAAAAAAAAAAAAAAAD/3//+AA8AAAAcAAAAAAAAAkX+f//8ABgAAAADAAAAAAAABeb8A//8AAAADgB/4AcAAAAAD/e/AP/4AAAAGCP//4OAAAf4Zfu/4P/4AAPgAH/////8Iw/////98H+AAA/8/////////9/////5+HwHAD/3/////////A////+IcDgAAP///////////A/v//8BwBgAAPn////////z4AOA//+B+AAACHn///////wGAAAAf//5/gAAHHP///////gOAAAAP////wAAPP////////4MAAAAH////wAAD/////////8AAAAAD///84AAD/////////wAAAAAD////AAAB//Xn/////gAAAAAD///wAAAPzeDn////+MAAAAAD///gAAAPEv/3////8IAAAAAB///AAAAPBN/3////sYAAAAAB///AAAAH8AP/////NwAAAAAAf/8AAAAP/IP/////iAAAAAAAf/8AAAAP////////gAAAAAAAP4EAAAAf///3////gAAAAAAAH4AAAAA///36////AAAAAAAAB4GAAAB/////H//8AAAAAAAAA4hAAAB///7+B+fgAAAAAAAAAfgAAAB///5+B4PggAAAAAAAAB4AAAB///94BwHwgAAAAAAAAAYAAAB////AAwHwQAAAAAAAAAI/AAA////wAwEgQAAAAAAAAAF/AAAf///wAIEAYAAAAAAAAAB/4AAPP//wAAKDAAAAAAAAAAB/8AAAD//gAAHGAAAAAAAAAAD/8AAAD/+AAACOwAAAAAAAAAD//gAAD/+AAADOhwAAAAAAAAH//4AAB/8AAABgg8gAAAAAAAD//8AAB/8AAAAYAeAAAAAAAAB//8AAB/8AAAAAABCAAAAAAAB//4AAB/8AAAAADgAAAAAAAAA//4AAB/8QAAAAPsAAAAAAAAAf/wAAB/9wAAAAf8AAAAAAAAAP/wAAB/wwAAAA/+AAAAAAAAAP/gAAA/xgAAAD//AAAAAAAAAP+AAAA/wgAAAH//gAAAAAAAAP+AAAA/gAAAAH//gAAAAAAAAf8AAAAfgAAAAD//gAAAAAAAAf4AAAAfAAAAAD5/gAAAAAAAAfwAAAAAAAAAADA/gAAAAAAAAfgAAAAAAAAAAAAPACAAAAAAA+AAAAAAAAAAAAAAACAAAAAAA8AAAAAAAAAAAAACAMAAAAAAA8AAAAAAAAAAAAAAAYAAAAAAA8AAAAAAAAAAAAAAAAAAAAAAA4AAAAAAAAAAAAAAAAAAAAAAA4AAAAAAAAAAAAAAAAAAAAAAAYAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'; // Mapa de puntos 144×57 (celdas de 2.5°)

  var state = { px: 0.5, py: 0.5, vel: 0 };
  var lenis = null;

  function safe(fn) { try { fn(); } catch (e) { if (window.console) console.error('[REIZA]', e); } }
  function navH() { return parseInt(getComputedStyle(root).getPropertyValue('--nav-h'), 10) || 72; }

  /* ───────────────────────── SCROLL SUAVE (Lenis) ───────────────────────── */
  function initSmooth() {
    if (!reduceMotion && typeof window.Lenis === 'function') {
      lenis = new window.Lenis({ lerp: 0.09, wheelMultiplier: 0.95, smoothWheel: true });
      lenis.stop(); // se libera al terminar el loader
      (function raf(t) { lenis.raf(t); requestAnimationFrame(raf); }(0));
    }
  }
  function lockScroll(lock) {
    if (lenis) { lock ? lenis.stop() : lenis.start(); }
    root.style.overflow = lock ? 'hidden' : '';
  }
  function scrollToY(y) {
    y = Math.max(0, y);
    if (lenis) lenis.scrollTo(y, { duration: 1.5, easing: function (t) { return 1 - Math.pow(1 - t, 4); } });
    else window.scrollTo({ top: y, behavior: reduceMotion ? 'auto' : 'smooth' });
  }
  function scrollToEl(el) {
    var top = el.getBoundingClientRect().top + window.scrollY;
    scrollToY(el.id === 'top' ? 0 : top - navH() + 28);
  }
  function initAnchors() {
    document.addEventListener('click', function (e) {
      var a = e.target.closest ? e.target.closest('a[href^="#"]') : null;
      if (!a) return;
      var id = a.getAttribute('href');
      if (id.length < 2) return;
      var target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      scrollToEl(target);
      if (history.replaceState) history.replaceState(null, '', id);
    });
  }

  /* ───────────────────────── LOADER ───────────────────────── */
  function initLoader(onDone) {
    var loader = $('#loader');
    if (!loader) { root.classList.remove('is-loading'); root.classList.add('ready'); if (lenis) lenis.start(); onDone(); return; }

    var bar = $('#ldBar'), pctEl = $('#ldPct'), msgEl = $('#ldMsg'), ring = $('#ldRing');
    var msgs = [
      [0, 'Iniciando sistema seguro'],
      [24, 'Verificando protocolos'],
      [50, 'Sincronizando rondines QR'],
      [74, 'Validando CTPAT · OEA · BASC · ISO'],
      [94, 'Acceso concedido']
    ];
    var MIN = reduceMotion ? 450 : 3000;
    var t0 = performance.now();
    var loaded = document.readyState === 'complete';
    var fontsOk = false, finished = false, shown = 0, lastMsg = -1;

    if (!loaded) window.addEventListener('load', function () { loaded = true; });
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () { fontsOk = true; });
      setTimeout(function () { fontsOk = true; }, 2600);
    } else { fontsOk = true; }

    function ease(p) { return p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; }

    function finish() {
      if (finished) return;
      finished = true;
      loader.classList.add('done');
      root.classList.remove('is-loading');
      root.classList.add('ready');
      if (lenis) lenis.start();
      onDone();
      setTimeout(function () { loader.classList.add('gone'); }, 2000);
    }

    function frame(now) {
      var p = clamp((now - t0) / MIN, 0, 1);
      var target = (loaded && fontsOk) ? 1 : 0.93;
      shown = Math.max(shown, Math.min(ease(p), target));
      var pct = Math.round(shown * 100);
      if (bar) bar.style.width = pct + '%';
      if (pctEl) pctEl.textContent = String(pct).padStart(3, '0') + '%';
      if (ring) ring.style.strokeDashoffset = String(578 * (1 - shown));
      for (var i = msgs.length - 1; i >= 0; i--) {
        if (pct >= msgs[i][0]) { if (i !== lastMsg && msgEl) { msgEl.textContent = msgs[i][1]; lastMsg = i; } break; }
      }
      if (shown >= 1) { setTimeout(finish, 420); return; }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
    setTimeout(finish, 9000); // red de seguridad
  }

  /* ───────────────────────── NAV + MENÚ MÓVIL ───────────────────────── */
  function initNav() {
    var burger = $('#burger'), mob = $('#mob');
    function setMenu(open) {
      if (!burger || !mob) return;
      mob.classList.toggle('open', open);
      mob.setAttribute('aria-hidden', open ? 'false' : 'true');
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      burger.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
      lockScroll(open);
    }
    if (burger) burger.addEventListener('click', function () { setMenu(!mob.classList.contains('open')); });
    if (mob) $$('a', mob).forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && mob && mob.classList.contains('open')) setMenu(false); });
    window.addEventListener('resize', function () { if (window.innerWidth >= 1080 && mob && mob.classList.contains('open')) setMenu(false); }, { passive: true });
  }

  /* ───────────────────────── MAPA DE PUNTOS (HERO) ───────────────────────── */
  function initMap() {
    var canvas = $('#mapCanvas');
    if (!canvas || !canvas.getContext) return;
    var hero = canvas.parentElement;
    var ctx = canvas.getContext('2d');

    var COLS = 144, ROWS = 57, CELL = 2.5, LAT_TOP = 84;
    var ASPECT = COLS / ROWS;
    var bits = (function () {
      var bin = atob(WORLD_B64), out = new Uint8Array(COLS * ROWS);
      for (var i = 0; i < out.length; i++) out[i] = (bin.charCodeAt(i >> 3) >> (7 - (i & 7))) & 1;
      return out;
    }());

    var HUBS = {
      mzo: [-104.32, 19.05], lzc: [-102.17, 17.95], ver: [-96.13, 19.17], ntl: [-99.5, 27.5],
      lax: [-118.24, 34.05], hou: [-95.37, 29.76], chi: [-87.63, 41.88], pty: [-79.52, 8.98],
      sao: [-46.33, -23.96], rtm: [4.48, 51.92], shg: [121.47, 31.23], sin: [103.82, 1.35],
      dxb: [55.27, 25.2], tyo: [139.69, 35.69]
    };
    var ROUTES = [
      ['mzo', 'shg', 4.6, 0.0], ['mzo', 'lax', 3.4, 1.2], ['ver', 'rtm', 5.2, 2.0], ['ntl', 'chi', 3.2, 0.6],
      ['hou', 'pty', 3.6, 2.8], ['pty', 'mzo', 3.4, 3.6], ['sao', 'ver', 4.4, 1.6], ['sin', 'dxb', 3.8, 0.9],
      ['dxb', 'rtm', 4.2, 3.1], ['shg', 'lax', 5.4, 2.3], ['tyo', 'lzc', 5.0, 4.1]
    ];
    var arcs = ROUTES.map(function (r, i) {
      return { a: HUBS[r[0]], b: HUBS[r[1]], dur: r[2], off: r[3], gap: 1.4 + (i % 4) * 0.7, gold: i % 3 === 0 };
    });

    var W = 0, H = 0, dpr = 1, mapW = 0, mapH = 0, mapY = 0, sprite = null, offset = 0;
    var running = false, visible = true, last = 0, time = 0;
    var parts = [];

    function resize() {
      var r = hero.getBoundingClientRect();
      W = Math.max(1, r.width); H = Math.max(1, r.height);
      dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      var targetH = clamp(H * 0.62, 420, 780);
      mapW = Math.max(targetH * ASPECT, W * 1.18);
      mapH = mapW / ASPECT;
      mapY = H * 0.46 - mapH / 2;
      buildSprite();
      var n = Math.round(clamp(W * H / 26000, 18, 46));
      parts = [];
      for (var i = 0; i < n; i++) parts.push({ x: Math.random() * W, y: Math.random() * H, r: Math.random() * 1.5 + .4, v: Math.random() * .22 + .05, p: Math.random() * 6.28 });
      if (!running) draw(0);
    }

    function buildSprite() {
      sprite = document.createElement('canvas');
      sprite.width = Math.round(mapW * dpr); sprite.height = Math.round(mapH * dpr);
      var c = sprite.getContext('2d');
      c.scale(dpr, dpr);
      var cw = mapW / COLS, ch = mapH / ROWS, rad = Math.min(cw, ch) * 0.27;
      for (var r = 0; r < ROWS; r++) {
        for (var q = 0; q < COLS; q++) {
          if (!bits[r * COLS + q]) continue;
          var seed = Math.sin((r * 131 + q * 71) * 12.9898) * 43758.5453; seed -= Math.floor(seed);
          var bright = seed > 0.93;
          c.beginPath();
          c.arc((q + .5) * cw, (r + .5) * ch, bright ? rad * 1.35 : rad, 0, 6.2832);
          c.fillStyle = bright ? 'rgba(200,228,255,.95)' : 'rgba(96,160,255,' + (0.38 + seed * 0.3).toFixed(2) + ')';
          c.fill();
        }
      }
    }

    function proj(h, base) { return [((h[0] + 180) / 360) * mapW + base, ((LAT_TOP - h[1]) / (ROWS * CELL)) * mapH + mapY]; }

    function drawArc(a, base, t, rip) {
      var p0 = proj(a.a, base), p1 = proj(a.b, base);
      var dx = p1[0] - p0[0];
      if (dx > mapW / 2) p1[0] -= mapW; else if (dx < -mapW / 2) p1[0] += mapW;
      var minX = Math.min(p0[0], p1[0]), maxX = Math.max(p0[0], p1[0]);
      if (maxX < -80 || minX > W + 80) return;
      var dist = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
      var cx = (p0[0] + p1[0]) / 2, cy = Math.min(p0[1], p1[1]) - dist * 0.3;
      function pt(u) { var m = 1 - u; return [m * m * p0[0] + 2 * m * u * cx + u * u * p1[0], m * m * p0[1] + 2 * m * u * cy + u * u * p1[1]]; }

      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(120,180,255,.10)';
      ctx.beginPath(); ctx.moveTo(p0[0], p0[1]); ctx.quadraticCurveTo(cx, cy, p1[0], p1[1]); ctx.stroke();

      if (t >= 0 && t <= 1) {
        var tail = 0.26, steps = 16, rgb = a.gold ? '255,194,31' : '110,180,255';
        for (var i = 0; i < steps; i++) {
          var u0 = clamp(t - tail + (tail * i) / steps, 0, 1), u1 = clamp(t - tail + (tail * (i + 1)) / steps, 0, 1);
          var A = pt(u0), B = pt(u1);
          ctx.strokeStyle = 'rgba(' + rgb + ',' + ((i + 1) / steps * 0.85).toFixed(3) + ')';
          ctx.lineWidth = 0.6 + (i / steps) * 2;
          ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); ctx.stroke();
        }
        var H0 = pt(t);
        var g = ctx.createRadialGradient(H0[0], H0[1], 0, H0[0], H0[1], 14);
        g.addColorStop(0, 'rgba(' + rgb + ',.95)'); g.addColorStop(1, 'rgba(' + rgb + ',0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(H0[0], H0[1], 14, 0, 6.2832); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(H0[0], H0[1], 1.8, 0, 6.2832); ctx.fill();
      }
      if (rip >= 0 && rip <= 1) {
        ctx.strokeStyle = 'rgba(255,255,255,' + (0.7 * (1 - rip)).toFixed(3) + ')';
        ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.arc(p1[0], p1[1], 3 + rip * 22, 0, 6.2832); ctx.stroke();
      }
    }

    function draw(dt) {
      time += dt;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      if (!reduceMotion) offset = (offset + dt * 7) % mapW;
      var par = (state.px - 0.5) * 18, parY = (state.py - 0.5) * 10;
      var x0 = -offset - par;

      for (var k = -1; k <= 1; k++) {
        var x = x0 + k * mapW;
        if (x > W || x + mapW < 0) continue;
        ctx.drawImage(sprite, x, mapY - parY, mapW, mapH);
      }

      if (!reduceMotion) {
        var bx = ((time * 0.11) % 1) * (W + 520) - 260;
        var sg = ctx.createLinearGradient(bx - 140, 0, bx + 140, 0);
        sg.addColorStop(0, 'rgba(255,194,31,0)'); sg.addColorStop(.5, 'rgba(255,214,102,.75)'); sg.addColorStop(1, 'rgba(255,194,31,0)');
        ctx.globalCompositeOperation = 'source-atop';
        ctx.fillStyle = sg; ctx.fillRect(bx - 140, 0, 280, H);
        ctx.globalCompositeOperation = 'source-over';
      }

      for (var i = 0; i < arcs.length; i++) {
        var a = arcs[i], cyc = a.dur + a.gap, loc = (time + a.off) % cyc;
        var t = loc / a.dur, rip = (loc - a.dur) / 1.2;
        if (reduceMotion) { t = 0.55 + (i % 3) * .1; rip = -1; }
        for (var kk = -1; kk <= 1; kk++) drawArc(a, x0 + kk * mapW, t, rip);
      }

      var pulse = (Math.sin(time * 2.2) + 1) / 2;
      Object.keys(HUBS).forEach(function (key) {
        for (var kh = -1; kh <= 1; kh++) {
          var P = proj(HUBS[key], x0 + kh * mapW);
          if (P[0] < -20 || P[0] > W + 20) continue;
          var mx = key === 'mzo' || key === 'ver' || key === 'lzc';
          ctx.fillStyle = mx ? 'rgba(255,194,31,.95)' : 'rgba(210,232,255,.9)';
          ctx.beginPath(); ctx.arc(P[0], P[1], mx ? 2.6 : 1.9, 0, 6.2832); ctx.fill();
          if (mx) { ctx.strokeStyle = 'rgba(255,194,31,' + (0.5 - pulse * 0.4).toFixed(2) + ')'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(P[0], P[1], 4 + pulse * 9, 0, 6.2832); ctx.stroke(); }
        }
      });

      for (var j = 0; j < parts.length; j++) {
        var p = parts[j];
        p.y -= p.v; if (p.y < -4) { p.y = H + 4; p.x = Math.random() * W; }
        var al = 0.25 + 0.55 * (0.5 + 0.5 * Math.sin(time * 1.3 + p.p));
        ctx.fillStyle = 'rgba(190,220,255,' + al.toFixed(2) + ')';
        ctx.beginPath(); ctx.arc(p.x + Math.sin(time * .4 + p.p) * 6, p.y, p.r, 0, 6.2832); ctx.fill();
      }
    }

    function loop(now) {
      if (!running) return;
      var dt = Math.min(0.05, (now - last) / 1000 || 0.016); last = now;
      draw(dt);
      requestAnimationFrame(loop);
    }
    function start() { if (running || reduceMotion || !visible || document.hidden) return; running = true; last = performance.now(); requestAnimationFrame(loop); }
    function stop() { running = false; }

    resize();
    window.addEventListener('resize', function () { resize(); }, { passive: true });
    if ('ResizeObserver' in window) new ResizeObserver(function () { resize(); }).observe(hero);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) { visible = en[0].isIntersecting; visible ? start() : stop(); }, { threshold: 0 }).observe(hero);
    }
    document.addEventListener('visibilitychange', function () { document.hidden ? stop() : start(); });
    start();
  }

  /* ───────────────────────── HERO: EMBLEMA, CICLO DE PALABRAS, RELOJ ───────────────────────── */
  function initHero() {
    var stage = $('.hero-stage');
    var ticks = $('.em-rings .ticks');
    if (ticks) {
      var s = '';
      for (var i = 0; i < 72; i++) {
        var a = (i / 72) * Math.PI * 2, big = i % 6 === 0, r1 = big ? 166 : 171, r2 = 178;
        s += '<line class="' + (big ? 'big' : '') + '" x1="' + (200 + Math.cos(a) * r1).toFixed(2) + '" y1="' + (200 + Math.sin(a) * r1).toFixed(2) + '" x2="' + (200 + Math.cos(a) * r2).toFixed(2) + '" y2="' + (200 + Math.sin(a) * r2).toFixed(2) + '"/>';
      }
      ticks.innerHTML = s;
    }

    var emblem = $('#emblem');
    if (stage && emblem && finePointer && !reduceMotion) {
      stage.addEventListener('pointermove', function (e) {
        var r = stage.getBoundingClientRect();
        state.px = clamp((e.clientX - r.left) / r.width, 0, 1);
        state.py = clamp((e.clientY - r.top) / r.height, 0, 1);
        emblem.style.setProperty('--rx', ((state.py - 0.5) * -12).toFixed(2) + 'deg');
        emblem.style.setProperty('--ry', ((state.px - 0.5) * 16).toFixed(2) + 'deg');
      }, { passive: true });
      stage.addEventListener('pointerleave', function () {
        state.px = 0.5; state.py = 0.5;
        emblem.style.setProperty('--rx', '0deg'); emblem.style.setProperty('--ry', '0deg');
      });
    }

    var words = $$('#cycle .cyc');
    if (words.length > 1 && !reduceMotion) {
      var idx = 0;
      setTimeout(function () {
        setInterval(function () {
          var cur = words[idx]; idx = (idx + 1) % words.length; var nxt = words[idx];
          nxt.style.transition = 'none'; nxt.classList.remove('is-out', 'is-on'); void nxt.offsetWidth; nxt.style.transition = '';
          cur.classList.remove('is-on'); cur.classList.add('is-out'); cur.setAttribute('aria-hidden', 'true');
          nxt.classList.add('is-on'); nxt.removeAttribute('aria-hidden');
        }, 3200);
      }, 3600);
    }

    function tickClock() {
      var d = new Date();
      var hm = d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false });
      var dt = d.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
      $$('[data-clock]').forEach(function (el) { el.textContent = hm; });
      $$('[data-date]').forEach(function (el) { el.textContent = dt; });
    }
    tickClock(); setInterval(tickClock, 20000);
  }

  /* ───────────────────────── MANIFIESTO: palabras que se encienden ───────────────────────── */
  var manifesto = { words: [], lit: -1 };
  function initManifesto() {
    var p = $('#mfText');
    if (!p) return;
    var frag = document.createDocumentFragment();
    Array.prototype.slice.call(p.childNodes).forEach(function (n) {
      var em = n.nodeType === 1 && n.tagName === 'B';
      n.textContent.split(/(\s+)/).forEach(function (tok) {
        if (!tok) return;
        if (/^\s+$/.test(tok)) { frag.appendChild(document.createTextNode(' ')); return; }
        var s = document.createElement('span');
        s.className = 'mw' + (em ? ' em' : '');
        s.textContent = tok;
        frag.appendChild(s); manifesto.words.push(s);
      });
    });
    p.textContent = ''; p.appendChild(frag);
    if (reduceMotion) manifesto.words.forEach(function (w) { w.classList.add('lit'); });
  }

  /* ───────────────────────── REVEAL + SPLIT ───────────────────────── */
  function initReveal() {
    $$('[data-split]').forEach(function (el) {
      var words = el.textContent.trim().split(/\s+/);
      el.textContent = '';
      words.forEach(function (w, i) {
        var outer = document.createElement('span'); outer.className = 'w';
        var inner = document.createElement('span'); inner.className = 'wi';
        inner.style.setProperty('--i', i); inner.textContent = w;
        outer.appendChild(inner); el.appendChild(outer);
        if (i < words.length - 1) el.appendChild(document.createTextNode(' '));
      });
      el.classList.add('split');
    });
    $$('.dash-bars i').forEach(function (el, i) { el.style.setProperty('--bi', i); });

    var targets = $$('.rev, .split');
    if (!('IntersectionObserver' in window) || reduceMotion) { targets.forEach(function (t) { t.classList.add('in'); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('in');
        io.unobserve(e.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    targets.forEach(function (t) { io.observe(t); });
  }

  /* ───────────────────────── SPOTLIGHT + BOTONES MAGNÉTICOS ───────────────────────── */
  function initPointerFx() {
    document.addEventListener('pointermove', function (e) {
      var t = e.target && e.target.closest ? e.target.closest('.spot') : null;
      if (t) {
        var r = t.getBoundingClientRect();
        t.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        t.style.setProperty('--my', (e.clientY - r.top) + 'px');
      }
    }, { passive: true });

    if (!finePointer || reduceMotion) return;
    $$('.magnetic').forEach(function (b) {
      b.addEventListener('pointermove', function (e) {
        var r = b.getBoundingClientRect();
        b.style.transform = 'translate(' + ((e.clientX - r.left - r.width / 2) * 0.22).toFixed(1) + 'px,' + ((e.clientY - r.top - r.height / 2) * 0.3).toFixed(1) + 'px)';
      });
      b.addEventListener('pointerleave', function () { b.style.transform = ''; });
    });
  }

  /* ───────────────────────── RONDINES QR: escena anclada ───────────────────────── */
  var qr = { set: function () {}, sp: function () {}, prog: function () {} };
  function initQR() {
    function rng(seed) { var s = seed * 9301 + 49297; return function () { s = (s * 9301 + 49297) % 233280; return s / 233280; }; }
    $$('svg[data-qr]').forEach(function (svg) {
      var n = 21, rand = rng(parseInt(svg.getAttribute('data-qr'), 10) || 7), out = '';
      function finder(fx, fy) {
        for (var y = 0; y < 7; y++) for (var x = 0; x < 7; x++) {
          var edge = x === 0 || y === 0 || x === 6 || y === 6, core = x >= 2 && x <= 4 && y >= 2 && y <= 4;
          if (edge || core) out += '<rect x="' + (fx + x) + '" y="' + (fy + y) + '" width="1.04" height="1.04"/>';
        }
      }
      for (var y = 0; y < n; y++) for (var x = 0; x < n; x++) {
        var inF = (x < 8 && y < 8) || (x > 12 && y < 8) || (x < 8 && y > 12);
        if (!inF && rand() > 0.52) out += '<rect x="' + x + '" y="' + y + '" width="1.04" height="1.04"/>';
      }
      finder(0, 0); finder(14, 0); finder(0, 14);
      svg.setAttribute('shape-rendering', 'crispEdges');
      svg.innerHTML = out;
    });

    var pin = $('#qrPin'), steps = $$('#qrSteps .step'), phone = $('#phone');
    if (!pin || !steps.length || !phone) return;
    var cur = -1, auto = { raf: 0, t0: 0, on: false }, DUR = 4600;

    function set(i) {
      if (i === cur) return;
      cur = i;
      steps.forEach(function (s, k) {
        var on = k === i;
        s.classList.toggle('is-on', on);
        if (on) s.setAttribute('aria-current', 'step'); else s.removeAttribute('aria-current');
        $('.step-h', s).setAttribute('aria-expanded', on ? 'true' : 'false');
        if (!on) s.style.setProperty('--sp', k < i ? 1 : 0);
      });
      phone.setAttribute('data-screen', String(i));
    }
    function sp(v) { if (steps[cur]) steps[cur].style.setProperty('--sp', clamp(v, 0, 1).toFixed(3)); }

    function autoStep(now) {
      if (!auto.on) return;
      var v = (now - auto.t0) / DUR;
      if (v >= 1) { set((cur + 1) % steps.length); auto.t0 = now; v = 0; }
      sp(v);
      auto.raf = requestAnimationFrame(autoStep);
    }
    function autoStart() { if (auto.on || reduceMotion || mqPin.matches) return; auto.on = true; auto.t0 = performance.now(); auto.raf = requestAnimationFrame(autoStep); }
    function autoStop() { auto.on = false; cancelAnimationFrame(auto.raf); }

    steps.forEach(function (s, i) {
      $('.step-h', s).addEventListener('click', function () {
        if (mqPin.matches) {
          var top = pin.getBoundingClientRect().top + window.scrollY, run = pin.offsetHeight - window.innerHeight;
          scrollToY(top + ((i + 0.5) / steps.length) * run);
        } else { set(i); auto.t0 = performance.now(); }
      });
    });

    set(0);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) { en[0].isIntersecting ? autoStart() : autoStop(); }, { threshold: 0.25 }).observe(pin);
    }
    var onMq = function () { autoStop(); if (!mqPin.matches) autoStart(); };
    if (mqPin.addEventListener) mqPin.addEventListener('change', onMq); else if (mqPin.addListener) mqPin.addListener(onMq);

    qr.set = set; qr.sp = sp;
    qr.prog = function (p) { // progreso 0..1 de la escena anclada
      pin.style.setProperty('--qp', p.toFixed(4));
      var f = clamp(p * steps.length, 0, steps.length - 0.0001), i = Math.floor(f);
      set(i); sp(f - i);
    };
  }

  /* ───────────────────────── CADENA: mapa fijo, ruta que avanza con el scroll ───────────────────────── */
  var chain = { update: function () {} };
  function initChain() {
    var map = $('#chainMap'), list = $('#risks'), items = $$('#risks .risk'), path = $('#routePath'), prog = $('#routeProg'), head = $('#routeHead');
    var sec = $('#cadena');
    if (!map || !list || !items.length || !path || !sec) return;
    var nodes = $$('.rn', map), logRisk = $('#clRisk'), logCtrl = $('#clCtrl');
    var total = path.getTotalLength();
    var cur = 0.25, target = 0.25, k = -1, visible = false, raf = 0, hold = false, timer = null;

    function setK(i) {
      if (i === k) return;
      k = i;
      map.setAttribute('data-active', String(i));
      items.forEach(function (it, j) { it.classList.toggle('is-on', j === i); });
      if (logRisk) logRisk.textContent = $('.risk-r', items[i]).textContent;
      if (logCtrl) logCtrl.textContent = $('h3', items[i]).textContent;
    }
    function render() {
      if (prog) prog.style.strokeDashoffset = String(1 - cur);
      var pt = path.getPointAtLength(total * cur);
      if (head) head.setAttribute('transform', 'translate(' + pt.x.toFixed(1) + ' ' + pt.y.toFixed(1) + ')');
      nodes.forEach(function (n) { n.classList.toggle('on', cur >= parseFloat(n.getAttribute('data-f')) - 0.002); });
    }
    function frame() {
      raf = 0;
      if (!visible) return;
      if (mqPin.matches) { // modo escena: el progreso lo marca el scroll
        var vh = window.innerHeight, a = items[0].getBoundingClientRect(), b = items[items.length - 1].getBoundingClientRect();
        var ca = a.top + a.height / 2, cb = b.top + b.height / 2;
        var p = clamp((vh * 0.5 - ca) / Math.max(1, cb - ca), 0, 1);
        target = 0.25 + p * 0.75;
        setK(Math.round(p * (items.length - 1)));
      }
      cur = reduceMotion ? target : lerp(cur, target, 0.12);
      if (Math.abs(cur - target) < 0.0004) cur = target;
      render();
      if (Math.abs(cur - target) > 0.0004 || mqPin.matches) raf = requestAnimationFrame(frame);
    }
    function kick() { if (!raf && visible) raf = requestAnimationFrame(frame); }

    function autoGo() { clearInterval(timer); if (reduceMotion || mqPin.matches) return; timer = setInterval(function () { if (!hold) pick((k + 1) % items.length); }, 3800); }
    function pick(i) { setK(i); target = (i + 1) / items.length; kick(); }

    items.forEach(function (it, i) {
      it.setAttribute('tabindex', '0'); it.setAttribute('role', 'button');
      function act() {
        if (mqPin.matches) { var r = it.getBoundingClientRect(); scrollToY(r.top + r.height / 2 + window.scrollY - window.innerHeight / 2); }
        else { pick(i); autoGo(); }
      }
      it.addEventListener('click', act);
      it.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); act(); } });
      it.addEventListener('mouseenter', function () { if (!mqPin.matches) { hold = true; pick(i); } });
      it.addEventListener('mouseleave', function () { hold = false; });
    });
    $$('.mk', map).forEach(function (m) {
      m.addEventListener('click', function () { var i = parseInt(m.getAttribute('data-k'), 10); if (!mqPin.matches) { pick(i); autoGo(); } });
    });
    map.addEventListener('mouseenter', function () { hold = true; });
    map.addEventListener('mouseleave', function () { hold = false; });

    setK(0); render();
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) {
        visible = en[0].isIntersecting;
        if (visible) { kick(); autoGo(); } else { clearInterval(timer); }
      }, { threshold: 0, rootMargin: '10% 0px 10% 0px' }).observe(sec);
    }
    var onMq = function () { clearInterval(timer); kick(); autoGo(); };
    if (mqPin.addEventListener) mqPin.addEventListener('change', onMq); else if (mqPin.addListener) mqPin.addListener(onMq);
    chain.update = kick;
  }

  /* ───────────────────────── MOTOR DE SCROLL ───────────────────────── */
  function initScroll() {
    var nav = $('#nav'), bar = $('#scrollBar');
    var hero = $('#top'), mf = $('#manifiesto'), qrPin = $('#qrPin');
    var pill = $('.nav-pill'), navLinks = $$('#navLinks a');
    var rail = $('#rail'), railList = rail ? $('ul', rail) : null;
    var speeds = $$('[data-speed]'), scales = $$('[data-scale]'), drifts = $$('[data-drift]');
    var tl = $('#timeline'), tlFill = $('#tlFill'), tlItems = $$('.tl-item');
    var checks = $$('#checklist li'), ckCount = $('#ckCount'), ckBar = $('#ckBar');
    var footMark = $('#footMark'), letters = footMark ? $$('span', footMark) : [];
    var sections = $$('[data-label]');
    var ticking = false, lastY = window.scrollY, lastHp = -1, lastActive = -2, lastLit = -1, lastChecks = -1;
    var scaleTops = [];

    /* riel lateral de secciones */
    var railLinks = [];
    if (railList) {
      sections.forEach(function (s) {
        var li = document.createElement('li'), a = document.createElement('a'), sp = document.createElement('span');
        a.href = '#' + s.id; a.setAttribute('aria-label', s.getAttribute('data-label')); sp.textContent = s.getAttribute('data-label');
        a.appendChild(sp); li.appendChild(a); railList.appendChild(li); railLinks.push(a);
      });
    }

    function placePill(link) {
      if (!pill) return;
      if (!link) { pill.style.opacity = '0'; return; }
      pill.style.opacity = '1';
      pill.style.width = link.offsetWidth + 'px';
      pill.style.transform = 'translateX(' + link.offsetLeft + 'px)';
    }
    function measure() {
      scaleTops = scales.map(function (el) {
        var s = el.style.scale; el.style.scale = '1';
        var r = el.getBoundingClientRect(), v = { top: r.top + window.scrollY, h: r.height };
        el.style.scale = s; return v;
      });
      placePill(navLinks.filter(function (a) { return a.classList.contains('active'); })[0]);
    }

    function update() {
      ticking = false;
      var y = window.scrollY, vh = window.innerHeight, vw = window.innerWidth;
      state.vel = y - lastY; lastY = y;

      if (nav) nav.classList.toggle('stuck', y > 24);
      if (bar) { var max = document.documentElement.scrollHeight - vh; bar.style.setProperty('--p', max > 0 ? (y / max).toFixed(4) : 0); }

      /* Hero anclado */
      if (hero) {
        var hp = mqHero.matches && !reduceMotion ? clamp(y / Math.max(1, hero.offsetHeight - vh), 0, 1) : 0;
        if (Math.abs(hp - lastHp) > 0.0005) { hero.style.setProperty('--hp', hp.toFixed(4)); lastHp = hp; }
      }

      /* Manifiesto */
      if (mf && manifesto.words.length && !reduceMotion) {
        var mr = mf.getBoundingClientRect();
        var mp = clamp(-mr.top / Math.max(1, mr.height - vh), 0, 1);
        mf.style.setProperty('--mp', mp.toFixed(4));
        var lit = Math.round(clamp(mp / 0.78, 0, 1) * manifesto.words.length);
        if (lit !== lastLit) {
          manifesto.words.forEach(function (w, i) { w.classList.toggle('lit', i < lit); });
          lastLit = lit;
        }
      }

      /* Rondines: escena anclada */
      if (qrPin && mqPin.matches && !reduceMotion) {
        var qrr = qrPin.getBoundingClientRect();
        qr.prog(clamp(-qrr.top / Math.max(1, qrr.height - vh), 0, 1));
      }

      /* Parallax suave */
      if (!reduceMotion) {
        speeds.forEach(function (el) {
          var par = el.parentElement.getBoundingClientRect();
          if (par.bottom < -200 || par.top > vh + 200) return;
          var off = (par.top + par.height / 2 - vh / 2) * -parseFloat(el.getAttribute('data-speed'));
          if (el.tagName === 'IMG') { var lim = par.height * 0.085; off = clamp(off, -lim, lim); }
          el.style.translate = '0 ' + off.toFixed(1) + 'px';
        });

        scales.forEach(function (el, i) {
          var m = scaleTops[i]; if (!m) return;
          var p = clamp((vh - (m.top - y)) / (vh * 0.8), 0, 1);
          el.style.scale = (0.9 + 0.1 * easeOut(p)).toFixed(4);
        });

        drifts.forEach(function (el) {
          var sr = el.parentElement.parentElement.getBoundingClientRect();
          var p = clamp((vh - sr.top) / (vh + sr.height), 0, 1);
          el.style.translate = (parseFloat(el.getAttribute('data-drift')) * (p - 0.5) * vw * 0.5).toFixed(1) + 'px 0';
        });

        if (letters.length) {
          var fr = footMark.getBoundingClientRect();
          var fp = clamp((vh - fr.top) / (fr.height * 1.4), 0, 1);
          letters.forEach(function (l, i) {
            var q = clamp(fp * 1.6 - i * 0.14, 0, 1);
            l.style.translate = '0 ' + ((1 - easeOut(q)) * 105).toFixed(1) + '%';
          });
        }
      }

      /* Línea de tiempo */
      if (tl && tlFill) {
        var r = tl.getBoundingClientRect();
        tlFill.style.height = (clamp((vh * 0.62 - r.top) / r.height, 0, 1) * 100).toFixed(2) + '%';
        tlItems.forEach(function (it) { it.classList.toggle('on', it.getBoundingClientRect().top + 40 < vh * 0.62); });
      }

      /* Lista de requisitos: se marcan al avanzar */
      if (checks.length) {
        var n = 0;
        checks.forEach(function (li) {
          var lr = li.getBoundingClientRect(), on = lr.top + lr.height / 2 < vh * 0.74 && lr.bottom > 0;
          li.classList.toggle('ok', on || reduceMotion);
          if (li.classList.contains('ok')) n++;
        });
        if (n !== lastChecks) {
          if (ckCount) ckCount.textContent = n + ' / ' + checks.length;
          if (ckBar) ckBar.style.transform = 'scaleX(' + (n / checks.length) + ')';
          lastChecks = n;
        }
      }

      /* Sección activa: nav, riel y tema */
      var active = -1;
      for (var i = 0; i < sections.length; i++) {
        if (sections[i].getBoundingClientRect().top <= vh * 0.4) active = i;
      }
      if (active !== lastActive) {
        lastActive = active;
        var id = active >= 0 ? sections[active].id : '';
        var activeLink = null;
        navLinks.forEach(function (a) { var on = a.getAttribute('href') === '#' + id; a.classList.toggle('active', on); if (on) activeLink = a; });
        placePill(activeLink);
        railLinks.forEach(function (a, j) { a.classList.toggle('on', j === active); });
        if (rail && active >= 0) rail.setAttribute('data-theme', sections[active].getAttribute('data-theme') || 'dark');
      }
    }

    function req() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }
    window.addEventListener('scroll', req, { passive: true });
    window.addEventListener('resize', function () { measure(); req(); }, { passive: true });
    window.addEventListener('load', function () { measure(); req(); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { measure(); req(); });
    measure(); update();

    /* Marquesina reactiva a la velocidad del scroll */
    var track = $('.marquee-track'), anim = null, rate = 1;
    if (track && track.getAnimations) anim = track.getAnimations()[0] || null;
    if (!reduceMotion && anim) {
      (function loop() {
        state.vel *= 0.9;
        rate = lerp(rate, 1 + Math.min(7, Math.abs(state.vel) * 0.35), 0.08);
        anim.playbackRate = rate;
        requestAnimationFrame(loop);
      }());
    }
  }

  /* ───────────────────────── CUENTA REGRESIVA ───────────────────────── */
  function initCountdown() {
    var box = $('#countdown');
    if (!box) return;
    var els = { d: $('#cdD'), h: $('#cdH'), m: $('#cdM'), s: $('#cdS') };
    var prev = {};
    function pad(n, l) { return String(n).padStart(l, '0'); }
    function put(k, v, l) {
      var txt = pad(v, l);
      if (prev[k] === txt) return;
      prev[k] = txt; els[k].textContent = txt;
      if (!reduceMotion) { els[k].classList.remove('tick'); void els[k].offsetWidth; els[k].classList.add('tick'); }
    }
    function tick() {
      var diff = DEADLINE.getTime() - Date.now();
      if (diff <= 0) {
        put('d', 0, 3); put('h', 0, 2); put('m', 0, 2); put('s', 0, 2);
        var lbl = $('.cd-label span', box); if (lbl) lbl.textContent = 'El registro electrónico de jornada ya es obligatorio';
        return;
      }
      var s = Math.floor(diff / 1000);
      put('d', Math.floor(s / 86400), 3); put('h', Math.floor((s % 86400) / 3600), 2);
      put('m', Math.floor((s % 3600) / 60), 2); put('s', s % 60, 2);
    }
    tick(); setInterval(tick, 1000);
  }

  /* ───────────────────────── FAQ ───────────────────────── */
  function initFaq() {
    var items = $$('.faq-i');
    items.forEach(function (it) {
      var btn = $('button', it);
      btn.addEventListener('click', function () {
        var open = !it.classList.contains('open');
        items.forEach(function (o) { o.classList.remove('open'); $('button', o).setAttribute('aria-expanded', 'false'); });
        if (open) { it.classList.add('open'); btn.setAttribute('aria-expanded', 'true'); }
      });
    });
  }

  /* ───────────────────────── FORMULARIO → WHATSAPP ───────────────────────── */
  function initForm() {
    var form = $('#cForm');
    if (!form) return;
    var ok = $('#fOk');
    function field(id) { return form.querySelector('#' + id); }
    function checked() { return form.querySelector('input[name="servicio"]:checked'); }
    function setErr(el, msg) {
      var g = el.classList.contains('fg') ? el : el.closest('.fg'), e = g && g.querySelector('.f-err');
      if (g) g.classList.toggle('invalid', !!msg);
      if (e) e.textContent = msg || '';
      el.setAttribute('aria-invalid', msg ? 'true' : 'false');
    }
    var rules = {
      fn: function (v) { return v.length < 2 ? 'Escribe tu nombre completo.' : ''; },
      ft: function (v) { return v.replace(/\D/g, '').length < 10 ? 'Ingresa un teléfono de 10 dígitos.' : ''; },
      fm: function (v) { return v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? 'Revisa el formato del correo.' : ''; },
      fServ: function () { return checked() ? '' : 'Selecciona qué necesitas.'; },
      fmsg: function (v) { return v.length < 5 ? 'Cuéntanos brevemente qué necesitas.' : ''; }
    };
    function val(id) { var el = field(id); return el.value !== undefined && el.tagName !== 'FIELDSET' ? el.value.trim() : ''; }

    Object.keys(rules).forEach(function (id) {
      var el = field(id);
      var ev = id === 'fServ' ? 'change' : 'input';
      el.addEventListener('blur', function () { if (id !== 'fServ') setErr(el, rules[id](val(id))); }, true);
      el.addEventListener(ev, function () { var g = el.classList.contains('fg') ? el : el.closest('.fg'); if (g.classList.contains('invalid')) setErr(el, rules[id](val(id))); });
    });

    /* Botones "Cotizar…" preseleccionan el servicio */
    $$('[data-service]').forEach(function (b) {
      b.addEventListener('click', function () {
        var v = b.getAttribute('data-service');
        $$('input[name="servicio"]', form).forEach(function (r) { r.checked = r.value === v; });
        var g = field('fServ'); if (g) setErr(g, '');
      });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var first = null;
      Object.keys(rules).forEach(function (id) {
        var el = field(id), msg = rules[id](val(id));
        setErr(el, msg);
        if (msg && !first) first = el;
      });
      if (first) { (first.tagName === 'FIELDSET' ? first.querySelector('input') : first).focus(); return; }

      var txt = '*Solicitud de cotización — REIZA Private Security*\n\n';
      txt += '• Nombre: ' + val('fn') + '\n';
      if (val('fe')) txt += '• Empresa: ' + val('fe') + '\n';
      txt += '• Teléfono: ' + val('ft') + '\n';
      if (val('fm')) txt += '• Correo: ' + val('fm') + '\n';
      txt += '• Servicio de interés: ' + checked().value + '\n';
      if (val('fi')) txt += '• Tipo de instalación: ' + val('fi') + '\n';
      txt += '• Mensaje: ' + val('fmsg');

      var a = document.createElement('a');
      a.href = 'https://wa.me/' + WA_NUMBER + '?text=' + encodeURIComponent(txt);
      a.target = '_blank'; a.rel = 'noopener noreferrer';
      document.body.appendChild(a); a.click(); a.remove();
      if (ok) ok.hidden = false;
    });
  }

  /* ───────────────────────── LIGHTBOX ───────────────────────── */
  function initLightbox() {
    var dlg = $('#lightbox'), img = $('#lbImg'), close = $('#lbClose');
    if (!dlg) return;
    function open(src, alt) {
      img.src = src; img.alt = alt || '';
      if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
      lockScroll(true);
    }
    function shut() { if (typeof dlg.close === 'function') dlg.close(); else dlg.removeAttribute('open'); }
    dlg.addEventListener('close', function () { lockScroll(false); });
    $$('[data-lightbox]').forEach(function (b) {
      b.addEventListener('click', function () { open(b.getAttribute('data-lightbox'), b.getAttribute('data-alt')); });
    });
    close.addEventListener('click', shut);
    dlg.addEventListener('click', function (e) { if (e.target === dlg) shut(); });
  }

  /* ───────────────────────── EXTRAS ───────────────────────── */
  function initExtras() {
    var y = $('#year'); if (y) y.textContent = new Date().getFullYear();
    var wa = $('#waFloat');
    if (wa) setTimeout(function () { wa.classList.add('tip'); setTimeout(function () { wa.classList.remove('tip'); }, 4500); }, 8000);
    if (reduceMotion) $$('svg').forEach(function (s) { if (s.pauseAnimations) s.pauseAnimations(); });
  }

  /* ───────────────────────── ARRANQUE ───────────────────────── */
  safe(initSmooth);
  safe(initAnchors);
  safe(initNav);
  safe(initManifesto);
  safe(initQR);
  safe(initChain);
  safe(initForm);
  safe(initFaq);
  safe(initLightbox);
  safe(initExtras);
  safe(initPointerFx);
  safe(initHero);
  safe(initMap);
  safe(initScroll);
  safe(initCountdown);

  initLoader(function () { safe(initReveal); });
}());
