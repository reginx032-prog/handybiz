/* ════════════════════════════════════════════════════════════════
   HANDYBIZ — HERO BRAND 3D TILT
   Mouse-tracking parallax na napisie HANDYBIZ.
   Aktywuje się DOPIERO po zakończeniu intro animacji (heroBrandIntro),
   żeby nie rozjechać wjazdu z animacji do statycznego stanu.
   ════════════════════════════════════════════════════════════════ */

(function () {
  if (!matchMedia('(pointer: fine)').matches) return;
  if (!matchMedia('(min-width: 769px)').matches) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const brand = document.querySelector('.hero-brand');
  if (!brand) return;
  const hero = brand.closest('.hero') || document.body;

  const MAX_DEG = 5;
  const SMOOTH = 0.09;

  let tx = 0, ty = 0;   // target rotation
  let cx = 0, cy = 0;   // current rotation
  let active = false;
  let raf;

  function enable() {
    if (active) return;
    brand.classList.add('tilt-ready');
    active = true;
  }

  // Czekaj na koniec heroBrandIntro
  brand.addEventListener('animationend', (e) => {
    if (e.animationName === 'heroBrandIntro') enable();
  });
  // Fallback gdyby animacja zdążyła się zakończyć przed ładowaniem skryptu
  setTimeout(enable, 2000);

  hero.addEventListener('pointermove', (e) => {
    if (!active) return;
    const r = hero.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width  - 0.5;
    const py = (e.clientY - r.top)  / r.height - 0.5;
    tx =  px * MAX_DEG * 2;
    ty = -py * MAX_DEG * 2;
    if (!raf) raf = requestAnimationFrame(loop);
  }, { passive: true });

  hero.addEventListener('pointerleave', () => {
    tx = 0; ty = 0;
    if (!raf) raf = requestAnimationFrame(loop);
  }, { passive: true });

  function loop() {
    cx += (tx - cx) * SMOOTH;
    cy += (ty - cy) * SMOOTH;
    brand.style.transform = `perspective(1400px) rotateX(${cy.toFixed(3)}deg) rotateY(${cx.toFixed(3)}deg)`;
    if (Math.abs(tx - cx) > 0.04 || Math.abs(ty - cy) > 0.04) {
      raf = requestAnimationFrame(loop);
    } else {
      raf = 0;
    }
  }
})();
