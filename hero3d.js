import * as THREE from 'three';

function supportsWebGL() {
  try {
    const canvas = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
  } catch (e) {
    return false;
  }
}

function shouldRun() {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isNarrowViewport = window.matchMedia('(max-width: 720px)').matches;
  return !prefersReducedMotion && !isNarrowViewport && supportsWebGL();
}

// Wait for full page load (fonts/layout settled) before touching WebGL, and
// retry once after a short delay in case the GPU context isn't ready yet.
function start() {
  if (!shouldRun()) return;
  const gearOk = initHeroGear();
  const particlesOk = initHeroParticles();
  if (!gearOk || !particlesOk) {
    setTimeout(() => {
      if (!gearOk) initHeroGear();
      if (!particlesOk) initHeroParticles();
    }, 400);
  }
}

if (document.readyState === 'complete') {
  start();
} else {
  window.addEventListener('load', start);
}

// Builds a proper gear silhouette (flat tooth tips + valley notches, not a zigzag)
// as an extrudable 2D shape with a bored centre hole.
function buildGearShape(teethCount, rootR, tipR, boreR, toothFrac) {
  const shape = new THREE.Shape();
  const step = (Math.PI * 2) / teethCount;
  const half = step * toothFrac * 0.5;
  let started = false;
  const lineTo = (angle, r) => {
    const x = Math.cos(angle) * r;
    const y = Math.sin(angle) * r;
    if (!started) { shape.moveTo(x, y); started = true; } else shape.lineTo(x, y);
  };
  for (let i = 0; i < teethCount; i++) {
    const c = i * step;
    lineTo(c - step / 2, rootR);
    lineTo(c - half, tipR);
    lineTo(c + half, tipR);
    lineTo(c + step / 2, rootR);
  }
  shape.closePath();
  const hole = new THREE.Path();
  hole.absarc(0, 0, boreR, 0, Math.PI * 2, true);
  shape.holes.push(hole);
  return shape;
}

function buildShadowTexture() {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, 'rgba(20,14,10,0.5)');
  gradient.addColorStop(1, 'rgba(20,14,10,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}

// A stylised, procedurally-built gear — no external 3D model files needed.
function buildGearGroup() {
  const group = new THREE.Group();
  const metal = new THREE.MeshStandardMaterial({
    color: 0x5b626e, metalness: 0.5, roughness: 0.3, emissive: 0x0c0e11, emissiveIntensity: 0.35
  });
  const accent = new THREE.MeshStandardMaterial({
    color: 0xff7a2e, metalness: 0.25, roughness: 0.36, emissive: 0xff6a13, emissiveIntensity: 0.3
  });
  const accentTrim = new THREE.MeshStandardMaterial({
    color: 0xff6a13, metalness: 0.4, roughness: 0.28, emissive: 0xff6a13, emissiveIntensity: 0.18
  });

  const shape = buildGearShape(12, 0.95, 1.2, 0.6, 0.6);
  const gearGeo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.42, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.04, bevelSegments: 2, curveSegments: 16
  });
  gearGeo.center();
  const gearMesh = new THREE.Mesh(gearGeo, metal);
  group.add(gearMesh);

  const trim = new THREE.Mesh(new THREE.TorusGeometry(0.66, 0.045, 12, 40), accentTrim);
  group.add(trim);

  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.56, 0.5, 32), accent);
  hub.rotation.x = Math.PI / 2;
  group.add(hub);

  const boltCount = 5;
  for (let i = 0; i < boltCount; i++) {
    const angle = (i / boltCount) * Math.PI * 2;
    const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.16, 6), metal);
    bolt.position.set(Math.cos(angle) * 0.36, Math.sin(angle) * 0.36, 0.33);
    bolt.rotation.x = Math.PI / 2;
    group.add(bolt);
  }

  return group;
}

function initHeroGear() {
  const canvas = document.getElementById('heroCanvas');
  const fallback = document.getElementById('heroIconFallback');
  if (!canvas || canvas.classList.contains('active')) return true;

  // Make the canvas visible (and the fallback icon hidden) before measuring
  // it, otherwise clientWidth/clientHeight read 0 while display:none.
  canvas.classList.add('active');
  if (fallback) fallback.classList.add('js-hidden');

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  } catch (e) {
    canvas.classList.remove('active');
    if (fallback) fallback.classList.remove('js-hidden');
    return false;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
  camera.position.set(2.9, 2.1, 5.0);
  camera.lookAt(0, 0, 0);

  scene.add(new THREE.HemisphereLight(0xfff2e6, 0x2a1c12, 1.15));
  const key = new THREE.DirectionalLight(0xffffff, 2.5);
  key.position.set(3, 5, 4);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xffffff, 0.9);
  fill.position.set(-4, 1.5, 2);
  scene.add(fill);
  const rim = new THREE.PointLight(0xff6a13, 4, 18);
  rim.position.set(-2, -1.5, -3);
  scene.add(rim);

  const gearGroup = buildGearGroup();
  scene.add(gearGroup);

  const shadowMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(2.6, 2.6),
    new THREE.MeshBasicMaterial({ map: buildShadowTexture(), transparent: true, depthWrite: false })
  );
  shadowMesh.rotation.x = -Math.PI / 2;
  shadowMesh.position.y = -1.55;
  scene.add(shadowMesh);

  const pointer = { x: 0, y: 0 };
  canvas.addEventListener('pointermove', (e) => {
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = ((e.clientY - rect.top) / rect.height) * 2 - 1;
  });

  function resize() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  let spin = 0;
  let tiltX = 0;
  let raf;
  function animate() {
    raf = requestAnimationFrame(animate);
    spin += 0.008;
    gearGroup.rotation.y = spin + pointer.x * 0.25;
    tiltX += (pointer.y * 0.2 - tiltX) * 0.05;
    gearGroup.rotation.x = tiltX;
    gearGroup.position.y = Math.sin(Date.now() * 0.0009) * 0.06;
    renderer.render(scene, camera);
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelAnimationFrame(raf);
    else animate();
  });

  animate();
  return true;
}

function initHeroParticles() {
  const canvas = document.getElementById('heroBgCanvas');
  if (!canvas || canvas.classList.contains('active')) return true;
  const section = canvas.closest('.hero');
  if (!section) return false;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true });
  } catch (e) {
    return false;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 20);
  camera.position.z = 6;

  const COUNT = 90;
  const positions = new Float32Array(COUNT * 3);
  for (let i = 0; i < COUNT; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 12;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 7;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 6;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({ color: 0xff6a13, size: 0.045, transparent: true, opacity: 0.55 });
  const points = new THREE.Points(geometry, material);
  scene.add(points);

  function resize() {
    const w = section.clientWidth;
    const h = section.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  let raf;
  function animate() {
    raf = requestAnimationFrame(animate);
    points.rotation.y += 0.0007;
    points.position.y = Math.sin(Date.now() * 0.0002) * 0.15;
    renderer.render(scene, camera);
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelAnimationFrame(raf);
    else animate();
  });

  animate();
  canvas.classList.add('active');
  return true;
}
