/* ════════════════════════════════════════════════════════════════
   HANDYBIZ — 3D CARD TILT + HOLOGRAPHIC GRADIENT
   Karty .bp-tier oraz .effect dostają:
   - 3D rotację reagującą na pozycję myszy (perspective + rotateX/Y)
   - Holograficzny gradient za kursorem (CSS via --mouse-x, --mouse-y)
   Każda karta ma własny rAF — nie ma wspólnej pętli.
   ════════════════════════════════════════════════════════════════ */

(function () {
  if (!matchMedia('(pointer: fine)').matches) return;
  if (!matchMedia('(min-width: 769px)').matches) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const cards = document.querySelectorAll('.bp-tier, .effect, .pkg-card');
  if (!cards.length) return;

  const MAX_DEG = 6;
  const SMOOTH = 0.18;

  cards.forEach(card => {
    card.classList.add('tilt-3d');

    let tx = 0, ty = 0, cx = 0, cy = 0;
    let raf;
    let rect;

    function updateRect() {
      rect = card.getBoundingClientRect();
    }

    card.addEventListener('pointerenter', () => {
      updateRect();
      card.classList.add('tilt-active');
    });

    card.addEventListener('pointermove', (e) => {
      if (!rect) updateRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      card.style.setProperty('--mouse-x', `${(x * 100).toFixed(1)}%`);
      card.style.setProperty('--mouse-y', `${(y * 100).toFixed(1)}%`);
      tx =  (y - 0.5) * -MAX_DEG * 2;
      ty =  (x - 0.5) *  MAX_DEG * 2;
      if (!raf) raf = requestAnimationFrame(loop);
    }, { passive: true });

    card.addEventListener('pointerleave', () => {
      tx = 0; ty = 0;
      card.classList.remove('tilt-active');
      card.style.setProperty('--mouse-x', '50%');
      card.style.setProperty('--mouse-y', '50%');
      if (!raf) raf = requestAnimationFrame(loop);
    });

    function loop() {
      cx += (tx - cx) * SMOOTH;
      cy += (ty - cy) * SMOOTH;
      card.style.transform = `perspective(900px) rotateX(${cx.toFixed(2)}deg) rotateY(${cy.toFixed(2)}deg) translateZ(0)`;
      if (Math.abs(tx - cx) > 0.04 || Math.abs(ty - cy) > 0.04) {
        raf = requestAnimationFrame(loop);
      } else {
        raf = 0;
        if (tx === 0 && ty === 0) card.style.transform = '';
      }
    }
  });
})();
