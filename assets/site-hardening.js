/* Nepali Patro — audit hardening layer */
(function () {
  'use strict';
  if (window.__NP_SITE_HARDENING__) return;
  window.__NP_SITE_HARDENING__ = true;

  var BASE = '/Nepali-Patro/';

  function normalizeInternalLinks() {
    document.querySelectorAll('a[href]').forEach(function (a) {
      var href = a.getAttribute('href');
      if (!href || href.charAt(0) === '#' || /^(https?:|mailto:|tel:|javascript:)/i.test(href)) return;
      if (href === BASE + 'all' || href === BASE + 'all/') {
        a.setAttribute('href', BASE + 'all/');
        return;
      }
      if (href.indexOf(BASE) === 0) return;
      if (/^(?:\.\/)?(?:patro|panchanga|rashifal|jyotish|parba|news|saith|forex|converter|itihas-aaja|gold-price|interest-rate|calendar|all)(?:\/|$)/.test(href)) {
        a.setAttribute('href', BASE + href.replace(/^\.\//, '').replace(/^\//, ''));
      }
    });
  }

  function improveAnchorNavigation() {
    document.documentElement.style.scrollBehavior = 'smooth';
    document.querySelectorAll('a[href^="#"]').forEach(function (a) {
      a.addEventListener('click', function () {
        var id = a.getAttribute('href').slice(1);
        if (!id) return;
        var target = document.getElementById(id);
        if (!target) return;
        setTimeout(function () {
          target.setAttribute('tabindex', '-1');
          target.focus({ preventScroll: true });
          target.classList.add('np-anchor-highlight');
          setTimeout(function () { target.classList.remove('np-anchor-highlight'); }, 900);
        }, 450);
      });
    });
  }

  function reserveDynamicSpace() {
    var rules = [
      ['#todayBs', 'min-height:1.2em'],
      ['#todayWeekday', 'min-height:1.5em'],
      ['#todayAd', 'min-height:1.4em'],
      ['#panchangaPreview', 'min-height:112px'],
      ['#calendarPreview', 'min-height:320px'],
      ['#parbaPreview', 'min-height:80px'],
      ['#rashifalPreview', 'min-height:80px'],
      ['#newsPreview', 'min-height:180px']
    ];
    rules.forEach(function (item) {
      var el = document.querySelector(item[0]);
      if (el) el.style.cssText += ';' + item[1];
    });
  }

  function improveMobileA11y() {
    var menu = document.getElementById('mobileMenu');
    var button = document.getElementById('mobileMenuBtn');
    if (!menu || !button) return;
    var sync = function () {
      var open = menu.classList.contains('open');
      menu.setAttribute('aria-hidden', String(!open));
      if ('inert' in menu) menu.inert = !open;
      button.setAttribute('aria-expanded', String(open));
    };
    sync();
    new MutationObserver(sync).observe(menu, { attributes: true, attributeFilter: ['class'] });
  }

  function improveDynamicAnnouncements() {
    ['newsPreview', 'panchangaPreview', 'parbaPreview', 'rashifalPreview'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.setAttribute('aria-live', 'polite');
    });
  }

  function injectStyles() {
    if (document.getElementById('np-site-hardening-style')) return;
    var style = document.createElement('style');
    style.id = 'np-site-hardening-style';
    style.textContent = '.np-anchor-highlight{outline:3px solid rgba(185,28,28,.35);outline-offset:6px;transition:outline-color .2s}.today-main-card{min-height:360px}.home-calendar-preview .np-panel{min-height:320px}.secondary-panel{min-height:180px}';
    document.head.appendChild(style);
  }

  function localizeCommonText() {
    document.querySelectorAll('h1,h2,h3,h4,p,a,span,small,button').forEach(function (el) {
      if (el.children.length) return;
      var text = el.textContent.trim();
      if (text === 'BS ↔ AD Converter') el.textContent = 'वि.सं. ↔ ई.सं. रूपान्तरण';
      if (text === 'Nepali Patro') el.textContent = 'नेपाली पात्रो';
    });
  }

  function boot() {
    normalizeInternalLinks();
    improveAnchorNavigation();
    reserveDynamicSpace();
    improveMobileA11y();
    improveDynamicAnnouncements();
    injectStyles();
    localizeCommonText();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
