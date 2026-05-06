/* ════════════════════════════════════════════════════════════════
   HANDYBIZ — 3D DEPTH FIELD (replaces 2D particle canvas on desktop)
   Three.js scene with:
   - 160 particles in 3D space (depth-aware)
   - Distance-based connection lines (O(n²), capped)
   - Gold accent particles (~7%)
   - Slow Y rotation + mouse parallax camera
   - Depth fog
   - Visibility-aware (pauses when tab hidden)
   - Graceful fallback: bails out if WebGL unsupported
   ════════════════════════════════════════════════════════════════ */

(async function () {
  // ── Capability checks ──
  if (!matchMedia('(pointer: fine)').matches) return;
  if (!matchMedia('(min-width: 769px)').matches) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  // WebGL test — jeśli brak, zostaje stary 2D canvas
  const test = document.createElement('canvas');
  const glCtx = test.getContext('webgl2') || test.getContext('webgl');
  if (!glCtx) return;

  // Lazy import Three.js (z CDN, tylko gdy faktycznie potrzebne)
  let THREE;
  try {
    THREE = await import('https://unpkg.com/three@0.160.0/build/three.module.js');
  } catch (e) {
    console.warn('[3d-bg] three.js load failed, falling back to 2D canvas', e);
    return;
  }

  // ── Scene setup ──
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x080808, 0.0011);

  const camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    1,
    2200
  );
  camera.position.set(0, 0, 460);

  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x000000, 0);
  renderer.domElement.id = 'canvas-3d';
  document.body.prepend(renderer.domElement);
  document.body.classList.add('has-3d-bg');

  // ── Particles ──
  const N = 160;
  const BOUND_X = 700;
  const BOUND_Y = 400;
  const BOUND_Z = 500;
  const MAX_DIST = 130;

  const positions = new Float32Array(N * 3);
  const velocities = new Float32Array(N * 3);
  const colors = new Float32Array(N * 3);
  const accentMask = new Uint8Array(N);

  for (let i = 0; i < N; i++) {
    positions[i * 3 + 0] = (Math.random() - 0.5) * BOUND_X * 2;
    positions[i * 3 + 1] = (Math.random() - 0.5) * BOUND_Y * 2;
    positions[i * 3 + 2] = (Math.random() - 0.5) * BOUND_Z * 2;

    velocities[i * 3 + 0] = (Math.random() - 0.5) * 0.32;
    velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.32;
    velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.32;

    const accent = Math.random() < 0.07;
    accentMask[i] = accent ? 1 : 0;
    if (accent) {
      colors[i * 3 + 0] = 200 / 255;
      colors[i * 3 + 1] = 169 / 255;
      colors[i * 3 + 2] = 110 / 255;
    } else {
      colors[i * 3 + 0] = 1;
      colors[i * 3 + 1] = 1;
      colors[i * 3 + 2] = 1;
    }
  }

  // Sprite tekstura (miękka kropka)
  const dotTexture = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.4, 'rgba(255,255,255,0.5)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  })();

  const pointsGeo = new THREE.BufferGeometry();
  pointsGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  pointsGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const pointsMat = new THREE.PointsMaterial({
    size: 9,
    map: dotTexture,
    vertexColors: true,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  });

  const points = new THREE.Points(pointsGeo, pointsMat);
  scene.add(points);

  // ── Lines (połączenia bliskich punktów) ──
  const MAX_LINES = 900;
  const linePositions = new Float32Array(MAX_LINES * 2 * 3);
  const lineColors = new Float32Array(MAX_LINES * 2 * 3);

  const linesGeo = new THREE.BufferGeometry();
  linesGeo.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
  linesGeo.setAttribute('color', new THREE.BufferAttribute(lineColors, 3));

  const linesMat = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const lines = new THREE.LineSegments(linesGeo, linesMat);
  scene.add(lines);

  // ── Mouse parallax ──
  let mx = 0, my = 0, cx = 0, cy = 0;
  window.addEventListener('pointermove', (e) => {
    mx = (e.clientX / window.innerWidth - 0.5) * 2;
    my = (e.clientY / window.innerHeight - 0.5) * 2;
  }, { passive: true });

  // ── Resize (debounced) ──
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    }, 180);
  }, { passive: true });

  // ── Render loop ──
  let raf;
  function frame() {
    // Kamera parallax
    cx += (mx * 28 - cx) * 0.04;
    cy += (-my * 18 - cy) * 0.04;
    camera.position.x = cx;
    camera.position.y = cy;
    camera.lookAt(0, 0, 0);

    // Powolny obrót sceny (Y)
    points.rotation.y += 0.00035;
    lines.rotation.y = points.rotation.y;

    // Update positions
    const pos = pointsGeo.attributes.position.array;
    for (let i = 0; i < N; i++) {
      const ix = i * 3;
      pos[ix] += velocities[ix];
      pos[ix + 1] += velocities[ix + 1];
      pos[ix + 2] += velocities[ix + 2];

      if (Math.abs(pos[ix]) > BOUND_X) velocities[ix] *= -1;
      if (Math.abs(pos[ix + 1]) > BOUND_Y) velocities[ix + 1] *= -1;
      if (Math.abs(pos[ix + 2]) > BOUND_Z) velocities[ix + 2] *= -1;
    }
    pointsGeo.attributes.position.needsUpdate = true;

    // Build line segments by distance
    let li = 0;
    for (let i = 0; i < N && li < MAX_LINES; i++) {
      const ix = i * 3;
      const accentI = accentMask[i];
      for (let j = i + 1; j < N && li < MAX_LINES; j++) {
        const jx = j * 3;
        const dx = pos[ix] - pos[jx];
        const dy = pos[ix + 1] - pos[jx + 1];
        const dz = pos[ix + 2] - pos[jx + 2];
        const dsq = dx * dx + dy * dy + dz * dz;
        if (dsq > MAX_DIST * MAX_DIST) continue;

        const d = Math.sqrt(dsq);
        const a = 1 - d / MAX_DIST;
        const isAccent = accentI || accentMask[j];

        const lx = li * 6;
        linePositions[lx]     = pos[ix];
        linePositions[lx + 1] = pos[ix + 1];
        linePositions[lx + 2] = pos[ix + 2];
        linePositions[lx + 3] = pos[jx];
        linePositions[lx + 4] = pos[jx + 1];
        linePositions[lx + 5] = pos[jx + 2];

        let r, g, b;
        if (isAccent) {
          r = (200 / 255) * a; g = (169 / 255) * a; b = (110 / 255) * a;
        } else {
          r = 0.5 * a; g = 0.5 * a; b = 0.5 * a;
        }
        lineColors[lx]     = r; lineColors[lx + 1] = g; lineColors[lx + 2] = b;
        lineColors[lx + 3] = r; lineColors[lx + 4] = g; lineColors[lx + 5] = b;

        li++;
      }
    }
    linesGeo.setDrawRange(0, li * 2);
    linesGeo.attributes.position.needsUpdate = true;
    linesGeo.attributes.color.needsUpdate = true;

    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  }

  // ── Visibility pause ──
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    } else if (!raf) {
      raf = requestAnimationFrame(frame);
    }
  });

  // ── Start ──
  renderer.domElement.classList.add('ready');
  raf = requestAnimationFrame(frame);
})();
