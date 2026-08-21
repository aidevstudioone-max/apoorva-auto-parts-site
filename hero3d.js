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
  const metal = new THREE.MeshStandardMaterial({
    color: 0x565d68, metalness: 0.55, roughness: 0.38, emissive: 0x0c0e11, emissiveIntensity: 0.4
  });
  const accent = new THREE.MeshStandardMaterial({
    color: 0xff7a2e, metalness: 0.3, roughness: 0.4, emissive: 0xff6a13, emissiveIntensity: 0.22
  });

  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.3, 28, 56), metal);
  group.add(ring);

  const teethCount = 12;
  for (let i = 0; i < teethCount; i++) {
    const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.46), metal);
    const angle = (i / teethCount) * Math.PI * 2;
    tooth.position.set(Math.cos(angle) * 1.42, Math.sin(angle) * 1.42, 0);
    tooth.rotation.z = angle;
    group.add(tooth);
  }

  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.56, 32), accent);
  hub.rotation.x = Math.PI / 2;
  group.add(hub);

  const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.55, 6), metal);
  bolt.position.set(2.15, -0.95, 0.4);
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
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
  camera.position.set(2.6, 1.9, 4.4);
  camera.lookAt(0, 0, 0);

  scene.add(new THREE.HemisphereLight(0xfff2e6, 0x2a1c12, 1.15));
  const key = new THREE.DirectionalLight(0xffffff, 2.4);
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

  let spin = 0;
  let tiltX = 0;
  let raf;
  function animate() {
    raf = requestAnimationFrame(animate);
    spin += 0.008;
    gearGroup.rotation.y = spin + pointer.x * 0.25;
    tiltX += (pointer.y * 0.2 - tiltX) * 0.05;
    gearGroup.rotation.x = tiltX;
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
