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
      // Hängt die Anfrage (z. B. durch ein App-Skript), nach 8 s abbrechen
      const ctrl = 'AbortController' in window ? new AbortController() : null;
      const timer = ctrl && setTimeout(() => ctrl.abort(), 8000);
      let r;
      try {
        r = await fetch('/cart/add.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({ id, quantity: qty }),
          signal: ctrl?.signal
        });
      } finally {
        clearTimeout(timer);
      }
      const data = await r.json().catch(() => ({}));
      // Shopify antwortet bei Ablehnung (z. B. ausverkauft) mit 4xx + description
      if (!r.ok) {
        const err = new Error(data.description || data.message || 'Artikel konnte nicht hinzugefügt werden.');
        err.status = r.status;
        throw err;
      }
      return data;
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
  // fallbackForm: bei technischem Fehler (kein Shopify-Nein) das Formular klassisch
  // an /cart/add senden — dann landet der Artikel trotzdem im Warenkorb.
  async function addToCart(variantId, qty, fallbackForm) {
    if (!variantId) {
      showToast('Bitte wähle zuerst eine Größe.');
      return false;
    }
    try {
      await Cart.add(variantId, qty || 1);
    } catch (e) {
      console.error('Add to cart failed', e);
      if (!e.status && fallbackForm) {
        HTMLFormElement.prototype.submit.call(fallbackForm);
        return false;
      }
      showToast(e.message);
      return false;
    }
    showToast('Zum Warenkorb hinzugefügt');
    // Drawer-Aktualisierung darf einen erfolgreichen Kauf nicht als Fehler melden
    refreshDrawer().catch(e => console.error('Cart refresh failed', e)).finally(() => setTimeout(openDrawer, 400));
    return true;
  }

  // ===== ATC Form (PDP) =====
  // Das Formular postet ohne JS nativ an /cart/add (Fallback). Mit JS: AJAX + Drawer.
  function initATCForm() {
    const form = document.getElementById('pdp-atc-form');
    if (!form) return;
    const button = form.querySelector('[type="submit"]');
    let busy = false;
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (busy) return;
      busy = true;
      button?.setAttribute('aria-busy', 'true');
      try {
        await addToCart(form.querySelector('[name="id"]')?.value, 1, form);
      } finally {
        busy = false;
        button?.removeAttribute('aria-busy');
      }
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
  // Menü-Links auf Abschnitte, die es nicht mehr gibt (ausgeblendet/umbenannt),
  // landen beim inhaltlich passenden Abschnitt statt ins Leere zu laufen.
  const ANCHOR_ALIASES = {
    '#howto': ['#so-wirkts'],
    '#solution': ['#story-paket', '#so-wirkts'],
    '#problem': ['#wirkung'],
    '#fuer-wen': ['#wirkung'],
    '#social': ['#reviews'],
    '#momente': ['#reviews'],
  };
  function findAnchorTarget(hash) {
    if (!hash || hash === '#') return null;
    let target = null;
    try { target = document.querySelector(hash); } catch (e) { return null; }
    if (target) return target;
    for (const alt of ANCHOR_ALIASES[hash] || []) {
      target = document.querySelector(alt);
      if (target) return target;
    }
    return null;
  }

  function initAnchorNav() {
    const NAV_HEIGHT = 72;
    // Seite mit Anker geöffnet (z. B. /#howto vom Menü einer anderen Seite)
    if (location.hash) {
      let direct = null;
      try { direct = document.querySelector(location.hash); } catch (e) { /* ungültiger Anker */ }
      const t = direct ? null : findAnchorTarget(location.hash);
      if (t) window.addEventListener('load', () => {
        window.scrollTo({ top: t.getBoundingClientRect().top + window.scrollY - NAV_HEIGHT });
      });
    }
    document.querySelectorAll('a[href]').forEach(link => {
      const href = link.getAttribute('href') || '';
      const hash = href.includes('#') ? '#' + href.split('#')[1] : null;
      if (!hash) return;
      link.addEventListener('click', e => {
        const target = findAnchorTarget(hash);
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

  // Leere Flächen im Judge.me-Widget (z. B. Reste von ausgeblendeter Galerie oder
  // Filterleisten) vor der ersten Bewertung einklappen — sie kosten mobil viel Höhe.
  // Nur Blöcke ohne Text und ohne sichtbare Medien/Bedienelemente werden markiert.
  const JM_KEEP_SEL = 'img, svg, video, iframe, canvas, input, button, select, textarea, a, [class*="star"], [class*="icon"]';
  // Text eines Elements ohne die Beschriftung von Buttons (z. B. Karussell-Pfeile „›“)
  function contentText(el) {
    let text = '';
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (node.parentElement && node.parentElement.closest('button, [role="button"]')) continue;
      text += node.nodeValue;
    }
    return text.trim();
  }
  function collapseEmptyBlocks(root) {
    const firstReview = root.querySelector(JM_REVIEW_SEL);
    if (!firstReview) return;
    const visible = el => el.getClientRects().length > 0 && !el.closest('[data-jm-media-hidden]');
    // Karussell-Pfeile der ausgeblendeten Galerie, falls sie außerhalb ihres Containers sitzen
    if (root.querySelector('[data-jm-media-hidden]')) {
      root.querySelectorAll('.jm-reviews-widget button, .jm-reviews-widget [role="button"]').forEach(btn => {
        if (!(firstReview.compareDocumentPosition(btn) & Node.DOCUMENT_POSITION_PRECEDING)) return;
        const label = ((btn.getAttribute('aria-label') || '') + ' ' + (btn.className || '')).toLowerCase();
        const text = (btn.textContent || '').trim();
        if (/^[›‹<>❯❮→←]?$/.test(text) && /(next|prev|arrow|scroll|carousel|weiter|zurück|nächst|vorig)/.test(label)) {
          btn.setAttribute('data-jm-empty', '');
        } else if (/^[›‹❯❮→←]$/.test(text)) {
          btn.setAttribute('data-jm-empty', '');
        }
      });
    }
    root.querySelectorAll('.jm-reviews-widget *').forEach(el => {
      if (!(el instanceof HTMLElement) || el.closest('svg')) return;   // SVG-Teile (Sterne) nie anfassen
      if (el.hasAttribute('data-jm-empty') || el.contains(firstReview)) return;
      if (!(firstReview.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_PRECEDING)) return;
      if (contentText(el) !== '') return;
      // Rest der ausgeblendeten Bild-Galerie: Container ohne Text, der ausgeblendete
      // Bilder enthält — übrig bleiben dort nur die Pfeil-Buttons des Karussells.
      if (el.querySelector('[data-jm-media-hidden]') && !el.closest('[data-jm-empty]')) {
        el.setAttribute('data-jm-empty', '');
        return;
      }
      if (el.offsetHeight < 32) return;
      if (el.matches(JM_KEEP_SEL)) return;
      if (Array.from(el.querySelectorAll(JM_KEEP_SEL)).some(visible)) return;
      el.setAttribute('data-jm-empty', '');
    });
  }

  // Mobil: Judge.me bringt eigene, sehr großzügige Abstände mit (Margins, Paddings,
  // Gaps, Mindesthöhen) — je nach Widget-Version mit anderen Klassen. Statt Klassen
  // zu raten, werden alle vertikalen Abstände im Widget auf ein Maximum gedeckelt.
  const JM_MAX_SPACE = 12;
  const JM_MOBILE = window.matchMedia('(max-width: 600px)');
  function compactJudgeme(root) {
    if (!JM_MOBILE.matches) return;
    root.querySelectorAll('.jm-reviews-widget *').forEach(el => {
      if (!(el instanceof HTMLElement) || el.closest('svg')) return;
      const cs = getComputedStyle(el);
      ['margin-top', 'margin-bottom', 'padding-top', 'padding-bottom', 'row-gap'].forEach(prop => {
        const v = parseFloat(cs.getPropertyValue(prop));
        if (v > JM_MAX_SPACE) el.style.setProperty(prop, JM_MAX_SPACE + 'px', 'important');
      });
      if (!el.matches('img, video, iframe, picture') && parseFloat(cs.minHeight) > 48) {
        el.style.setProperty('min-height', '0', 'important');
      }
    });
  }

  // Sichtbarer Text eines Elements — ohne Button-Beschriftungen und ohne
  // Screenreader-Texte (1-px-Elemente, unsichtbare Elemente).
  function visibleText(el) {
    let text = '';
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      const parent = node.parentElement;
      if (!parent || !node.nodeValue.trim()) continue;
      if (parent.closest('button, [role="button"], [data-jm-empty], [data-jm-media-hidden]')) continue;
      const r = parent.getBoundingClientRect();
      if (r.width <= 2 || r.height <= 2) continue;
      const cs = getComputedStyle(parent);
      if (cs.visibility === 'hidden' || cs.opacity === '0') continue;
      text += node.nodeValue;
    }
    return text.trim();
  }
  const JM_FORM_SEL = 'input, select, textarea, label, [role="radio"], [role="checkbox"], [role="listbox"], [role="option"]';

  // Mobil: Zwischen der Zeile „Bewertung schreiben“ und der ersten Bewertung steht
  // bei Judge.me viel Leerraum — verschachtelte Abstände und unsichtbare Reste der
  // Bild-Galerie. Hier wird der Weg zwischen beiden Elementen gezielt geleert.
  function tightenFirstReviewGap(root) {
    if (!JM_MOBILE.matches) return;
    const firstReview = root.querySelector(JM_REVIEW_SEL);
    if (!firstReview) return;
    const precedes = el => firstReview.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_PRECEDING;
    const controls = Array.from(root.querySelectorAll('.jm-reviews-widget button, .jm-reviews-widget a, .jm-reviews-widget [role="button"]'))
      .filter(el => precedes(el) && !el.closest('[data-jm-empty], [data-jm-media-hidden]') && el.getClientRects().length);
    const writeBtn = controls.find(el => /bewertung schreiben|write a review/i.test(el.textContent || '')) || controls[controls.length - 1];
    if (!writeBtn) return;
    let common = writeBtn.parentElement;
    while (common && !common.contains(firstReview)) common = common.parentElement;
    if (!common) return;
    const set = (el, prop, val) => el.style.setProperty(prop, val, 'important');

    // Weg von der Bewertung nach oben: Abstände oben weg, leere Geschwister davor ausblenden
    for (let node = firstReview; node && node !== common; node = node.parentElement) {
      if (node !== firstReview) { set(node, 'margin-top', '0px'); set(node, 'padding-top', '0px'); }
      else set(node, 'margin-top', '0px');
      for (let sib = node.previousElementSibling; sib; sib = sib.previousElementSibling) {
        if (sib.contains(writeBtn) || !sib.getClientRects().length) continue;
        if (sib.querySelector(JM_FORM_SEL) || sib.matches(JM_FORM_SEL)) continue;
        if (visibleText(sib) === '') sib.setAttribute('data-jm-empty', '');
      }
    }
    // Weg vom Button nach oben: Abstände unten weg
    for (let node = writeBtn.parentElement; node && node !== common; node = node.parentElement) {
      set(node, 'margin-bottom', '0px'); set(node, 'padding-bottom', '0px');
    }
    // Zwischen Button-Zeile und Bewertung liegende Geschwister im gemeinsamen Container
    let rowChild = writeBtn; while (rowChild.parentElement !== common) rowChild = rowChild.parentElement;
    let reviewChild = firstReview; while (reviewChild.parentElement !== common) reviewChild = reviewChild.parentElement;
    for (let sib = rowChild.nextElementSibling; sib && sib !== reviewChild; sib = sib.nextElementSibling) {
      if (!sib.getClientRects().length) continue;
      if (sib.querySelector(JM_FORM_SEL) || sib.matches(JM_FORM_SEL)) continue;
      if (visibleText(sib) === '') sib.setAttribute('data-jm-empty', '');
    }
    set(common, 'row-gap', '12px');
    set(reviewChild, 'margin-top', '12px');
  }

  // Letzte Absicherung (mobil): Abstand zwischen der Zeile „Bewertung schreiben“
  // und dem ersten sichtbaren Inhalt darunter (Sterne/Text der ersten Bewertung)
  // tatsächlich messen. Ist er größer als 24 px, wird der Block darunter per
  // negativem Margin hochgezogen — unabhängig davon, woher die Lücke kommt.
  // Öffnet sich dort etwas Sichtbares (z. B. Filter-Menü), ist die Lücke klein und
  // es wird nichts verschoben.
  const JM_TARGET_GAP = 16;
  function pullUpReviews(root) {
    const widget = root.querySelector('.jm-reviews-widget');
    if (!widget) return;
    const prev = widget.querySelector('[data-jm-pull]');
    if (prev) { prev.style.removeProperty('margin-top'); prev.removeAttribute('data-jm-pull'); }
    if (!JM_MOBILE.matches) return;

    const isShown = el => {
      const r = el.getBoundingClientRect();
      if (r.width <= 2 || r.height <= 2) return false;
      const cs = getComputedStyle(el);
      return cs.visibility !== 'hidden' && cs.opacity !== '0';
    };
    const writeBtn = Array.from(widget.querySelectorAll('button, a, [role="button"]'))
      .find(el => /bewertung schreiben|write a review/i.test(el.textContent || '') && isShown(el));
    if (!writeBtn) return;
    const row = writeBtn.parentElement;

    let target = null;
    for (const el of widget.querySelectorAll('*')) {
      if (row.contains(el) || !(row.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING)) continue;
      if (el.closest('[data-jm-empty], [data-jm-media-hidden]')) continue;
      const isMedia = el.matches('img, svg, video, picture, canvas');
      const ownText = Array.from(el.childNodes).some(n => n.nodeType === 3 && n.nodeValue.trim());
      if (!isMedia && !ownText) continue;
      if (!isShown(el)) continue;
      target = el;
      break;
    }
    if (!target) return;

    let block = target;
    while (block.parentElement && !block.parentElement.contains(row)) block = block.parentElement;
    const rowBottom = row.getBoundingClientRect().bottom;
    const gap = target.getBoundingClientRect().top - rowBottom;
    if (gap <= 24) return;
    let shift = gap - JM_TARGET_GAP;
    // Trennlinien (border-top) auf dem Weg dürfen nicht über die Button-Zeile rutschen
    for (let a = target.parentElement; a; a = a.parentElement) {
      const cs = getComputedStyle(a);
      if (parseFloat(cs.borderTopWidth) > 0 && cs.borderTopStyle !== 'none') {
        shift = Math.min(shift, a.getBoundingClientRect().top - rowBottom - 8);
      }
      if (a === block) break;
    }
    if (shift <= 8) return;
    const mt = parseFloat(getComputedStyle(block).marginTop) || 0;
    block.style.setProperty('margin-top', (mt - shift) + 'px', 'important');
    block.setAttribute('data-jm-pull', '');
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
    if (root.classList.contains('jm-reviews--no-widget-title')) {
      // Neuere Judge.me-Widgets haben eine eigene Überschrift ohne feste Klasse
      rules.push({ re: /^(kundenbewertungen|customer reviews|bewertungen)$/i, attr: 'data-jm-title-hidden' });
    }
    const showAvgStars = root.classList.contains('jm-reviews--avg-stars');
    const hideGallery = root.classList.contains('jm-reviews--no-media-gallery');

    const run = () => {
      if (rules.length) markByText(root, rules);
      if (showAvgStars) injectAverageStars(root);
      if (hideGallery) hideMediaGallery(root);
      collapseEmptyBlocks(root);
      compactJudgeme(root);
      tightenFirstReviewGap(root);
      pullUpReviews(root);
    };

    run();
    // Judge.me setzt Layout-Klassen teils erst später → zur Sicherheit nachziehen
    [800, 2500, 5000].forEach(ms => setTimeout(run, ms));
    // Nach Klicks (Filter/Sortierung öffnen sich) und Drehen des Handys neu messen
    root.addEventListener('click', () => setTimeout(run, 350));
    window.addEventListener('resize', () => requestAnimationFrame(run));
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
      // Aktiver Rabattcode (snippets/discount-preview.liquid): mit dem reduzierten Preis rechnen
      const D = window.RecovtecDiscount;
      const basePrice = Number(root.dataset.price);
      const discounted = D && root.hasAttribute('data-discountable');
      const price = (discounted ? D.apply(basePrice) : basePrice) / 100;
      const studio = Number(root.dataset.studio) / 100;
      const travel = Number(root.dataset.travel) || 0;
      const range = root.querySelector('[data-calc-range]');
      if (!range || !price || !studio) return;

      const set = (sel, val) => root.querySelectorAll(sel).forEach(el => { el.textContent = val; });
      // Ganze Beträge ohne, krumme mit Cent — alle Beträge im selben Format
      const money = v => (Math.round(v * 100) % 100 === 0 ? eur : eurCents).format(v);
      set('[data-calc-price]', money(price));
      const was = root.querySelector('[data-calc-was]');
      if (discounted && was) {
        was.textContent = money(basePrice / 100);
        was.hidden = false;
      }

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
        set('[data-calc-studio-year]', money(studioYear));
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

  // ===== Wisch-Karussells (mobil): Punkte-Indikator unter [data-swipe] =====
  function initSwipe() {
    document.querySelectorAll('[data-swipe]').forEach(track => {
      const items = Array.from(track.children);
      if (items.length < 2) return;
      const dots = document.createElement('div');
      dots.className = 'swipe-dots';
      dots.setAttribute('aria-hidden', 'true');
      items.forEach(() => dots.appendChild(document.createElement('span')));
      track.after(dots);
      const marks = Array.from(dots.children);
      let raf = 0;
      function update() {
        raf = 0;
        const left = track.getBoundingClientRect().left;
        let best = 0, bestDist = Infinity;
        items.forEach((el, i) => {
          const d = Math.abs(el.getBoundingClientRect().left - left - parseFloat(getComputedStyle(track).paddingLeft || 0));
          if (d < bestDist) { bestDist = d; best = i; }
        });
        // Am rechten Ende ist die letzte Karte aktiv, auch wenn sie nicht ganz links steht
        if (track.scrollLeft + track.clientWidth >= track.scrollWidth - 4) best = items.length - 1;
        marks.forEach((m, i) => m.classList.toggle('is-active', i === best));
      }
      track.addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(update); }, { passive: true });
      window.addEventListener('resize', update);
      update();
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

    refreshDrawer().catch(e => console.error('Cart refresh failed', e));
    // Kauf-Funktionen zuerst; jede Init einzeln abgesichert, damit ein Fehler
    // (z. B. im Judge.me-Widget) nicht den Warenkorb-Button lahmlegt.
    [
      initATCForm, initSizeSelector, initStickyBuy,
      initJudgemeWidget, initAnchorNav, initGallery, initAccordion, initSizeGuide,
      initPaymentInfo, initNewsletter, initGuaranteeLabel, initValueCalc,
      initModeDemo, initSwipe
    ].forEach(fn => {
      try { fn(); } catch (e) { console.error(fn.name + ' failed', e); }
    });
  });
})();
