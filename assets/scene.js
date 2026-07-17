/* ===========================================================
   mirza.tech v4 — scene.js  (ES module, three.js r160)
   One WebGL piece, driven by gsap.ticker:
     - Hero head: cropped blue wireframe of the face mesh,
       drag-to-rotate + momentum + additive idle float.
       (#heroMount, desktop ≥901px only)
   v4 dropped the pipeline toy; this is hero-only.
   three.module.js (1.2MB) and the GLB (1.7MB) are only fetched
   on desktop — mobile never renders the mesh, so the module and
   model are loaded via dynamic import behind the media query.
   Nothing here calls requestAnimationFrame directly.
   =========================================================== */
const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const DESKTOP = window.matchMedia('(min-width: 901px)').matches;
const COL = { blue: 0x2b4bff, peri: 0x6f86ff, yellow: 0xe6ff00 };
const GLB = 'face-mesh.glb';

// expose control surface immediately (main.js wires ScrollTrigger to these)
const hero = { enabled: true };
window.MZScene = {
  setHeroEnabled(b){ hero.enabled = !!b; }
};

const mountEl = document.getElementById('heroMount');
if (mountEl && DESKTOP) {
  // ~3MB of module + GLB — wait for idle so it never competes with first paint.
  // Any failure (no WebGL, import error) marks the mount so CSS collapses it
  // and the "drag to rotate" hint never appears over nothing.
  const start = () => initHero(mountEl).catch((err) => {
    console.warn('[scene] hero init failed:', err);
    mountEl.classList.add('is-failed');
  });
  if ('requestIdleCallback' in window) requestIdleCallback(start, { timeout: 2000 });
  else setTimeout(start, 350);
}

/* ===========================================================
   HERO HEAD
   =========================================================== */
