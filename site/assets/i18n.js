/* ============================================================================
   Turbo Keysmith — public-site language toggle (English / Spanish)
   ----------------------------------------------------------------------------
   Self-contained, no dependencies. Drop <script src=".../assets/i18n.js" defer>
   on any public page and it:
     • injects a 🌐 EN/ES toggle into the header,
     • remembers the choice in localStorage ('tks_site_lang'),
     • translates the shared chrome (nav, trust strip, footer) via the DICT below,
     • translates any element tagged data-i18n="<spanish>" (text) or
       data-i18n-html="<spanish html>" (markup), restoring English on toggle.
   Page-body copy that isn't tagged stays English (translate later by tagging).
   ============================================================================ */
(function () {
  'use strict';
  var KEY = 'tks_site_lang';

  // EN source text -> ES. Used to translate the shared chrome automatically.
  var DICT = {
    // nav
    'Home':'Inicio','Automotive':'Automotriz','Residential':'Residencial',
    'Commercial':'Comercial','Emergency':'Emergencia','FAQ':'Preguntas',
    'Pay Now':'Pagar','Blog':'Blog','Certifications':'Certificaciones','Contact':'Contacto',
    // trust strip
    '250+ Google reviews':'250+ reseñas de Google','Licensed':'Con licencia',
    '24-Hour':'24 horas','Monday–Saturday':'Lunes a sábado','Mobile':'Móvil',
    'We come to you':'Vamos a usted',
    // footer
    'Services':'Servicios','Company':'Empresa','Service Areas':'Zonas de servicio',
    'Your trusted mobile locksmith — always there when you need us.':
      'Tu cerrajero móvil de confianza — siempre ahí cuando lo necesitas.',
    'Staff Login':'Acceso de personal',
    // section headings shared across pages
    'How It Works':'Cómo funciona','Our Work':'Nuestro trabajo',
    'Serving the Oklahoma City Metro':'Servimos el área de Oklahoma City',
    "Three simple steps — no stress.":'Tres pasos simples — sin estrés.',
    'Call':'Llamar','We come to you ':'Vamos a usted','Back in business':'De vuelta en marcha',
    // Service Areas hub — distance-group headings (mirror the EN structure/order)
    'Home turf — minutes away':'A minutos de nosotros',
    'Inner metro':'Zona metro interior',
    'Surrounding metro':'Zona metro circundante',
    'Outer edge of our area':'El borde de nuestra zona'
  };

  var lang = 'en';
  try { lang = localStorage.getItem(KEY) === 'es' ? 'es' : 'en'; } catch (e) {}

  // Selectors whose LEAF text we translate from DICT (no nested elements).
  var CHROME_SEL = 'header.site nav.main a, header.site nav.mobile a, .trust .item span, ' +
                   'footer.site h4, footer.site a, .sec-head h2, .sec-head p, .step h3';

  function leaf(el) { return el.children.length === 0; }

  function translateChrome() {
    document.querySelectorAll(CHROME_SEL).forEach(function (el) {
      if (!leaf(el)) return;
      if (el.getAttribute('data-i18n-en') === null) el.setAttribute('data-i18n-en', el.textContent.trim());
      var en = el.getAttribute('data-i18n-en');
      el.textContent = (lang === 'es' && DICT[en]) ? DICT[en] : en;
    });
  }

  function translateTagged() {
    // text nodes
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      if (el.getAttribute('data-i18n-en') === null) el.setAttribute('data-i18n-en', el.textContent);
      el.textContent = (lang === 'es') ? el.getAttribute('data-i18n') : el.getAttribute('data-i18n-en');
    });
    // html blocks
    document.querySelectorAll('[data-i18n-html]').forEach(function (el) {
      if (el.getAttribute('data-i18n-enhtml') === null) el.setAttribute('data-i18n-enhtml', el.innerHTML);
      el.innerHTML = (lang === 'es') ? el.getAttribute('data-i18n-html') : el.getAttribute('data-i18n-enhtml');
    });
    // placeholders
    document.querySelectorAll('[data-i18n-ph]').forEach(function (el) {
      if (el.getAttribute('data-i18n-phen') === null) el.setAttribute('data-i18n-phen', el.getAttribute('placeholder') || '');
      el.setAttribute('placeholder', (lang === 'es') ? el.getAttribute('data-i18n-ph') : el.getAttribute('data-i18n-phen'));
    });
    // <option> labels (e.g. the contact service dropdown)
    document.querySelectorAll('option[data-i18n]').forEach(function (el) {
      if (el.getAttribute('data-i18n-en') === null) el.setAttribute('data-i18n-en', el.textContent);
      el.textContent = (lang === 'es') ? el.getAttribute('data-i18n') : el.getAttribute('data-i18n-en');
    });
  }

  function apply() {
    document.documentElement.lang = lang;
    translateChrome();
    translateTagged();
    var btn = document.getElementById('langToggleBtn');
    if (btn) {
      btn.textContent = (lang === 'es') ? '🌐 English' : '🌐 Español';
      btn.setAttribute('aria-label', (lang === 'es') ? 'Switch to English' : 'Cambiar a Español');
    }
  }

  function toggle() {
    lang = (lang === 'es') ? 'en' : 'es';
    try { localStorage.setItem(KEY, lang); } catch (e) {}
    apply();
  }

  function injectButton() {
    var bar = document.querySelector('header.site .bar');
    if (!bar || document.getElementById('langToggleBtn')) return;
    var b = document.createElement('button');
    b.id = 'langToggleBtn';
    b.type = 'button';
    b.className = 'langtoggle';
    b.onclick = toggle;
    b.style.cssText = 'margin-left:8px;background:var(--surface,#f4f6f8);border:1px solid var(--edge,#e3e8ee);' +
      'color:var(--ink,#1a1d21);border-radius:10px;padding:9px 12px;font-weight:700;font-size:13px;' +
      'cursor:pointer;white-space:nowrap;font-family:inherit;min-height:40px;';
    var ref = bar.querySelector('.navtoggle') || bar.querySelector('.head-call');
    if (ref) bar.insertBefore(b, ref); else bar.appendChild(b);
  }

  function init() { injectButton(); apply(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
