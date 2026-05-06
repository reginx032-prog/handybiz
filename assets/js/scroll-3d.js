/* ════════════════════════════════════════════════════════════════
   HANDYBIZ — SCROLL-DRIVEN 3D REVEALS
   Wybrane sekcje wjeżdżają z perspektywą rotateX gdy wchodzą do viewportu.
   Działa równolegle do istniejącego systemu .reveal — nie nadpisuje go,
   tylko dokłada perspektywę 3D na poziomie kontenerów.
   ════════════════════════════════════════════════════════════════ */

(function () {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (matchMedia('(pointer: coarse)').matches) return;
  if (!matchMedia('(min-width: 769px)').matches) return;
  if (!('IntersectionObserver' in window)) return;

  // Targetujemy KONTENERY, nie poszczególne karty —
  // w środku karty mają już swoje .reveal/animacje, więc się nie kłócimy.
  const SELECTORS = [
    '.fcta-box',
    '.effects-grid',
    '.steps',
    '.problems-grid',
  ];

  const containers = document.querySelectorAll(SELECTORS.join(','));
  if (!containers.length) return;

  containers.forEach(el => el.classList.add('scroll-3d'));

  const obs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('scroll-3d-in');
        obs.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.15,
    rootMargin: '0px 0px -8% 0px',
  });

  // Double rAF: pierwszy frame aplikuje stan początkowy, drugi startuje observer.
  // Bez tego elementy już widoczne na pierwszym ekranie skoczyłyby ze stanu
  // start do end w tej samej klatce → brak tranzycji.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      containers.forEach(el => obs.observe(el));
    });
  });
})();
