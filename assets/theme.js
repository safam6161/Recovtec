/* ── Recovtec Theme JS ─────────────────────────────────── */

document.addEventListener('DOMContentLoaded', () => {

  // Sticky header shadow
  const header = document.querySelector('.site-header');
  if (header) {
    window.addEventListener('scroll', () => {
      header.classList.toggle('scrolled', window.scrollY > 20);
    }, { passive: true });
  }

  // Quantity controls
  document.querySelectorAll('.qty-control').forEach(ctrl => {
    const minus = ctrl.querySelector('[data-qty="minus"]');
    const plus  = ctrl.querySelector('[data-qty="plus"]');
    const num   = ctrl.querySelector('.qty-num');
    if (!num) return;

    let qty = parseInt(num.textContent) || 1;

    minus?.addEventListener('click', () => {
      if (qty > 1) { qty--; num.textContent = qty; }
    });
    plus?.addEventListener('click', () => {
      qty++;
      num.textContent = qty;
    });
  });

  // Size selector
  document.querySelectorAll('.size-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      btn.closest('.product-sizes')
        ?.querySelectorAll('.size-btn')
        .forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // Product gallery thumbnails
  const mainImg = document.querySelector('.product-main-img img');
  document.querySelectorAll('.product-thumb').forEach(thumb => {
    thumb.addEventListener('click', () => {
      const src = thumb.querySelector('img')?.src;
      if (mainImg && src) {
        mainImg.src = src;
        document.querySelectorAll('.product-thumb').forEach(t => t.classList.remove('active'));
        thumb.classList.add('active');
      }
    });
  });

  // Scroll reveal animation
  const reveals = document.querySelectorAll('.benefit-card, .step, .testimonial-card, .showcase-feature');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });

    reveals.forEach((el, i) => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(24px)';
      el.style.transition = `opacity 0.5s ease ${i * 0.06}s, transform 0.5s ease ${i * 0.06}s`;
      io.observe(el);
    });
  }

  // Add-to-cart feedback
  document.querySelectorAll('.add-to-cart-btn').forEach(btn => {
    btn.addEventListener('click', function () {
      const original = this.textContent;
      this.textContent = 'In den Warenkorb gelegt ✓';
      this.style.background = 'var(--green)';
      setTimeout(() => {
        this.textContent = original;
        this.style.background = '';
      }, 2000);
    });
  });

  // Mobile nav toggle
  const hamburger = document.querySelector('.hamburger');
  const mobileNav = document.querySelector('.mobile-nav');
  hamburger?.addEventListener('click', () => {
    const open = mobileNav?.classList.toggle('open');
    hamburger.setAttribute('aria-expanded', open ? 'true' : 'false');
  });

});
