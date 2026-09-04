/** Auto-generated valid data bundle */
const PORTAL_DATA = {
  "daily_missions": [
    {
      "id": "D-01",
      "title": "Tune Critically Damped PD Controller",
      "xp": 50,
      "description": "In 03_pd_controller.py, test starting from qpos = 0.0 with target = 1.57 (90°). Tune Kp and Kd until the arm reaches 90° as fast as possible with zero overshoot oscillations.",
      "completed": false
    },
    {
      "id": "D-02",
      "title": "Holding Torque at 30°",
      "xp": 50,
      "description": "Calculate theoretical gravity torque for 30°: tau = 3.77 * sin(30°) = 1.885 N*m. Test commanding this open-loop torque in Python to verify equilibrium.",
      "completed": false
    },
    {
      "id": "D-03",
      "title": "Disturbance Impulse Stress Test",
      "xp": 50,
      "description": "In your balance controller, increase external disturbance shove to 12.0 N*m for 50 timesteps. Tune Kp and Kd to recover balance without letting the pendulum tumble.",
      "completed": false
    }
  ],
  "practice_challenges": [
    {
      "id": "PRAC-01",
      "type": "quiz",
      "category": "Control Theory",
      "title": "Damping Physics at Rest",
      "prompt": "When the robot arm is stationary at rest ($q_{\\text{vel}} = 0$), how much torque does the derivative ($K_d$) term provide?",
      "options": [
        "Zero torque (0 N*m)",
        "Maximum torque",
        "Equal to Kp * target",
        "Opposite of gravity torque"
      ],
      "correct": 0,
      "explanation": "Because tau_D = -Kd * qvel, when velocity is zero, the derivative torque is strictly zero. The D term only resists active motion; it cannot hold static weight.",
      "xp": 40
    },
    {
      "id": "PRAC-02",
      "type": "fill_in",
      "category": "MuJoCo Architecture",
      "title": "Actuator Command Array",
      "prompt": "In MuJoCo, generalized coordinates are in `data.qpos` and velocities are in `data.qvel`. What is the exact name of the array used to send motor torque commands?",
      "placeholder": "e.g. data.xyz",
      "answer": "data.ctrl",
      "explanation": "data.ctrl is the 1D control vector dispatched to actuators on every simulation step.",
      "xp": 40
    },
    {
      "id": "PRAC-03",
      "type": "physics",
      "category": "Static Dynamics",
      "title": "Analytical Gravity Torque at 30°",
      "prompt": "Our pendulum has a maximum gravity torque of $3.77\\text{ N}\\cdot\\text{m}$ at horizontal ($90^\\circ$). Given $\\tau(\\theta) = \\tau_{\\max} \\cdot \\sin(\\theta)$, calculate the gravity torque at $\\theta = 30^\\circ$ (where $\\sin(30^\\circ) = 0.5$). Enter the numerical value in $\\text{N}\\cdot\\text{m}$:",
      "placeholder": "e.g. 1.50",
      "answer": 1.885,
      "tolerance": 0.05,
      "explanation": "tau = 3.77 * sin(30°) = 3.77 * 0.5 = 1.885 N*m (approx 1.89 N*m).",
      "xp": 50
    },
    {
      "id": "PRAC-04",
      "type": "physics",
      "category": "Control Theory",
      "title": "Steady-State Droop Calculation",
      "prompt": "A robot joint uses pure Proportional control with $K_p = 25.0\\text{ N}\\cdot\\text{m/rad}$. At the desired target, gravity pulls downward with $\\tau_{\\text{grav}} = 2.50\\text{ N}\\cdot\\text{m}$. Since static equilibrium requires $K_p \\cdot e = \\tau_{\\text{grav}}$, calculate the steady-state error $e$ in radians:",
      "placeholder": "e.g. 0.05",
      "answer": 0.10,
      "tolerance": 0.01,
      "explanation": "e = tau_grav / Kp = 2.50 / 25.0 = 0.10 radians (about 5.73 degrees droop).",
      "xp": 50
    },
    {
      "id": "PRAC-05",
      "type": "physics",
      "category": "Kinematics",
      "title": "Planar Arm Maximum Reach",
      "prompt": "A 2-DoF planar arm has upper arm length $l_1 = 0.45\\text{ m}$ and forearm length $l_2 = 0.35\\text{ m}$. What is the maximum reachable distance (workspace radius) from the shoulder pivot in meters when fully outstretched?",
      "placeholder": "e.g. 1.0",
      "answer": 0.80,
      "tolerance": 0.01,
      "explanation": "When fully extended in a straight line (relative elbow angle = 0), r_max = l1 + l2 = 0.45 + 0.35 = 0.80 meters.",
      "xp": 50
    },
    {
      "id": "PRAC-06",
      "type": "fill_in",
      "category": "Kinematics",
      "title": "Coordinate Space Mapping",
      "prompt": "Calculating the hand Cartesian position $(x, y, z)$ from known joint angles $(\\theta_1, \\theta_2)$ is called ________ kinematics (type 'Forward' or 'Inverse'):",
      "placeholder": "Forward or Inverse",
      "answer": "forward",
      "explanation": "Forward kinematics maps joint angles to Cartesian coordinates. Inverse kinematics solves the reverse.",
      "xp": 40
    }
  ],
  "lessons": [
    {
      "id": "1.1",
      "phase": "Phase 1: The Dot",
      "title": "MuJoCo Core Architecture & State Vectors",
      "status": "completed",
      "xp": 50,
      "g1_connection": "On the Unitree G1, data.qpos is a 1D array of 35 floating-point numbers instead of 1. Indexes 0-6 represent the floating pelvis (XYZ position + orientation quaternion), while indexes 7-34 represent every single joint in the legs, waist, arms, and hands. The physics loop that advances these 35 joints is identical to our simple pendulum.",
      "quiz": {
        "question": "If a robot has 2 arms with 7 joints each, a 3-joint neck, and a fixed base, what is the length of data.qpos?",
        "options": [
          "7",
          "14",
          "17",
          "21"
        ],
        "correct": 2,
        "explanation": "7 (left arm) + 7 (right arm) + 3 (neck) = 17 generalized joint coordinates."
      },
      "content": "### 1. Architectural Foundation: Model vs. Data\n\nMuJoCo enforces a strict separation between structural specifications and temporal physics states.\n\n* **`mjModel` (`model`)**: The static blueprint. Stored in C memory as an immutable struct once parsed from the XML definition. It encapsulates kinematic tree topologies, link geometries, inertial properties, joint axes, actuator limits, and solver integration parameters. It does not change during simulation.\n* **`mjData` (`data`)**: The dynamic runtime buffer. Contains the transient state variables at time $t$. Every call to `mujoco.mj_step(model, data)` consumes the current state in `data`, applies numerical integration, and overwrites `data` with the subsequent state at $t + \\Delta t$.\n\n### 2. State Representation & Coordinate Systems\n\nRobotics physics engines rely on Generalized Coordinates ($q$). Rather than storing Cartesian coordinates $(x, y, z)$ for every link and solving millions of rigid-body equality constraints, MuJoCo uses Minimal Coordinates along the joint axes.\n\n```text\ndata.qpos : Generalized Positions [nq]\ndata.qvel : Generalized Velocities [nv]\ndata.ctrl : Actuator Control Inputs [nu]\n```\n\n#### The Zero Configuration ($q_{\\text{pos}} = 0$)\n\nIn analytical mathematics, $0$ radians is typically aligned with the Cartesian $+X$ axis. In multibody simulation, $q_{\\text{pos}} = 0$ is defined strictly by the resting geometric layout declared in the model XML file.\n\nWhen our pendulum rod is defined with `pos=\"0 0 -0.25\"`, the geometry points vertically downward along the $-Z$ axis in the zero configuration. Thus:\n\n* $q_{\\text{pos}} = 0.00\\text{ rad}$ ($0^\\circ$): Hanging straight down (stable equilibrium).\n* $q_{\\text{pos}} = 1.57\\text{ rad}$ ($90^\\circ$): Rotated counter-clockwise to horizontal.\n* $q_{\\text{pos}} = 3.14\\text{ rad}$ ($180^\\circ$): Pointing vertically upward (unstable inverted equilibrium).\n\n### 3. The Numerical Integration Step\n\nThe fundamental simulation loop operates in discrete time steps:\n\n$$\\Delta t = \\text{model.opt.timestep} \\quad (\\text{default: } 0.002\\text{ s})$$\n\nEach invocation of `mujoco.mj_step(model, data)` calculates forward dynamics:\n1. Forward kinematics: body positions, orientations, and frame Jacobians.\n2. Applied forces: gravity vector, Coriolis and centrifugal forces.\n3. Accelerations $\\ddot{q} = M(q)^{-1} (\\tau - C(q, \\dot{q}) - g(q))$.\n4. Time stepping: updates $q_{\\text{pos}}$ and $q_{\\text{vel}}$ using the semi-implicit Euler integrator."
    },
    {
      "id": "1.2",
      "phase": "Phase 1: The Dot",
      "title": "Passive Dynamics, Friction & Equilibrium Conditions",
      "status": "completed",
      "xp": 50,
      "g1_connection": "When a real humanoid robot experiences a power cut or loses motor power, its joints go completely passive. Understanding joint damping and mechanical equilibrium is critical for designing compliant fall-recovery behaviors and ensuring unpowered limbs decelerate safely rather than violently flailing.",
      "quiz": {
        "question": "Why does evaluating `abs(qvel) < 0.02` by itself fail to confirm that a swinging pendulum has stopped?",
        "options": [
          "Because velocity is always positive",
          "Because at the turnaround peak of every swing, velocity is zero",
          "Because MuJoCo cannot measure speed accurately",
          "Because damping increases velocity"
        ],
        "correct": 1,
        "explanation": "At the peak of every swing, instantaneous velocity passes through zero before reversing direction, creating a false-positive."
      },
      "content": "### 1. Mechanical Energy Conservation in Ideal Systems\n\nIn an unactuated mechanical system without dissipative elements (`damping=\"0.0\"`), total mechanical energy $E$ is conserved:\n\n$$E = T + V = \\text{constant}$$\n\nWhere:\n* **Kinetic Energy ($T$)**: $T = \\frac{1}{2} I \\dot{\\theta}^2$\n* **Potential Energy ($V$)**: $V = -m g l_{\\text{com}} \\cos(\\theta)$\n\nWhen released from rest at $90^\\circ$ ($q_{\\text{pos}} = 1.57$), all energy is gravitational potential. In the absence of friction, it oscillates continuously between $+90^\\circ$ and $-90^\\circ$.\n\nIf initial kinetic energy is injected via $q_{\\text{vel}} > 0$ such that $E > m g l_{\\text{com}}$, the pendulum possesses sufficient velocity to overcome the potential peak at $180^\\circ$, entering continuous complete rotations.\n\n### 2. Viscous Damping & Energy Dissipation\n\nReal joints encounter friction. In MuJoCo, the `damping` attribute models viscous damping:\n\n$$\\tau_{\\text{friction}} = -b \\cdot \\dot{q} = -b \\cdot q_{\\text{vel}}$$\n\nWhere $b$ is the damping coefficient (in $\\text{N}\\cdot\\text{m}\\cdot\\text{s}/\\text{rad}$). This generates a resisting torque directly proportional to instantaneous rotational speed, dissipating mechanical energy as heat.\n\n### 3. Multi-Condition Equilibrium Check\nA body has reached true rest if and only if:\n1. It is positioned at the potential energy minimum: $|q_{\\text{pos}}| < \\epsilon_p$.\n2. Its kinetic energy is negligible: $|q_{\\text{vel}}| < \\epsilon_v$.\n3. The condition holds after initial dynamic transients have elapsed ($t > t_{\\text{settle}}$)."
    },
    {
      "id": "1.3",
      "phase": "Phase 1: The Dot",
      "title": "Torque Actuation & Static Gravity Compensation",
      "status": "completed",
      "xp": 75,
      "g1_connection": "The Unitree G1 humanoid's arms weigh approximately 2.5 kg each. Without active gravity compensation torques fed into data.ctrl, the robot's arms would sag toward the floor. In commercial humanoid control, a dynamic gravity-compensation algorithm computes the exact feedforward torque for all 14 arm joints continuously in real-time.",
      "quiz": {
        "question": "What happens if you command a constant open-loop holding torque of 3.77 N·m to an arm that is already moving upward at 1.0 rad/s?",
        "options": [
          "It stops immediately at 90 degrees",
          "It accelerates upward and spins continuously because gravity resistance decreases as it rises",
          "It runs out of battery",
          "MuJoCo shuts down the simulation"
        ],
        "correct": 1,
        "explanation": "Because gravity torque decreases as angle approaches 180 degrees, a constant motor torque exceeds gravity and drives continuous rotation."
      },
      "content": "### 1. Actuation Architecture: The `data.ctrl` Vector\n\nTo transform a passive linkage into an active robot, actuators are declared in the XML model:\n\n```xml\n<actuator>\n  <motor name=\"shoulder_motor\" joint=\"pin\"/>\n</actuator>\n```\n\nA `<motor>` actuator in MuJoCo directly injects generalized forces along the joint degree of freedom. For revolute joints, `data.ctrl[i]` specifies joint torque $\\tau$ in Newton-meters ($\text{N}\\cdot\\text{m}$).\n\n### 2. Static Equilibrium & Torque Derivation\n\nFor a rigid body to maintain a stationary configuration at an angle $\\theta$, the sum of all external and actuator torques about the pivot axis must equal zero:\n\n$$\\sum \\tau = \\tau_{\\text{motor}} + \\tau_{\\text{gravity}} = 0$$\n$$\\tau_{\\text{motor}} = -\\tau_{\\text{gravity}}$$\n\n#### The Analytical Calculation for our Model\nOur pendulum assembly consists of two distinct physical bodies:\n\n1. **The Cylindrical Rod**:\n   * Mass: $m_{\\text{rod}} = 1.0\\text{ kg}$, Length: $L = 0.5\\text{ m}$\n   * Center of mass distance: $r_{\\text{rod}} = 0.25\\text{ m}$\n   * $\\tau_{\\text{rod}} = 1.0 \\times 9.81 \\times 0.25 = 2.4525\\text{ N}\\cdot\\text{m}$\n\n2. **The Tip Sphere**:\n   * Mass from volume: $m_{\\text{sphere}} \\approx 0.268\\text{ kg}$, Distance: $0.50\\text{ m}$\n   * $\\tau_{\\text{sphere}} = 0.268 \\times 9.81 \\times 0.50 = 1.3145\\text{ N}\\cdot\\text{m}$\n\n$$\\tau_{\\text{total}} = 2.4525 + 1.3145 \\approx 3.77\\text{ N}\\cdot\\text{m}$$\n\nWhen starting at rest (`qvel = 0.0`), commanding `data.ctrl[0] = 3.77` balances gravity at horizontal."
    },
    {
      "id": "1.4",
      "phase": "Phase 1: The Dot",
      "title": "Feedback Control: From Pure P to PD Control",
      "status": "completed",
      "xp": 100,
      "g1_connection": "Every low-level motor drive on the Unitree G1 humanoid runs a high-frequency (1 kHz) PD loop locally on its microcontrollers. When high-level AI policies (like Diffusion Policy or ACT) output action chunks, they are sending target joint angles (q_target) to these PD controllers.",
      "quiz": {
        "question": "What happens if you use a pure Proportional (P) controller without any Derivative (D) term or friction?",
        "options": [
          "The arm reaches the target and stops instantly",
          "The arm acts like an undamped spring, overshooting the target and oscillating back and forth forever",
          "The motor burns out immediately",
          "The arm drops to the floor"
        ],
        "correct": 1,
        "explanation": "A pure P controller stores energy as a virtual spring. Without a D term (damper) to extract kinetic energy, the arm overshoots and oscillates endlessly."
      },
      "content": "### 1. Why Start with Pure P Control?\n\nBefore understanding PD control, we **must understand P (Proportional) control on its own**.\n\nIn Mission 1.3, we used an open-loop torque ($3.77\\text{ N}\\cdot\\text{m}$). It worked only for $90^\\circ$ when starting from rest. If we want the robot to move from $0^\\circ$ to any arbitrary target angle (e.g. $45^\\circ$ or $90^\\circ$), the motor must react to where it currently is:\n\n$$e(t) = q_{\\text{target}} - q_{\\text{actual}}(t)$$\n$$\\tau_P = K_p \\cdot e(t)$$\n\n#### The Physical Meaning of $K_p$ (The Virtual Spring)\n$K_p$ acts as a **virtual torsional spring** connecting the arm to the target setpoint:\n* When $e$ is large (far from target) $\\rightarrow$ spring pulls hard.\n* When $e = 0$ (at target) $\\rightarrow$ spring exerts zero force.\n\n#### The Fatal Flaw of Pure P Control: Endless Oscillations!\nIf you attach a weight to a physical spring and pull it, does it stop at the center? **No!**\nIt accelerates toward the center, reaches maximum speed right at the target, overshoots to the other side, and bounces back and forth forever!\n**A pure P controller has zero damping.** It converts potential error energy into kinetic speed energy and back again.\n\n---\n\n### 2. Enter the D Term: The Virtual Shock Absorber\n\nTo stop the oscillations, we must add a brake that actively **dissipates kinetic energy**.\nThat is the **Derivative (D) term**:\n\n$$\\tau_D = -K_d \\cdot \\dot{q} = -K_d \\cdot q_{\\text{vel}}$$\n\n#### The Physical Meaning of $K_d$ (The Virtual Damper)\n* When moving fast toward the target, $\\tau_D$ pushes in the **opposite direction of motion**, slowing the arm down just before it hits the target!\n* When the arm is stationary ($\\dot{q} = 0$), the damper exerts **zero force** and does not resist holding.\n\n---\n\n### 3. The Full PD Equation\n\nCombining the virtual spring and the virtual damper yields the complete Proportional-Derivative controller:\n\n$$\\tau(t) = K_p \\cdot (q_{\\text{target}} - q_{\\text{actual}}) - K_d \\cdot q_{\\text{vel}}$$\n\n* **Proportional (P)**: $K_p \\cdot (q_{\\text{target}} - q_{\\text{actual}})$ acts as a virtual spring pulling toward the target.\n* **Derivative (D)**: $-K_d \\cdot q_{\\text{vel}}$ acts as a virtual shock absorber braking the motion.\n\n### 4. Lab Mission: Write 03_pd_controller.py\n\nIn our upcoming hands-on lab:\n1. **Step 1**: Implement pure P control ($K_d = 0$). Witness the overshoot and oscillation firsthand.\n2. **Step 2**: Add the D term ($K_d > 0$). Watch the arm decelerate smoothly and lock onto the target like a precision instrument!"
    },
    {
      "id": "1.5",
      "phase": "Phase 1: The Dot",
      "title": "Phase 1 Boss Fight: The Inverted Pendulum Balance Challenge",
      "status": "completed",
      "xp": 200,
      "g1_connection": "Humanoid walking is fundamentally modeled as an 3D Inverted Pendulum (LIPM - Linear Inverted Pendulum Model). If you can stabilize an inverted pendulum against perturbations, you have mastered the core stabilization principle behind bipedal balance.",
      "quiz": {
        "question": "Why does an inverted pendulum require almost zero holding torque at exactly 180 degrees (3.14159 rad), but requires high torque at 90 degrees?",
        "options": [
          "Gravity shuts down at 180 degrees",
          "At 180 degrees, the center of mass is balanced directly over the pivot, making gravity torque zero",
          "The motor turns off automatically at the top",
          "The air pressure holds it in place"
        ],
        "correct": 1,
        "explanation": "Because gravity torque is tau = -m*g*l*sin(theta), when theta = 180 degrees, sin(180) = 0. The mass is balanced directly above the pivot, requiring zero holding torque at perfect equilibrium."
      },
      "content": "### Phase 1 Capstone Challenge: Balancing at 180°\n\nIn this boss challenge, you achieved closed-loop balance of an inverted pendulum under external disturbances:\n\n1. **Equilibrium at the Peak**: At $\\theta = \\pi\\text{ rad}$ ($180^\\circ$), gravity torque is zero ($\\sin(\\pi) = 0$). Unlike holding horizontally, no continuous gravity compensation torque is needed.\n2. **Unstable Equilibrium**: Any microscopic perturbation pushes the mass off-center. Gravity produces a destabilizing torque pulling it downward.\n3. **Closed-Loop Disturbance Rejection**: By commanding:\n\n$$\\tau = K_p \\cdot (\\pi - q_{\\text{pos}}) - K_d \\cdot q_{\\text{vel}}$$\n\nthe controller acts as an active restorative spring and shock absorber, rejecting external shoves injected via `data.qfrc_applied[0]` and returning the arm to upright stability.\n\n---\n\n### Phase 1 Summary: What You Mastered\n* **MuJoCo Core Architecture**: `model` (static metadata) vs `data` (dynamic state).\n* **Generalized Coordinates**: `qpos` (radians), `qvel` (rad/s), and `ctrl` (actuator commands).\n* **Physics Principles**: Gravity torque $\\tau = m g l \\sin(\\theta)$, viscous friction $\\tau = -b \\dot{q}$, and mechanical energy exchange.\n* **Control Theory**: The role of $K_p$ (virtual spring), $K_d$ (virtual damper), and steady-state gravity droop."
    },
    {
      "id": "2.1",
      "phase": "Phase 2: The Line",
      "title": "2-DoF Planar Arm & Forward Kinematics (FK)",
      "status": "in_progress",
      "xp": 150,
      "g1_connection": "Each arm of the Unitree G1 has 7 joints. Forward Kinematics (FK) is the mathematical transformation that calculates the exact 3D Cartesian coordinates (x, y, z) of the robot hand palm relative to the robot torso base from joint angles.",
      "quiz": {
        "question": "If link 1 has length l1 = 0.5m and link 2 has length l2 = 0.4m, what is the maximum reachable distance (workspace boundary radius) from the shoulder pivot?",
        "options": [
          "0.5 m",
          "0.9 m",
          "0.1 m",
          "1.2 m"
        ],
        "correct": 1,
        "explanation": "When both joints are fully extended in a straight line (relative elbow angle = 0), the total reach is the sum of both link lengths: l1 + l2 = 0.5 + 0.4 = 0.9m."
      },
      "content": "### 1. Transitioning to Phase 2: The Robot Enters Cartesian Space\n\nIn Phase 1, our robot was a single degree of freedom. Its world was a single scalar number $\\theta$.\n\nIn the real world, robots do not work in joint space — they work in **Cartesian Task Space** $(x, y, z)$.\nWhen you ask the Unitree G1 humanoid to grab an apple, you do not command individual motor degrees — you specify where the hand must go: *\"Move hand to position $(x=0.4, y=0.1, z=0.8)$\"*.\n\nTo build this intuition, we add a second link and second motor to form a **2-DoF Planar Arm** (a shoulder and an elbow).\n\n---\n\n### 2. MuJoCo Kinematic Trees: Nested Bodies\n\nIn MuJoCo XML, multiple linked bodies are defined as a **nested kinematic tree**:\n\n```xml\n<body name=\"upper_arm\" pos=\"0 0 1.0\">\n  <joint name=\"shoulder\" type=\"hinge\" axis=\"0 1 0\"/>\n  <geom type=\"cylinder\" size=\"0.02 0.2\" pos=\"0 0 -0.2\" mass=\"1.0\"/>\n  \n  <!-- The elbow is a child body nested inside the upper arm -->\n  <body name=\"forearm\" pos=\"0 0 -0.4\">\n    <joint name=\"elbow\" type=\"hinge\" axis=\"0 1 0\"/>\n    <geom type=\"cylinder\" size=\"0.018 0.15\" pos=\"0 0 -0.15\" mass=\"0.8\"/>\n    <!-- End-effector fingertip -->\n    <site name=\"fingertip\" pos=\"0 0 -0.3\"/>\n  </body>\n</body>\n```\n\n* The shoulder rotates the entire upper arm.\n* The elbow rotates the forearm **relative to the upper arm**.\n* When the shoulder moves, the elbow moves with it automatically!\n\n---\n\n### 3. Forward Kinematics (FK) Derivation\n\n**Forward Kinematics (FK)** answers one fundamental question:\n> *\"Given joint angles $(\\theta_1, \\theta_2)$, where is the tip of the arm $(x, z)$ in the world?\"*\n\nLet link 1 have length $l_1$ at angle $\\theta_1$ (relative to vertical hanging).\nLet link 2 have length $l_2$ at relative angle $\theta_2$ (relative to link 1).\n\n#### The Analytical Trigonometric Equations\n1. **Shoulder to Elbow**:\n   $$x_1 = l_1 \\cdot \\sin(\\theta_1)$$\n   $$z_1 = -l_1 \\cdot \\cos(\\theta_1)$$\n\n2. **Elbow to Fingertip** (The forearm points at absolute angle $\\theta_1 + \\theta_2$):\n   $$x_{\\text{tip}} = l_1 \\cdot \\sin(\\theta_1) + l_2 \\cdot \\sin(\\theta_1 + \\theta_2)$$\n   $$z_{\\text{tip}} = -l_1 \\cdot \\cos(\\theta_1) - l_2 \\cdot \\cos(\\theta_1 + \\theta_2)$$\n\n---\n\n### 4. MuJoCo's Built-In FK Engine\n\nMuJoCo computes forward kinematics on every simulation step automatically! You can query any link or site's exact 3D Cartesian coordinates directly from `data`:\n\n```python\n# 3D Cartesian position of body or site in world frame\ntip_pos = data.site('fingertip').xpos  # [x, y, z]\n```\n\nIn our next lab, we will build `learning/02_the_line/double_pendulum.xml` and verify our hand-derived trigonometric FK formulas against MuJoCo's internal physics engine!"
    },
    {
      "id": "2.2",
      "phase": "Phase 2: The Line",
      "title": "Analytical Inverse Kinematics (IK) & The Law of Cosines",
      "status": "pending",
      "xp": 150,
      "g1_connection": "When you want the Unitree G1 to reach for an apple on a table, the high-level planner specifies the apple's 3D Cartesian coordinates. Inverse Kinematics calculates the exact shoulder, elbow, and wrist angles required for the hand to arrive at that target.",
      "quiz": {
        "question": "Why does a 2-DoF planar arm generally have TWO valid inverse kinematics solutions (elbow-up and elbow-down) for a reachable target point?",
        "options": [
          "Because the motors can spin in reverse",
          "Because the triangle formed by the shoulder, elbow, and target can be flipped above or below the baseline",
          "Because MuJoCo runs two simulations at once",
          "Because gravity creates an extra solution"
        ],
        "correct": 1,
        "explanation": "Given link lengths l1 and l2, you can bend the elbow either outward (elbow-down) or inward (elbow-up) to hit the exact same target coordinate (x, z)."
      },
      "content": "### 1. The Inverse Problem: Cartesian Target to Joint Angles\n\nWhile **Forward Kinematics (FK)** calculates position from angles:\n$$(\\theta_1, \\theta_2) \\longrightarrow (x, z)$$\n\n**Inverse Kinematics (IK)** solves the exact opposite:\n$$(x, z) \\longrightarrow (\\theta_1, \\theta_2)$$\n\nThis is the core algorithm running behind every robotic arm manipulation task.\n\n---\n\n### 2. Analytical Derivation using The Law of Cosines\n\nConsider the triangle formed by the shoulder pivot $(0, 0)$, the elbow joint, and the target $(x, z)$:\n* Side $a = l_1$ (upper arm)\n* Side $b = l_2$ (forearm)\n* Side $c = r = \\sqrt{x^2 + z^2}$ (distance from shoulder to target)\n\n#### Step 1: Solve for the Elbow Angle ($\\theta_2$)\nBy the Law of Cosines on the elbow angle:\n$$r^2 = l_1^2 + l_2^2 + 2 l_1 l_2 \\cos(\\theta_2)$$\n$$\\cos(\\theta_2) = \\frac{r^2 - l_1^2 - l_2^2}{2 l_1 l_2}$$\n\nUsing $\\arccos$ gives two symmetric solutions:\n$$\\theta_2 = \\pm \\arccos\\left(\\frac{x^2 + z^2 - l_1^2 - l_2^2}{2 l_1 l_2}\\right)$$\n* **Positive solution ($+\\theta_2$)**: Elbow bends one way (elbow-down / outward).\n* **Negative solution ($-\\theta_2$)**: Elbow bends the opposite way (elbow-up / inward).\n\n#### Step 2: Solve for the Shoulder Angle ($\\theta_1$)\nUsing trigonometry between the baseline angle to the target and the internal triangle angle:\n$$\\theta_1 = \\text{atan2}(x, -z) - \\text{atan2}(l_2 \\sin(\\theta_2), l_1 + l_2 \\cos(\\theta_2))$$\n\n---\n\n### 3. Reachability Checks\nBefore calculating $\\arccos$, we must verify if the target is physically reachable:\n1. If $r > l_1 + l_2$: Target is **too far** (outside workspace).\n2. If $r < |l_1 - l_2|$: Target is **too close** (arm cannot fold that tightly).\n\nIf either condition occurs, the argument to $\\arccos$ exceeds $[-1, 1]$, and no physical solution exists!"
    },
    {
      "id": "2.3",
      "phase": "Phase 2: The Line",
      "title": "Singularities, Reachability, & Workspace Boundaries",
      "status": "pending",
      "xp": 150,
      "g1_connection": "When the Unitree G1 stretches its arm straight out, it encounters a kinematic singularity. If an algorithm asks it to move faster outward, required motor velocities explode toward infinity, causing joint shudder or actuator shutdown.",
      "quiz": {
        "question": "What physically happens to a 2-DoF arm at a boundary singularity (when theta_2 = 0)?",
        "options": [
          "The robot shuts down immediately",
          "The arm loses 1 degree of freedom in Cartesian space and cannot produce any velocity radially outward",
          "Both motors reverse direction",
          "The link mass increases"
        ],
        "correct": 1,
        "explanation": "At theta_2 = 0, the arm is fully outstretched. It cannot move further outward no matter how much joint velocity is applied, meaning it has lost 1 Cartesian degree of freedom."
      },
      "content": "### 1. What is a Kinematic Singularity?\n\nA **singularity** is a robot posture where the manipulator **loses one or more degrees of freedom** in Cartesian task space.\n\nAt a singularity:\n1. The arm cannot move in certain Cartesian directions, no matter what joint torques or velocities you apply.\n2. Inverting the kinematics matrix (the Jacobian) requires dividing by zero ($|J| = 0$).\n3. Small Cartesian motion requests near the boundary command near-infinite joint speeds!\n\n---\n\n### 2. The Two Singularities of a 2-Link Planar Arm\n\n1. **Boundary Singularity (Maximum Stretch)**:\n   $$\\theta_2 = 0^\\circ$$\n   * Both links align into a single straight line: $r = l_1 + l_2$.\n   * The arm can swing sideways, but cannot move **even $1\\text{ mm}$ radially outward**!\n2. **Internal Fold Singularity (Full Retraction)**:\n   $$\\theta_2 = 180^\\circ$$\n   * Link 2 folds flat backwards onto link 1: $r = |l_1 - l_2|$.\n   * The arm cannot move inward any further.\n\n---\n\n### 3. Engineering Workarounds in Production Humanoids\nOn real humanoids like the Unitree G1:\n* Controllers clamp targets to $95\\%$ of the maximum reach ($r_{\\text{safe}} = 0.95 \\cdot (l_1 + l_2)$).\n* Solvers use **Damped Least Squares (DLS)** instead of pure matrix inversion to keep joint velocities bounded near singularities."
    },
    {
      "id": "2.4",
      "phase": "Phase 2: The Line",
      "title": "Cartesian Path Following & Waypoint Interpolation",
      "status": "pending",
      "xp": 180,
      "g1_connection": "When the G1 wipes a whiteboard or slides a box along a table, the fingertip must follow a perfectly straight Cartesian line in 3D space rather than swinging through arbitrary curved arcs.",
      "quiz": {
        "question": "Why does linearly interpolating joint angles (qpos) produce a curved end-effector path instead of a straight line in Cartesian space?",
        "options": [
          "Because motors have friction",
          "Because forward kinematics involves non-linear trigonometric functions (sine and cosine)",
          "Because gravity bends the path",
          "Because MuJoCo rounds coordinates"
        ],
        "correct": 1,
        "explanation": "Because x = l1*sin(q1) + l2*sin(q1+q2) is non-linear, linear changes in (q1, q2) sweep circular arcs in (x, z) space rather than straight lines."
      },
      "content": "### 1. Joint Space vs. Cartesian Space Trajectories\n\nIf we have a start position $A$ and goal position $B$:\n* **Joint Interpolation**: Interpolate $\\theta(t) = \\theta_A + t \\cdot (\\theta_B - \\theta_A)$. The motors move smoothly, but the fingertip sweeps a **curved banana-shaped arc** in the air!\n* **Cartesian Interpolation**: Interpolate $P(t) = P_A + t \\cdot (P_B - P_A)$. The fingertip moves in a **perfect straight line**, but the joints must continuously recalculate non-linear IK solutions.\n\n---\n\n### 2. High-Frequency IK Control Loop\n\nTo move in a straight line:\n1. Generate intermediate Cartesian waypoints along the line segment at $500\\text{ Hz}$.\n2. Solve analytical IK on every timestep to get $(\\theta_{1, \\text{target}}, \\theta_{2, \\text{target}})$.\n3. Feed these target angles into your joint PD controllers.\n\nIn our upcoming Phase 2 lab missions, you will implement this exact straight-line drawing controller!"
    },
    {
      "id": "3.1",
      "phase": "Phase 3: The Shape",
      "title": "3D Manipulators & The Jacobian Matrix",
      "status": "pending",
      "xp": 200,
      "g1_connection": "The official UniBot challenge uses Damped Least Squares Jacobian Inverse Kinematics in run_sim.py. In Phase 3, you will derive and understand this exact mathematical matrix yourself.",
      "content": "### Roadmap Preview: Spatial Manipulators & Jacobians\n\nPhase 3 transitions to 6-DoF spatial manipulators, mapping end-effector Cartesian velocities to joint velocities via the Jacobian matrix $J(q)$."
    }
  ],
  "glossary": [
    {
      "term": "data.qpos",
      "category": "MuJoCo State",
      "summary": "Generalized coordinates vector (joint positions / angles).",
      "details": "A 1D numpy array representing the current position of every degree of freedom in the system. For a revolute/hinge joint, qpos is rotation in radians relative to the reference zero configuration defined in XML. For a prismatic joint, it is displacement in meters. For a 3D free joint (unanchored object), it takes 7 entries: 3 for Cartesian position (x, y, z) and 4 for orientation quaternion (w, x, y, z)."
    },
    {
      "term": "data.qvel",
      "category": "MuJoCo State",
      "summary": "Generalized velocities vector (joint speeds).",
      "details": "A 1D numpy array representing the time derivative of joint positions. For hinge joints, this is angular velocity in radians per second (rad/s). For slide joints, it is linear velocity in meters per second (m/s). For a 3D free joint, it takes 6 entries: 3 linear velocities and 3 rotational velocities (angular rate vector in body frame)."
    },
    {
      "term": "data.ctrl",
      "category": "MuJoCo Actuation",
      "summary": "Actuator control inputs vector.",
      "details": "A 1D numpy array of control commands passed to actuators. For a torque motor (<motor>), ctrl corresponds directly to torque in Newton-meters (N·m) or linear force in Newtons (N). For position or velocity servos, ctrl represents the target setpoint."
    },
    {
      "term": "data.xpos",
      "category": "MuJoCo Kinematics",
      "summary": "Cartesian positions of bodies in world frame.",
      "details": "A 2D array of shape (nbody, 3) representing the global 3D coordinates (x, y, z in meters) of the center of each body, computed automatically by MuJoCo via forward kinematics during each physics step."
    },
    {
      "term": "data.time",
      "category": "MuJoCo State",
      "summary": "Current simulation timestamp in seconds.",
      "details": "Simulation clock tracking total elapsed physical time (in seconds). Advanced by model.opt.timestep every time mj_step is invoked."
    },
    {
      "term": "model.opt.timestep",
      "category": "MuJoCo Config",
      "summary": "Discrete numerical integration step size.",
      "details": "The delta time (dt) used by the numerical integrator (Euler or Runge-Kutta). The default value is 0.002 seconds (2 milliseconds), meaning 500 integration steps equal 1 second of physical time."
    },
    {
      "term": "Zero Configuration (Reference Pose)",
      "category": "Robotics Kinematics",
      "summary": "The baseline posture of the robot where all joint angles are zero.",
      "details": "The spatial configuration of links and bodies when qpos = 0. This is defined by the resting geometry and positions authored in the XML model file. Every commanded angle is measured as an offset from this baseline."
    },
    {
      "term": "Degree of Freedom (DoF)",
      "category": "Robotics Mechanics",
      "summary": "The number of independent parameters defining the system's configuration.",
      "details": "A single hinge joint has 1 DoF (rotation around one axis). A human arm has 7 DoFs (3 at shoulder, 1 at elbow, 3 at wrist). An unconstrained rigid body in 3D space has 6 DoFs (3 translation, 3 rotation)."
    },
    {
      "term": "Joint Space vs. Cartesian Space",
      "category": "Robotics Kinematics",
      "summary": "Coordinate representations of robot state.",
      "details": "Joint space describes the robot using its internal joint angles (theta_1, theta_2, ...). Cartesian space (also called operational space or task space) describes the position and orientation of the end-effector or object in 3D world coordinates (x, y, z, roll, pitch, yaw)."
    },
    {
      "term": "Forward Kinematics (FK)",
      "category": "Robotics Kinematics",
      "summary": "Computing Cartesian end-effector pose from joint angles.",
      "details": "Given joint values (qpos), calculate where the end-effector or gripper is located in 3D Cartesian space. FK is deterministic and always yields a unique single solution."
    },
    {
      "term": "Inverse Kinematics (IK)",
      "category": "Robotics Kinematics",
      "summary": "Computing joint angles required to place the end-effector at a target pose.",
      "details": "Given a target 3D position/orientation (x, y, z), solve for the joint angles (qpos) needed to achieve it. IK can have zero solutions (target out of reach), multiple solutions (elbow-up vs elbow-down), or infinite solutions (redundant manipulators)."
    },
    {
      "term": "Open-Loop Control",
      "category": "Control Theory",
      "summary": "Actuation without feedback monitoring.",
      "details": "The controller executes a predetermined command (such as a constant torque or open-loop trajectory) without measuring actual system state. Susceptible to drift, disturbances, and modeling discrepancies."
    },
    {
      "term": "Closed-Loop Control (Feedback)",
      "category": "Control Theory",
      "summary": "Actuation actively corrected by sensor feedback.",
      "details": "The controller continuously measures actual state (qpos, qvel), computes the error between target and actual, and calculates a corrective command to drive the error to zero."
    },
    {
      "term": "Proportional (P) Control",
      "category": "Control Theory",
      "summary": "Control output proportional to current position error.",
      "details": "Command u = K_p * (target - current). Acts like a virtual spring: the further the joint is from the target, the harder the motor pushes. Without damping, a pure P controller will oscillate indefinitely around the target."
    },
    {
      "term": "Derivative (D) Control",
      "category": "Control Theory",
      "summary": "Control output proportional to rate of change (velocity).",
      "details": "Command u = -K_d * velocity. Acts like a virtual damper or shock absorber: resists rapid motion and dissipates kinetic energy, eliminating oscillations."
    },
    {
      "term": "Gravity Compensation",
      "category": "Control Theory",
      "summary": "Feedforward torque applied to counteract the weight of the robot links.",
      "details": "Torque calculated from the link masses and lever arms such that the gravitational pull is exactly neutralized, allowing the robot to feel weightless."
    },
    {
      "term": "End-Effector",
      "category": "Robotics Kinematics",
      "summary": "The terminal tool or tip of a robotic manipulator.",
      "details": "The device at the end of an arm intended to interact with the environment (e.g. gripper, palm, fingertip, suction cup, welding torch). Kinematics calculations typically compute the pose of this specific frame."
    },
    {
      "term": "Reachable Workspace",
      "category": "Robotics Kinematics",
      "summary": "The entire geometric volume that can be reached by the robot end-effector.",
      "details": "For a 2-DoF planar arm with lengths l1 and l2, the reachable workspace is an annulus (ring) bounded by outer radius r_max = l1 + l2 and inner radius r_min = |l1 - l2|."
    },
    {
      "term": "Kinematic Singularity",
      "category": "Robotics Kinematics",
      "summary": "Configurations where a robot loses instantaneous degrees of freedom.",
      "details": "Posture where the Jacobian matrix loses rank (determinant drops to 0). At a singularity, the arm cannot move in certain Cartesian directions, and inverting kinematics commands infinite joint speeds."
    },
    {
      "term": "Elbow-Up vs. Elbow-Down",
      "category": "Robotics Kinematics",
      "summary": "The multiple geometric configurations that reach the same Cartesian target.",
      "details": "Because the elbow angle solution uses arccos, there are positive and negative angles (+theta_2 and -theta_2). Both place the end-effector at the identical (x, z) point, representing elbow-down or elbow-up postures."
    },
    {
      "term": "data.site('...').xpos",
      "category": "MuJoCo API",
      "summary": "3D Cartesian world coordinates of a named site marker.",
      "details": "Returns a length-3 numpy array [x, y, z] of the exact global world position of a site attached to a body or geom, computed automatically by MuJoCo's forward kinematics engine."
    },
    {
      "term": "Waypoint Interpolation",
      "category": "Motion Planning",
      "summary": "Discretizing a continuous Cartesian path into high-frequency intermediate target points.",
      "details": "Generating intermediate poses between start and goal (e.g. along a line or spline) at fixed time increments (e.g. 500 Hz), solving Inverse Kinematics at each waypoint to produce smooth motor commands."
    }
  ]
};
if (typeof window !== 'undefined') window.PORTAL_DATA = PORTAL_DATA;
if (typeof module !== 'undefined') module.exports = PORTAL_DATA;
