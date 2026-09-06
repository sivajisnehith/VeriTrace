/* =========================================================
   VeriTrace Hero — 3D Biometric Face Matching Scene
   Vanilla Three.js (r128). No build step or external model required.
   Renders an illuminated 3D biometric facial landmark mesh,
   dual eye-tracking reticles, scanning laser plane, and
   forensic bounding brackets.
   ========================================================= */
(function () {
  "use strict";

  const container = document.getElementById("hero-visual");
  const canvas = document.getElementById("scene-canvas");
  if (!container || !canvas || typeof THREE === "undefined") {
    if (container) container.classList.add("no-webgl");
    return;
  }

  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
  } catch (e) {
    container.classList.add("no-webgl");
    return;
  }
  if (!renderer) {
    container.classList.add("no-webgl");
    return;
  }

  // Forensic Cyber Theme Palette
  const COLOR_ACCENT = 0x4fd1c5;       // Cyan / Teal
  const COLOR_ACCENT_2 = 0x8b7cf6;     // Violet / Purple
  const COLOR_SUCCESS = 0x10b981;      // Verified Match Emerald
  const COLOR_LINE = 0x222a36;         // Muted Structure Line

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
  camera.position.set(0, 0.15, 7.5);

  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  renderer.setPixelRatio(pixelRatio);
  renderer.setClearColor(0x000000, 0);

  function resize() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (w === 0 || h === 0) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  // ---- Lighting ---------------------------------------------------
  scene.add(new THREE.AmbientLight(0xffffff, 0.45));

  const keyLight = new THREE.PointLight(0x4fd1c5, 1.4, 25, 2);
  keyLight.position.set(3.5, 3.5, 4.5);
  scene.add(keyLight);

  const rimLight = new THREE.PointLight(0x8b7cf6, 1.1, 25, 2);
  rimLight.position.set(-4.0, -2.5, -3.5);
  scene.add(rimLight);

  // ---- Main Rig (Rotates gently & responds to cursor) -------------
  const rig = new THREE.Group();
  scene.add(rig);

  // ---- 1. 3D Biometric Facial Landmark Topology -------------------
  // 68 anatomical coordinates mapping human face proportions
  const RAW_LANDMARKS = [
    // 0-6: Forehead & hairline arch
    [0.00, 1.55, 0.35],
    [-0.40, 1.48, 0.30], [0.40, 1.48, 0.30],
    [-0.75, 1.35, 0.18], [0.75, 1.35, 0.18],
    [-1.05, 1.15, -0.05], [1.05, 1.15, -0.05],

    // 7-11: Mid-forehead plane
    [0.00, 1.15, 0.45],
    [-0.38, 1.10, 0.42], [0.38, 1.10, 0.42],
    [-0.75, 1.00, 0.28], [0.75, 1.00, 0.28],

    // 12-13: Temples
    [-1.15, 0.85, 0.00], [1.15, 0.85, 0.00],

    // 14: Nasion (top of nose bridge between eyes)
    [0.00, 0.72, 0.50],

    // 15-19: Left eyebrow (inner to outer)
    [-0.20, 0.82, 0.50],
    [-0.40, 0.89, 0.48],
    [-0.60, 0.90, 0.42],
    [-0.82, 0.84, 0.30],
    [-1.00, 0.72, 0.15],

    // 20-24: Right eyebrow (inner to outer)
    [0.20, 0.82, 0.50],
    [0.40, 0.89, 0.48],
    [0.60, 0.90, 0.42],
    [0.82, 0.84, 0.30],
    [1.00, 0.72, 0.15],

    // 25-28: Left eye contour (inner, upper, outer, lower)
    [-0.26, 0.58, 0.44],
    [-0.50, 0.68, 0.42],
    [-0.74, 0.58, 0.34],
    [-0.50, 0.48, 0.42],
    // 29: Left pupil center
    [-0.50, 0.58, 0.40],

    // 30-33: Right eye contour (inner, upper, outer, lower)
    [0.26, 0.58, 0.44],
    [0.50, 0.68, 0.42],
    [0.74, 0.58, 0.34],
    [0.50, 0.48, 0.42],
    // 34: Right pupil center
    [0.50, 0.58, 0.40],

    // 35-39: Nose structure
    [0.00, 0.45, 0.64],   // bridge midpoint
    [0.00, 0.22, 0.78],   // supratip
    [0.00, 0.08, 0.92],   // nose tip (forward peak)
    [-0.24, 0.02, 0.68],  // left nostril alar
    [0.24, 0.02, 0.68],   // right nostril alar
    // 40: Subnasale (base of nose)
    [0.00, -0.08, 0.62],

    // 41-44: Cheekbones (zygomatic arch)
    [-0.92, 0.32, 0.34], [0.92, 0.32, 0.34],
    [-0.60, 0.10, 0.46], [0.60, 0.10, 0.46],

    // 45-48: Midface & nasolabial fold
    [-0.32, -0.15, 0.54], [0.32, -0.15, 0.54],
    [-0.68, -0.22, 0.38], [0.68, -0.22, 0.38],

    // 49-53: Outer lips (Cupid's bow & corners)
    [0.00, -0.22, 0.60],  // philtrum center
    [-0.20, -0.22, 0.56], [0.20, -0.22, 0.56],
    [-0.46, -0.32, 0.46], // left corner
    [0.46, -0.32, 0.46],  // right corner
    // 54-56: Lower lip
    [0.00, -0.46, 0.54],  // lower lip bottom
    [-0.22, -0.42, 0.50], [0.22, -0.42, 0.50],
    // 57: Mouth oral opening center
    [0.00, -0.32, 0.54],

    // 58-60: Chin structure
    [0.00, -0.72, 0.50],  // mental crease
    [0.00, -1.02, 0.48],  // chin peak
    [0.00, -1.28, 0.36],  // menton (bottom tip)
    // 61-62: Lateral chin
    [-0.32, -1.18, 0.36], [0.32, -1.18, 0.36],

    // 63-64: Jaw body
    [-0.68, -0.92, 0.22], [0.68, -0.92, 0.22],
    // 65-66: Gonion (jaw angles)
    [-0.98, -0.52, -0.05], [0.98, -0.52, -0.05],
    // 67-68: Mandible / ears
    [-1.15, 0.05, -0.35], [1.15, 0.05, -0.35],
  ];

  const faceGroup = new THREE.Group();
  rig.add(faceGroup);

  // Build landmark positions buffer
  const landmarkCount = RAW_LANDMARKS.length;
  const landmarkPositions = new Float32Array(landmarkCount * 3);
  for (let i = 0; i < landmarkCount; i++) {
    landmarkPositions[i * 3] = RAW_LANDMARKS[i][0];
    landmarkPositions[i * 3 + 1] = RAW_LANDMARKS[i][1];
    landmarkPositions[i * 3 + 2] = RAW_LANDMARKS[i][2];
  }

  const landmarkGeo = new THREE.BufferGeometry();
  landmarkGeo.setAttribute("position", new THREE.BufferAttribute(landmarkPositions, 3));

  // Glowing Points Material for Landmark Nodes
  const landmarkMat = new THREE.PointsMaterial({
    color: COLOR_ACCENT,
    size: 0.058,
    transparent: true,
    opacity: 0.85,
    sizeAttenuation: true,
  });
  const landmarkPoints = new THREE.Points(landmarkGeo, landmarkMat);
  faceGroup.add(landmarkPoints);

  // ---- 2. Facial Contour & Triangulation Wireframes ----------------
  const EDGES = [
    // Forehead arch
    [5, 3], [3, 1], [1, 0], [0, 2], [2, 4], [4, 6],
    // Mid forehead cross
    [1, 8], [0, 7], [2, 9], [7, 8], [7, 9], [8, 10], [9, 11],
    [10, 12], [11, 13], [3, 10], [4, 11], [5, 12], [6, 13],
    // Brow to forehead
    [7, 14], [8, 15], [9, 20], [10, 16], [11, 21],
    // Left eyebrow
    [15, 16], [16, 17], [17, 18], [18, 19], [19, 12],
    // Right eyebrow
    [20, 21], [21, 22], [22, 23], [23, 24], [24, 13],
    // Left eye orbit
    [25, 26], [26, 27], [27, 28], [28, 25],
    [15, 25], [16, 26], [17, 27], [18, 27],
    // Right eye orbit
    [30, 31], [31, 32], [32, 33], [33, 30],
    [20, 30], [21, 31], [22, 32], [23, 32],
    // Nose bridge & midline
    [14, 35], [35, 36], [36, 37], [37, 40],
    [14, 25], [14, 30], [35, 25], [35, 30],
    // Nose base & alar
    [37, 38], [37, 39], [38, 40], [39, 40],
    [28, 38], [33, 39], [25, 38], [30, 39],
    // Cheekbones & midface
    [27, 41], [32, 42], [41, 43], [42, 44],
    [41, 19], [42, 24], [41, 67], [42, 68],
    [43, 45], [44, 46], [38, 45], [39, 46],
    [43, 47], [44, 48], [47, 51], [48, 52],
    // Lips & mouth
    [40, 49], [49, 50], [49, 51], [50, 52], [51, 53],
    [45, 52], [46, 53], [52, 57], [53, 57],
    [52, 55], [53, 56], [54, 55], [54, 56], [49, 57], [54, 57],
    // Chin & lower face
    [54, 58], [58, 59], [59, 60],
    [59, 61], [59, 62], [60, 61], [60, 62],
    [52, 63], [53, 64], [61, 63], [62, 64],
    // Jawline from left ear around chin to right ear
    [67, 65], [65, 63], [63, 61], [61, 60],
    [60, 62], [62, 64], [64, 66], [66, 68],
    [47, 65], [48, 66],
  ];

  const edgePoints = [];
  for (let i = 0; i < EDGES.length; i++) {
    const p1 = RAW_LANDMARKS[EDGES[i][0]];
    const p2 = RAW_LANDMARKS[EDGES[i][1]];
    if (p1 && p2) {
      edgePoints.push(new THREE.Vector3(p1[0], p1[1], p1[2]));
      edgePoints.push(new THREE.Vector3(p2[0], p2[1], p2[2]));
    }
  }

  const wireGeo = new THREE.BufferGeometry().setFromPoints(edgePoints);
  const wireMat = new THREE.LineBasicMaterial({
    color: COLOR_ACCENT,
    transparent: true,
    opacity: 0.38,
  });
  const faceWireframe = new THREE.LineSegments(wireGeo, wireMat);
  faceGroup.add(faceWireframe);

  // Subtle translucent facial volumetric presence
  const faceSolidGeo = new THREE.BufferGeometry();
  faceSolidGeo.setAttribute("position", new THREE.BufferAttribute(landmarkPositions, 3));
  const TRI_INDICES = [
    7, 14, 8,   7, 9, 14,   8, 14, 25,  9, 30, 14,
    14, 35, 25, 14, 30, 35, 25, 35, 38, 30, 39, 35,
    35, 36, 38, 35, 39, 36, 36, 37, 38, 36, 39, 37,
    37, 40, 38, 37, 39, 40, 40, 49, 45, 40, 46, 49,
    49, 52, 54, 49, 54, 53, 54, 58, 61, 54, 62, 58,
    58, 59, 61, 58, 62, 59, 59, 60, 61, 59, 62, 60
  ];
  faceSolidGeo.setIndex(TRI_INDICES);
  faceSolidGeo.computeVertexNormals();
  const faceSolidMat = new THREE.MeshStandardMaterial({
    color: 0x0c1015,
    roughness: 0.3,
    metalness: 0.8,
    transparent: true,
    opacity: 0.45,
    side: THREE.DoubleSide,
  });
  const faceSolid = new THREE.Mesh(faceSolidGeo, faceSolidMat);
  faceGroup.add(faceSolid);

  // ---- 3. Dual Eye Biometric Alignment Reticles ---------------------
  function createEyeReticle(cx, cy, cz) {
    const eyeGroup = new THREE.Group();
    eyeGroup.position.set(cx, cy, cz);

    // Inner reticle circle
    const circlePts = [];
    const segs = 32;
    const r = 0.22;
    for (let i = 0; i <= segs; i++) {
      const theta = (i / segs) * Math.PI * 2;
      circlePts.push(new THREE.Vector3(Math.cos(theta) * r, Math.sin(theta) * r, 0));
    }
    const circleGeo = new THREE.BufferGeometry().setFromPoints(circlePts);
    const circleMat = new THREE.LineBasicMaterial({ color: COLOR_ACCENT, transparent: true, opacity: 0.65 });
    eyeGroup.add(new THREE.Line(circleGeo, circleMat));

    // Crosshair ticks
    const tickPts = [
      new THREE.Vector3(-r * 1.35, 0, 0), new THREE.Vector3(-r * 0.7, 0, 0),
      new THREE.Vector3(r * 0.7, 0, 0), new THREE.Vector3(r * 1.35, 0, 0),
      new THREE.Vector3(0, -r * 1.35, 0), new THREE.Vector3(0, -r * 0.7, 0),
      new THREE.Vector3(0, r * 0.7, 0), new THREE.Vector3(0, r * 1.35, 0),
    ];
    const tickGeo = new THREE.BufferGeometry().setFromPoints(tickPts);
    const tickMat = new THREE.LineSegments(tickGeo, new THREE.LineBasicMaterial({ color: COLOR_ACCENT_2, transparent: true, opacity: 0.7 }));
    eyeGroup.add(tickMat);

    // Center pupil lock dot
    const dotGeo = new THREE.OctahedronGeometry(0.035, 0);
    const dotMat = new THREE.MeshBasicMaterial({ color: COLOR_SUCCESS });
    const dot = new THREE.Mesh(dotGeo, dotMat);
    eyeGroup.add(dot);

    return eyeGroup;
  }

  const leftEyeReticle = createEyeReticle(-0.50, 0.58, 0.44);
  const rightEyeReticle = createEyeReticle(0.50, 0.58, 0.44);
  faceGroup.add(leftEyeReticle);
  faceGroup.add(rightEyeReticle);

  // ---- 4. Forensic Bounding Box & Target Corner Brackets ------------
  const bboxGroup = new THREE.Group();
  rig.add(bboxGroup);

  const bw = 1.35; // half width
  const bh = 1.65; // half height
  const bz = 0.55; // front depth
  const blen = 0.35; // corner bracket arm length

  // 4 Corner brackets: Top-Left, Top-Right, Bottom-Left, Bottom-Right
  const bracketSegments = [
    // Top-Left
    new THREE.Vector3(-bw, bh - blen, bz), new THREE.Vector3(-bw, bh, bz),
    new THREE.Vector3(-bw, bh, bz), new THREE.Vector3(-bw + blen, bh, bz),
    new THREE.Vector3(-bw, bh, bz), new THREE.Vector3(-bw, bh, bz - blen),

    // Top-Right
    new THREE.Vector3(bw, bh - blen, bz), new THREE.Vector3(bw, bh, bz),
    new THREE.Vector3(bw, bh, bz), new THREE.Vector3(bw - blen, bh, bz),
    new THREE.Vector3(bw, bh, bz), new THREE.Vector3(bw, bh, bz - blen),

    // Bottom-Left
    new THREE.Vector3(-bw, -bh + blen, bz), new THREE.Vector3(-bw, -bh, bz),
    new THREE.Vector3(-bw, -bh, bz), new THREE.Vector3(-bw + blen, -bh, bz),
    new THREE.Vector3(-bw, -bh, bz), new THREE.Vector3(-bw, -bh, bz - blen),

    // Bottom-Right
    new THREE.Vector3(bw, -bh + blen, bz), new THREE.Vector3(bw, -bh, bz),
    new THREE.Vector3(bw, -bh, bz), new THREE.Vector3(bw - blen, -bh, bz),
    new THREE.Vector3(bw, -bh, bz), new THREE.Vector3(bw, -bh, bz - blen),
  ];

  const bracketGeo = new THREE.BufferGeometry().setFromPoints(bracketSegments);
  const bracketMat = new THREE.LineSegments(
    bracketGeo,
    new THREE.LineBasicMaterial({ color: COLOR_ACCENT, transparent: true, opacity: 0.9, linewidth: 2 })
  );
  bboxGroup.add(bracketMat);

  // Subtle outer wirefrustum box
  const outerBoxGeo = new THREE.BoxGeometry(bw * 2, bh * 2, bz * 2);
  const outerBoxEdges = new THREE.LineSegments(
    new THREE.EdgesGeometry(outerBoxGeo),
    new THREE.LineBasicMaterial({ color: COLOR_LINE, transparent: true, opacity: 0.3 })
  );
  bboxGroup.add(outerBoxEdges);

  // ---- 5. Biometric Laser Scanning Plane ---------------------------
  const scanGroup = new THREE.Group();
  rig.add(scanGroup);

  // Glowing laser line
  const laserPts = [
    new THREE.Vector3(-bw * 1.05, 0, bz + 0.05),
    new THREE.Vector3(bw * 1.05, 0, bz + 0.05),
  ];
  const laserLineGeo = new THREE.BufferGeometry().setFromPoints(laserPts);
  const laserLineMat = new THREE.LineBasicMaterial({ color: COLOR_ACCENT, transparent: true, opacity: 0.95 });
  const laserLine = new THREE.Line(laserLineGeo, laserLineMat);
  scanGroup.add(laserLine);

  // Translucent sweep plane trailing behind laser
  const sweepGeo = new THREE.PlaneGeometry(bw * 2.1, 0.45);
  const sweepMat = new THREE.MeshBasicMaterial({
    color: COLOR_ACCENT,
    transparent: true,
    opacity: 0.12,
    side: THREE.DoubleSide,
  });
  const sweepPlane = new THREE.Mesh(sweepGeo, sweepMat);
  sweepPlane.position.set(0, 0.22, bz + 0.02);
  scanGroup.add(sweepPlane);

  // ---- 6. Concentric Biometric ArcFace Coordinate Rings ------------
  const ringGroup = new THREE.Group();
  rig.add(ringGroup);

  function makeCoordRing(radius, tiltX, tiltY) {
    const pts = [];
    const segs = 64;
    for (let i = 0; i <= segs; i++) {
      const theta = (i / segs) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(theta) * radius, Math.sin(theta) * radius, 0));
    }
    const g = new THREE.BufferGeometry().setFromPoints(pts);
    const m = new THREE.LineBasicMaterial({ color: COLOR_ACCENT_2, transparent: true, opacity: 0.22 });
    const ring = new THREE.Line(g, m);
    ring.rotation.x = tiltX;
    ring.rotation.y = tiltY;
    return ring;
  }

  const orbitRing1 = makeCoordRing(2.3, Math.PI * 0.35, Math.PI * 0.15);
  const orbitRing2 = makeCoordRing(2.6, -Math.PI * 0.25, Math.PI * 0.3);
  ringGroup.add(orbitRing1);
  ringGroup.add(orbitRing2);

  // ---- 7. Ambient Floating Feature Vector Particles ----------------
  const PARTICLE_COUNT = 90;
  const particlePositions = new Float32Array(PARTICLE_COUNT * 3);
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const r = 2.4 + Math.random() * 2.2;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    particlePositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    particlePositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.8;
    particlePositions[i * 3 + 2] = r * Math.cos(phi) * 0.7 - 0.5;
  }
  const particleGeo = new THREE.BufferGeometry();
  particleGeo.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));
  const particleMat = new THREE.PointsMaterial({
    color: 0x6e7b8c,
    size: 0.022,
    transparent: true,
    opacity: 0.45,
    sizeAttenuation: true,
  });
  const particles = new THREE.Points(particleGeo, particleMat);
  rig.add(particles);

  // ---- Interaction State (Smooth Pointer Parallax) -----------------
  let targetRotX = 0;
  let targetRotY = 0;
  let currentRotX = 0;
  let currentRotY = 0;

  function onPointerMove(e) {
    const rect = container.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width - 0.5;
    const ny = (e.clientY - rect.top) / rect.height - 0.5;
    targetRotY = nx * 0.55;
    targetRotX = ny * 0.35;
  }

  if (!prefersReducedMotion) {
    container.addEventListener("mousemove", onPointerMove);
    container.addEventListener("mouseleave", () => {
      targetRotX = 0;
      targetRotY = 0;
    });
  }

  // ---- Visibility Handling -----------------------------------------
  let isVisible = true;
  const io =
    "IntersectionObserver" in window
      ? new IntersectionObserver(
          (entries) => {
            isVisible = entries[0].isIntersecting;
          },
          { threshold: 0.05 }
        )
      : null;
  if (io) io.observe(container);

  window.addEventListener("resize", resize);
  resize();

  // ---- Render Animation Loop ---------------------------------------
  const clock = new THREE.Clock();

  function renderStatic() {
    resize();
    renderer.render(scene, camera);
  }

  function animate() {
    if (prefersReducedMotion) return;
    requestAnimationFrame(animate);
    if (!isVisible) return;

    const dt = clock.getDelta();
    const elapsed = clock.getElapsedTime();

    // Gentle base oscillation (looking around slowly)
    const baseRotY = Math.sin(elapsed * 0.45) * 0.18;
    const baseRotX = Math.sin(elapsed * 0.3) * 0.08;

    // Smooth cursor tracking interpolation
    currentRotX += (targetRotX + baseRotX - currentRotX) * 0.05;
    currentRotY += (targetRotY + baseRotY - currentRotY) * 0.05;
    rig.rotation.y = currentRotY;
    rig.rotation.x = currentRotX;

    // Vertical Laser Scanning Motion (Sweeps through facial contours)
    const scanY = Math.sin(elapsed * 0.75) * 1.5;
    scanGroup.position.y = scanY;

    // Dynamic landmark illumination when laser passes
    landmarkMat.opacity = 0.75 + Math.sin(elapsed * 1.6) * 0.15;
    laserLineMat.opacity = 0.85 + Math.cos(elapsed * 3) * 0.12;

    // Eye reticles rotate continuously
    leftEyeReticle.rotation.z += dt * 0.6;
    rightEyeReticle.rotation.z -= dt * 0.6;

    // Outer coordinate rings rotate slowly
    orbitRing1.rotation.z += dt * 0.08;
    orbitRing2.rotation.z -= dt * 0.06;
    particles.rotation.y -= dt * 0.015;

    renderer.render(scene, camera);
  }

  if (prefersReducedMotion) {
    renderStatic();
  } else {
    animate();
  }
})();
