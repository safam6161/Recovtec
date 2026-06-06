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
    const mainImg = document.getElementById('gallery-main-img');
    if (!thumbs.length || !mainImg) return;
    thumbs.forEach(thumb => {
      thumb.addEventListener('click', () => {
        thumbs.forEach(t => t.classList.remove('active'));
        thumb.classList.add('active');
        const src = thumb.dataset.src;
        const alt = thumb.dataset.alt;
        if (src) { mainImg.src = src; if (alt) mainImg.alt = alt; }
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

  // ===== Size Guide Modal =====
  function initSizeGuide() {
    const modal = document.getElementById('size-guide-modal');
    if (!modal) return;
    const overlay = document.getElementById('sg-overlay');
    const closeBtn = modal.querySelector('.sg-close');

    function openSG() {
      overlay?.classList.add('open');
      modal.classList.add('open');
    }
    function closeSG() {
      overlay?.classList.remove('open');
      modal.classList.remove('open');
    }

    document.querySelectorAll('.size-guide-trigger, .size-guide-link').forEach(btn => {
      btn.addEventListener('click', openSG);
    });
    closeBtn?.addEventListener('click', closeSG);
    overlay?.addEventListener('click', closeSG);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeSG(); });
  }

  // ===== Newsletter =====
  function initNewsletter() {
    document.querySelectorAll('.final-nl-form').forEach(form => {
      form.addEventListener('submit', async e => {
        e.preventDefault();

        const input = form.querySelector('input[type="email"]');
        const button = form.querySelector('button[type="submit"]');
        const wrap = form.closest('[data-newsletter]') || form.parentElement;
        const msg = wrap ? wrap.querySelector('.final-nl-msg') : null;
        const fine = wrap ? wrap.querySelector('.nl-fine') : null;

        // Browser-Validierung als Sicherheitsnetz (leere/ungültige E-Mail)
        if (input && !input.checkValidity()) {
          input.reportValidity();
          return;
        }

        if (button) button.disabled = true;
        form.classList.add('is-loading');

        function show(type, fallback) {
          if (!msg) return;
          msg.textContent = (type === 'success' ? msg.dataset.success : msg.dataset.error) || fallback;
          msg.classList.toggle('is-success', type === 'success');
          msg.classList.toggle('is-error', type === 'error');
          msg.hidden = false;
        }

        try {
          const action = (form.getAttribute('action') || '/contact').split('#')[0];
          // Shopify beantwortet eine erfolgreiche Anmeldung mit einem Redirect.
          // redirect:'manual' => NICHT folgen, sonst CORS-Fehler bei eigener Domain.
          const res = await fetch(action, {
            method: 'POST',
            headers: { 'Accept': 'application/json' },
            body: new FormData(form),
            redirect: 'manual'
          });
          // Erfolg = Redirect (opaqueredirect / Status 0) ODER 2xx. Sonst echter Fehler.
          const success = res.type === 'opaqueredirect' || res.status === 0 || res.ok;
          if (!success) throw new Error('Newsletter request failed: ' + res.status);

          // Erfolg: Formular ausblenden, dauerhafte Bestätigung anzeigen
          if (input) input.value = '';
          form.hidden = true;
          if (fine) fine.hidden = true;
          show('success', 'Danke! Wir haben dir eine Bestätigungs-E-Mail geschickt — bitte bestätige deine Anmeldung.');
        } catch (err) {
          console.error('Newsletter signup failed', err);
          if (button) button.disabled = false;
          show('error', 'Hoppla, das hat nicht geklappt. Bitte versuche es gleich noch einmal.');
        } finally {
          form.classList.remove('is-loading');
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
    initAnchorNav();
    initATCForm();
    initSizeSelector();
    initGallery();
    initAccordion();
    initSizeGuide();
    initNewsletter();
  });
})();
