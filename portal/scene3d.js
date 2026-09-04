/**
 * Unibot Lab - 3D Landing Page Engine: "Kinematic Evolution"
 * Procedural Three.js visualization of the 5 robotics phases with full orbit controls.
 * Zero external asset dependencies.
 */

(function () {
  let scene, camera, renderer;
  let container;
  let models = [];
  let groundGrid;
  let animFrameId = null;
  let activePhase = 1;

  // Phase metadata for the inspection card and dock
  const PHASES_DATA = [
    {
      phase: 1,
      name: "The Dot",
      title: "1-DoF Inverted Pendulum",
      tag: "PHASE 1 // THE DOT",
      xp: "+200 XP",
      status: "completed",
      statusText: "Completed ✓",
      lessonId: "1.1",
      posX: -16,
      desc: "First-principles mechanics: generalized coordinates, gravity torque, and closed-loop PD disturbance rejection. Master single-joint control before scaling degrees of freedom.",
      formula: "$$\\tau(t) = K_p \\cdot (q^* - q) - K_d \\cdot \\dot{q}$$"
    },
    {
      phase: 2,
      name: "The Line",
      title: "2-DoF Planar Arm & FK",
      tag: "PHASE 2 // THE LINE",
      xp: "+350 XP",
      status: "next",
      statusText: "Current Focus &bull; Start Now",
      lessonId: "2.1",
      posX: -8,
      desc: "Kinematic chains in the plane: DH parameters, rotation matrices, Forward Kinematics, and planar end-effector trajectory tracking with continuous workspace mapping.",
      formula: "$$\\begin{bmatrix} x \\\\ y \\end{bmatrix} = \\begin{bmatrix} l_1 c_1 + l_2 c_{12} \\\\ l_1 s_1 + l_2 s_{12} \\end{bmatrix}$$"
    },
    {
      phase: 3,
      name: "The Shape",
      title: "6-DoF Spatial Arm & IK",
      tag: "PHASE 3 // THE SHAPE",
      xp: "+600 XP",
      status: "locked",
      statusText: "Locked (Prereq: Phase 2)",
      lessonId: "3.1",
      posX: 0,
      desc: "Full 3D spatial manipulators: 6-DoF inverse kinematics, Jacobian matrices, singularity avoidance, and resolved-rate impedance control for manipulation tasks.",
      formula: "$$\\dot{\\mathbf{x}} = \\mathbf{J}(\\mathbf{q})\\dot{\\mathbf{q}} \\implies \\dot{\\mathbf{q}} = \\mathbf{J}^\\dagger \\dot{\\mathbf{x}}$$"
    },
    {
      phase: 4,
      name: "The Vision",
      title: "RGB-D Perception & Voxels",
      tag: "PHASE 4 // THE VISION",
      xp: "+750 XP",
      status: "locked",
      statusText: "Locked (Prereq: Phase 3)",
      lessonId: "4.1",
      posX: 8,
      desc: "Closing the loop with spatial perception: camera intrinsic matrices, depth back-projection, point cloud voxelization, and 3D visual target tracking.",
      formula: "$$\\mathbf{P}_C = \\mathbf{K}^{-1} \\begin{bmatrix} u \\\\ v \\\\ 1 \\end{bmatrix} \\cdot Z$$"
    },
    {
      phase: 5,
      name: "The Humanoid",
      title: "Unitree G1 Bipedal Locomotion",
      tag: "PHASE 5 // THE HUMANOID",
      xp: "+1200 XP",
      status: "locked",
      statusText: "Locked (Apex Mission)",
      lessonId: "5.1",
      posX: 16,
      desc: "Apex robotics: 23-DoF bipedal dynamics, Zero-Moment Point (ZMP) stability, Whole-Body Model Predictive Control (MPC), and contact implicit trajectory optimization.",
      formula: "$$\\min_{\\mathbf{u}} \\sum_{k=0}^{N} \\|\\mathbf{x}_k - \\mathbf{x}^*\\|_{\\mathbf{Q}}^2 + \\|\\mathbf{u}_k\\|_{\\mathbf{R}}^2$$"
    }
  ];

  // Camera Orbit & Interpolation State
  const cameraState = {
    targetPos: new THREE.Vector3(-16, 2.8, 8.5),
    currentPos: new THREE.Vector3(-16, 4.5, 14),
    targetLookAt: new THREE.Vector3(-16, 2.0, 0),
    currentLookAt: new THREE.Vector3(-16, 2.0, 0),
    radius: 7.8,
    theta: Math.PI / 2, // azimuth
    phi: Math.PI / 2.6, // elevation
    isDragging: false,
    prevMouse: { x: 0, y: 0 },
    autoRotate: true,
    lerpSpeed: 0.055
  };

  // Model animation handles
  let pendulumJoint, pendulumBob;
  let armLink1, armLink2, armTipTrail, armTrailPoints = [];
  let spatialJoints = [];
  let visionFrustumLines, pointCloudParticles, laserScanner;
  let humanoidBones = {};

  let isInitialized = false;

  /**
   * Initialize the 3D Stage
   */
  function initScene3D() {
    container = document.getElementById("canvas3DContainer");
    if (!container) return;

    // Avoid duplicate initialization
    if (isInitialized) {
      updateDimensions();
      return;
    }

    const rect = container.getBoundingClientRect();
    const width = (rect.width > 0) ? rect.width : (container.clientWidth || (window.innerWidth - 290));
    const height = (rect.height > 0) ? rect.height : (container.clientHeight || (window.innerHeight - 56));

    // 1. Scene setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1A1B26);
    scene.fog = new THREE.FogExp2(0x1A1B26, 0.022);

    // 2. Camera setup
    camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.copy(cameraState.currentPos);
    camera.lookAt(cameraState.currentLookAt);

    // 3. Renderer setup
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    // Sub-pixel automatic canvas resizing via ResizeObserver
    if (typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver(() => {
        updateDimensions();
      });
      ro.observe(container);
    }

    // 4. Lighting setup (Tokyo Night palette)
    setupLights();

    // 5. Build Environment Floor & Stage Markers
    buildEnvironment();

    // 6. Build the 5 Procedural Models
    buildPhase1Pendulum();
    buildPhase2PlanarArm();
    buildPhase3SpatialManipulator();
    buildPhase4PerceptionVision();
    buildPhase5Humanoid();

    // 7. Setup Interaction (Orbit controls & Raycasting)
    setupInteraction();

    // 8. Hook up Dock Buttons
    setupDockButtons();

    // 9. Initial inspection card state
    updateInspectCard(activePhase);

    // 10. Start Animation Loop
    isInitialized = true;
    animate();

    window.addEventListener("resize", onWindowResize);
  }

  /**
   * Lighting system
   */
  function setupLights() {
    const ambient = new THREE.AmbientLight(0x24283B, 2.2);
    scene.add(ambient);

    // Key light (Tokyo Night Blue)
    const keyLight = new THREE.DirectionalLight(0x7AA2F7, 2.0);
    keyLight.position.set(10, 20, 15);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.bias = -0.001;
    scene.add(keyLight);

    // Rim light (Subtle Magenta / Purple)
    const rimLight = new THREE.DirectionalLight(0xBB9AF7, 1.2);
    rimLight.position.set(-15, 12, -15);
    scene.add(rimLight);

    // Soft fill from below
    const fillLight = new THREE.DirectionalLight(0x414868, 0.8);
    fillLight.position.set(0, -10, 10);
    scene.add(fillLight);
  }

  /**
   * Procedural floor grid and illuminated pedestals
   */
  function buildEnvironment() {
    // Large ground grid
    const gridHelper = new THREE.GridHelper(80, 80, 0x414868, 0x24283B);
    gridHelper.position.y = 0;
    scene.add(gridHelper);

    // Subtle reflective ground disk
    const groundGeo = new THREE.PlaneGeometry(80, 80);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x16161E,
      roughness: 0.85,
      metalness: 0.2
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.01;
    ground.receiveShadow = true;
    scene.add(ground);

    // Glowing stage rings and pedestals for each phase
    PHASES_DATA.forEach((p, idx) => {
      const ringGroup = new THREE.Group();
      ringGroup.position.set(p.posX, 0.02, 0);

      // Base cylinder pedestal
      const pedGeo = new THREE.CylinderGeometry(2.0, 2.2, 0.15, 32);
      const pedMat = new THREE.MeshStandardMaterial({
        color: 0x1F2335,
        metalness: 0.6,
        roughness: 0.4
      });
      const pedestal = new THREE.Mesh(pedGeo, pedMat);
      pedestal.position.y = 0.075;
      pedestal.receiveShadow = true;
      pedestal.userData = { phaseIndex: p.phase };
      ringGroup.add(pedestal);

      // Neon outer ring
      const ringGeo = new THREE.RingGeometry(2.1, 2.18, 48);
      const ringMat = new THREE.MeshBasicMaterial({
        color: p.phase === 1 ? 0x9ECE6A : (p.phase === 2 ? 0x7AA2F7 : 0x565F89),
        side: THREE.DoubleSide
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.16;
      ringGroup.add(ring);

      scene.add(ringGroup);
    });
  }

  // =========================================================================
  // MODEL 1: Phase 1 Inverted Pendulum (The Dot)
  // =========================================================================
  function buildPhase1Pendulum() {
    const group = new THREE.Group();
    group.position.set(-16, 0.15, 0);
    group.userData = { phaseIndex: 1 };

    // Metallic Base Stand
    const baseGeo = new THREE.CylinderGeometry(0.8, 1.0, 0.3, 24);
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x292E42, metalness: 0.8, roughness: 0.2 });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = 0.15;
    group.add(base);

    // Vertical Yoke Pillars
    const pillarGeo = new THREE.BoxGeometry(0.12, 1.6, 0.35);
    const pillarMat = new THREE.MeshStandardMaterial({ color: 0x414868, metalness: 0.6, roughness: 0.3 });
    const pillarL = new THREE.Mesh(pillarGeo, pillarMat);
    pillarL.position.set(-0.35, 0.95, 0);
    const pillarR = new THREE.Mesh(pillarGeo, pillarMat);
    pillarR.position.set(0.35, 0.95, 0);
    group.add(pillarL);
    group.add(pillarR);

    // Motor Joint Housing (Bearing)
    const bearingGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.8, 20);
    bearingGeo.rotateZ(Math.PI / 2);
    const bearingMat = new THREE.MeshStandardMaterial({ color: 0x7AA2F7, metalness: 0.9, roughness: 0.1 });
    const bearing = new THREE.Mesh(bearingGeo, bearingMat);
    bearing.position.y = 1.6;
    group.add(bearing);

    // Rotating Joint Anchor
    pendulumJoint = new THREE.Group();
    pendulumJoint.position.set(0, 1.6, 0);

    // Pendulum Rod (pointing upwards, length = 2.0)
    const rodGeo = new THREE.CylinderGeometry(0.05, 0.05, 2.0, 16);
    rodGeo.translate(0, 1.0, 0); // Origin at bottom of rod
    const rodMat = new THREE.MeshStandardMaterial({ color: 0xF7768E, metalness: 0.7, roughness: 0.3 });
    const rod = new THREE.Mesh(rodGeo, rodMat);
    pendulumJoint.add(rod);

    // Glowing Inverted Bob (The Point Mass)
    const bobGeo = new THREE.SphereGeometry(0.22, 24, 24);
    const bobMat = new THREE.MeshStandardMaterial({
      color: 0x9ECE6A,
      emissive: 0x9ECE6A,
      emissiveIntensity: 0.6,
      metalness: 0.3,
      roughness: 0.2
    });
    pendulumBob = new THREE.Mesh(bobGeo, bobMat);
    pendulumBob.position.set(0, 2.0, 0);
    pendulumJoint.add(pendulumBob);

    // Target balance reference ring (subtle dashed circle)
    const refRingGeo = new THREE.RingGeometry(1.95, 2.02, 32);
    const refRingMat = new THREE.MeshBasicMaterial({ color: 0x7AA2F7, wireframe: true, transparent: true, opacity: 0.25 });
    const refRing = new THREE.Mesh(refRingGeo, refRingMat);
    refRing.position.set(0, 1.6, 0);
    group.add(refRing);

    group.add(pendulumJoint);
    scene.add(group);
    models.push(group);
  }

  // =========================================================================
  // MODEL 2: Phase 2 Planar 2-DoF Arm (The Line)
  // =========================================================================
  function buildPhase2PlanarArm() {
    const group = new THREE.Group();
    group.position.set(-8, 0.15, 0);
    group.userData = { phaseIndex: 2 };

    // Base Joint Base
    const baseGeo = new THREE.CylinderGeometry(0.9, 1.1, 0.4, 24);
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x24283B, metalness: 0.8, roughness: 0.3 });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = 0.2;
    group.add(base);

    // Joint 1 Turret
    const j1Geo = new THREE.CylinderGeometry(0.35, 0.35, 0.5, 20);
    const jMat = new THREE.MeshStandardMaterial({ color: 0x7AA2F7, metalness: 0.9, roughness: 0.2 });
    const j1Mesh = new THREE.Mesh(j1Geo, jMat);
    j1Mesh.position.y = 0.45;
    group.add(j1Mesh);

    // Arm Link 1 (Length = 1.8)
    armLink1 = new THREE.Group();
    armLink1.position.set(0, 0.6, 0);

    const l1Geo = new THREE.BoxGeometry(0.2, 0.25, 1.8);
    l1Geo.translate(0, 0, 0.9); // Pivot at start of link
    const linkMat1 = new THREE.MeshStandardMaterial({ color: 0x414868, metalness: 0.5, roughness: 0.3 });
    const l1Mesh = new THREE.Mesh(l1Geo, linkMat1);
    armLink1.add(l1Mesh);

    // Elbow Joint 2
    const j2Mesh = new THREE.Mesh(j1Geo, jMat);
    j2Mesh.position.set(0, 0.05, 1.8);
    armLink1.add(j2Mesh);

    // Arm Link 2 (Forearm, Length = 1.4)
    armLink2 = new THREE.Group();
    armLink2.position.set(0, 0.05, 1.8);

    const l2Geo = new THREE.BoxGeometry(0.16, 0.2, 1.4);
    l2Geo.translate(0, 0, 0.7);
    const linkMat2 = new THREE.MeshStandardMaterial({ color: 0x565F89, metalness: 0.6, roughness: 0.3 });
    const l2Mesh = new THREE.Mesh(l2Geo, linkMat2);
    armLink2.add(l2Mesh);

    // End-effector stylus with cyan neon tip
    const tipGeo = new THREE.SphereGeometry(0.12, 16, 16);
    const tipMat = new THREE.MeshStandardMaterial({
      color: 0x7DCFFF,
      emissive: 0x7DCFFF,
      emissiveIntensity: 0.8
    });
    const tipMesh = new THREE.Mesh(tipGeo, tipMat);
    tipMesh.position.set(0, 0, 1.4);
    armLink2.add(tipMesh);

    armLink1.add(armLink2);
    group.add(armLink1);

    // Real-time End-Effector Trajectory Trail Line
    const trailMaxPoints = 120;
    const trailGeo = new THREE.BufferGeometry();
    const trailPositions = new Float32Array(trailMaxPoints * 3);
    trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
    const trailMat = new THREE.LineBasicMaterial({
      color: 0x7DCFFF,
      transparent: true,
      opacity: 0.75,
      linewidth: 2
    });
    armTipTrail = new THREE.Line(trailGeo, trailMat);
    group.add(armTipTrail);

    scene.add(group);
    models.push(group);
  }

  // =========================================================================
  // MODEL 3: Phase 3 Spatial 6-DoF Manipulator (The Shape)
  // =========================================================================
  function buildPhase3SpatialManipulator() {
    const group = new THREE.Group();
    group.position.set(0, 0.15, 0);
    group.userData = { phaseIndex: 3 };

    const metalMat = new THREE.MeshStandardMaterial({ color: 0x292E42, metalness: 0.85, roughness: 0.25 });
    const accentMat = new THREE.MeshStandardMaterial({ color: 0xFF9E64, metalness: 0.8, roughness: 0.2 });
    const armMat = new THREE.MeshStandardMaterial({ color: 0xC0CAF5, metalness: 0.4, roughness: 0.4 });

    // Base Pedestal
    const baseGeo = new THREE.CylinderGeometry(1.0, 1.2, 0.4, 32);
    const base = new THREE.Mesh(baseGeo, metalMat);
    base.position.y = 0.2;
    group.add(base);

    // Axis 1: Base Turret
    const j1 = new THREE.Group();
    j1.position.y = 0.4;
    const j1Mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.5, 24), accentMat);
    j1Mesh.position.y = 0.25;
    j1.add(j1Mesh);

    // Axis 2: Shoulder Yoke
    const j2 = new THREE.Group();
    j2.position.set(0, 0.5, 0);
    const shoulderGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.8, 20);
    shoulderGeo.rotateZ(Math.PI / 2);
    const shoulderMesh = new THREE.Mesh(shoulderGeo, metalMat);
    j2.add(shoulderMesh);

    // Upper Arm Link (Length = 1.6)
    const upperArmGeo = new THREE.BoxGeometry(0.3, 1.6, 0.35);
    upperArmGeo.translate(0, 0.8, 0);
    const upperArm = new THREE.Mesh(upperArmGeo, armMat);
    j2.add(upperArm);

    // Axis 3: Elbow Joint
    const j3 = new THREE.Group();
    j3.position.set(0, 1.6, 0);
    const elbowMesh = new THREE.Mesh(shoulderGeo, accentMat);
    j3.add(elbowMesh);

    // Forearm Link (Length = 1.4)
    const forearmGeo = new THREE.BoxGeometry(0.24, 1.4, 0.28);
    forearmGeo.translate(0, 0.7, 0);
    const forearm = new THREE.Mesh(forearmGeo, armMat);
    j3.add(forearm);

    // Axis 4, 5, 6: Spherical Wrist & Flange
    const wrist = new THREE.Group();
    wrist.position.set(0, 1.4, 0);
    const wristGeo = new THREE.SphereGeometry(0.22, 16, 16);
    const wristMesh = new THREE.Mesh(wristGeo, metalMat);
    wrist.add(wristMesh);

    // Tool Gripper
    const gripBaseGeo = new THREE.BoxGeometry(0.3, 0.12, 0.2);
    gripBaseGeo.translate(0, 0.12, 0);
    const gripBase = new THREE.Mesh(gripBaseGeo, accentMat);
    wrist.add(gripBase);

    // Gripper Fingers
    const fingerGeo = new THREE.BoxGeometry(0.06, 0.25, 0.08);
    fingerGeo.translate(0, 0.28, 0);
    const f1 = new THREE.Mesh(fingerGeo, metalMat);
    f1.position.x = -0.1;
    const f2 = new THREE.Mesh(fingerGeo, metalMat);
    f2.position.x = 0.1;
    wrist.add(f1);
    wrist.add(f2);

    // Spatial Coordinate Frame Triad (RGB = XYZ)
    const triad = new THREE.AxesHelper(0.5);
    triad.position.y = 0.42;
    wrist.add(triad);

    j3.add(wrist);
    j2.add(j3);
    j1.add(j2);
    group.add(j1);

    spatialJoints = [j1, j2, j3, wrist];

    scene.add(group);
    models.push(group);
  }

  // =========================================================================
  // MODEL 4: Phase 4 RGB-D Perception & Spatial Voxels (The Vision)
  // =========================================================================
  function buildPhase4PerceptionVision() {
    const group = new THREE.Group();
    group.position.set(8, 0.15, 0);
    group.userData = { phaseIndex: 4 };

    // Sleek sensor pylon
    const pylonGeo = new THREE.CylinderGeometry(0.12, 0.4, 2.2, 24);
    const pylonMat = new THREE.MeshStandardMaterial({ color: 0x24283B, metalness: 0.7, roughness: 0.3 });
    const pylon = new THREE.Mesh(pylonGeo, pylonMat);
    pylon.position.y = 1.1;
    group.add(pylon);

    // Sensor Head (Intel RealSense / OAK-D form factor)
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 2.2, 0);

    const headGeo = new THREE.BoxGeometry(0.9, 0.24, 0.25);
    const headMat = new THREE.MeshStandardMaterial({ color: 0x1A1B26, metalness: 0.9, roughness: 0.1 });
    const head = new THREE.Mesh(headGeo, headMat);
    headGroup.add(head);

    // Dual Stereo Lenses + IR Projector
    const lensGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.08, 16);
    lensGeo.rotateX(Math.PI / 2);
    const lensMat = new THREE.MeshStandardMaterial({ color: 0x7AA2F7, metalness: 0.9, roughness: 0.1 });
    const leftLens = new THREE.Mesh(lensGeo, lensMat);
    leftLens.position.set(-0.32, 0, 0.12);
    const rightLens = new THREE.Mesh(lensGeo, lensMat);
    rightLens.position.set(0.32, 0, 0.12);
    const irCenter = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 12), new THREE.MeshBasicMaterial({ color: 0xF7768E }));
    irCenter.position.set(0, 0, 0.13);
    headGroup.add(leftLens);
    headGroup.add(rightLens);
    headGroup.add(irCenter);

    // Wireframe Camera Projection Frustum
    const frustumGeo = new THREE.BufferGeometry();
    const fPoints = [
      // Apex
      new THREE.Vector3(0, 0, 0.15), new THREE.Vector3(-1.4, 0.9, 3.2),
      new THREE.Vector3(0, 0, 0.15), new THREE.Vector3(1.4, 0.9, 3.2),
      new THREE.Vector3(0, 0, 0.15), new THREE.Vector3(1.4, -0.9, 3.2),
      new THREE.Vector3(0, 0, 0.15), new THREE.Vector3(-1.4, -0.9, 3.2),
      // Base rectangle
      new THREE.Vector3(-1.4, 0.9, 3.2), new THREE.Vector3(1.4, 0.9, 3.2),
      new THREE.Vector3(1.4, 0.9, 3.2), new THREE.Vector3(1.4, -0.9, 3.2),
      new THREE.Vector3(1.4, -0.9, 3.2), new THREE.Vector3(-1.4, -0.9, 3.2),
      new THREE.Vector3(-1.4, -0.9, 3.2), new THREE.Vector3(-1.4, 0.9, 3.2)
    ];
    frustumGeo.setFromPoints(fPoints);
    const frustumMat = new THREE.LineBasicMaterial({ color: 0x7AA2F7, transparent: true, opacity: 0.45 });
    visionFrustumLines = new THREE.LineSegments(frustumGeo, frustumMat);
    headGroup.add(visionFrustumLines);

    // Scanning Horizontal Laser Beam inside Frustum
    const laserGeo = new THREE.BoxGeometry(2.4, 0.02, 0.05);
    const laserMat = new THREE.MeshBasicMaterial({ color: 0x9ECE6A, transparent: true, opacity: 0.8 });
    laserScanner = new THREE.Mesh(laserGeo, laserMat);
    laserScanner.position.set(0, 0, 2.8);
    headGroup.add(laserScanner);

    group.add(headGroup);

    // 3D Point Cloud Voxel Cluster (approx 350 depth sensor points)
    const particleCount = 360;
    const pGeo = new THREE.BufferGeometry();
    const pPositions = new Float32Array(particleCount * 3);
    const pColors = new Float32Array(particleCount * 3);
    const colorNear = new THREE.Color(0x7DCFFF);
    const colorFar = new THREE.Color(0xBB9AF7);

    for (let i = 0; i < particleCount; i++) {
      const u = (Math.random() - 0.5) * 2.2;
      const v = (Math.random() - 0.5) * 1.5;
      const w = 1.8 + Math.random() * 2.0;

      pPositions[i * 3] = u * (w / 2.0);
      pPositions[i * 3 + 1] = 2.2 + v * (w / 2.0);
      pPositions[i * 3 + 2] = w;

      const t = (w - 1.8) / 2.0;
      const c = colorNear.clone().lerp(colorFar, t);
      pColors[i * 3] = c.r;
      pColors[i * 3 + 1] = c.g;
      pColors[i * 3 + 2] = c.b;
    }

    pGeo.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
    pGeo.setAttribute('color', new THREE.BufferAttribute(pColors, 3));

    const pMat = new THREE.PointsMaterial({
      size: 0.07,
      vertexColors: true,
      transparent: true,
      opacity: 0.85
    });
    pointCloudParticles = new THREE.Points(pGeo, pMat);
    group.add(pointCloudParticles);

    scene.add(group);
    models.push(group);
  }

  // =========================================================================
  // MODEL 5: Phase 5 Unitree G1 Humanoid (The Humanoid)
  // =========================================================================
  function buildPhase5Humanoid() {
    const group = new THREE.Group();
    group.position.set(16, 0.15, 0);
    group.userData = { phaseIndex: 5 };

    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1F2335, metalness: 0.85, roughness: 0.3 });
    const whitePlates = new THREE.MeshStandardMaterial({ color: 0xC0CAF5, metalness: 0.5, roughness: 0.35 });
    const jointMat = new THREE.MeshStandardMaterial({ color: 0x7AA2F7, metalness: 0.9, roughness: 0.1 });
    const visorMat = new THREE.MeshBasicMaterial({ color: 0x7DCFFF });

    // Root Pelvis (Base of whole-body kinematics)
    const pelvis = new THREE.Group();
    pelvis.position.set(0, 1.7, 0);

    const pelvisGeo = new THREE.BoxGeometry(0.65, 0.3, 0.4);
    const pelvisMesh = new THREE.Mesh(pelvisGeo, bodyMat);
    pelvis.add(pelvisMesh);

    // Torso / Chest Shell
    const torsoGeo = new THREE.BoxGeometry(0.8, 0.9, 0.45);
    torsoGeo.translate(0, 0.55, 0);
    const torsoMesh = new THREE.Mesh(torsoGeo, whitePlates);
    pelvis.add(torsoMesh);

    // Chest Status LED Core
    const coreGeo = new THREE.RingGeometry(0.08, 0.14, 20);
    const coreMat = new THREE.MeshBasicMaterial({ color: 0x7DCFFF, side: THREE.DoubleSide });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    coreMesh.position.set(0, 0.65, 0.23);
    pelvis.add(coreMesh);

    // Head / Sensor Visor
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 1.15, 0);
    const headMesh = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.35, 0.35), bodyMat);
    const visorMesh = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.08, 0.04), visorMat);
    visorMesh.position.set(0, 0.04, 0.18);
    headGroup.add(headMesh);
    headGroup.add(visorMesh);
    pelvis.add(headGroup);

    // Arms (Shoulder -> Forearm -> Hand)
    function createArm(side) {
      const shoulder = new THREE.Group();
      shoulder.position.set(side * 0.52, 0.9, 0);

      const jMesh = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 16), jointMat);
      shoulder.add(jMesh);

      // Upper Arm
      const uGeo = new THREE.BoxGeometry(0.16, 0.6, 0.18);
      uGeo.translate(0, -0.3, 0);
      const uMesh = new THREE.Mesh(uGeo, bodyMat);
      shoulder.add(uMesh);

      // Forearm & Hand
      const elbow = new THREE.Group();
      elbow.position.set(0, -0.6, 0);
      const fGeo = new THREE.BoxGeometry(0.14, 0.55, 0.16);
      fGeo.translate(0, -0.28, 0);
      const fMesh = new THREE.Mesh(fGeo, whitePlates);
      elbow.add(fMesh);

      const handMesh = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 0.12), bodyMat);
      handMesh.position.y = -0.58;
      elbow.add(handMesh);

      shoulder.add(elbow);
      return { shoulder, elbow };
    }

    const armL = createArm(-1);
    const armR = createArm(1);
    pelvis.add(armL.shoulder);
    pelvis.add(armR.shoulder);

    // Legs (Hip -> Thigh -> Knee -> Shin -> Foot)
    function createLeg(side) {
      const hip = new THREE.Group();
      hip.position.set(side * 0.24, -0.15, 0);

      const hipJoint = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 16), jointMat);
      hip.add(hipJoint);

      // Thigh
      const thighGeo = new THREE.BoxGeometry(0.2, 0.75, 0.22);
      thighGeo.translate(0, -0.38, 0);
      const thighMesh = new THREE.Mesh(thighGeo, whitePlates);
      hip.add(thighMesh);

      // Knee & Shin
      const knee = new THREE.Group();
      knee.position.set(0, -0.75, 0);
      const kneeJoint = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.24, 16).rotateZ(Math.PI / 2), jointMat);
      knee.add(kneeJoint);

      const shinGeo = new THREE.BoxGeometry(0.18, 0.75, 0.2);
      shinGeo.translate(0, -0.38, 0);
      const shinMesh = new THREE.Mesh(shinGeo, bodyMat);
      knee.add(shinMesh);

      // Foot Plate
      const footGeo = new THREE.BoxGeometry(0.22, 0.08, 0.44);
      footGeo.translate(0, -0.78, 0.08);
      const footMesh = new THREE.Mesh(footGeo, bodyMat);
      knee.add(footMesh);

      hip.add(knee);
      return { hip, knee };
    }

    const legL = createLeg(-1);
    const legR = createLeg(1);
    pelvis.add(legL.hip);
    pelvis.add(legR.hip);

    humanoidBones = { pelvis, armL, armR, legL, legR };

    group.add(pelvis);
    scene.add(group);
    models.push(group);
  }

  // =========================================================================
  // INTERACTION: Mouse/Touch Orbit & Model Click Selection
  // =========================================================================
  function setupInteraction() {
    const el = renderer.domElement;
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    let pointerDownTime = 0;
    let pointerStartPos = { x: 0, y: 0 };

    el.addEventListener("pointerdown", (e) => {
      cameraState.isDragging = true;
      cameraState.autoRotate = false;
      cameraState.prevMouse.x = e.clientX;
      cameraState.prevMouse.y = e.clientY;
      pointerStartPos = { x: e.clientX, y: e.clientY };
      pointerDownTime = performance.now();
    });

    window.addEventListener("pointermove", (e) => {
      if (!cameraState.isDragging) return;
      const dx = e.clientX - cameraState.prevMouse.x;
      const dy = e.clientY - cameraState.prevMouse.y;
      cameraState.prevMouse.x = e.clientX;
      cameraState.prevMouse.y = e.clientY;

      cameraState.theta -= dx * 0.006;
      cameraState.phi = Math.max(0.2, Math.min(Math.PI / 2 - 0.05, cameraState.phi - dy * 0.006));
    });

    window.addEventListener("pointerup", (e) => {
      if (!cameraState.isDragging) return;
      cameraState.isDragging = false;

      // Detect click if mouse didn't drag far
      const dist = Math.hypot(e.clientX - pointerStartPos.x, e.clientY - pointerStartPos.y);
      const duration = performance.now() - pointerDownTime;
      if (dist < 6 && duration < 350) {
        handleSceneClick(e);
      }
    });

    // Zoom via Mouse Wheel
    el.addEventListener("wheel", (e) => {
      e.preventDefault();
      cameraState.radius = Math.max(4.0, Math.min(22.0, cameraState.radius + e.deltaY * 0.008));
    }, { passive: false });

    function handleSceneClick(e) {
      const rect = el.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(scene.children, true);

      for (let hit of intersects) {
        let obj = hit.object;
        while (obj && obj !== scene) {
          if (obj.userData && obj.userData.phaseIndex) {
            switchPhase(obj.userData.phaseIndex);
            return;
          }
          obj = obj.parent;
        }
      }
    }
  }

  // =========================================================================
  // DOCK BUTTONS & INSPECTION CARD SYNC
  // =========================================================================
  function setupDockButtons() {
    const dockButtons = document.querySelectorAll(".phase-dock-btn");
    dockButtons.forEach(btn => {
      btn.addEventListener("click", () => {
        const p = parseInt(btn.dataset.phase, 10);
        switchPhase(p);
      });
    });

    // Enter Phase Button in Inspection Card
    const btnLaunch = document.getElementById("btnLaunchPhase");
    if (btnLaunch) {
      btnLaunch.addEventListener("click", () => {
        const pData = PHASES_DATA.find(p => p.phase === activePhase) || PHASES_DATA[0];
        if (typeof showLessonsView === "function") {
          showLessonsView();
        }
        if (typeof selectLesson === "function") {
          selectLesson(pData.lessonId);
        }
      });
    }
  }

  /**
   * Switch the active phase, glide camera, and update inspection UI
   */
  function switchPhase(phaseNum) {
    if (phaseNum < 1 || phaseNum > 5) return;
    activePhase = phaseNum;

    const data = PHASES_DATA.find(p => p.phase === phaseNum) || PHASES_DATA[0];

    // Smooth camera glide target
    cameraState.targetLookAt.set(data.posX, 2.0, 0);

    // Update Dock Buttons
    document.querySelectorAll(".phase-dock-btn").forEach(btn => {
      btn.classList.toggle("active", parseInt(btn.dataset.phase, 10) === phaseNum);
    });

    // Update Floating Inspect Card
    updateInspectCard(phaseNum);
  }

  /**
   * Update the floating inspection card with phase info and LaTeX formulas
   */
  function updateInspectCard(phaseNum) {
    const data = PHASES_DATA.find(p => p.phase === phaseNum) || PHASES_DATA[0];

    const tag = document.getElementById("inspectPhaseTag");
    const xp = document.getElementById("inspectXpBadge");
    const title = document.getElementById("inspectTitle");
    const desc = document.getElementById("inspectDesc");
    const formula = document.getElementById("inspectFormula");
    const status = document.getElementById("inspectStatus");
    const btnLaunch = document.getElementById("btnLaunchPhase");

    if (tag) tag.textContent = data.tag;
    if (xp) xp.textContent = data.xp;
    if (title) title.textContent = data.title;
    if (desc) desc.textContent = data.desc;
    if (formula) formula.innerHTML = data.formula;

    if (status) {
      status.className = `inspect-status ${data.status}`;
      status.innerHTML = data.statusText;
    }

    if (btnLaunch) {
      if (data.status === "locked") {
        btnLaunch.textContent = "Preview Phase →";
        btnLaunch.style.opacity = "0.75";
      } else {
        btnLaunch.textContent = "Enter Phase →";
        btnLaunch.style.opacity = "1.0";
      }
    }

    // Typeset KaTeX if available
    if (typeof renderMathInElement === "function" && formula) {
      try {
        renderMathInElement(formula, {
          delimiters: [
            { left: '$$', right: '$$', display: true },
            { left: '$', right: '$', display: false }
          ],
          throwOnError: false
        });
      } catch (err) {
        console.warn("KaTeX render in inspect card:", err);
      }
    }
  }

  // =========================================================================
  // MAIN ANIMATION LOOP
  // =========================================================================
  function animate() {
    animFrameId = requestAnimationFrame(animate);

    const time = performance.now() * 0.001;

    // 1. Camera interpolation (lerp towards target)
    // Compute desired camera position on the sphere around targetLookAt
    const targetX = cameraState.targetLookAt.x + cameraState.radius * Math.sin(cameraState.phi) * Math.sin(cameraState.theta);
    const targetY = cameraState.targetLookAt.y + cameraState.radius * Math.cos(cameraState.phi);
    const targetZ = cameraState.targetLookAt.z + cameraState.radius * Math.sin(cameraState.phi) * Math.cos(cameraState.theta);

    cameraState.targetPos.set(targetX, targetY, targetZ);

    camera.position.lerp(cameraState.targetPos, cameraState.lerpSpeed);
    cameraState.currentLookAt.lerp(cameraState.targetLookAt, cameraState.lerpSpeed);
    camera.lookAt(cameraState.currentLookAt);

    // 2. Animate Model 1: Inverted Pendulum
    if (pendulumJoint) {
      // Subtle harmonic balancing wobble with periodic corrective impulse
      const theta = 0.08 * Math.sin(time * 2.8) * Math.exp(-0.2 * ((time * 0.5) % 4));
      pendulumJoint.rotation.z = theta;
    }

    // 3. Animate Model 2: Planar 2-DoF Arm Trajectory
    if (armLink1 && armLink2) {
      const q1 = Math.sin(time * 1.2) * 0.6 + 0.3;
      const q2 = Math.cos(time * 1.8) * 0.9 - 0.5;
      armLink1.rotation.y = q1;
      armLink2.rotation.y = q2;

      // Update real-time tip trail
      if (armTipTrail) {
        const p1 = 1.8;
        const p2 = 1.4;
        const totalAngle = q1 + q2;
        // Tip position relative to arm base
        const tipX = p1 * Math.sin(q1) + p2 * Math.sin(totalAngle);
        const tipZ = p1 * Math.cos(q1) + p2 * Math.cos(totalAngle);
        const tipY = 0.65;

        armTrailPoints.push(new THREE.Vector3(tipX, tipY, tipZ));
        if (armTrailPoints.length > 70) armTrailPoints.shift();

        const posAttr = armTipTrail.geometry.attributes.position;
        for (let i = 0; i < armTrailPoints.length; i++) {
          posAttr.setXYZ(i, armTrailPoints[i].x, armTrailPoints[i].y, armTrailPoints[i].z);
        }
        armTipTrail.geometry.setDrawRange(0, armTrailPoints.length);
        posAttr.needsUpdate = true;
      }
    }

    // 4. Animate Model 3: Spatial 6-DoF Arm
    if (spatialJoints.length >= 4) {
      spatialJoints[0].rotation.y = Math.sin(time * 0.8) * 0.5;       // J1 Turret
      spatialJoints[1].rotation.z = Math.sin(time * 1.1) * 0.25 - 0.1; // J2 Shoulder
      spatialJoints[2].rotation.z = Math.cos(time * 1.1) * 0.35 + 0.2; // J3 Elbow
      spatialJoints[3].rotation.y = time * 1.5;                         // J6 Tool Flange Roll
    }

    // 5. Animate Model 4: RGB-D Scanner & Point Cloud
    if (laserScanner) {
      laserScanner.position.y = Math.sin(time * 2.5) * 0.8;
    }
    if (pointCloudParticles) {
      pointCloudParticles.rotation.y = Math.sin(time * 0.5) * 0.15;
    }

    // 6. Animate Model 5: Unitree G1 Humanoid Balance
    if (humanoidBones.pelvis) {
      // Natural ZMP (Zero-Moment Point) breathing sway
      const sway = Math.sin(time * 1.6) * 0.05;
      const breathe = Math.sin(time * 2.4) * 0.02;

      humanoidBones.pelvis.position.x = sway;
      humanoidBones.pelvis.position.y = 1.7 + breathe;
      humanoidBones.pelvis.rotation.z = -sway * 0.4;

      // Synchronized counter-balancing arm swing
      if (humanoidBones.armL && humanoidBones.armR) {
        humanoidBones.armL.shoulder.rotation.x = Math.sin(time * 1.6) * 0.15;
        humanoidBones.armR.shoulder.rotation.x = -Math.sin(time * 1.6) * 0.15;
      }
    }

    renderer.render(scene, camera);
  }

  /**
   * Handle browser and container resize
   */
  function updateDimensions() {
    if (!container || !renderer || !camera) return;
    const rect = container.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    if (width <= 0 || height <= 0) return;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  }

  function onWindowResize() {
    updateDimensions();
  }

  // Global exports for app.js
  window.initScene3D = initScene3D;
  window.getActivePhase = () => activePhase;
  window.setActivePhase = switchPhase;

})();
