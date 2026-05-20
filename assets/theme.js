/* Recovtec Theme JS */

(function () {
  'use strict';

  // ── Cart state (localStorage, overridden by Shopify cart API in production) ──
  function getCart() {
    try { return JSON.parse(localStorage.getItem('rt-cart') || '[]'); } catch { return []; }
  }
  function saveCart(lines) {
    try { localStorage.setItem('rt-cart', JSON.stringify(lines)); } catch {}
  }

  // ── Cart Drawer ──
  const drawerOverlay = document.querySelector('.drawer-overlay');
  const drawer        = document.querySelector('.drawer');
  const drawerBody    = document.querySelector('.drawer-body');
  const drawerFoot    = document.querySelector('.drawer-foot');
  const cartCountEls  = document.querySelectorAll('.cart-count');

  function openDrawer()  { drawerOverlay?.classList.add('open'); drawer?.classList.add('open'); renderDrawer(); }
  function closeDrawer() { drawerOverlay?.classList.remove('open'); drawer?.classList.remove('open'); }

  drawerOverlay?.addEventListener('click', closeDrawer);
  document.querySelector('.drawer-close')?.addEventListener('click', closeDrawer);
  document.querySelectorAll('[data-cart-open]').forEach(el => el.addEventListener('click', openDrawer));

  function updateCartCount() {
    const lines = getCart();
    const count = lines.reduce((s, l) => s + l.qty, 0);
    cartCountEls.forEach(el => {
      el.textContent = count;
      el.style.display = count > 0 ? 'flex' : 'none';
    });
  }

  function renderDrawer() {
    if (!drawerBody) return;
    const lines = getCart();
    if (lines.length === 0) {
      drawerBody.innerHTML = `<div class="cart-empty"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 5h2.5l2.2 11.5a1.5 1.5 0 0 0 1.5 1.2h8a1.5 1.5 0 0 0 1.5-1.2L20.5 8H6.5"/><circle cx="9" cy="20.5" r="1.2"/><circle cx="18" cy="20.5" r="1.2"/></svg><div><div style="font-weight:600;margin-bottom:4px">Noch leer</div><div style="font-size:13px;color:var(--mute)">Füge die Recovery Boots hinzu.</div></div></div>`;
      if (drawerFoot) drawerFoot.style.display = 'none';
      return;
    }
    drawerBody.innerHTML = lines.map((l, i) => `
      <div class="cart-line">
        <div class="img"></div>
        <div class="info">
          <div class="name">${l.name}</div>
          <div class="opt">Größe ${l.size}</div>
          <div class="qty-row">
            <button data-qty-dec="${i}">−</button>
            <span class="v">${l.qty}</span>
            <button data-qty-inc="${i}">+</button>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px">
          <div class="price">${(l.price * l.qty).toLocaleString('de-DE')} €</div>
          <button class="remove" data-remove="${i}">Entfernen</button>
        </div>
      </div>`).join('');

    const total = lines.reduce((s, l) => s + l.price * l.qty, 0);
    if (drawerFoot) {
      drawerFoot.style.display = 'flex';
      drawerFoot.innerHTML = `
        <div class="sub"><span class="lbl">Zwischensumme</span><span class="val">${total.toLocaleString('de-DE')} €</span></div>
        <button class="btn btn-primary btn-lg" style="width:100%">Zur Kasse <span class="btn-icon"><svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M2 7h10M8 3l4 4-4 4"/></svg></span></button>
        <div class="note">Versand 1–3 Werktage · 30 Tage Geld zurück</div>`;
    }

    drawerBody.querySelectorAll('[data-qty-dec]').forEach(btn => {
      btn.addEventListener('click', () => {
        const i = +btn.dataset.qtyDec;
        const lines = getCart();
        if (lines[i].qty <= 1) { lines.splice(i, 1); } else { lines[i].qty--; }
        saveCart(lines); updateCartCount(); renderDrawer();
      });
    });
    drawerBody.querySelectorAll('[data-qty-inc]').forEach(btn => {
      btn.addEventListener('click', () => {
        const i = +btn.dataset.qtyInc;
        const lines = getCart();
        lines[i].qty++;
        saveCart(lines); updateCartCount(); renderDrawer();
      });
    });
    drawerBody.querySelectorAll('[data-remove]').forEach(btn => {
      btn.addEventListener('click', () => {
        const i = +btn.dataset.remove;
        const lines = getCart();
        lines.splice(i, 1);
        saveCart(lines); updateCartCount(); renderDrawer();
      });
    });
  }

  // ── Add to Cart ──
  const PRICE = 499;
  let selectedSize = 'M';

  document.querySelectorAll('.size-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedSize = btn.dataset.size || btn.textContent.replace('Größe ', '').trim();
    });
  });

  document.querySelectorAll('.atc-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const lines = getCart();
      const idx = lines.findIndex(l => l.name === 'Recovtec Pro' && l.size === selectedSize);
      if (idx > -1) { lines[idx].qty++; } else { lines.push({ name: 'Recovtec Pro', size: selectedSize, price: PRICE, qty: 1 }); }
      saveCart(lines);
      updateCartCount();
      showToast('Zum Warenkorb hinzugefügt');
      setTimeout(openDrawer, 400);
    });
  });

  // ── Toast ──
  const toast = document.querySelector('.toast');
  let toastTimer;
  function showToast(msg) {
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
  }

  // ── Gallery Thumbnails ──
  const mainImg = document.querySelector('.gallery-main img');
  document.querySelectorAll('.gallery-thumb').forEach(thumb => {
    thumb.addEventListener('click', () => {
      const src = thumb.querySelector('img')?.src;
      if (mainImg && src) mainImg.src = src;
      document.querySelectorAll('.gallery-thumb').forEach(t => t.classList.remove('active'));
      thumb.classList.add('active');
    });
  });

  // ── FAQ Accordion ──
  document.querySelectorAll('.acc-trigger').forEach(trigger => {
    trigger.addEventListener('click', () => {
      const item = trigger.closest('.acc-item');
      const isOpen = item.classList.contains('open');
      // Close all in same accordion
      trigger.closest('.acc')?.querySelectorAll('.acc-item').forEach(i => i.classList.remove('open'));
      if (!isOpen) item.classList.add('open');
    });
  });

  // ── Size Guide Modal ──
  const sgOverlay = document.querySelector('.sg-overlay');
  const sgModal   = document.querySelector('.sg-modal');
  function openSizeGuide()  { sgOverlay?.classList.add('open'); sgModal?.classList.add('open'); }
  function closeSizeGuide() { sgOverlay?.classList.remove('open'); sgModal?.classList.remove('open'); }
  document.querySelector('.size-guide-link')?.addEventListener('click', openSizeGuide);
  sgOverlay?.addEventListener('click', closeSizeGuide);
  document.querySelector('.sg-close')?.addEventListener('click', closeSizeGuide);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeSizeGuide(); closeDrawer(); } });

  // ── Sticky ATC ──
  const stickyATC    = document.querySelector('.sticky-atc');
  const pdpMainRef   = document.querySelector('.pdp-info');
  if (stickyATC && pdpMainRef) {
    const io = new IntersectionObserver(entries => {
      const entry = entries[0];
      const drawerOpen = drawer?.classList.contains('open');
      if (!drawerOpen && entry.intersectionRatio < 0.15) {
        stickyATC.classList.add('visible');
      } else {
        stickyATC.classList.remove('visible');
      }
    }, { threshold: [0, 0.15] });
    io.observe(pdpMainRef);
  }

  // ── Newsletter no-op ──
  document.querySelectorAll('.final-nl-form').forEach(form => {
    form.addEventListener('submit', e => { e.preventDefault(); showToast('Danke! Du wirst benachrichtigt.'); });
  });

  // ── Init ──
  updateCartCount();

})();
