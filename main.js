/* =====================================================================
   BADIRA — interactions & mouvements
   GSAP + ScrollTrigger + Lenis. Aucune donnée envoyée : site 100 % statique.
   ===================================================================== */
(function () {
  'use strict';

  /* ---------- outils ---------- */
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var cfg = window.BADIRA || {};
  var root = document.documentElement;
  var reduce = root.classList.contains('rm');
  var fine = matchMedia('(hover:hover) and (pointer:fine)').matches;
  var DESK = '(min-width: 900px)';
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  var rand = function (a, b) { return a + Math.random() * (b - a); };
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var safe = function (fn) { try { fn(); } catch (e) { if (window.console) console.error('[badira]', e); } };
  var hasGSAP = typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined';
  var lenis = null;

  /* ---------- données : horaires / statut ---------- */
  var DAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  var H = cfg.horaires || {};
  function parisNow() { return new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Paris' })); }
  function fmtH(h) { var hh = Math.floor(h), mm = Math.round((h - hh) * 60); return mm ? hh + ' h ' + String(mm).padStart(2, '0') : hh + ' h'; }
  function status() {
    var n = parisNow(), d = n.getDay(), cur = n.getHours() + n.getMinutes() / 60, t = H[d];
    if (t && cur >= t[0] && cur < t[1]) return { open: true, label: 'Ouvert maintenant', hint: 'jusqu’à ' + fmtH(t[1]) };
    if (t && cur < t[0]) return { open: false, label: 'Fermé', hint: 'ouvre aujourd’hui à ' + fmtH(t[0]) };
    for (var i = 1; i <= 7; i++) {
      var dd = (d + i) % 7, tt = H[dd];
      if (tt) return { open: false, label: 'Fermé', hint: i === 1 ? 'ouvre demain à ' + fmtH(tt[0]) : 'ouvre ' + DAYS[dd] + ' à ' + fmtH(tt[0]) };
    }
    return { open: false, label: 'Fermé', hint: '' };
  }

  /* ---------- découpage du texte ---------- */
  function splitWords(el) {
    var text = el.textContent.replace(/\s+/g, ' ').trim();
    el.setAttribute('aria-label', text);
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var frag = document.createDocumentFragment();
          n.textContent.split(/([ \t\r\n]+)/).forEach(function (part) {
            if (!part) return;
            if (/^[ \t\r\n]+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            var w = document.createElement('span'); w.className = 'w'; w.setAttribute('aria-hidden', 'true');
            var wi = document.createElement('span'); wi.className = 'wi'; wi.textContent = part;
            w.appendChild(wi); frag.appendChild(w);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && n.tagName !== 'BR') { walk(n); }
      });
    })(el);
    return $$('.wi', el);
  }
  function splitChars(el) {
    var text = el.textContent.trim();
    el.setAttribute('aria-label', text);
    el.textContent = '';
    Array.prototype.forEach.call(text, function (ch) {
      var c = document.createElement('span'); c.className = 'c'; c.setAttribute('aria-hidden', 'true');
      var ci = document.createElement('span'); ci.className = 'ci'; ci.textContent = ch === ' ' ? '\u00a0' : ch;
      c.appendChild(ci); el.appendChild(c);
    });
    return $$('.ci', el);
  }

  /* =====================================================================
     1. Éléments statiques (fonctionnent sans animation)
     ===================================================================== */
  function staticUI() {
    var y = $('#year'); if (y) y.textContent = new Date().getFullYear();

    // Tarifs / durées renseignés dans config.js
    $$('.js-price').forEach(function (el) {
      var s = (cfg.soins || {})[el.getAttribute('data-for')];
      if (s && s.prix) el.textContent = s.prix + (s.duree ? ' · ' + s.duree : '');
    });

    // Statut d'ouverture
    function paint() {
      var st = status();
      var a = $('#openState'), b = $('#openHint');
      if (a) a.textContent = st.label; if (b) b.textContent = st.hint;
      var f = $('#findState');
      if (f) { f.textContent = st.label + (st.hint ? ' · ' + st.hint : ''); f.classList.toggle('is-open', st.open); }
      var today = parisNow().getDay();
      $$('.hours tr').forEach(function (tr) { tr.classList.toggle('is-today', +tr.getAttribute('data-d') === today); });
    }
    paint(); setInterval(paint, 60000);

    // FAQ
    $$('.qa button').forEach(function (b) {
      b.addEventListener('click', function () {
        var qa = b.closest('.qa'), wasOpen = qa.classList.contains('is-open');
        $$('.qa.is-open').forEach(function (o) { o.classList.remove('is-open'); $('button', o).setAttribute('aria-expanded', 'false'); });
        if (!wasOpen) { qa.classList.add('is-open'); b.setAttribute('aria-expanded', 'true'); }
        if (hasGSAP) setTimeout(function () { ScrollTrigger.refresh(); }, 700);
      });
    });

    // Lightbox galerie
    var dlg = document.createElement('dialog'); dlg.className = 'lb';
    dlg.setAttribute('aria-label', 'Photo agrandie');
    dlg.innerHTML = '<img alt=""><p></p><button type="button" aria-label="Fermer">×</button>';
    document.body.appendChild(dlg);
    var limg = $('img', dlg), lcap = $('p', dlg);
    $$('.g').forEach(function (g) {
      var cap = g.querySelector('figcaption') ? g.querySelector('figcaption').textContent : 'photo';
      g.tabIndex = 0; g.setAttribute('role', 'button'); g.setAttribute('aria-label', 'Agrandir : ' + cap);
      var open = function () {
        var i = g.querySelector('img');
        limg.src = i.currentSrc || i.src; limg.alt = i.alt; lcap.textContent = cap;
        if (dlg.showModal) dlg.showModal();
        if (lenis) lenis.stop();
      };
      g.addEventListener('click', open);
      g.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
    });
    dlg.addEventListener('click', function (e) { if (e.target === dlg || e.target.tagName === 'BUTTON') dlg.close(); });
    dlg.addEventListener('close', function () { if (lenis) lenis.start(); });
  }

  /* =====================================================================
     2. Réservation (SMS / appel / .ics) — aucun serveur
     ===================================================================== */
  function booking() {
    var form = $('#wiz'); if (!form) return;
    var S = cfg.soins || {};
    var st = { soin: null, iso: null, h: null };
    var panes = $$('.wiz__pane', form), steps = $$('.wiz__steps li', form), cur = 0;
    var stepErr = $('#stepErr'), nameErr = $('#nameErr');

    // choix du soin
    var items = Object.keys(S).map(function (k) { return { k: k, nom: S[k].nom, meta: [S[k].prix, S[k].duree].filter(Boolean).join(' · ') }; });
    items.push({ k: 'conseil', nom: 'Je ne sais pas encore : conseillez-moi', meta: '' });
    $('#choiceSoins').innerHTML = items.map(function (it) {
      return '<label class="choice"><input type="radio" name="soin" value="' + esc(it.k) + '"><span class="c2"><b>' + esc(it.nom) + '</b>' + (it.meta ? '<small>' + esc(it.meta) + '</small>' : '') + '</span></label>';
    }).join('');
    $$('input[name="soin"]', form).forEach(function (r) { r.addEventListener('change', function () { st.soin = r.value; stepErr.hidden = true; }); });

    // jours & créneaux (horaires = ceux de la fiche Google)
    var now = parisNow(), days = [];
    for (var i = 0; i < 21; i++) {
      var d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
      days.push({ d: d, i: i, hrs: H[d.getDay()], iso: d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') });
    }
    function slotsFor(day) {
      if (!day.hrs) return [];
      var out = [];
      for (var h = day.hrs[0]; h < day.hrs[1]; h++) {
        if (day.i === 0 && h * 60 < now.getHours() * 60 + now.getMinutes() + 120) continue;
        out.push(h);
      }
      return out;
    }
    var dayWrap = $('#days'), slotWrap = $('#slots'), hint = $('#slotHint');
    days.forEach(function (day) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'day'; b.setAttribute('aria-pressed', 'false');
      var wd = day.d.toLocaleDateString('fr-FR', { weekday: 'short' }), mo = day.d.toLocaleDateString('fr-FR', { month: 'short' });
      b.innerHTML = '<small>' + esc(wd) + '</small><b>' + day.d.getDate() + '</b><small>' + esc(mo) + '</small>';
      b.setAttribute('aria-label', day.d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }) + (slotsFor(day).length ? '' : ', indisponible'));
      if (!slotsFor(day).length) b.disabled = true;
      b.addEventListener('click', function () {
        st.iso = day.iso; st.h = null; stepErr.hidden = true;
        $$('.day', dayWrap).forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
        var sl = slotsFor(day);
        slotWrap.innerHTML = sl.map(function (h) { return '<button type="button" class="slot" aria-pressed="false" data-h="' + h + '">' + h + ' h</button>'; }).join('');
        hint.textContent = 'Horaires ce jour-là : ' + fmtH(day.hrs[0]) + ' – ' + fmtH(day.hrs[1]) + '. Christine confirme l’heure exacte.';
        if (hasGSAP && !reduce) gsap.from($$('.slot', slotWrap), { y: 12, opacity: 0, stagger: .04, duration: .5, ease: 'power3.out' });
      });
      dayWrap.appendChild(b);
    });
    slotWrap.addEventListener('click', function (e) {
      var s = e.target.closest('.slot'); if (!s) return;
      st.h = +s.getAttribute('data-h'); stepErr.hidden = true;
      $$('.slot', slotWrap).forEach(function (x) { x.setAttribute('aria-pressed', x === s ? 'true' : 'false'); });
    });

    // navigation entre étapes
    function go(n) {
      cur = clamp(n, 0, panes.length - 1);
      panes.forEach(function (p, i) { p.classList.toggle('is-on', i === cur); });
      steps.forEach(function (s, i) { s.classList.toggle('on', i <= cur); });
      stepErr.hidden = true; nameErr.hidden = true;
      if (hasGSAP && !reduce) gsap.fromTo(panes[cur], { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: .6, ease: 'power3.out' });
      if (cur === 3) summary();
    }
    function fail(msg) { stepErr.textContent = msg; stepErr.hidden = false; }
    form.addEventListener('click', function (e) {
      if (e.target.closest('[data-prev]')) { go(cur - 1); return; }
      if (!e.target.closest('[data-next]')) return;
      if (cur === 0 && !st.soin) return fail('Choisissez un soin pour continuer.');
      if (cur === 1 && !st.iso) return fail('Choisissez un jour.');
      if (cur === 1 && st.h == null) return fail('Choisissez une heure.');
      if (cur === 2 && !$('#fName').value.trim()) { nameErr.hidden = false; $('#fName').focus(); return; }
      go(cur + 1);
    });
    form.addEventListener('submit', function (e) { e.preventDefault(); });

    // depuis les cartes « Réserver »
    $$('[data-pick]').forEach(function (a) {
      a.addEventListener('click', function () {
        var key = a.getAttribute('data-pick'), r = $('input[name="soin"][value="' + key + '"]', form);
        if (r) { r.checked = true; st.soin = key; go(1); }
      });
    });

    // récapitulatif + actions
    var msgText = '', ics = '';
    function dateOf() { var p = st.iso.split('-'); return new Date(+p[0], +p[1] - 1, +p[2], st.h, 0, 0); }
    function summary() {
      var name = $('#fName').value.trim(), note = $('#fMsg').value.trim();
      var soin = st.soin === 'conseil' ? 'un soin (je souhaite être conseillé·e)' : S[st.soin].nom;
      var dt = dateOf();
      var dlabel = dt.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
      var tlabel = st.h + ' h 00';
      $('#sum').innerHTML = '<b>' + esc(soin) + '</b><br>' + esc(dlabel) + ' à <b>' + esc(tlabel) + '</b><br>Pour : ' + esc(name) + (note ? '<br><em>« ' + esc(note) + ' »</em>' : '');
      msgText = 'Bonjour Christine, c’est ' + name + '. Je souhaiterais réserver : ' + soin + ', le ' + dlabel + ' à ' + tlabel + '. ' + (note ? note + ' ' : '') + 'Merci, à bientôt !';
      $('#btnSms').setAttribute('href', 'sms:' + cfg.telephone + '?&body=' + encodeURIComponent(msgText));
      // .ics (heure locale flottante, durée indicative 1 h)
      var p2 = function (n) { return String(n).padStart(2, '0'); };
      var f = function (d) { return d.getFullYear() + p2(d.getMonth() + 1) + p2(d.getDate()) + 'T' + p2(d.getHours()) + p2(d.getMinutes()) + '00'; };
      var end = new Date(dt.getTime() + 3600000);
      var e2 = function (t) { return t.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n'); };
      ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Badira//Reservation//FR', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'BEGIN:VEVENT',
        'UID:' + Date.now() + '@badira.local', 'DTSTAMP:' + new Date().toISOString().replace(/[-:]|\.\d{3}/g, ''),
        'DTSTART:' + f(dt), 'DTEND:' + f(end), 'SUMMARY:' + e2('Badira · ' + soin + ' (à confirmer)'),
        'LOCATION:' + e2(cfg.adresse || ''), 'STATUS:TENTATIVE',
        'DESCRIPTION:' + e2('Demande envoyée à Christine par SMS (' + (cfg.telephoneAffiche || '') + '). Créneau à confirmer par Badira.'),
        'BEGIN:VALARM', 'TRIGGER:-PT1H', 'ACTION:DISPLAY', 'DESCRIPTION:Rendez-vous Badira', 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
    }
    $('#btnIcs').addEventListener('click', function () {
      var blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
      var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'badira-rendez-vous.ics';
      document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    });
    $('#btnCopy').addEventListener('click', function () {
      var btn = this, ok = function () { btn.textContent = 'Message copié ✓'; setTimeout(function () { btn.textContent = 'Copier le message'; }, 2400); };
      if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(msgText).then(ok, function () { fallback(); }); } else fallback();
      function fallback() { var t = document.createElement('textarea'); t.value = msgText; document.body.appendChild(t); t.select(); try { document.execCommand('copy'); ok(); } catch (e) { } t.remove(); }
    });
  }

  /* =====================================================================
     3. Animations (GSAP)
     ===================================================================== */
  function motion() {
    if (!hasGSAP) { var L = $('#loader'); if (L) L.remove(); return; }
    gsap.registerPlugin(ScrollTrigger);

    /* ----- Lenis (défilement doux) ----- */
    if (!reduce && typeof Lenis !== 'undefined') {
      lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.95, smoothWheel: true });
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
      gsap.ticker.lagSmoothing(0);
      lenis.stop();
    }
    function scrollToEl(target, opts) {
      if (lenis) lenis.scrollTo(target, Object.assign({ duration: 1.6, easing: function (t) { return 1 - Math.pow(1 - t, 4); } }, opts || {}));
      else if (typeof target === 'number') window.scrollTo({ top: target, behavior: reduce ? 'auto' : 'smooth' });
      else target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
    }

    /* ----- menu mobile ----- */
    var menuOpen = false, burger = $('#burger'), menu = $('#menu');
    function setMenu(v) {
      menuOpen = v;
      burger.setAttribute('aria-expanded', v); burger.setAttribute('aria-label', v ? 'Fermer le menu' : 'Ouvrir le menu'); menu.setAttribute('aria-hidden', !v);
      var d = reduce ? .01 : 1;
      if (v) {
        menu.style.visibility = 'visible'; if (lenis) lenis.stop();
        gsap.to(menu, { clipPath: 'circle(150% at calc(100% - 42px) 38px)', duration: d * 1.1, ease: 'expo.inOut' });
        gsap.fromTo('.menu__nav a', { yPercent: 60, opacity: 0 }, { yPercent: 0, opacity: 1, stagger: .06, duration: d * .9, delay: d * .35, ease: 'expo.out' });
      } else {
        if (lenis) lenis.start();
        gsap.to(menu, { clipPath: 'circle(0% at calc(100% - 42px) 38px)', duration: d * .8, ease: 'expo.inOut', onComplete: function () { menu.style.visibility = 'hidden'; } });
      }
    }
    burger.addEventListener('click', function () { setMenu(!menuOpen); });
    addEventListener('keydown', function (e) { if (e.key === 'Escape' && menuOpen) setMenu(false); });

    /* ----- ancres ----- */
    $$('a[href^="#"]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        var id = a.getAttribute('href'); if (id.length < 2) return;
        var t = $(id); if (!t) return;
        e.preventDefault();
        if (menuOpen) setMenu(false);
        if (id === '#accueil') scrollToEl(0); else scrollToEl(t);
      });
    });

    /* ----- découpage des titres ----- */
    var heroChars = splitChars($('.hero__title'));
    var footChars = splitChars($('.foot__giant'));
    var splitTitles = $$('.split').map(function (el) { return { el: el, words: splitWords(el) }; });

    /* =================== LOADER → INTRO =================== */
    var introPlayed = false;
    function intro() {
      if (introPlayed) return; introPlayed = true;
      if (reduce) return;
      if (lenis) lenis.start();
      var tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
      tl.from('.hero__poster,.hero__video', { scale: 1.3, duration: 2.6 }, 0)
        .from('.hero__shade', { opacity: 0, duration: 1.6, ease: 'power2.out' }, 0)
        .fromTo('.hr-line', { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 2.8, ease: 'power3.inOut' }, 0.1)
        .from('.hero__eyebrow', { y: 24, opacity: 0, duration: 1 }, 0.35)
        .from(heroChars, { yPercent: 118, duration: 1.5, stagger: 0.075 }, 0.3)
        .from('.hero__lead', { y: 26, opacity: 0, duration: 1.1 }, 0.95)
        .from('.hero__actions .btn', { y: 28, opacity: 0, duration: 1, stagger: 0.1 }, 1.1)
        .from('.hero__chips li', { x: -24, opacity: 0, duration: 1, stagger: 0.12 }, 1.3)
        .from('.hero__scroll', { opacity: 0, duration: 1 }, 1.5)
        .from('.hero__ears svg', { y: 140, duration: 2.2, stagger: 0.07 }, 0.2)
        .from('.hero__wave path', { yPercent: 100, duration: 1.8, stagger: 0.12 }, 0.3)
        .from('.nav', { yPercent: -160, duration: 1.1 }, 1.0);
    }

    function runLoader() {
      var L = $('#loader');
      if (!L || reduce) { if (L) L.remove(); intro(); return; }
      var cnt = $('#loaderCount'), o = { v: 0 };
      var ready = new Promise(function (res) {
        if (document.readyState === 'complete') res(); else addEventListener('load', res);
        setTimeout(res, 3500);
      });
      var tl = gsap.timeline();
      tl.to('.lm-ring', { strokeDashoffset: 0, duration: 1.5, ease: 'power3.inOut' }, 0)
        .to('.lm-branch', { strokeDashoffset: 0, duration: 1.2, ease: 'power2.inOut' }, 0.35)
        .to('.lm-branch2', { strokeDashoffset: 0, duration: 1, ease: 'power2.inOut' }, 0.6)
        .to('.lm-leaf', { opacity: 1, scale: 1, duration: 0.7, stagger: 0.15, ease: 'back.out(2)' }, 1.0)
        .from('.loader__word span', { yPercent: 115, duration: 1, stagger: 0.07, ease: 'expo.out' }, 0.5)
        .from('.loader__sub', { opacity: 0, y: 10, duration: 0.8 }, 1.0)
        .to(o, { v: 100, duration: 2, ease: 'power2.inOut', onUpdate: function () { cnt.textContent = Math.round(o.v); } }, 0)
        .addPause(2.2, function () { ready.then(function () { tl.play(); }); })
        .to('.loader__inner', { scale: 0.88, opacity: 0, duration: 0.6, ease: 'power2.in' }, 2.25)
        .to('.loader__count', { opacity: 0, duration: 0.4 }, 2.25)
        .add(intro, 2.6)
        .to(L, { '--r': Math.ceil(Math.hypot(innerWidth, innerHeight) / 2) + 80 + 'px', duration: 1.35, ease: 'expo.inOut', onComplete: function () { L.remove(); } }, 2.5);
      // sécurité : jamais bloqué
      setTimeout(function () { if ($('#loader')) { $('#loader').remove(); intro(); } }, 12000);
    }

    /* =================== NAV / PROGRESSION / CURSEUR / FAB =================== */
    var nav = $('#nav'), navHidden = false;
    ScrollTrigger.create({
      start: 0, end: 'max',
      onUpdate: function (self) {
        var y = self.scroll(), hide = self.direction === 1 && y > 180 && !menuOpen;
        if (hide !== navHidden) { navHidden = hide; gsap.to(nav, { yPercent: hide ? -160 : 0, duration: 0.6, ease: 'power3.out', overwrite: 'auto' }); }
      }
    });
    gsap.to('.progress i', { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: 0.3 } });
    var fab = $('#fab');
    ScrollTrigger.create({ trigger: '.hero', start: 'bottom 45%', onEnter: function () { fab.classList.add('is-on'); }, onLeaveBack: function () { fab.classList.remove('is-on'); } });
    ScrollTrigger.create({ trigger: '#reserver', start: 'top 70%', end: 'bottom 30%', onToggle: function (s) { fab.style.visibility = s.isActive ? 'hidden' : 'visible'; } });

    if (fine && !reduce) {
      var cur = $('.cursor'), lab = $('.cursor__label');
      var cx = gsap.quickTo(cur, 'x', { duration: 0.35, ease: 'power3' }), cy = gsap.quickTo(cur, 'y', { duration: 0.35, ease: 'power3' });
      addEventListener('pointermove', function (e) { if (e.pointerType === 'touch') return; cur.classList.add('is-on'); cx(e.clientX); cy(e.clientY); });
      document.addEventListener('pointerover', function (e) {
        var link = e.target.closest('a,button,input,textarea,label,[data-cursor],.tilt');
        var lbl = e.target.closest('[data-cursor]');
        var txt = lbl ? lbl.getAttribute('data-cursor') : '';
        cur.classList.toggle('is-link', !!link);
        cur.classList.toggle('is-label', !!txt);
        lab.textContent = txt || '';
      });
      document.addEventListener('pointerleave', function () { cur.classList.remove('is-on'); });
    }

    /* =================== HERO : médias, décor, parallaxe =================== */
    safe(function () { heroVideos(); });
    safe(function () { heroDecor(); });

    function heroVideos() {
      var vids = $$('.hero__video'); if (!vids.length) return;
      var small = innerWidth < 700 || (navigator.connection && navigator.connection.saveData);
      var first = vids[0];
      first.muted = true; first.setAttribute('playsinline', ''); first.src = first.getAttribute('data-src');
      first.loop = !!(small || reduce);
      var p = first.play(); if (p && p.catch) p.catch(function () { });
      if (small || reduce) return;
      var cur = 0, switching = false;
      first.addEventListener('playing', function once() {
        first.removeEventListener('playing', once);
        vids.slice(1).forEach(function (v) { v.muted = true; v.src = v.getAttribute('data-src'); v.load(); });
      });
      vids.forEach(function (v, i) {
        v.addEventListener('timeupdate', function () {
          if (i !== cur || switching || !v.duration) return;
          if (v.duration - v.currentTime < 1.4) {
            switching = true;
            var n = (i + 1) % vids.length, nv = vids[n];
            nv.currentTime = 0; var pp = nv.play(); if (pp && pp.catch) pp.catch(function () { });
            nv.classList.add('is-on');
            gsap.fromTo(nv, { opacity: 0 }, { opacity: 1, duration: 1.4, ease: 'power1.inOut' });
            gsap.to(v, { opacity: 0, duration: 1.4, ease: 'power1.inOut', onComplete: function () { v.pause(); v.classList.remove('is-on'); cur = n; switching = false; } });
          }
        });
      });
    }

    function heroDecor() {
      var ears = $('.hero__ears'), leaves = $('.hero__leaves'), hero = $('.hero');
      var grain = function (n) {
        var g = '<ellipse cx="20" cy="22" rx="4" ry="10"/><path d="M20 12L20 -6" stroke-width=".8"/>';
        for (var k = 0; k < n; k++) {
          var y = 38 + k * 12;
          g += '<ellipse cx="12.5" cy="' + y + '" rx="4.3" ry="9.4" transform="rotate(-26 12.5 ' + y + ')"/><ellipse cx="27.5" cy="' + y + '" rx="4.3" ry="9.4" transform="rotate(26 27.5 ' + y + ')"/>' +
            '<path d="M10 ' + (y - 8) + 'L3 ' + (y - 34) + 'M30 ' + (y - 8) + 'L37 ' + (y - 34) + '" stroke-width=".7"/>';
        }
        return g;
      };
      var count = innerWidth < 700 ? 6 : 11;
      for (var i = 0; i < count; i++) {
        var h = rand(34, 92), left = (i + 0.5) / count * 100 + rand(-3, 3), op = rand(0.55, 0.95);
        var el = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        el.setAttribute('viewBox', '0 -8 40 208'); el.setAttribute('aria-hidden', 'true');
        el.style.cssText = 'left:' + left + '%;height:' + h + '%;width:auto;opacity:' + op + ';' + (i % 3 === 0 ? 'filter:blur(1.5px);' : '');
        el.innerHTML = '<g fill="#EBD9BF" stroke="#EBD9BF"><path d="M20 200C20 150 22 100 20 36" fill="none" stroke-width="1.6" stroke-linecap="round"/>' + grain(5) + '</g>';
        ears.appendChild(el);
        var r0 = rand(-6, 6);
        gsap.set(el, { rotation: r0, transformOrigin: '50% 100%' });
        if (!reduce) {
          gsap.to(el, { rotation: -r0 * rand(0.5, 1.2), duration: rand(2.6, 4.6), yoyo: true, repeat: -1, ease: 'sine.inOut' });
          gsap.to(el, { yPercent: -rand(8, 40), ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });
        }
      }
      if (reduce) return;
      // feuilles qui dérivent
      for (var j = 0; j < 8; j++) {
        var s = rand(18, 44), lf = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        lf.setAttribute('viewBox', '0 0 24 24'); lf.setAttribute('aria-hidden', 'true');
        lf.style.cssText = 'left:' + rand(4, 94) + '%;top:' + rand(8, 70) + '%;width:' + s + 'px;height:' + s + 'px;opacity:' + rand(0.35, 0.85);
        lf.innerHTML = '<path d="M3 21C3 11 10 3 21 3c0 11-7 18-18 18z" fill="' + (j % 2 ? '#C8975A' : '#EBD9BF') + '"/><path d="M3 21L14 10" stroke="#2A1220" stroke-opacity=".35" stroke-width=".8" fill="none"/>';
        leaves.appendChild(lf);
        gsap.set(lf, { rotation: rand(-80, 80) });
        gsap.to(lf, { y: '+=' + rand(50, 150), x: '+=' + rand(-70, 70), rotation: '+=' + rand(-110, 110), duration: rand(8, 15), yoyo: true, repeat: -1, ease: 'sine.inOut', delay: rand(0, 4) });
      }
      // parallaxe multicouche au défilement
      var st = { trigger: hero, start: 'top top', end: 'bottom top', scrub: true };
      gsap.to('.hero__media', { yPercent: 16, scale: 1.14, ease: 'none', scrollTrigger: st });
      gsap.to('.hero__ring', { yPercent: -14, rotation: 35, ease: 'none', scrollTrigger: st });
      gsap.to(leaves, { yPercent: -35, ease: 'none', scrollTrigger: st });
      gsap.to('.hero__content', { yPercent: -18, opacity: 0.05, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: '70% top', scrub: true } });
      gsap.to('.hero__chips,.hero__scroll', { opacity: 0, ease: 'none', scrollTrigger: { trigger: hero, start: '5% top', end: '30% top', scrub: true } });
      gsap.to('.w-back', { yPercent: -35, ease: 'none', scrollTrigger: st });
      // parallaxe à la souris
      if (fine) {
        var qx = gsap.quickTo('.hero__ring', 'x', { duration: 1.2, ease: 'power3' }), qy = gsap.quickTo('.hero__ring', 'y', { duration: 1.2, ease: 'power3' });
        var lx = gsap.quickTo(leaves, 'x', { duration: 1.6, ease: 'power3' }), ly = gsap.quickTo(leaves, 'y', { duration: 1.6, ease: 'power3' });
        var ex = gsap.quickTo(ears, 'x', { duration: 1.4, ease: 'power3' });
        hero.addEventListener('pointermove', function (e) {
          var nx = e.clientX / innerWidth - 0.5, ny = e.clientY / innerHeight - 0.5;
          qx(nx * -34); qy(ny * -24); lx(nx * 60); ly(ny * 40); ex(nx * -22);
        });
      }
    }

    /* =================== PINS D'ABORD (ordre de création) =================== */
    var mm = gsap.matchMedia();

    // L'esprit : section épinglée, storytelling en 4 étapes
    mm.add('(min-width: 900px) and (prefers-reduced-motion: no-preference)', function () {
      var steps = $$('.step'), frames = $$('.frame'), num = $('#storyNum');
      var reveals = [null,
        ['circle(0% at 50% 50%)', 'circle(80% at 50% 50%)'],
        ['inset(100% 0% 0% 0%)', 'inset(0% 0% 0% 0%)'],
        ['circle(0% at 85% 90%)', 'circle(130% at 85% 90%)']];
      gsap.set(steps, { autoAlpha: 0 }); gsap.set(steps[0], { autoAlpha: 1 });
      frames.forEach(function (f, i) { if (i) gsap.set(f, { clipPath: reveals[i][0] }); });
      var tl = gsap.timeline({
        defaults: { ease: 'power2.inOut' },
        onUpdate: function () { var k = Math.min(3, Math.floor(tl.time() + 0.12)); num.textContent = '0' + (k + 1); },
        scrollTrigger: { trigger: '.story__pin', start: 'top top', end: '+=360%', pin: true, scrub: 0.7, anticipatePin: 1 }
      });
      for (var i = 1; i < 4; i++) {
        var t = i - 0.2;
        tl.to(steps[i - 1], { autoAlpha: 0, y: -36, duration: 0.3 }, t)
          .fromTo(steps[i], { autoAlpha: 0, y: 44 }, { autoAlpha: 1, y: 0, duration: 0.35 }, t + 0.18)
          .fromTo(frames[i], { clipPath: reveals[i][0] }, { clipPath: reveals[i][1], duration: 0.7, ease: 'power3.inOut' }, t);
      }
      tl.fromTo('.frame img', { scale: 1.22 }, { scale: 1.02, ease: 'none', duration: 4 }, 0)
        .fromTo('.sm-fg', { strokeDashoffset: 1 }, { strokeDashoffset: 0, ease: 'none', duration: 4 }, 0)
        .fromTo('.story__orbit circle', { strokeDashoffset: 1 }, { strokeDashoffset: 0, ease: 'none', duration: 4 }, 0)
        .fromTo('.story__orbit', { rotation: -30 }, { rotation: 90, ease: 'none', duration: 4 }, 0)
        .to({}, { duration: 0.25 }, 3.75);
    });
    // version empilée : simples apparitions
    mm.add('(max-width: 899px), (prefers-reduced-motion: reduce)', function () {
      if (reduce) return;
      $$('.step, .frame').forEach(function (el) {
        gsap.from(el, { y: 50, opacity: 0, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 88%' } });
      });
    });

    // Soins : défilement horizontal piloté par le scroll vertical
    mm.add('(min-width: 900px) and (prefers-reduced-motion: no-preference)', function () {
      var sec = $('.rail'), track = $('.rail__track');
      var dist = function () { return Math.max(0, track.scrollWidth - innerWidth); };
      var h = gsap.to(track, {
        x: function () { return -dist(); }, ease: 'none',
        scrollTrigger: { trigger: sec, start: 'top top', end: function () { return '+=' + dist(); }, pin: true, scrub: 0.8, invalidateOnRefresh: true, anticipatePin: 1 }
      });
      $$('.card').forEach(function (card) {
        gsap.fromTo($('img', card), { xPercent: -5 }, { xPercent: 5, ease: 'none', scrollTrigger: { trigger: card, containerAnimation: h, start: 'left right', end: 'right left', scrub: true } });
        gsap.fromTo(card, { opacity: 0.35, scale: 0.94 }, { opacity: 1, scale: 1, ease: 'none', scrollTrigger: { trigger: card, containerAnimation: h, start: 'left 100%', end: 'left 62%', scrub: true } });
      });
      gsap.to('.rail__hint span', { x: 14, repeat: -1, yoyo: true, duration: 0.9, ease: 'sine.inOut' });
    });

    /* =================== TITRES & TEXTES =================== */
    if (!reduce) splitTitles.forEach(function (t) {
      gsap.from(t.words, { yPercent: 118, duration: 1.2, stagger: 0.045, ease: 'expo.out', scrollTrigger: { trigger: t.el, start: 'top 86%' } });
    });
    if (!reduce) $$('.eyebrow, .lede, .christine__text > p, .christine__text .btn, .faq__head > p, .mado__head > p, .booking__intro .bignum, .find__card address, .find__tel, .find__state, .gallery__more, .reviews__score, .reviews__src, .rail__intro > p, .rail__outro > *').forEach(function (el) {
      if (el.closest('.hero')) return;
      gsap.from(el, { y: 30, opacity: 0, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 90%' } });
    });

    /* =================== BANDEAU DÉFILANT (réagit au scroll) =================== */
    if (!reduce) {
      var rows = $$('.marquee__row').map(function (r) { return { el: $('.marquee__track', r), dir: +r.getAttribute('data-dir') || 1, x: 0, half: 0 }; });
      var measure = function () { rows.forEach(function (r) { r.half = r.el.scrollWidth / 2; }); };
      measure(); addEventListener('resize', measure); addEventListener('load', measure);
      var boost = 0;
      gsap.ticker.add(function (t, dt) {
        var v = lenis ? lenis.velocity : 0, tgt = Math.min(Math.abs(v) * 0.55, 22) * (v < 0 ? -1 : 1);
        boost += (tgt - boost) * 0.08;
        rows.forEach(function (r) {
          if (!r.half) return;
          r.x -= r.dir * (0.7 + boost) * (dt / 16.67) * 1.2;
          if (r.x <= -r.half) r.x += r.half; if (r.x > 0) r.x -= r.half;
          r.el.style.transform = 'translate3d(' + r.x + 'px,0,0)';
        });
      });
      gsap.to('.marquee', { rotation: -0.4, ease: 'none', scrollTrigger: { trigger: '.marquee', start: 'top bottom', end: 'bottom top', scrub: true } });
    }

    /* =================== CHRISTINE =================== */
    if (!reduce) {
      gsap.to('.portrait__text', { rotation: 200, ease: 'none', scrollTrigger: { trigger: '.christine', start: 'top bottom', end: 'bottom top', scrub: true } });
      gsap.fromTo('.portrait', { yPercent: 7 }, { yPercent: -7, ease: 'none', scrollTrigger: { trigger: '.christine', start: 'top bottom', end: 'bottom top', scrub: true } });
      gsap.fromTo('.portrait img', { scale: 1.35 }, { scale: 1, duration: 2.2, ease: 'expo.out', scrollTrigger: { trigger: '.christine__visual', start: 'top 75%' } });
      gsap.fromTo('.portrait', { clipPath: 'circle(0% at 50% 50%)' }, { clipPath: 'circle(75% at 50% 50%)', duration: 1.8, ease: 'expo.out', scrollTrigger: { trigger: '.christine__visual', start: 'top 75%' } });
      gsap.from('.christine__muguet', { scale: 0, rotation: -50, duration: 1.4, ease: 'back.out(1.7)', scrollTrigger: { trigger: '.christine__visual', start: 'top 60%' } });
    }

    /* =================== MADOTHÉRAPIE : cadran =================== */
    var nodes = $$('.node'), kEl = $('#dialKicker'), tEl = $('#dialTitle'), dEl = $('#dialText');
    function pick(n) {
      if (n.classList.contains('is-on') && kEl.textContent === n.getAttribute('data-k')) return;
      nodes.forEach(function (x) { x.classList.toggle('is-on', x === n); x.setAttribute('aria-pressed', x === n ? 'true' : 'false'); });
      var swap = function () { kEl.textContent = n.getAttribute('data-k'); tEl.textContent = n.getAttribute('data-t'); dEl.textContent = n.getAttribute('data-d'); };
      if (reduce) { swap(); return; }
      gsap.timeline().to('.dial__core > *', { y: -10, opacity: 0, duration: 0.25, stagger: 0.04, ease: 'power2.in' })
        .add(swap).fromTo('.dial__core > *', { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.55, stagger: 0.07, ease: 'power3.out' });
    }
    nodes.forEach(function (n) { n.addEventListener('click', function () { pick(n); }); n.addEventListener('focus', function () { pick(n); }); if (fine) n.addEventListener('mouseenter', function () { pick(n); }); });
    if (!reduce) {
      gsap.fromTo('.d-line', { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 2.4, ease: 'power3.inOut', scrollTrigger: { trigger: '.dial', start: 'top 75%' } });
      gsap.from(nodes, { scale: 0, duration: 0.9, stagger: 0.14, ease: 'back.out(1.8)', scrollTrigger: { trigger: '.dial', start: 'top 70%' } });
      gsap.to('.mado__bg img', { yPercent: 12, scale: 1.1, ease: 'none', scrollTrigger: { trigger: '.mado', start: 'top bottom', end: 'bottom top', scrub: true } });
    }

    /* =================== CHIFFRES =================== */
    $$('.stat').forEach(function (s, i) {
      var b = $('b', s), ring = $('.s-fg', s), to = +b.getAttribute('data-count'), dec = +b.getAttribute('data-decimals') || 0, fill = parseFloat(ring.getAttribute('data-fill')) || 1;
      var fmt = function (v) { return v.toFixed(dec).replace('.', ','); };
      if (reduce) { ring.style.strokeDashoffset = 1 - fill; return; }
      b.textContent = fmt(0);
      ScrollTrigger.create({
        trigger: s, start: 'top 82%', once: true,
        onEnter: function () {
          var o = { v: 0 };
          gsap.to(o, { v: to, duration: 2.2, delay: i * 0.12, ease: 'power3.out', onUpdate: function () { b.textContent = fmt(o.v); } });
          gsap.to(ring, { strokeDashoffset: 1 - fill, duration: 2.4, delay: i * 0.12, ease: 'power3.inOut' });
        }
      });
    });
    if (!reduce) {
      $$('[data-parallax]').forEach(function (img) {
        gsap.set(img, { scale: 1.22 });
        gsap.fromTo(img, { yPercent: -9 }, { yPercent: 9, ease: 'none', scrollTrigger: { trigger: img.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } });
      });
    }

    /* =================== GALERIE : révélations par masque =================== */
    if (!reduce) {
      $$('.g').forEach(function (g, i) {
        var kind = g.getAttribute('data-reveal'), img = $('img', g);
        var from = kind === 'circle' ? 'circle(0% at 50% 50%)' : 'inset(100% 0% 0% 0%)';
        var to = kind === 'circle' ? 'circle(75% at 50% 50%)' : 'inset(0% 0% 0% 0%)';
        gsap.fromTo(g, { clipPath: from }, { clipPath: to, duration: 1.5, ease: 'expo.out', delay: (i % 3) * 0.08, scrollTrigger: { trigger: g, start: 'top 90%' } });
        if (!img.hasAttribute('data-parallax')) {
          gsap.fromTo(img, { scale: 1.4 }, { scale: 1.08, duration: 2.2, ease: 'expo.out', scrollTrigger: { trigger: g, start: 'top 90%' } });
        }
      });
    }

    /* =================== AVIS : carrousel =================== */
    safe(function () {
      var vp = $('#revViewport'), tr = $('#revTrack'), bar = $('#revBar'); if (!vp) return;
      var cards = $$('.rev', tr), x = 0, idx = 0, drag = null, hover = false, inView = false;
      var gap = function () { return parseFloat(getComputedStyle(tr).columnGap) || 20; };
      var padL = function () { return parseFloat(getComputedStyle(vp).paddingLeft) || 0; };
      var maxX = function () { return Math.max(0, tr.offsetWidth - (vp.clientWidth - padL() * 2)); };
      var stepW = function () { return cards[0].offsetWidth + gap(); };
      var paint = function () { var m = maxX(); bar.style.transform = 'scaleX(' + (m ? Math.max(0.08, clamp(x / m, 0, 1)) : 1) + ')'; };
      var setX = function (nx, anim) {
        x = clamp(nx, 0, maxX());
        gsap.to(tr, { x: -x, duration: anim === false ? 0 : 0.9, ease: 'power3.out', overwrite: true });
        paint();
      };
      var go = function (i) { idx = clamp(i, 0, cards.length - 1); setX(idx * stepW()); };
      var next = function () { if (x >= maxX() - 4) go(0); else go(Math.round(x / stepW()) + 1); };
      var prev = function () { go(Math.round(x / stepW()) - 1); };
      $('#revNext').addEventListener('click', next); $('#revPrev').addEventListener('click', prev);
      vp.addEventListener('keydown', function (e) { if (e.key === 'ArrowRight') { e.preventDefault(); next(); } if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); } });
      vp.addEventListener('pointerdown', function (e) { if (e.pointerType === 'mouse' && e.button !== 0) return; drag = { sx: e.clientX, x0: x, moved: false }; });
      addEventListener('pointermove', function (e) {
        if (!drag) return;
        var dx = e.clientX - drag.sx; if (Math.abs(dx) > 6) drag.moved = true;
        if (drag.moved) { x = clamp(drag.x0 - dx, -60, maxX() + 60); gsap.set(tr, { x: -x }); paint(); }
      });
      addEventListener('pointerup', function () {
        if (!drag) return; var was = drag; drag = null;
        if (was.moved) { vp.setAttribute('data-drag', '1'); setTimeout(function () { vp.removeAttribute('data-drag'); }, 60); go(Math.round(x / stepW())); }
      });
      vp.addEventListener('click', function (e) { if (vp.getAttribute('data-drag')) { e.preventDefault(); e.stopPropagation(); } }, true);
      vp.addEventListener('mouseenter', function () { hover = true; }); vp.addEventListener('mouseleave', function () { hover = false; });
      addEventListener('resize', function () { setX(x, false); });
      ScrollTrigger.create({ trigger: vp, start: 'top 85%', end: 'bottom 15%', onToggle: function (s) { inView = s.isActive; } });
      if (!reduce) {
        setInterval(function () { if (inView && !hover && !drag && !document.hidden) next(); }, 6500);
        gsap.from(cards, { x: 140, opacity: 0, duration: 1.4, stagger: 0.1, ease: 'expo.out', scrollTrigger: { trigger: vp, start: 'top 85%' } });
      }
      paint();
    });

    /* =================== BOUTONS MAGNÉTIQUES & CARTES 3D =================== */
    if (fine && !reduce) {
      $$('.magnetic').forEach(function (el) {
        var t = $('.btn__t', el);
        el.addEventListener('pointermove', function (e) {
          var r = el.getBoundingClientRect(), dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
          gsap.to(el, { x: dx * 0.3, y: dy * 0.38, duration: 0.5, ease: 'power3.out' });
          if (t) gsap.to(t, { x: dx * 0.12, y: dy * 0.16, duration: 0.5, ease: 'power3.out' });
        });
        el.addEventListener('pointerleave', function () {
          gsap.to(el, { x: 0, y: 0, duration: 1.1, ease: 'elastic.out(1,.5)' });
          if (t) gsap.to(t, { x: 0, y: 0, duration: 1.1, ease: 'elastic.out(1,.5)' });
        });
      });
      $$('.tilt').forEach(function (el) {
        el.addEventListener('pointermove', function (e) {
          var r = el.getBoundingClientRect(), px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
          gsap.to(el, { rotateY: (px - 0.5) * 11, rotateX: -(py - 0.5) * 11, transformPerspective: 900, duration: 0.5, ease: 'power3.out', overwrite: 'auto' });
          el.style.setProperty('--mx', px * 100 + '%'); el.style.setProperty('--my', py * 100 + '%');
        });
        el.addEventListener('pointerleave', function () { gsap.to(el, { rotateX: 0, rotateY: 0, duration: 1, ease: 'elastic.out(1,.6)', overwrite: 'auto' }); });
      });
    }

    /* =================== FOOTER =================== */
    if (!reduce) {
      gsap.from(footChars, { yPercent: 115, duration: 1.6, stagger: 0.08, ease: 'expo.out', scrollTrigger: { trigger: '.foot', start: 'top 75%' } });
      gsap.from('.foot__quote, .foot__links a', { y: 30, opacity: 0, duration: 1.1, stagger: 0.07, ease: 'expo.out', scrollTrigger: { trigger: '.foot', start: 'top 85%' } });
    }

    /* =================== LANCEMENT =================== */
    ScrollTrigger.sort();
    addEventListener('load', function () { ScrollTrigger.refresh(); });
    runLoader();
  }

  /* ---------- démarrage ---------- */
  safe(staticUI);
  safe(booking);
  try { motion(); } catch (e) { if (window.console) console.error('[badira]', e); var L = $('#loader'); if (L) L.remove(); }
})();
