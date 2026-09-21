/** Auto-generated valid data bundle */
const PORTAL_DATA = {
  "daily_missions": [
    {
      "id": "D-01",
      "title": "Step Size Sensitivity Test",
      "xp": 40,
      "description": "In 01_inspect_physics.py, change timestep from 0.002 to 0.02 and 0.0002. Observe numerical stability.",
      "completed": true
    },
    {
      "id": "D-02",
      "title": "Zero-Damping Energy Check",
      "xp": 50,
      "description": "Set joint damping to 0.0 in XML and verify that max amplitude is perfectly conserved across 20 cycles.",
      "completed": true
    },
    {
      "id": "D-03",
      "title": "Torque Limits Verification",
      "xp": 60,
      "description": "Add gear or ctrlrange attribute to your actuator in XML and test what happens when motor torque saturates.",
      "completed": true
    }
  ],
  "lessons": [
    {
      "id": "1.1",
      "phase": "Phase 1: The Dot",
      "title": "MuJoCo Core Architecture & State Vectors",
      "status": "completed",
      "xp": 100,
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
      "xp": 100,
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
      "xp": 150,
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
      "content": "### 1. Actuation Architecture: The `data.ctrl` Vector\n\nTo transform a passive linkage into an active robot, actuators are declared in the XML model:\n\n```xml\n<actuator>\n  <motor name=\"shoulder_motor\" joint=\"pin\"/>\n</actuator>\n```\n\nA `<motor>` actuator in MuJoCo directly injects generalized forces along the joint degree of freedom. For revolute joints, `data.ctrl[i]` specifies joint torque $\\tau$ in Newton-meters ($\\text{N}\\cdot\\text{m}$).\n\n### 2. Static Equilibrium & Torque Derivation\n\nFor a rigid body to maintain a stationary configuration at an angle $\\theta$, the sum of all external and actuator torques about the pivot axis must equal zero:\n\n$$\\sum \\tau = \\tau_{\\text{motor}} + \\tau_{\\text{gravity}} = 0$$\n$$\\tau_{\\text{motor}} = -\\tau_{\\text{gravity}}$$\n\n#### The Analytical Calculation for our Model\nOur pendulum assembly consists of two distinct physical bodies:\n\n1. **The Cylindrical Rod**:\n   * Mass: $m_{\\text{rod}} = 1.0\\text{ kg}$, Length: $L = 0.5\\text{ m}$\n   * Center of mass distance: $r_{\\text{rod}} = 0.25\\text{ m}$\n   * $\\tau_{\\text{rod}} = 1.0 \\times 9.81 \\times 0.25 = 2.4525\\text{ N}\\cdot\\text{m}$\n\n2. **The Tip Sphere**:\n   * Mass from volume: $m_{\\text{sphere}} \\approx 0.268\\text{ kg}$, Distance: $0.50\\text{ m}$\n   * $\\tau_{\\text{sphere}} = 0.268 \\times 9.81 \\times 0.50 = 1.3145\\text{ N}\\cdot\\text{m}$\n\n$$\\tau_{\\text{total}} = 2.4525 + 1.3145 \\approx 3.77\\text{ N}\\cdot\\text{m}$$\n\nWhen starting at rest (`qvel = 0.0`), commanding `data.ctrl[0] = 3.77` balances gravity at horizontal."
    },
    {
      "id": "1.4",
      "phase": "Phase 1: The Dot",
      "title": "Feedback Control: Proportional-Derivative (PD) Control",
      "status": "completed",
      "xp": 200,
      "g1_connection": "Every low-level motor drive on the Unitree G1 humanoid runs a high-frequency (1 kHz) PD loop locally on its microcontrollers. When high-level AI policies (like Diffusion Policy or ACT) output action chunks, they are sending target joint angles (q_target) to these PD controllers.",
      "quiz": {
        "question": "What is the physical role of the Derivative gain (Kd) in a PD controller?",
        "options": [
          "It pushes the arm toward the target like a spring",
          "It acts like a virtual damper, absorbing kinetic energy and stopping oscillations",
          "It multiplies the position error",
          "It cancels gravity completely"
        ],
        "correct": 1,
        "explanation": "Kd opposes joint velocity (-Kd * qvel), acting as a virtual shock absorber to prevent overshoot and oscillations."
      },
      "content": "### 1. The Limitation of Open-Loop Actuation\n\nIn Mission 1.3, we found a specific constant torque ($3.77\\text{ N}\\cdot\\text{m}$) that holds the arm at exactly $90^\\circ$. However, this open-loop strategy cannot steer the robot from an arbitrary starting position to a designated target, nor can it reject external physical disturbances.\n\nTo make a robot autonomous, we must transition from open-loop actuation to **closed-loop feedback control**.\n\n### 2. The Proportional-Derivative (PD) Architecture\n\nThe PD controller continuously observes the actual joint state and calculates control torque as a function of instantaneous state error:\n\n$$e(t) = q_{\\text{target}} - q_{\\text{actual}}(t)$$\n$$\\tau(t) = K_p \\cdot e(t) - K_d \\cdot \\dot{q}_{\\text{actual}}(t)$$\n\n#### The Proportional Term ($K_p \\cdot e$)\nActs as a **virtual torsional spring** anchored between the actual joint position and the target setpoint. The further the arm is from the target, the greater the restoring torque exerted by the motor.\n\n#### The Derivative Term ($-K_d \\cdot \\dot{q}$)\nActs as a **virtual torsional damper**. It opposes rotational velocity, dissipating kinetic energy as the arm moves toward the setpoint. Without the derivative term ($K_d = 0$), the proportional spring causes the arm to overshoot the target and oscillate indefinitely.\n\n### 3. Lab Mission: Build Your First PD Controller\n\n1. Choose a target angle: e.g. $q_{\\text{target}} = 0.785\\text{ rad}$ ($45^\\circ$).\n2. Inside the simulation loop, compute: `error = target - data.qpos[0]`.\n3. Compute torque: `data.ctrl[0] = Kp * error - Kd * data.qvel[0]`.\n4. Tune $K_p$ and $K_d$ to achieve fast, stable convergence without oscillations."
    },
    {
      "id": "1.5",
      "phase": "Phase 1: The Dot",
      "title": "Phase 1 Boss Challenge: Inverted Pendulum Balancing at 180°",
      "status": "completed",
      "xp": 300,
      "g1_connection": "Humanoid walking is fundamentally modeled as a 3D Inverted Pendulum (LIPM - Linear Inverted Pendulum Model). If you can stabilize an inverted pendulum against perturbations, you have mastered the core stabilization principle behind bipedal balance.",
      "content": "### Phase 1 Capstone Challenge: Balancing at 180°\n\nIn this boss challenge, you achieved closed-loop balance of an inverted pendulum under external disturbances:\n\n1. **Equilibrium at the Peak**: At $\\theta = \\pi\\text{ rad}$ ($180^\\circ$), gravity torque is zero ($\\sin(\\pi) = 0$). Unlike holding horizontally, no continuous gravity compensation torque is needed.\n2. **Unstable Equilibrium**: Any microscopic perturbation pushes the mass off-center. Gravity produces a destabilizing torque pulling it downward.\n3. **Closed-Loop Disturbance Rejection**: By commanding:\n\n$$\\tau = K_p \\cdot (\\pi - q_{\\text{pos}}) - K_d \\cdot q_{\\text{vel}}$$\n\nthe controller acts as an active restorative spring and shock absorber, rejecting external shoves injected via `data.qfrc_applied[0]` and returning the arm to upright stability."
    },
    {
      "id": "2.1",
      "phase": "Phase 2: The Line",
      "title": "2-DoF Planar Arm & Forward Kinematics (FK)",
      "status": "completed",
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
      "content": "### 1. Transitioning to Phase 2: Cartesian Task Space\n\nIn Phase 1, the robot had a single degree of freedom ($q = \\theta$). \nIn real-world robotics, tasks are commanded in **Cartesian Task Space** $(x, y, z)$. When commanding the Unitree G1 to grasp an object, the high-level planner specifies: *\"Move hand to position $(x=0.4, y=0.1, z=0.8)$\"*.\n\nTo study this, we analyze a **2-DoF Planar Arm** operating in the $(X, Z)$ vertical plane.\n\n---\n\n### 2. MuJoCo Kinematic Trees: Nested Body Hierarchy\n\nIn MuJoCo XML, multi-link mechanisms are declared as a **nested kinematic tree**:\n\n```xml\n<body name=\"upper_arm\" pos=\"0 0 1.0\">\n  <joint name=\"shoulder\" type=\"hinge\" axis=\"0 1 0\"/>\n  <geom type=\"cylinder\" size=\"0.02 0.2\" pos=\"0 0 -0.2\" mass=\"1.0\"/>\n  \n  <!-- Forearm is a child body nested inside upper_arm -->\n  <body name=\"forearm\" pos=\"0 0 -0.4\">\n    <joint name=\"elbow\" type=\"hinge\" axis=\"0 1 0\"/>\n    <geom type=\"cylinder\" size=\"0.018 0.15\" pos=\"0 0 -0.15\" mass=\"0.8\"/>\n    <site name=\"fingertip\" pos=\"0 0 -0.3\"/>\n  </body>\n</body>\n```\n\n* The child body position `pos=\"0 0 -0.4\"` is relative to the parent frame (`upper_arm`).\n* When the shoulder joint rotates, the forearm body automatically rotates and translates with it.\n\n---\n\n### 3. Forward Kinematics (FK) Derivation from First Principles\n\nLet $l_1 = 0.4\\text{ m}$ (upper arm length) and $l_2 = 0.3\\text{ m}$ (forearm length).\nLet the shoulder pivot be located at $(x_0, z_0) = (0, 1.0)$.\nLet $q_1$ be the shoulder angle relative to downward vertical.\nLet $q_2$ be the elbow angle relative to the extended upper arm.\n\n#### Step 1: Shoulder to Elbow (Link 1)\n$$x_1 = l_1 \\sin(q_1)$$\n$$z_1 = z_0 - l_1 \\cos(q_1)$$\n\n#### Step 2: Elbow to Fingertip (Link 2)\nThe forearm points at absolute angle $(q_1 + q_2)$ relative to downward vertical:\n$$x_{\\text{tip}} = l_1 \\sin(q_1) + l_2 \\sin(q_1 + q_2)$$\n$$z_{\\text{tip}} = z_0 - l_1 \\cos(q_1) - l_2 \\cos(q_1 + q_2)$$\n\nIn `01_fk.py`, this hand-derived formula matches MuJoCo's C-level engine (`data.site(\"fingertip\").xpos`) to 8 decimal places!"
    },
    {
      "id": "2.2",
      "phase": "Phase 2: The Line",
      "title": "Analytical Inverse Kinematics (IK) & The Law of Cosines",
      "status": "completed",
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
      "content": "### 1. The Inverse Problem: Cartesian Target to Joint Angles\n\nWhile **Forward Kinematics (FK)** maps:\n$$(q_1, q_2) \\longrightarrow (x, z)$$\n\n**Inverse Kinematics (IK)** solves the reverse transformation:\n$$(x, z) \\longrightarrow (q_1, q_2)$$\n\nUnlike FK (which is a deterministic one-to-one function), IK is non-linear and can have zero, two, or infinite solutions.\n\n---\n\n### 2. Analytical Derivation Using the Triangle Geometry\n\nLet the shoulder pivot be at $(x_0, z_0) = (0, 1.0)$.\nFor a target $(x^*, z^*)$, compute offsets relative to the shoulder:\n$$\\Delta x = x^* - x_0, \\quad \\Delta z = z^* - z_0$$\n$$r = \\sqrt{\\Delta x^2 + \\Delta z^2}$$\n\nConsider the triangle formed by Shoulder ($S$), Elbow ($E$), and Target ($T$):\n* Side $a = l_1$\n* Side $b = l_2$\n* Side $c = r$\n\n#### Step 1: Solving for Elbow Angle ($q_2$)\nThe internal triangle angle at the elbow is $\\phi = 180^\\circ - q_2$.\nBy the Law of Cosines:\n$$r^2 = l_1^2 + l_2^2 - 2 l_1 l_2 \\cos(180^\\circ - q_2) = l_1^2 + l_2^2 + 2 l_1 l_2 \\cos(q_2)$$\n$$\\cos(q_2) = \\frac{r^2 - l_1^2 - l_2^2}{2 l_1 l_2}$$\n\nBecause $\\cos(q_2) = \\cos(-q_2)$, two symmetric branches exist:\n$$q_2 = \\pm \\arccos\\left(\\frac{r^2 - l_1^2 - l_2^2}{2 l_1 l_2}\\right)$$\n* **Elbow-Down ($+q_2$)**: Forearm bends outward/forward.\n* **Elbow-Up ($-q_2$)**: Forearm bends inward/backward.\n\n#### Step 2: Solving for Shoulder Angle ($q_1$)\nUsing vector decomposition in the upper arm's local coordinate frame:\n$$q_1 = \\alpha - \\psi$$\n* **Sightline angle $\\alpha$**: Direction from shoulder to target:\n  $$\\alpha = \\text{atan2}(\\Delta x, -\\Delta z)$$\n* **Internal triangle angle $\\psi$**: Angle between upper arm and target sightline:\n  $$\\psi = \\text{atan2}(l_2 \\sin(q_2), \\; l_1 + l_2 \\cos(q_2))$$"
    },
    {
      "id": "2.3",
      "phase": "Phase 2: The Line",
      "title": "Singularities, Reachability, & Workspace Boundaries",
      "status": "completed",
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
      "content": "### 1. What is a Kinematic Singularity?\n\nA **singularity** is a robot posture where the manipulator **loses one or more degrees of freedom** in Cartesian task space.\n\nAt a singularity:\n1. The arm cannot move in certain Cartesian directions, no matter what joint torques or velocities you apply.\n2. The Jacobian matrix loses rank (its determinant becomes zero: $\\det(J) = 0$).\n3. Small Cartesian motion requests command near-infinite joint velocities.\n\n---\n\n### 2. The Two Singularities of a 2-Link Planar Arm\n\n1. **Outer Boundary Singularity (Maximum Stretch)**:\n   $$q_2 = 0^\\circ \\implies r = l_1 + l_2$$\n   * Both links align into a single straight line ($r = 0.4 + 0.3 = 0.7\\text{ m}$).\n   * The arm can swing tangentially, but **cannot produce any velocity radially outward**.\n2. **Inner Fold Singularity (Full Retraction)**:\n   $$q_2 = 180^\\circ \\implies r = |l_1 - l_2|$$\n   * The forearm folds completely backward onto the upper arm like a pocket knife ($r = |0.4 - 0.3| = 0.1\\text{ m}$).\n   * The arm cannot move inward any closer to the shoulder.\n\n---\n\n### 3. Numerical Precision Hazards & Safe Clamping\n\nIn floating-point arithmetic (IEEE 754), evaluating $\\frac{r^2 - l_1^2 - l_2^2}{2 l_1 l_2}$ at boundary $r = 0.1$ can produce `-1.0000000000000002` due to rounding. \nBecause this strictly exceeds $[-1, 1]$, `math.acos()` crashes with `ValueError: math domain error`.\n\n#### The Professional Guard:\n```python\n# 1. Workspace Boundary Clamping\nif r > (l1 + l2):\n    scale = (l1 + l2) / r\n    delta_x *= scale; delta_z *= scale; r = l1 + l2\nelif r < abs(l1 - l2):\n    scale = abs(l1 - l2) / r\n    delta_x *= scale; delta_z *= scale; r = abs(l1 - l2)\n\n# 2. Numerical Domain Clipping\ncos_q2 = (r**2 - l1**2 - l2**2) / (2 * l1 * l2)\ncos_q2 = max(-1.0, min(1.0, cos_q2))\nq2 = math.acos(cos_q2)\n```"
    },
    {
      "id": "2.4",
      "phase": "Phase 2: The Line",
      "title": "Cartesian Path Following & Waypoint Interpolation",
      "status": "completed",
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
      "content": "### 1. Joint Space vs. Cartesian Space Trajectories\n\nGiven a start waypoint $A = (x_A, z_A)$ and goal waypoint $B = (x_B, z_B)$:\n\n#### Approach A: Joint-Space Interpolation (The Banana Arc)\n* Solve IK at endpoints: $q_A = \\text{IK}(A)$, $q_B = \\text{IK}(B)$.\n* Interpolate joint angles linearly: $q(t) = q_A + s(t) \\cdot (q_B - q_A)$.\n* **Result**: Because Forward Kinematics $x(t) = l_1 \\sin(q_1) + l_2 \\sin(q_1 + q_2)$ is a sum of harmonic sinusoids, linear joint motions produce a **curved circular arc** in the air.\n\n#### Approach B: Cartesian-Space Interpolation (The Laser Line)\n* Interpolate Cartesian coordinates linearly:\n  $$x(t) = x_A + s(t) \\cdot (x_B - x_A)$$\n  $$z(t) = z_A + s(t) \\cdot (z_B - z_A)$$\n* On **every simulation step**, solve:\n  $$q(t) = \\text{IK}(x(t), z(t))$$\n* **Result**: The joint angles move along non-linear curves that dynamically adjust the arm's reach, keeping the fingertip on a **laser-straight Cartesian line**!\n\n---\n\n### 2. Smooth Continuous Reversing\nTo move continuously back and forth between $A$ and $B$ without teleporting:\n* Define a signed step $\\Delta s = 0.005$.\n* On each step: $s \\leftarrow s + \\Delta s$.\n* When $s \\ge 1.0$ or $s \\le 0.0$, invert direction: $\\Delta s \\leftarrow -\\Delta s$."
    },
    {
      "id": "3.1",
      "phase": "Phase 3: The Shape",
      "title": "Velocity Kinematics & The 2-DoF Jacobian Matrix",
      "status": "in_progress",
      "xp": 200,
      "g1_connection": "On the Unitree G1 humanoid, the arm has 7 degrees of freedom in 3D space. You cannot use the Law of Cosines on 7 joints! The G1 control system uses the 6x7 Jacobian matrix J(q) running at 1 kHz in run_sim.py to map joint motor velocities to 3D hand velocities.",
      "quiz": {
        "question": "What mathematical operation produces the Jacobian matrix J(q) from Forward Kinematics f(q)?",
        "options": [
          "Matrix inversion",
          "First-order partial derivatives with respect to joint angles",
          "Numerical integration",
          "Cross product with gravity"
        ],
        "correct": 1,
        "explanation": "The Jacobian is the matrix of partial derivatives J_ij = d(x_i) / d(q_j), mapping joint velocities dq/dt to Cartesian velocities dx/dt."
      },
      "content": "### 1. Why Do We Need the Jacobian Matrix?\n\nIn Phase 2, we solved Inverse Kinematics using high-school trigonometry (Law of Cosines). This succeeded only because the arm had **2 links in a 2D plane**.\n\nWhen a robot arm has:\n* 3 links in a plane,\n* 6 links in 3D space (industrial robots like UR5 or KUKA),\n* **7 links in 3D space (the Unitree G1 humanoid arm)**,\n\nthere is **no simple triangle** to apply the Law of Cosines to! Analytical trigonometry completely breaks down.\n\nTo control multi-joint spatial robots, modern robotics relies on **Differential Velocity Kinematics** via the **Jacobian Matrix ($J$)**.\n\n---\n\n### 2. Definition of the Jacobian Matrix\n\nForward Kinematics maps joint positions to Cartesian position:\n$$\\mathbf{x} = f(\\mathbf{q})$$\n\nTaking the total time derivative using the multivariate chain rule:\n$$\\dot{\\mathbf{x}} = \\frac{\\partial f}{\\partial \\mathbf{q}} \\cdot \\dot{\\mathbf{q}} = \\mathbf{J}(\\mathbf{q}) \\cdot \\dot{\\mathbf{q}}$$\n\nThe **Jacobian Matrix $J(q)$** is the matrix of first-order partial derivatives:\n$$J_{ij} = \\frac{\\partial x_i}{\\partial q_j}$$\n\nIt acts as a linear transformation mapping **joint velocities $\\dot{\\mathbf{q}}$ (rad/s)** to **Cartesian end-effector velocity $\\mathbf{v}$ (m/s)**!\n\n---\n\n### 3. Step-by-Step Calculus Derivation for Our 2-DoF Arm\n\nRecall our Forward Kinematics equations:\n$$x = l_1 \\sin(q_1) + l_2 \\sin(q_1 + q_2)$$\n$$z = -l_1 \\cos(q_1) - l_2 \\cos(q_1 + q_2)$$\n\nThe Jacobian is a $2 \\times 2$ matrix:\n$$\\mathbf{J}(\\mathbf{q}) = \\begin{bmatrix} \\frac{\\partial x}{\\partial q_1} & \\frac{\\partial x}{\\partial q_2} \\\\[6pt] \\frac{\\partial z}{\\partial q_1} & \\frac{\\partial z}{\\partial q_2} \\end{bmatrix}$$\n\n#### Differentiating $x$ with respect to $q_1$ and $q_2$:\n* With respect to $q_1$:\n  $$\\frac{\\partial x}{\\partial q_1} = l_1 \\cos(q_1) + l_2 \\cos(q_1 + q_2)$$\n* With respect to $q_2$:\n  $$\\frac{\\partial x}{\\partial q_2} = l_2 \\cos(q_1 + q_2)$$\n\n#### Differentiating $z$ with respect to $q_1$ and $q_2$:\n* With respect to $q_1$ (recalling $\\frac{d}{du}(-\\cos u) = \\sin u$):\n  $$\\frac{\\partial z}{\\partial q_1} = l_1 \\sin(q_1) + l_2 \\sin(q_1 + q_2)$$\n* With respect to $q_2$:\n  $$\\frac{\\partial z}{\\partial q_2} = l_2 \\sin(q_1 + q_2)$$\n\n#### The Complete 2-DoF Analytical Jacobian:\n$$\\mathbf{J}(\\mathbf{q}) = \\begin{bmatrix} l_1 \\cos(q_1) + l_2 \\cos(q_1 + q_2) & l_2 \\cos(q_1 + q_2) \\\\[6pt] l_1 \\sin(q_1) + l_2 \\sin(q_1 + q_2) & l_2 \\sin(q_1 + q_2) \\end{bmatrix}$$\n\n---\n\n### 4. The Physical Meaning of the Columns\n\nLook at the two columns of $J$:\n$$\\mathbf{J} = \\begin{bmatrix} \\mathbf{J}_1 & \\mathbf{J}_2 \\end{bmatrix}$$\n\n* **Column 1 ($\\mathbf{J}_1$)**: The Cartesian velocity of the fingertip if **only Joint 1 rotates at $1\\text{ rad/s}$** (with Joint 2 locked).\n* **Column 2 ($\\mathbf{J}_2$)**: The Cartesian velocity of the fingertip if **only Joint 2 rotates at $1\\text{ rad/s}$** (with Joint 1 locked).\n\nBecause velocities superimpose linearly:\n$$\\mathbf{v} = \\mathbf{J}_1 \\dot{q}_1 + \\mathbf{J}_2 \\dot{q}_2$$\n\nIn our next mission, we will invert this matrix to command Cartesian velocities directly!"
    },
    {
      "id": "3.2",
      "phase": "Phase 3: The Shape",
      "title": "Differential Inverse Kinematics & Matrix Inversion",
      "status": "pending",
      "xp": 220,
      "g1_connection": "In run_sim.py, when the Unitree G1 humanoid tracks a hand velocity trajectory, it inverts the Jacobian at every 1 ms timestep to compute target joint velocities: dq = J^-1 * v.",
      "quiz": {
        "question": "What is the determinant of our 2-DoF arm's Jacobian, and when does it equal zero?",
        "options": [
          "det(J) = l1*l2*cos(q2), zero when q2 = 90 deg",
          "det(J) = l1*l2*sin(q2), zero when q2 = 0 deg or 180 deg",
          "det(J) = l1 + l2, never zero",
          "det(J) = 1"
        ],
        "correct": 1,
        "explanation": "Evaluating det(J) gives l1*l2*sin(q2). When q2 = 0 or 180 (the boundary singularities), sin(q2) = 0 and the matrix cannot be inverted."
      },
      "content": "### 1. Inverting the Velocity Mapping\n\nWe know that:\n$$\\mathbf{v} = \\mathbf{J}(\\mathbf{q}) \\cdot \\dot{\\mathbf{q}}$$\n\nTo solve **Inverse Kinematics at the velocity level**:\nGiven a desired Cartesian velocity $\\mathbf{v} = [v_x, v_z]^T$, what joint velocities $\\dot{\\mathbf{q}} = [\\dot{q}_1, \\dot{q}_2]^T$ must we command?\n\nBy inverting the Jacobian matrix:\n$$\\dot{\\mathbf{q}} = \\mathbf{J}(\\mathbf{q})^{-1} \\cdot \\mathbf{v}$$\n\n---\n\n### 2. Analytical Inverse of a 2x2 Matrix\n\nFor any $2 \\times 2$ matrix:\n$$A = \\begin{bmatrix} a & b \\\\ c & d \\end{bmatrix} \\implies A^{-1} = \\frac{1}{\\det(A)} \\begin{bmatrix} d & -b \\\\ -c & a \\end{bmatrix}$$\nwhere $\\det(A) = ad - bc$.\n\n#### Computing the Determinant of our 2-DoF Jacobian:\n$$\\det(\\mathbf{J}) = \\left[l_1 \\cos(q_1) + l_2 \\cos(q_1 + q_2)\\right] \\cdot \\left[l_2 \\sin(q_1 + q_2)\\right] - \\left[l_2 \\cos(q_1 + q_2)\\right] \\cdot \\left[l_1 \\sin(q_1) + l_2 \\sin(q_1 + q_2)\\right]$$\n\nExpanding the terms:\n$$\\det(\\mathbf{J}) = l_1 l_2 \\left[\\cos(q_1) \\sin(q_1 + q_2) - \\sin(q_1) \\cos(q_1 + q_2)\\right]$$\n\nApplying the trigonometric angle subtraction identity $\\sin(A - B) = \\sin(A)\\cos(B) - \\cos(A)\\sin(B)$:\n$$\\det(\\mathbf{J}) = l_1 l_2 \\sin((q_1 + q_2) - q_1) = \\mathbf{l_1 l_2 \\sin(q_2)}$$\n\nLook at how elegant this result is:\n**The determinant depends ONLY on the elbow angle $q_2$!**\n\n---\n\n### 3. The Mathematical Proof of Singularities\n\nWhen is $\\det(\\mathbf{J}) = 0$?\n$$\\det(\\mathbf{J}) = 0 \\iff \\sin(q_2) = 0 \\iff \\mathbf{q_2 = 0^\\circ \\quad \\text{or} \\quad q_2 = 180^\\circ}$$\n\n* At $q_2 = 0^\\circ$ (arm fully outstretched): $\\det(\\mathbf{J}) = 0$.\n* At $q_2 = 180^\\circ$ (arm folded flat): $\\det(\\mathbf{J}) = 0$.\n\nBecause $\\det(\\mathbf{J}) = 0$, **the Jacobian cannot be inverted**! \nDividing by zero causes required joint velocities to explode toward infinity: $\\dot{q} \\to \\infty$.\n\nThis algebraically proves the two physical singularities we discovered in Phase 2!"
    },
    {
      "id": "3.3",
      "phase": "Phase 3: The Shape",
      "title": "Damped Least Squares (DLS) & Singularity Robustness",
      "status": "pending",
      "xp": 250,
      "g1_connection": "In run_sim.py, the UniBot controller implements Damped Least Squares Jacobian Inverse Kinematics. This ensures the robot never experiences numerical explosions or joint shudder when limbs reach full extension.",
      "quiz": {
        "question": "What is the primary benefit of Damped Least Squares (DLS) over pure matrix inversion near singularities?",
        "options": [
          "It makes the motors run faster",
          "It bounds joint velocities, trading tiny tracking error for numerical stability and preventing infinite speeds",
          "It eliminates gravity",
          "It removes the need for sensors"
        ],
        "correct": 1,
        "explanation": "DLS adds a damping factor lambda^2 that regularizes the inversion, keeping joint velocities strictly bounded near singular configurations."
      },
      "content": "### 1. The Problem with Pure Inversion Near Singularities\n\nWhen a robot's hand approaches the workspace boundary ($r \\to l_1 + l_2$), $\\det(J) \\to 0$.\nEven if the desired Cartesian velocity is small ($v = 0.01\\text{ m/s}$), pure inversion commands:\n$$\\dot{q} = J^{-1} v = \\frac{1}{\\det(J)} \\cdot [\\dots] \\approx \\frac{1}{0.0001} \\times 0.01 = \\mathbf{100\\text{ rad/s (Violent Joint Shudder!)}}$$\n\nIn real hardware, this blows motor fuses or triggers emergency torque shutoffs.\n\n---\n\n### 2. The Levenberg-Marquardt / Damped Least Squares (DLS) Solution\n\nInstead of solving the exact equation $J \\dot{q} = v$, DLS solves an **optimization problem**:\n$$\\min_{\\dot{q}} \\; \\|J \\dot{q} - v\\|^2 + \\lambda^2 \\|\\dot{q}\\|^2$$\n\n* Term 1 ($\\|J \\dot{q} - v\\|^2$): Minimize Cartesian tracking error.\n* Term 2 ($\\lambda^2 \\|\\dot{q}\\|^2$): Penalize large joint velocities (damping).\n\nThe closed-form analytical solution is the **Damped Pseudoinverse**:\n$$\\mathbf{J^\\dagger = J^T (J J^T + \\lambda^2 I)^{-1}}$$\n\nWhere:\n* $\\lambda$ is the **damping coefficient** (e.g. $\\lambda = 0.05$).\n* $I$ is the identity matrix.\n\n#### Why DLS Never Fails:\n* Far from singularities: $\\lambda^2 \\ll \\det(J)$, so $J^\\dagger \\approx J^{-1}$ (perfect tracking).\n* Near singularities: $\\lambda^2$ prevents the denominator from approaching zero, keeping $\\dot{q}$ strictly bounded!\n\nThis is the exact algorithm running in `run_sim.py` for the Unitree G1 humanoid!"
    },
    {
      "id": "3.4",
      "phase": "Phase 3: The Shape",
      "title": "Tracing 2D Parametric Shapes (Circles & Closed Curves)",
      "status": "pending",
      "xp": 250,
      "g1_connection": "When the Unitree G1 turns a steering wheel, polishes a curved tabletop, or turns a valve, it tracks continuous 2D/3D parametric curves in task space using closed-loop Cartesian trajectory tracking.",
      "content": "### 1. From Lines to Shapes\n\nIn Phase 2, you made the arm trace a 1D line segment. \nNow, we expand to **2D closed curves**: circles, ellipses, and polygons.\n\nA circle of radius $R$ centered at $(x_c, z_c)$ is parameterized by:\n$$x(t) = x_c + R \\cos(\\omega t)$$\n$$z(t) = z_c + R \\sin(\\omega t)$$\n\nTaking time derivatives gives the analytical feedforward velocity:\n$$\\dot{x}(t) = -R \\omega \\sin(\\omega t)$$\n$$\\dot{z}(t) = R \\omega \\cos(\\omega t)$$\n\n---\n\n### 2. Closed-Loop Cartesian Velocity Control\n\nTo prevent numerical drift over long simulation runs, controllers combine feedforward velocity with proportional position error feedback:\n\n$$\\mathbf{v}_{\\text{cmd}} = \\mathbf{v}_{\\text{desired}} + K_p \\cdot (\\mathbf{x}_{\\text{desired}} - \\mathbf{x}_{\\text{actual}})$$\n\nThen, at every simulation step:\n1. Compute $\\mathbf{v}_{\\text{cmd}}$.\n2. Solve $\\dot{\\mathbf{q}} = \\mathbf{J}^\\dagger \\mathbf{v}_{\\text{cmd}}$.\n3. Integrate joint position: $\\mathbf{q}_{\\text{next}} = \\mathbf{q} + \\dot{\\mathbf{q}} \\Delta t$.\n4. Set `data.qpos = q_next` and watch the arm trace a **perfect, continuous circle**!"
    },
    {
      "id": "3.5",
      "phase": "Phase 3: The Shape",
      "title": "Scaling to 3D & The 7-DoF Unitree G1 Humanoid Arm",
      "status": "pending",
      "xp": 300,
      "g1_connection": "This is the direct bridge to the official UniBot challenge. You will inspect models/unitree_g1/g1.xml, understand its 7 arm joints, and use MuJoCo's built-in Jacobian engine (mj_jacSite) to command 3D hand poses.",
      "content": "### 1. Transitioning to 6D Spatial Task Space\n\nIn 3D space, an end-effector has **6 degrees of freedom**:\n* 3 Translational: $(x, y, z)$\n* 3 Rotational: $(\\omega_x, \\omega_y, \\omega_z)$ or roll, pitch, yaw.\n\nThe spatial Jacobian has shape **$6 \\times n$**, where $n$ is the number of arm joints.\n\nFor the Unitree G1 arm ($n = 7$ joints):\n$$\\mathbf{J} \\in \\mathbb{R}^{6 \\times 7}$$\n\n$$\\begin{bmatrix} v_x \\\\ v_y \\\\ v_z \\\\[4pt] \\omega_x \\\\ \\omega_y \\\\ \\omega_z \\end{bmatrix} = \\mathbf{J}_{6 \\times 7} \\cdot \\begin{bmatrix} \\dot{q}_1 \\\\ \\dot{q}_2 \\\\ \\vdots \\\\ \\dot{q}_7 \\end{bmatrix}$$\n\n---\n\n### 2. Kinematic Redundancy: Why 7 Joints?\n\nA task in 3D requires 6 degrees of freedom. The G1 arm has 7 joints:\n$$\\text{Redundant DoFs} = 7 - 6 = 1$$\n\nBecause $n > m$, the system has **infinite solutions** for any target hand pose!\n* The robot can hold a cup fixed in space while swiveling its elbow up or down.\n* We can use the extra degree of freedom to **avoid joint limits, dodge obstacles, or minimize energy** using **Null-Space Projection**:\n\n$$\\dot{\\mathbf{q}} = \\mathbf{J}^\\dagger \\mathbf{v} + (\\mathbf{I} - \\mathbf{J}^\\dagger \\mathbf{J}) \\dot{\\mathbf{q}}_{\\text{null}}$$\n\nWhere $(\\mathbf{I} - \\mathbf{J}^\\dagger \\mathbf{J})$ projects secondary goals into the null-space without disturbing the primary hand motion!\n\nIn Phase 3, you will control this exact 7-DoF arm in MuJoCo!"
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
    }
  ]
};
if (typeof window !== 'undefined') window.PORTAL_DATA = PORTAL_DATA;
if (typeof module !== 'undefined') module.exports = PORTAL_DATA;
