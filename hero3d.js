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

// A stylised, procedurally-built gear + bolt — no external 3D model files needed.
function buildGearGroup() {
  const group = new THREE.Group();
  const metal = new THREE.MeshStandardMaterial({ color: 0x2a2f38, metalness: 0.85, roughness: 0.32 });
  const accent = new THREE.MeshStandardMaterial({ color: 0xff6a13, metalness: 0.55, roughness: 0.35 });

  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.22, 24, 48), metal);
  group.add(ring);

  const teethCount = 12;
  for (let i = 0; i < teethCount; i++) {
    const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.26, 0.34), metal);
    const angle = (i / teethCount) * Math.PI * 2;
    tooth.position.set(Math.cos(angle) * 1.4, Math.sin(angle) * 1.4, 0);
    tooth.rotation.z = angle;
    group.add(tooth);
  }

  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.42, 32), accent);
  hub.rotation.x = Math.PI / 2;
  group.add(hub);

  const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.55, 6), metal);
  bolt.position.set(2.15, -0.95, 0.25);
  bolt.rotation.set(0.6, 0.3, 0.2);
  group.add(bolt);

  return group;
}

function initHeroGear() {
  const canvas = document.getElementById('heroCanvas');
  const fallback = document.getElementById('heroIconFallback');
  if (!canvas || canvas.classList.contains('active')) return true;
  const container = canvas.parentElement;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  } catch (e) {
    return false;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  camera.position.set(0, 0.4, 5.2);

  scene.add(new THREE.AmbientLight(0x404040, 1.1));
  const key = new THREE.DirectionalLight(0xffffff, 1.7);
  key.position.set(3, 4, 5);
  scene.add(key);
  const rim = new THREE.PointLight(0xff6a13, 7, 20);
  rim.position.set(-3, -2, 3);
  scene.add(rim);

  const gearGroup = buildGearGroup();
  scene.add(gearGroup);

  const pointer = { x: 0, y: 0 };
  container.addEventListener('pointermove', (e) => {
    const rect = container.getBoundingClientRect();
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = ((e.clientY - rect.top) / rect.height) * 2 - 1;
  });

  function resize() {
    const w = container.clientWidth;
    const h = container.clientHeight;
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
    gearGroup.rotation.z += 0.006;
    gearGroup.rotation.x += (pointer.y * 0.3 - gearGroup.rotation.x) * 0.04;
    gearGroup.rotation.y += (pointer.x * 0.3 - gearGroup.rotation.y) * 0.04;
    renderer.render(scene, camera);
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelAnimationFrame(raf);
    else animate();
  });

  animate();
  canvas.classList.add('active');
  if (fallback) fallback.classList.add('js-hidden');
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