async function initHero(mount){
  const THREE = await import('three');
  const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');

  const ticker = (window.gsap && window.gsap.ticker) || null;
  function onTick(fn){
    if (ticker) { ticker.add(fn); return; }
    // defensive fallback if GSAP is unavailable
    let last = performance.now();
    (function loop(now){ const dt=(now-last)/1000; last=now; fn(now/1000, dt); requestAnimationFrame(loop); })(last);
  }

  /* ---------- single shared GLB load ---------- */
  let _gltf = null, _waiters = [];
  function loadGLTF(cb){
    if (_gltf) { cb(_gltf); return; }
    _waiters.push(cb);
    if (_waiters.length > 1) return;               // a load is already in flight
    new GLTFLoader().load(GLB, (gltf) => {
      _gltf = gltf; _waiters.forEach(w => w(gltf)); _waiters = [];
    }, undefined, (err) => {
      console.warn('[scene] GLB load failed:', err); _waiters.forEach(w => w(null)); _waiters = [];
    });
  }

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.localClippingEnabled = true;
  const rect = () => mount.getBoundingClientRect();
  renderer.setSize(rect().width || 100, rect().height || 100);
  renderer.setClearColor(0x000000, 0);
  mount.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  camera.position.set(0, 0, 5.5); camera.lookAt(0, 0, 0);
  const root = new THREE.Group(); scene.add(root);

  const clipLocal = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const clipWorld = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  let modelHeightWorld = 2.4, modelSizeYLocal = 2.4, modelSizeZLocal = 2.4;
  const FRONT = 0.73, BACK = 1.0, SIGN = +1;

  function setClip(fKeep, bKeep){
    const fK = Math.max(0.05, Math.min(1, fKeep)), bK = Math.max(0.05, Math.min(1, bKeep));
    const H = modelHeightWorld, tighter = Math.min(fK, bK);
    root.position.x = 0.0;
    root.position.y = (tighter - 1) * H / 1.98;
    const frontY = (0.5 - fK) * modelSizeYLocal, backY = (0.5 - bK) * modelSizeYLocal;
    const halfZ = modelSizeZLocal / 2, fz = SIGN * halfZ, bz = -SIGN * halfZ;
    const nzRaw = (backY - frontY) / (bz - fz), len = Math.hypot(1, nzRaw);
    clipLocal.normal.set(0, 1 / len, nzRaw / len);
    clipLocal.constant = (-(frontY + nzRaw * fz)) / len;
    syncClip();
  }
  function syncClip(){ root.updateMatrixWorld(true); clipWorld.copy(clipLocal).applyMatrix4(root.matrixWorld); }

  let ready = false;
  loadGLTF((gltf) => {
    if (!gltf) { mount.classList.add('is-failed'); return; }
    const model = gltf.scene.clone(true);
    const swaps = [];
    model.traverse((node) => {
      if (node.isMesh && node.geometry) {
        const wire = new THREE.Mesh(node.geometry, new THREE.MeshBasicMaterial({
          color: COL.blue, wireframe: true, transparent: true, opacity: 0.18, clippingPlanes: [clipWorld]
        }));
        const edges = new THREE.LineSegments(new THREE.EdgesGeometry(node.geometry, 25), new THREE.LineBasicMaterial({
          color: COL.blue, transparent: true, opacity: 0.88, clippingPlanes: [clipWorld]
        }));
        [wire, edges].forEach((o) => { o.position.copy(node.position); o.rotation.copy(node.rotation); o.scale.copy(node.scale); o.matrix.copy(node.matrix); });
        swaps.push({ node, wire, edges });
      }
    });
    if (!swaps.length) { mount.classList.add('is-failed'); return; }
    swaps.forEach(({ node, wire, edges }) => { const p = node.parent; p.add(wire); p.add(edges); p.remove(node); });
    root.add(model);
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3()), center = box.getCenter(new THREE.Vector3());
    model.position.sub(center);
    const maxDim = Math.max(size.x, size.y, size.z), scale = maxDim > 0 ? 3.05 / maxDim : 1;
    root.scale.setScalar(scale);
    modelHeightWorld = size.y * scale; modelSizeYLocal = size.y; modelSizeZLocal = size.z;
    setClip(FRONT, BACK);
    ready = true;
    syncClip(); renderer.render(scene, camera);   // paint first frame immediately (don't wait for the ticker)
    mount.classList.add('is-ready');              // reveals the "drag to rotate" hint (site.css)
  });

  // drag-to-rotate + momentum
  let rotY = 0, rotX = 0, velY = 0, velX = 0, idleAmp = 1;
  let dragging = false, lastX = 0, lastY = 0;
  mount.addEventListener('pointerdown', (e) => { dragging = true; idleAmp = 0; lastX = e.clientX; lastY = e.clientY; mount.classList.add('grabbing'); mount.setPointerCapture && mount.setPointerCapture(e.pointerId); });
  mount.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastX, dy = e.clientY - lastY;
    rotY += dx * 0.006; rotX += dy * 0.005; rotX = Math.max(-0.9, Math.min(0.9, rotX));
    velY = dx * 0.006; velX = dy * 0.005; lastX = e.clientX; lastY = e.clientY;
  });
  const release = () => { dragging = false; mount.classList.remove('grabbing'); };
  mount.addEventListener('pointerup', release);
  mount.addEventListener('pointercancel', release);

  function renderHero(time){
    if (!hero.enabled || REDUCED) return;
    if (!ready) { renderer.render(scene, camera); return; }
    if (!dragging) {
      velY *= 0.93; velX *= 0.90; rotY += velY; rotX += velX;
      const moving = Math.abs(velY) + Math.abs(velX);
      idleAmp += ((moving > 0.0015 ? 0 : 1) - idleAmp) * 0.05;   // idle eases back after a drag settles
    }
    root.rotation.y = rotY + idleAmp * Math.sin(time * 0.30) * 0.45;
    root.rotation.x = rotX + idleAmp * Math.sin(time * 0.21) * 0.06;
    syncClip();
    renderer.render(scene, camera);
  }
  onTick(renderHero);

  new ResizeObserver(() => {
    const r = rect(); renderer.setSize(r.width, r.height);
    camera.aspect = (r.width || 1) / (r.height || 1); camera.updateProjectionMatrix();
    if (ready) { syncClip(); renderer.render(scene, camera); }   // setSize clears the canvas — repaint now
  }).observe(mount);
}
