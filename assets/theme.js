/* RECOVTEC Theme JS */
(function () {
  'use strict';

  // ===== Cart (Shopify AJAX API) =====
  const Cart = {
    async get() {
      const r = await fetch('/cart.js');
      return r.json();
    },
    async add(id, qty) {
      const r = await fetch('/cart/add.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, quantity: qty })
      });
      return r.json();
    },
    async change(line, qty) {
      const r = await fetch('/cart/change.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ line, quantity: qty })
      });
      return r.json();
    },
    async remove(line) { return Cart.change(line, 0); }
  };

  // ===== Toast =====
  let toastTimer;
  function showToast(msg) {
    const el = document.getElementById('toast');
    if (!el) return;
    el.querySelector('.toast-msg').textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
  }

  // ===== Cart Drawer =====
  function formatMoney(cents) {
    return (cents / 100).toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + ' €';
  }

  function renderCartLine(item, index) {
    const img = item.image
      ? `<img src="${item.image}" alt="${item.title}" loading="lazy">`
      : `<div class="placeholder"></div>`;
    return `
      <div class="cart-line">
        <div class="img">${img}</div>
        <div class="info">
          <div class="name">${item.product_title}</div>
          <div class="opt">${item.variant_title && item.variant_title !== 'Default Title' ? item.variant_title : ''}</div>
          <div class="qty-row">
            <button data-line="${index + 1}" data-qty="${item.quantity - 1}" aria-label="weniger">−</button>
            <span class="v">${item.quantity}</span>
            <button data-line="${index + 1}" data-qty="${item.quantity + 1}" aria-label="mehr">+</button>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px">
          <div class="price">${formatMoney(item.line_price)}</div>
          <button class="remove" data-line="${index + 1}" data-qty="0">Entfernen</button>
        </div>
      </div>`;
  }

  async function refreshDrawer() {
    const cart = await Cart.get();
    const body = document.querySelector('.drawer-body');
    const foot = document.querySelector('.drawer-foot');
    const countEl = document.querySelector('.cart-count');

    const totalQty = cart.item_count;
    if (countEl) {
      countEl.textContent = totalQty;
      countEl.style.display = totalQty > 0 ? 'flex' : 'none';
    }
    const titleEl = document.querySelector('.drawer-head .title');
    if (titleEl) titleEl.textContent = `Warenkorb · ${totalQty}`;

    if (!body) return;

    if (cart.items.length === 0) {
      body.innerHTML = `
        <div class="cart-empty">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 5h2.5l2.2 11.5a1.5 1.5 0 0 0 1.5 1.2h8a1.5 1.5 0 0 0 1.5-1.2L20.5 8H6.5"/><circle cx="9" cy="20.5" r="1.2"/><circle cx="18" cy="20.5" r="1.2"/></svg>
          <div>
            <div class="h-4" style="margin-bottom:4px">Noch leer</div>
            <div style="font-size:13px">Füge die Recovery Boots hinzu — und du bist startklar.</div>
          </div>
        </div>`;
      if (foot) foot.style.display = 'none';
    } else {
      body.innerHTML = cart.items.map((item, i) => renderCartLine(item, i)).join('');
      if (foot) {
        foot.style.display = 'flex';
        const subVal = foot.querySelector('.val');
        if (subVal) subVal.textContent = formatMoney(cart.total_price);
      }
      body.querySelectorAll('button[data-line]').forEach(btn => {
        btn.addEventListener('click', async () => {
          const line = parseInt(btn.dataset.line);
          const qty = parseInt(btn.dataset.qty);
          await Cart.change(line, qty);
          await refreshDrawer();
        });
      });
    }
  }

  function openDrawer() {
    document.querySelector('.drawer-overlay')?.classList.add('open');
    document.querySelector('.drawer')?.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function closeDrawer() {
    document.querySelector('.drawer-overlay')?.classList.remove('open');
    document.querySelector('.drawer')?.classList.remove('open');
    document.body.style.overflow = '';
  }

  // ===== Add to Cart =====
  async function addToCart(variantId, qty) {
    if (!variantId) return;
    try {
      await Cart.add(variantId, qty || 1);
      await refreshDrawer();
      showToast('Zum Warenkorb hinzugefügt');
      setTimeout(openDrawer, 400);
    } catch (e) {
      console.error('Add to cart failed', e);
    }
  }

  // ===== ATC Form (PDP) =====
  function initATCForm() {
    const form = document.getElementById('pdp-atc-form');
    if (!form) return;
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = form.querySelector('[name="id"]')?.value;
      await addToCart(id, 1);
    });
  }

  // ===== Size Selector =====
  function initSizeSelector() {
    const opts = document.querySelectorAll('.size-opt');
    if (!opts.length) return;
    opts.forEach(btn => {
      btn.addEventListener('click', () => {
        opts.forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        const variantId = btn.dataset.variantId;
        if (variantId) {
          const hidden = document.querySelector('#pdp-atc-form [name="id"]');
          if (hidden) hidden.value = variantId;
        }
      });
    });
  }

  // ===== Gallery =====
  function initGallery() {
    const thumbs = document.querySelectorAll('.gallery-thumb');
    const slides = document.querySelectorAll('.gallery-slide');
    if (!thumbs.length || !slides.length) return;
    thumbs.forEach(thumb => {
      thumb.addEventListener('click', () => {
        thumbs.forEach(t => t.classList.remove('active'));
        thumb.classList.add('active');
        const id = thumb.dataset.mediaId;
        slides.forEach(slide => {
          const isActive = slide.dataset.mediaId === id;
          slide.classList.toggle('active', isActive);
          slide.hidden = !isActive;
          // Videos auf ausgeblendeten Slides anhalten
          if (!isActive) {
            slide.querySelectorAll('video').forEach(v => v.pause());
            slide.querySelectorAll('iframe').forEach(f => { const src = f.src; f.src = src; });
          }
        });
      });
    });
  }

  // ===== FAQ Accordion =====
  function initAccordion() {
    document.querySelectorAll('.acc-item').forEach(item => {
      const trigger = item.querySelector('.acc-trigger');
      if (!trigger) return;
      trigger.addEventListener('click', () => {
        const isOpen = item.classList.contains('open');
        // Close all in this accordion
        const acc = item.closest('.acc');
        if (acc) acc.querySelectorAll('.acc-item.open').forEach(i => i.classList.remove('open'));
        if (!isOpen) item.classList.add('open');
      });
    });
  }

  // ===== Side Modals (Größentabelle, Ratenzahlung) =====
  function initSideModal(modalId, overlayId, triggerSelector) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    const overlay = document.getElementById(overlayId);
    const closeBtn = modal.querySelector('.sg-close');

    function open() {
      overlay?.classList.add('open');
      modal.classList.add('open');
    }
    function close() {
      overlay?.classList.remove('open');
      modal.classList.remove('open');
    }

    document.querySelectorAll(triggerSelector).forEach(btn => {
      btn.addEventListener('click', open);
    });
    closeBtn?.addEventListener('click', close);
    overlay?.addEventListener('click', close);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
  }

  function initSizeGuide() {
    initSideModal('size-guide-modal', 'sg-overlay', '.size-guide-trigger, .size-guide-link');
  }

  function initPaymentInfo() {
    initSideModal('payment-info-modal', 'pay-overlay', '.pay-info-trigger');
  }

  // ===== Newsletter =====
  function initNewsletter() {
    document.querySelectorAll('.final-nl-form').forEach(form => {
      const wrap = form.closest('[data-newsletter]') || form.parentElement;
      const input = form.querySelector('input[type="email"]');
      const button = form.querySelector('button[type="submit"]');
      const msg = wrap ? wrap.querySelector('.final-nl-msg') : null;
      const fine = wrap ? wrap.querySelector('.nl-fine') : null;
      const sink = wrap ? wrap.querySelector('.final-nl-sink') : null;

      function show(type, fallback) {
        if (!msg) return;
        msg.textContent = (type === 'success' ? msg.dataset.success : msg.dataset.error) || fallback;
        msg.classList.toggle('is-success', type === 'success');
        msg.classList.toggle('is-error', type === 'error');
        msg.hidden = false;
      }
      function succeed() {
        if (input) input.value = '';
        form.hidden = true;
        if (fine) fine.hidden = true;
        form.classList.remove('is-loading');
        show('success', 'Danke! Wir haben dir eine Bestätigungs-E-Mail geschickt — bitte bestätige deine Anmeldung.');
      }

      // Bevorzugt: nativer Submit in ein verstecktes iframe.
      // -> Kein Reload (Antwort landet im iframe) und kein CORS-Problem.
      if (sink && form.getAttribute('target')) {
        let submitting = false;
        sink.addEventListener('load', () => {
          if (!submitting) return; // initiales Laden des leeren iframe ignorieren
          submitting = false;
          succeed();
        });
        form.addEventListener('submit', () => {
          // Native Validierung blockt ungültige/leere E-Mails bereits vor diesem Event.
          submitting = true;
          if (button) button.disabled = true;
          form.classList.add('is-loading');
          // Sicherheitsnetz, falls das load-Event ausbleibt:
          setTimeout(() => { if (submitting) { submitting = false; succeed(); } }, 4000);
          // KEIN preventDefault -> Submit geht nativ ins iframe
        });
        return;
      }

      // Fallback (kein iframe im HTML): AJAX, Redirect als Erfolg werten.
      form.addEventListener('submit', async e => {
        e.preventDefault();
        if (input && !input.checkValidity()) { input.reportValidity(); return; }
        if (button) button.disabled = true;
        form.classList.add('is-loading');
        try {
          const action = (form.getAttribute('action') || '/contact').split('#')[0];
          const res = await fetch(action, {
            method: 'POST',
            headers: { 'Accept': 'application/json' },
            body: new FormData(form),
            redirect: 'manual'
          });
          const ok = res.type === 'opaqueredirect' || res.status === 0 || res.ok;
          if (!ok) throw new Error('Newsletter request failed: ' + res.status);
          succeed();
        } catch (err) {
          console.error('Newsletter signup failed', err);
          if (button) button.disabled = false;
          form.classList.remove('is-loading');
          show('error', 'Hoppla, das hat nicht geklappt. Bitte versuche es gleich noch einmal.');
        }
      });
    });
  }

  // ===== Anchor Nav =====
  function initAnchorNav() {
    const NAV_HEIGHT = 72;
    document.querySelectorAll('a[href]').forEach(link => {
      const href = link.getAttribute('href') || '';
      const hash = href.includes('#') ? '#' + href.split('#')[1] : null;
      if (!hash) return;
      link.addEventListener('click', e => {
        const target = document.querySelector(hash);
        if (!target) return;
        e.preventDefault();
        const top = target.getBoundingClientRect().top + window.scrollY - NAV_HEIGHT;
        window.scrollTo({ top, behavior: 'smooth' });
        history.pushState(null, '', hash);
      });
    });
  }

  // ===== Gewaehrleistungslabel: Originalgroesse anzeigen =====
  function initGuaranteeLabel() {
    let box = null;

    function close() {
      box?.classList.remove('open');
      document.body.classList.remove('lgl-noscroll');
    }

    function open(src, alt) {
      if (!box) {
        box = document.createElement('div');
        box.className = 'lgl-lightbox';
        box.innerHTML =
          '<button type="button" class="lgl-lightbox-close" aria-label="Schliessen">&times;</button>' +
          '<img alt="">';
        box.addEventListener('click', e => {
          if (e.target.tagName !== 'IMG') close();
        });
        document.body.appendChild(box);
      }
      const img = box.querySelector('img');
      img.src = src;
      img.alt = alt || '';
      box.classList.add('open');
      document.body.classList.add('lgl-noscroll');
    }

    document.addEventListener('click', e => {
      const trigger = e.target.closest('[data-lgl-zoom]');
      if (!trigger) return;
      open(trigger.dataset.lglZoom, trigger.dataset.lglAlt);
    });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') close();
    });
  }

  // ===== Judge.me: Datum und Gesamtzahl der Bewertungen ausblenden =====
  // Die Regeln in theme.css decken die bekannten Judge.me-Klassen ab. Benennt
  // Judge.me sie in einer neuen Widget-Generation um, greift dieser Fallback:
  // Er sucht im Widget Elemente, deren gesamter Text nur aus einem Datum
  // besteht, und markiert sie für die CSS-Regel [data-jm-date-hidden].
  const JM_MONTHS = 'Januar|Februar|Maerz|März|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember'
                  + '|Jan|Feb|Mrz|Mar|Apr|Jun|Jul|Aug|Sep|Okt|Oct|Nov|Dez|Dec';
  const JM_UNITS_DE = 'Sekunde|Minute|Stunde|Tag|Woche|Monat|Jahr';
  const JM_UNITS_EN = 'second|minute|hour|day|week|month|year';
  const JM_DATE_RE = new RegExp(
    '^(?:'
    + '\\d{1,2}[./-]\\d{1,2}[./-]\\d{2,4}'                                  // 26/09/2026, 26.09.2026
    + '|\\d{4}-\\d{1,2}-\\d{1,2}'                                            // 2026-09-26
    + '|\\d{1,2}\\.?\\s*(?:' + JM_MONTHS + ')\\.?\\s*\\d{2,4}'               // 26. September 2026
    + '|(?:' + JM_MONTHS + ')\\.?\\s*\\d{1,2},?\\s*\\d{2,4}'                 // September 26, 2026
    + '|vor\\s+(?:\\d+|einem|einer)\\s+(?:' + JM_UNITS_DE + ')\\w*'          // vor 2 Tagen
    + '|(?:\\d+|an?)\\s+(?:' + JM_UNITS_EN + ')s?\\s+ago'                    // 2 days ago
    + ')$', 'i');

  // Gesamtzahl der Bewertungen, z. B. "Basierend auf 47 Bewertungen", "47 reviews", "(47)"
  const JM_COUNT_RE = new RegExp(
    '^(?:'
    + '(?:basierend\\s+auf\\s+)?\\d+\\s*(?:Bewertung|Bewertungen|Rezension|Rezensionen)'
    + '|(?:based\\s+on\\s+)?\\d+\\s*(?:review|reviews|rating|ratings)'
    + '|\\(\\s*\\d+\\s*\\)'
    + ')$', 'i');

  function markByText(root, rules) {
    root.querySelectorAll('*').forEach(el => {
      if (el.children.length) return;                    // nur Blattelemente
      const text = (el.textContent || '').trim();
      if (!text || text.length > 40) return;             // Bewertungstext ausschließen
      rules.forEach(rule => {
        if (el.hasAttribute(rule.attr)) return;
        if (rule.re.test(text)) el.setAttribute(rule.attr, '');
      });
    });
  }

  // Durchschnittsbewertung: Judge.me gibt nur die Zahl aus ("5.0"). Die Sterne
  // daneben zeichnet das Theme selbst — gleiches SVG wie in Social Proof, damit
  // es zum Shop passt. Anteilige Füllung über eine geclippte Overlay-Reihe.
  const JM_STAR_PATH = 'M8 1l2.1 4.6 5 .6-3.7 3.4 1 5-4.4-2.6L3.6 14.6l1-5L.9 6.2l5-.6L8 1z';
  const JM_AVG_RE = /^([0-5][.,]\d)$/;   // Dezimalstelle verlangt, sonst kollidiert es
                                         // mit den Zeilenlabels 5/4/3/2/1 im Histogramm

  function buildStarRow(value) {
    const svg = '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="' + JM_STAR_PATH + '"/></svg>';
    const row = document.createElement('span');
    row.className = 'jm-avg-stars';
    row.setAttribute('role', 'img');
    row.setAttribute('aria-label', value.toString().replace('.', ',') + ' von 5 Sternen');
    row.innerHTML =
      '<span class="jm-avg-bg">' + svg.repeat(5) + '</span>' +
      '<span class="jm-avg-fg" style="width:' + (value / 5 * 100) + '%">' + svg.repeat(5) + '</span>';
    return row;
  }

  function injectAverageStars(root) {
    if (root.querySelector('.jm-avg-stars')) return;      // nur einmal
    const nodes = root.querySelectorAll('*');
    for (const el of nodes) {
      if (el.children.length) continue;
      const match = (el.textContent || '').trim().match(JM_AVG_RE);
      if (!match) continue;
      // nicht innerhalb einer einzelnen Bewertung oder des Histogramms
      if (el.closest('.jdgm-rev, [class*="review-item"], [class*="rev__body"], [class*="histogram"]')) continue;
      const value = parseFloat(match[1].replace(',', '.'));
      if (!(value >= 0 && value <= 5)) continue;
      el.insertAdjacentElement('beforebegin', buildStarRow(value));
      if (el.parentElement) el.parentElement.classList.add('jm-avg');
      return;
    }
  }

  // Judge.me zeigt oberhalb der Liste eine Galerie mit allen Bewertungsbildern.
  // Dasselbe Foto steht dadurch zweimal auf der Seite. Statt nach dem
  // Klassennamen der Galerie zu raten, wird sie über die Struktur bestimmt:
  // Bilder, die VOR der ersten Bewertung stehen, gehören zur Galerie.
  // Achtung: nicht [class*="jm-review"] verwenden — das trifft auch den eigenen
  // Wrapper .jm-reviews-widget, der das ganze Widget umschließt. Dann gilt jedes
  // Bild als "innerhalb einer Bewertung" und die Galerie bleibt stehen.
  const JM_REVIEW_SEL = '.jdgm-rev, [class*="review-item"], [class*="jm-review-item"]';

  function hideMediaGallery(root) {
    const firstReview = root.querySelector(JM_REVIEW_SEL);
    if (!firstReview) return;                       // Struktur unklar -> nichts anfassen

    root.querySelectorAll('img').forEach(img => {
      if (firstReview.contains(img)) return;
      if (img.closest(JM_REVIEW_SEL)) return;       // gehört zu einer Bewertung
      const pos = firstReview.compareDocumentPosition(img);
      if (!(pos & Node.DOCUMENT_POSITION_PRECEDING)) return;

      // Nach oben bis zum äußersten Container, der ausser Medien keinen Text
      // enthält — sonst bliebe eine leere Box stehen.
      let node = img;
      while (node.parentElement
             && node.parentElement !== root
             && !node.parentElement.classList.contains('jm-reviews-widget')
             && (node.parentElement.textContent || '').trim() === '') {
        node = node.parentElement;
      }
      node.setAttribute('data-jm-media-hidden', '');
    });
  }

  function initJudgemeWidget() {
    // Die Section kann mehrfach vorkommen (Produktseite und Startseite).
    document.querySelectorAll('.jm-reviews').forEach(setupJudgemeRoot);
  }

  function setupJudgemeRoot(root) {
    const rules = [];
    if (root.classList.contains('jm-reviews--no-date')) {
      rules.push({ re: JM_DATE_RE, attr: 'data-jm-date-hidden' });
    }
    if (root.classList.contains('jm-reviews--no-count')) {
      rules.push({ re: JM_COUNT_RE, attr: 'data-jm-count-hidden' });
    }
    const showAvgStars = root.classList.contains('jm-reviews--avg-stars');
    const hideGallery = root.classList.contains('jm-reviews--no-media-gallery');
    if (!rules.length && !showAvgStars && !hideGallery) return;

    const run = () => {
      if (rules.length) markByText(root, rules);
      if (showAvgStars) injectAverageStars(root);
      if (hideGallery) hideMediaGallery(root);
    };

    run();
    // Judge.me rendert asynchron und baut bei Seitenwechseln neu auf.
    let pending = false;
    const observer = new MutationObserver(() => {
      if (pending) return;
      pending = true;
      requestAnimationFrame(() => { pending = false; run(); });
    });
    observer.observe(root, { childList: true, subtree: true });
  }

  // ===== Kostenrechner (sections/value-calculator.liquid) =====
  function initValueCalc() {
    const eur = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
    const eurCents = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 });

    document.querySelectorAll('[data-calc]').forEach(root => {
      const price = Number(root.dataset.price) / 100;
      const studio = Number(root.dataset.studio) / 100;
      const travel = Number(root.dataset.travel) || 0;
      const range = root.querySelector('[data-calc-range]');
      if (!range || !price || !studio) return;

      const set = (sel, val) => root.querySelectorAll(sel).forEach(el => { el.textContent = val; });

      function update() {
        const n = Number(range.value) || 1;
        const perYear = n * 52;
        const studioYear = studio * perYear;
        const breakEven = Math.ceil(price / studio);
        const weeks = Math.ceil(breakEven / n);
        const max = Math.max(studioYear, price);

        range.style.setProperty('--p', ((n - 1) / 6 * 100) + '%');
        set('[data-calc-n]', n + '×');
        set('[data-calc-breakeven]', breakEven);
        set('[data-calc-weeks]', weeks);
        set('[data-calc-studio-year]', eur.format(studioYear));
        set('[data-calc-per-session]', eurCents.format(price / perYear));
        set('[data-calc-hours]', Math.floor(travel * perYear / 60));
        const barStudio = root.querySelector('[data-calc-bar-studio]');
        const barOurs = root.querySelector('[data-calc-bar-ours]');
        if (barStudio) barStudio.style.width = (studioYear / max * 100) + '%';
        if (barOurs) barOurs.style.width = (price / max * 100) + '%';
      }

      range.addEventListener('input', update);
      update();
    });
  }

  // ===== Sticky-Kaufleiste (sections/sticky-buy.liquid) =====
  // Sichtbar, sobald der Haupt-Kaufbutton (PDP) bzw. der Hero (andere Seiten) oben
  // aus dem Bild ist — aber nicht, solange Final-CTA oder Footer im Bild sind.
  function initStickyBuy() {
    const bar = document.querySelector('[data-sticky-buy]');
    if (!bar || !('IntersectionObserver' in window)) return;

    const isPdp = bar.dataset.mode === 'pdp';
    const form = document.getElementById('pdp-atc-form');
    const trigger = isPdp ? form : document.querySelector('.hero');
    if (!trigger) return;

    let pastTrigger = false;
    const blockers = new Set();

    function render() {
      const show = pastTrigger && blockers.size === 0;
      bar.classList.toggle('is-visible', show);
      bar.setAttribute('aria-hidden', show ? 'false' : 'true');
      bar.querySelectorAll('a, button').forEach(el => { el.tabIndex = show ? 0 : -1; });
    }

    new IntersectionObserver(([entry]) => {
      // Nur "vorbei", wenn das Element nach oben hinausgescrollt ist
      pastTrigger = !entry.isIntersecting && entry.boundingClientRect.top < 0;
      render();
    }).observe(trigger);

    const blockObserver = new IntersectionObserver(entries => {
      entries.forEach(e => { e.isIntersecting ? blockers.add(e.target) : blockers.delete(e.target); });
      render();
    });
    document.querySelectorAll('.final-cta, .footer').forEach(el => blockObserver.observe(el));

    if (isPdp && form) {
      bar.querySelector('[data-sticky-buy-submit]')?.addEventListener('click', () => {
        if (typeof form.requestSubmit === 'function') form.requestSubmit();
        else form.querySelector('[type="submit"]')?.click();
      });
    }
  }

  // ===== Modus-Vorschau (sections/how-it-works.liquid) =====
  // Spielt pro Modus ein eigenes Druckmuster auf den 4 Kammern ab. Ein Frame = Zustand
  // der Kammern [Fuß, Wade, Knie, Oberschenkel]. Wechselt automatisch weiter, bis jemand
  // selbst einen Modus wählt; läuft nur, solange die Grafik im Bild ist.
  function initModeDemo() {
    const P = {
      wave:       [[1,0,0,0],[1,1,0,0],[0,1,1,0],[0,0,1,1],[0,0,0,1],[0,0,0,0]],
      double:     [[1,0,0,0],[0,1,0,0],[1,0,1,0],[0,1,0,1],[0,0,1,0],[0,0,0,1],[0,0,0,0]],
      sequential: [[1,0,0,0],[1,1,0,0],[1,1,1,0],[1,1,1,1],[1,1,1,1],[0,0,0,0]],
      all:        [[1,1,1,1],[1,1,1,1],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
    };
    P.combo = P.sequential.concat(P.double);
    const STEP = 650;
    const CYCLES_PER_MODE = 2;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    document.querySelectorAll('[data-mode-demo]').forEach(fig => {
      const tabs = Array.from(fig.querySelectorAll('[data-mode-tab]'));
      const air = [1, 2, 3, 4].map(i => fig.querySelector('.hiw-air-' + i));
      if (!tabs.length || air.some(a => !a)) return;

      const panel = fig.querySelector('.hiw-mode-panel');
      const titleEl = fig.querySelector('[data-mode-title]');
      const nameEl = fig.querySelector('[data-mode-name]');
      const textEl = fig.querySelector('[data-mode-text]');
      let current = 0, frame = 0, cycles = 0, auto = true, visible = false, timer = null;

      fig.classList.add('is-scripted');
      panel?.setAttribute('aria-live', 'off');

      const pattern = () => P[fig.dataset.pattern] || P.wave;
      const paint = levels => air.forEach((el, i) => el.classList.toggle('is-on', !!levels[i]));

      function select(i, byUser) {
        current = i; frame = 0; cycles = 0;
        const t = tabs[i];
        tabs.forEach((b, j) => {
          b.classList.toggle('is-active', j === i);
          b.setAttribute('aria-pressed', j === i ? 'true' : 'false');
        });
        fig.dataset.pattern = t.dataset.pattern;
        if (titleEl) titleEl.textContent = t.dataset.title || '';
        if (nameEl) nameEl.textContent = t.dataset.name || '';
        if (textEl) textEl.textContent = t.dataset.text || '';
        if (byUser) { auto = false; panel?.setAttribute('aria-live', 'polite'); }
        if (reduce) {
          // Ohne Bewegung: den „vollsten" Frame des Musters zeigen
          paint(pattern().reduce((a, b) => (b.reduce((x, y) => x + y) > a.reduce((x, y) => x + y) ? b : a)));
        }
      }

      function tick() {
        const pat = pattern();
        paint(pat[frame]);
        frame += 1;
        if (frame >= pat.length) {
          frame = 0; cycles += 1;
          if (auto && cycles >= CYCLES_PER_MODE) select((current + 1) % tabs.length, false);
        }
      }
      function start() { if (!timer && !reduce) timer = setInterval(tick, STEP); }
      function stop() { clearInterval(timer); timer = null; }

      tabs.forEach((b, i) => b.addEventListener('click', () => {
        select(i, true);
        stop();
        if (!reduce) tick();
        if (visible) start();
      }));

      if ('IntersectionObserver' in window) {
        new IntersectionObserver(([e]) => { visible = e.isIntersecting; visible ? start() : stop(); }).observe(fig);
      } else {
        visible = true; start();
      }
      select(0, false);
    });
  }

  // ===== Init =====
  document.addEventListener('DOMContentLoaded', () => {
    // Cart triggers
    document.querySelector('[data-cart-open]')?.addEventListener('click', () => {
      refreshDrawer().then(openDrawer);
    });
    document.querySelector('.drawer-close')?.addEventListener('click', closeDrawer);
    document.querySelector('.drawer-overlay')?.addEventListener('click', closeDrawer);

    // Checkout button
    document.querySelector('.drawer-foot .btn-primary')?.addEventListener('click', () => {
      window.location.href = '/checkout';
    });

    refreshDrawer();
    initJudgemeWidget();
    initAnchorNav();
    initATCForm();
    initSizeSelector();
    initGallery();
    initAccordion();
    initSizeGuide();
    initPaymentInfo();
    initNewsletter();
    initGuaranteeLabel();
    initValueCalc();
    initStickyBuy();
    initModeDemo();
  });
})();
