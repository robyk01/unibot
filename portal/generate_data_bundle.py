import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))

daily_missions = [
    {
        "id": "D-01",
        "title": "Step Size Sensitivity Test",
        "xp": 40,
        "description": "In 01_inspect_physics.py, change timestep from 0.002 to 0.02 and 0.0002. Observe numerical stability.",
        "completed": True
    },
    {
        "id": "D-02",
        "title": "Zero-Damping Energy Check",
        "xp": 50,
        "description": "Set joint damping to 0.0 in XML and verify that max amplitude is perfectly conserved across 20 cycles.",
        "completed": True
    },
    {
        "id": "D-03",
        "title": "Torque Limits Verification",
        "xp": 60,
        "description": "Add gear or ctrlrange attribute to your actuator in XML and test what happens when motor torque saturates.",
        "completed": True
    }
]

lessons = [
    # -------------------------------------------------------------
    # PHASE 1: THE DOT (1-DoF PENDULUM DYNAMICS & CONTROL)
    # -------------------------------------------------------------
    {
        "id": "1.1",
        "phase": "Phase 1: The Dot",
        "title": "MuJoCo Core Architecture & State Vectors",
        "status": "completed",
        "xp": 100,
        "g1_connection": "On the Unitree G1, data.qpos is a 1D array of 35 floating-point numbers instead of 1. Indexes 0-6 represent the floating pelvis (XYZ position + orientation quaternion), while indexes 7-34 represent every single joint in the legs, waist, arms, and hands. The physics loop that advances these 35 joints is identical to our simple pendulum.",
        "quiz": {
            "question": "If a robot has 2 arms with 7 joints each, a 3-joint neck, and a fixed base, what is the length of data.qpos?",
            "options": ["7", "14", "17", "21"],
            "correct": 2,
            "explanation": "7 (left arm) + 7 (right arm) + 3 (neck) = 17 generalized joint coordinates."
        },
        "content": """### 1. Architectural Foundation: Model vs. Data

MuJoCo enforces a strict separation between structural specifications and temporal physics states.

* **`mjModel` (`model`)**: The static blueprint. Stored in C memory as an immutable struct once parsed from the XML definition. It encapsulates kinematic tree topologies, link geometries, inertial properties, joint axes, actuator limits, and solver integration parameters. It does not change during simulation.
* **`mjData` (`data`)**: The dynamic runtime buffer. Contains the transient state variables at time $t$. Every call to `mujoco.mj_step(model, data)` consumes the current state in `data`, applies numerical integration, and overwrites `data` with the subsequent state at $t + \\Delta t$.

### 2. State Representation & Coordinate Systems

Robotics physics engines rely on Generalized Coordinates ($q$). Rather than storing Cartesian coordinates $(x, y, z)$ for every link and solving millions of rigid-body equality constraints, MuJoCo uses Minimal Coordinates along the joint axes.

```text
data.qpos : Generalized Positions [nq]
data.qvel : Generalized Velocities [nv]
data.ctrl : Actuator Control Inputs [nu]
```

#### The Zero Configuration ($q_{\\text{pos}} = 0$)

In analytical mathematics, $0$ radians is typically aligned with the Cartesian $+X$ axis. In multibody simulation, $q_{\\text{pos}} = 0$ is defined strictly by the resting geometric layout declared in the model XML file.

When our pendulum rod is defined with `pos="0 0 -0.25"`, the geometry points vertically downward along the $-Z$ axis in the zero configuration. Thus:

* $q_{\\text{pos}} = 0.00\\text{ rad}$ ($0^\\circ$): Hanging straight down (stable equilibrium).
* $q_{\\text{pos}} = 1.57\\text{ rad}$ ($90^\\circ$): Rotated counter-clockwise to horizontal.
* $q_{\\text{pos}} = 3.14\\text{ rad}$ ($180^\\circ$): Pointing vertically upward (unstable inverted equilibrium).

### 3. The Numerical Integration Step

The fundamental simulation loop operates in discrete time steps:

$$\\Delta t = \\text{model.opt.timestep} \\quad (\\text{default: } 0.002\\text{ s})$$

Each invocation of `mujoco.mj_step(model, data)` calculates forward dynamics:
1. Forward kinematics: body positions, orientations, and frame Jacobians.
2. Applied forces: gravity vector, Coriolis and centrifugal forces.
3. Accelerations $\\ddot{q} = M(q)^{-1} (\\tau - C(q, \\dot{q}) - g(q))$.
4. Time stepping: updates $q_{\\text{pos}}$ and $q_{\\text{vel}}$ using the semi-implicit Euler integrator."""
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
        "content": """### 1. Mechanical Energy Conservation in Ideal Systems

In an unactuated mechanical system without dissipative elements (`damping="0.0"`), total mechanical energy $E$ is conserved:

$$E = T + V = \\text{constant}$$

Where:
* **Kinetic Energy ($T$)**: $T = \\frac{1}{2} I \\dot{\\theta}^2$
* **Potential Energy ($V$)**: $V = -m g l_{\\text{com}} \\cos(\\theta)$

When released from rest at $90^\\circ$ ($q_{\\text{pos}} = 1.57$), all energy is gravitational potential. In the absence of friction, it oscillates continuously between $+90^\\circ$ and $-90^\\circ$.

If initial kinetic energy is injected via $q_{\\text{vel}} > 0$ such that $E > m g l_{\\text{com}}$, the pendulum possesses sufficient velocity to overcome the potential peak at $180^\\circ$, entering continuous complete rotations.

### 2. Viscous Damping & Energy Dissipation

Real joints encounter friction. In MuJoCo, the `damping` attribute models viscous damping:

$$\\tau_{\\text{friction}} = -b \\cdot \\dot{q} = -b \\cdot q_{\\text{vel}}$$

Where $b$ is the damping coefficient (in $\\text{N}\\cdot\\text{m}\\cdot\\text{s}/\\text{rad}$). This generates a resisting torque directly proportional to instantaneous rotational speed, dissipating mechanical energy as heat.

### 3. Multi-Condition Equilibrium Check
A body has reached true rest if and only if:
1. It is positioned at the potential energy minimum: $|q_{\\text{pos}}| < \\epsilon_p$.
2. Its kinetic energy is negligible: $|q_{\\text{vel}}| < \\epsilon_v$.
3. The condition holds after initial dynamic transients have elapsed ($t > t_{\\text{settle}}$)."""
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
        "content": """### 1. Actuation Architecture: The `data.ctrl` Vector

To transform a passive linkage into an active robot, actuators are declared in the XML model:

```xml
<actuator>
  <motor name="shoulder_motor" joint="pin"/>
</actuator>
```

A `<motor>` actuator in MuJoCo directly injects generalized forces along the joint degree of freedom. For revolute joints, `data.ctrl[i]` specifies joint torque $\\tau$ in Newton-meters ($\\text{N}\\cdot\\text{m}$).

### 2. Static Equilibrium & Torque Derivation

For a rigid body to maintain a stationary configuration at an angle $\\theta$, the sum of all external and actuator torques about the pivot axis must equal zero:

$$\\sum \\tau = \\tau_{\\text{motor}} + \\tau_{\\text{gravity}} = 0$$
$$\\tau_{\\text{motor}} = -\\tau_{\\text{gravity}}$$

#### The Analytical Calculation for our Model
Our pendulum assembly consists of two distinct physical bodies:

1. **The Cylindrical Rod**:
   * Mass: $m_{\\text{rod}} = 1.0\\text{ kg}$, Length: $L = 0.5\\text{ m}$
   * Center of mass distance: $r_{\\text{rod}} = 0.25\\text{ m}$
   * $\\tau_{\\text{rod}} = 1.0 \\times 9.81 \\times 0.25 = 2.4525\\text{ N}\\cdot\\text{m}$

2. **The Tip Sphere**:
   * Mass from volume: $m_{\\text{sphere}} \\approx 0.268\\text{ kg}$, Distance: $0.50\\text{ m}$
   * $\\tau_{\\text{sphere}} = 0.268 \\times 9.81 \\times 0.50 = 1.3145\\text{ N}\\cdot\\text{m}$

$$\\tau_{\\text{total}} = 2.4525 + 1.3145 \\approx 3.77\\text{ N}\\cdot\\text{m}$$

When starting at rest (`qvel = 0.0`), commanding `data.ctrl[0] = 3.77` balances gravity at horizontal."""
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
        "content": """### 1. The Limitation of Open-Loop Actuation

In Mission 1.3, we found a specific constant torque ($3.77\\text{ N}\\cdot\\text{m}$) that holds the arm at exactly $90^\\circ$. However, this open-loop strategy cannot steer the robot from an arbitrary starting position to a designated target, nor can it reject external physical disturbances.

To make a robot autonomous, we must transition from open-loop actuation to **closed-loop feedback control**.

### 2. The Proportional-Derivative (PD) Architecture

The PD controller continuously observes the actual joint state and calculates control torque as a function of instantaneous state error:

$$e(t) = q_{\\text{target}} - q_{\\text{actual}}(t)$$
$$\\tau(t) = K_p \\cdot e(t) - K_d \\cdot \\dot{q}_{\\text{actual}}(t)$$

#### The Proportional Term ($K_p \\cdot e$)
Acts as a **virtual torsional spring** anchored between the actual joint position and the target setpoint. The further the arm is from the target, the greater the restoring torque exerted by the motor.

#### The Derivative Term ($-K_d \\cdot \\dot{q}$)
Acts as a **virtual torsional damper**. It opposes rotational velocity, dissipating kinetic energy as the arm moves toward the setpoint. Without the derivative term ($K_d = 0$), the proportional spring causes the arm to overshoot the target and oscillate indefinitely.

### 3. Lab Mission: Build Your First PD Controller

1. Choose a target angle: e.g. $q_{\\text{target}} = 0.785\\text{ rad}$ ($45^\\circ$).
2. Inside the simulation loop, compute: `error = target - data.qpos[0]`.
3. Compute torque: `data.ctrl[0] = Kp * error - Kd * data.qvel[0]`.
4. Tune $K_p$ and $K_d$ to achieve fast, stable convergence without oscillations."""
    },
    {
        "id": "1.5",
        "phase": "Phase 1: The Dot",
        "title": "Phase 1 Boss Challenge: Inverted Pendulum Balancing at 180°",
        "status": "completed",
        "xp": 300,
        "g1_connection": "Humanoid walking is fundamentally modeled as a 3D Inverted Pendulum (LIPM - Linear Inverted Pendulum Model). If you can stabilize an inverted pendulum against perturbations, you have mastered the core stabilization principle behind bipedal balance.",
        "content": """### Phase 1 Capstone Challenge: Balancing at 180°

In this boss challenge, you achieved closed-loop balance of an inverted pendulum under external disturbances:

1. **Equilibrium at the Peak**: At $\\theta = \\pi\\text{ rad}$ ($180^\\circ$), gravity torque is zero ($\\sin(\\pi) = 0$). Unlike holding horizontally, no continuous gravity compensation torque is needed.
2. **Unstable Equilibrium**: Any microscopic perturbation pushes the mass off-center. Gravity produces a destabilizing torque pulling it downward.
3. **Closed-Loop Disturbance Rejection**: By commanding:

$$\\tau = K_p \\cdot (\\pi - q_{\\text{pos}}) - K_d \\cdot q_{\\text{vel}}$$

the controller acts as an active restorative spring and shock absorber, rejecting external shoves injected via `data.qfrc_applied[0]` and returning the arm to upright stability."""
    },

    # -------------------------------------------------------------
    # PHASE 2: THE LINE (2-DoF PLANAR KINEMATICS & TRAJECTORIES)
    # -------------------------------------------------------------
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
        "content": """### 1. Transitioning to Phase 2: Cartesian Task Space

In Phase 1, the robot had a single degree of freedom ($q = \\theta$). 
In real-world robotics, tasks are commanded in **Cartesian Task Space** $(x, y, z)$. When commanding the Unitree G1 to grasp an object, the high-level planner specifies: *\"Move hand to position $(x=0.4, y=0.1, z=0.8)$\"*.

To study this, we analyze a **2-DoF Planar Arm** operating in the $(X, Z)$ vertical plane.

---

### 2. MuJoCo Kinematic Trees: Nested Body Hierarchy

In MuJoCo XML, multi-link mechanisms are declared as a **nested kinematic tree**:

```xml
<body name="upper_arm" pos="0 0 1.0">
  <joint name="shoulder" type="hinge" axis="0 1 0"/>
  <geom type="cylinder" size="0.02 0.2" pos="0 0 -0.2" mass="1.0"/>
  
  <!-- Forearm is a child body nested inside upper_arm -->
  <body name="forearm" pos="0 0 -0.4">
    <joint name="elbow" type="hinge" axis="0 1 0"/>
    <geom type="cylinder" size="0.018 0.15" pos="0 0 -0.15" mass="0.8"/>
    <site name="fingertip" pos="0 0 -0.3"/>
  </body>
</body>
```

* The child body position `pos="0 0 -0.4"` is relative to the parent frame (`upper_arm`).
* When the shoulder joint rotates, the forearm body automatically rotates and translates with it.

---

### 3. Forward Kinematics (FK) Derivation from First Principles

Let $l_1 = 0.4\\text{ m}$ (upper arm length) and $l_2 = 0.3\\text{ m}$ (forearm length).
Let the shoulder pivot be located at $(x_0, z_0) = (0, 1.0)$.
Let $q_1$ be the shoulder angle relative to downward vertical.
Let $q_2$ be the elbow angle relative to the extended upper arm.

#### Step 1: Shoulder to Elbow (Link 1)
$$x_1 = l_1 \\sin(q_1)$$
$$z_1 = z_0 - l_1 \\cos(q_1)$$

#### Step 2: Elbow to Fingertip (Link 2)
The forearm points at absolute angle $(q_1 + q_2)$ relative to downward vertical:
$$x_{\\text{tip}} = l_1 \\sin(q_1) + l_2 \\sin(q_1 + q_2)$$
$$z_{\\text{tip}} = z_0 - l_1 \\cos(q_1) - l_2 \\cos(q_1 + q_2)$$

In `01_fk.py`, this hand-derived formula matches MuJoCo's C-level engine (`data.site("fingertip").xpos`) to 8 decimal places!"""
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
        "content": """### 1. The Inverse Problem: Cartesian Target to Joint Angles

While **Forward Kinematics (FK)** maps:
$$(q_1, q_2) \\longrightarrow (x, z)$$

**Inverse Kinematics (IK)** solves the reverse transformation:
$$(x, z) \\longrightarrow (q_1, q_2)$$

Unlike FK (which is a deterministic one-to-one function), IK is non-linear and can have zero, two, or infinite solutions.

---

### 2. Analytical Derivation Using the Triangle Geometry

Let the shoulder pivot be at $(x_0, z_0) = (0, 1.0)$.
For a target $(x^*, z^*)$, compute offsets relative to the shoulder:
$$\\Delta x = x^* - x_0, \\quad \\Delta z = z^* - z_0$$
$$r = \\sqrt{\\Delta x^2 + \\Delta z^2}$$

Consider the triangle formed by Shoulder ($S$), Elbow ($E$), and Target ($T$):
* Side $a = l_1$
* Side $b = l_2$
* Side $c = r$

#### Step 1: Solving for Elbow Angle ($q_2$)
The internal triangle angle at the elbow is $\\phi = 180^\\circ - q_2$.
By the Law of Cosines:
$$r^2 = l_1^2 + l_2^2 - 2 l_1 l_2 \\cos(180^\\circ - q_2) = l_1^2 + l_2^2 + 2 l_1 l_2 \\cos(q_2)$$
$$\\cos(q_2) = \\frac{r^2 - l_1^2 - l_2^2}{2 l_1 l_2}$$

Because $\\cos(q_2) = \\cos(-q_2)$, two symmetric branches exist:
$$q_2 = \\pm \\arccos\\left(\\frac{r^2 - l_1^2 - l_2^2}{2 l_1 l_2}\\right)$$
* **Elbow-Down ($+q_2$)**: Forearm bends outward/forward.
* **Elbow-Up ($-q_2$)**: Forearm bends inward/backward.

#### Step 2: Solving for Shoulder Angle ($q_1$)
Using vector decomposition in the upper arm's local coordinate frame:
$$q_1 = \\alpha - \\psi$$
* **Sightline angle $\\alpha$**: Direction from shoulder to target:
  $$\\alpha = \\text{atan2}(\\Delta x, -\\Delta z)$$
* **Internal triangle angle $\\psi$**: Angle between upper arm and target sightline:
  $$\\psi = \\text{atan2}(l_2 \\sin(q_2), \\; l_1 + l_2 \\cos(q_2))$$"""
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
        "content": """### 1. What is a Kinematic Singularity?

A **singularity** is a robot posture where the manipulator **loses one or more degrees of freedom** in Cartesian task space.

At a singularity:
1. The arm cannot move in certain Cartesian directions, no matter what joint torques or velocities you apply.
2. The Jacobian matrix loses rank (its determinant becomes zero: $\\det(J) = 0$).
3. Small Cartesian motion requests command near-infinite joint velocities.

---

### 2. The Two Singularities of a 2-Link Planar Arm

1. **Outer Boundary Singularity (Maximum Stretch)**:
   $$q_2 = 0^\\circ \\implies r = l_1 + l_2$$
   * Both links align into a single straight line ($r = 0.4 + 0.3 = 0.7\\text{ m}$).
   * The arm can swing tangentially, but **cannot produce any velocity radially outward**.
2. **Inner Fold Singularity (Full Retraction)**:
   $$q_2 = 180^\\circ \\implies r = |l_1 - l_2|$$
   * The forearm folds completely backward onto the upper arm like a pocket knife ($r = |0.4 - 0.3| = 0.1\\text{ m}$).
   * The arm cannot move inward any closer to the shoulder.

---

### 3. Numerical Precision Hazards & Safe Clamping

In floating-point arithmetic (IEEE 754), evaluating $\\frac{r^2 - l_1^2 - l_2^2}{2 l_1 l_2}$ at boundary $r = 0.1$ can produce `-1.0000000000000002` due to rounding. 
Because this strictly exceeds $[-1, 1]$, `math.acos()` crashes with `ValueError: math domain error`.

#### The Professional Guard:
```python
# 1. Workspace Boundary Clamping
if r > (l1 + l2):
    scale = (l1 + l2) / r
    delta_x *= scale; delta_z *= scale; r = l1 + l2
elif r < abs(l1 - l2):
    scale = abs(l1 - l2) / r
    delta_x *= scale; delta_z *= scale; r = abs(l1 - l2)

# 2. Numerical Domain Clipping
cos_q2 = (r**2 - l1**2 - l2**2) / (2 * l1 * l2)
cos_q2 = max(-1.0, min(1.0, cos_q2))
q2 = math.acos(cos_q2)
```"""
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
        "content": """### 1. Joint Space vs. Cartesian Space Trajectories

Given a start waypoint $A = (x_A, z_A)$ and goal waypoint $B = (x_B, z_B)$:

#### Approach A: Joint-Space Interpolation (The Banana Arc)
* Solve IK at endpoints: $q_A = \\text{IK}(A)$, $q_B = \\text{IK}(B)$.
* Interpolate joint angles linearly: $q(t) = q_A + s(t) \\cdot (q_B - q_A)$.
* **Result**: Because Forward Kinematics $x(t) = l_1 \\sin(q_1) + l_2 \\sin(q_1 + q_2)$ is a sum of harmonic sinusoids, linear joint motions produce a **curved circular arc** in the air.

#### Approach B: Cartesian-Space Interpolation (The Laser Line)
* Interpolate Cartesian coordinates linearly:
  $$x(t) = x_A + s(t) \\cdot (x_B - x_A)$$
  $$z(t) = z_A + s(t) \\cdot (z_B - z_A)$$
* On **every simulation step**, solve:
  $$q(t) = \\text{IK}(x(t), z(t))$$
* **Result**: The joint angles move along non-linear curves that dynamically adjust the arm's reach, keeping the fingertip on a **laser-straight Cartesian line**!

---

### 2. Smooth Continuous Reversing
To move continuously back and forth between $A$ and $B$ without teleporting:
* Define a signed step $\\Delta s = 0.005$.
* On each step: $s \\leftarrow s + \\Delta s$.
* When $s \\ge 1.0$ or $s \\le 0.0$, invert direction: $\\Delta s \\leftarrow -\\Delta s$."""
    },

    # -------------------------------------------------------------
    # PHASE 3: THE SHAPE (SPATIAL MANIPULATORS & THE JACOBIAN MATRIX)
    # -------------------------------------------------------------
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
        "content": """### 1. Why Do We Need the Jacobian Matrix?

In Phase 2, we solved Inverse Kinematics using high-school trigonometry (Law of Cosines). This succeeded only because the arm had **2 links in a 2D plane**.

When a robot arm has:
* 3 links in a plane,
* 6 links in 3D space (industrial robots like UR5 or KUKA),
* **7 links in 3D space (the Unitree G1 humanoid arm)**,

there is **no simple triangle** to apply the Law of Cosines to! Analytical trigonometry completely breaks down.

To control multi-joint spatial robots, modern robotics relies on **Differential Velocity Kinematics** via the **Jacobian Matrix ($J$)**.

---

### 2. Definition of the Jacobian Matrix

Forward Kinematics maps joint positions to Cartesian position:
$$\\mathbf{x} = f(\\mathbf{q})$$

Taking the total time derivative using the multivariate chain rule:
$$\\dot{\\mathbf{x}} = \\frac{\\partial f}{\\partial \\mathbf{q}} \\cdot \\dot{\\mathbf{q}} = \\mathbf{J}(\\mathbf{q}) \\cdot \\dot{\\mathbf{q}}$$

The **Jacobian Matrix $J(q)$** is the matrix of first-order partial derivatives:
$$J_{ij} = \\frac{\\partial x_i}{\\partial q_j}$$

It acts as a linear transformation mapping **joint velocities $\\dot{\\mathbf{q}}$ (rad/s)** to **Cartesian end-effector velocity $\\mathbf{v}$ (m/s)**!

---

### 3. Step-by-Step Calculus Derivation for Our 2-DoF Arm

Recall our Forward Kinematics equations:
$$x = l_1 \\sin(q_1) + l_2 \\sin(q_1 + q_2)$$
$$z = -l_1 \\cos(q_1) - l_2 \\cos(q_1 + q_2)$$

The Jacobian is a $2 \\times 2$ matrix:
$$\\mathbf{J}(\\mathbf{q}) = \\begin{bmatrix} \\frac{\\partial x}{\\partial q_1} & \\frac{\\partial x}{\\partial q_2} \\\\[6pt] \\frac{\\partial z}{\\partial q_1} & \\frac{\\partial z}{\\partial q_2} \\end{bmatrix}$$

#### Differentiating $x$ with respect to $q_1$ and $q_2$:
* With respect to $q_1$:
  $$\\frac{\\partial x}{\\partial q_1} = l_1 \\cos(q_1) + l_2 \\cos(q_1 + q_2)$$
* With respect to $q_2$:
  $$\\frac{\\partial x}{\\partial q_2} = l_2 \\cos(q_1 + q_2)$$

#### Differentiating $z$ with respect to $q_1$ and $q_2$:
* With respect to $q_1$ (recalling $\\frac{d}{du}(-\\cos u) = \\sin u$):
  $$\\frac{\\partial z}{\\partial q_1} = l_1 \\sin(q_1) + l_2 \\sin(q_1 + q_2)$$
* With respect to $q_2$:
  $$\\frac{\\partial z}{\\partial q_2} = l_2 \\sin(q_1 + q_2)$$

#### The Complete 2-DoF Analytical Jacobian:
$$\\mathbf{J}(\\mathbf{q}) = \\begin{bmatrix} l_1 \\cos(q_1) + l_2 \\cos(q_1 + q_2) & l_2 \\cos(q_1 + q_2) \\\\[6pt] l_1 \\sin(q_1) + l_2 \\sin(q_1 + q_2) & l_2 \\sin(q_1 + q_2) \\end{bmatrix}$$

---

### 4. The Physical Meaning of the Columns

Look at the two columns of $J$:
$$\\mathbf{J} = \\begin{bmatrix} \\mathbf{J}_1 & \\mathbf{J}_2 \\end{bmatrix}$$

* **Column 1 ($\\mathbf{J}_1$)**: The Cartesian velocity of the fingertip if **only Joint 1 rotates at $1\\text{ rad/s}$** (with Joint 2 locked).
* **Column 2 ($\\mathbf{J}_2$)**: The Cartesian velocity of the fingertip if **only Joint 2 rotates at $1\\text{ rad/s}$** (with Joint 1 locked).

Because velocities superimpose linearly:
$$\\mathbf{v} = \\mathbf{J}_1 \\dot{q}_1 + \\mathbf{J}_2 \\dot{q}_2$$

In our next mission, we will invert this matrix to command Cartesian velocities directly!"""
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
        "content": """### 1. Inverting the Velocity Mapping

We know that:
$$\\mathbf{v} = \\mathbf{J}(\\mathbf{q}) \\cdot \\dot{\\mathbf{q}}$$

To solve **Inverse Kinematics at the velocity level**:
Given a desired Cartesian velocity $\\mathbf{v} = [v_x, v_z]^T$, what joint velocities $\\dot{\\mathbf{q}} = [\\dot{q}_1, \\dot{q}_2]^T$ must we command?

By inverting the Jacobian matrix:
$$\\dot{\\mathbf{q}} = \\mathbf{J}(\\mathbf{q})^{-1} \\cdot \\mathbf{v}$$

---

### 2. Analytical Inverse of a 2x2 Matrix

For any $2 \\times 2$ matrix:
$$A = \\begin{bmatrix} a & b \\\\ c & d \\end{bmatrix} \\implies A^{-1} = \\frac{1}{\\det(A)} \\begin{bmatrix} d & -b \\\\ -c & a \\end{bmatrix}$$
where $\\det(A) = ad - bc$.

#### Computing the Determinant of our 2-DoF Jacobian:
$$\\det(\\mathbf{J}) = \\left[l_1 \\cos(q_1) + l_2 \\cos(q_1 + q_2)\\right] \\cdot \\left[l_2 \\sin(q_1 + q_2)\\right] - \\left[l_2 \\cos(q_1 + q_2)\\right] \\cdot \\left[l_1 \\sin(q_1) + l_2 \\sin(q_1 + q_2)\\right]$$

Expanding the terms:
$$\\det(\\mathbf{J}) = l_1 l_2 \\left[\\cos(q_1) \\sin(q_1 + q_2) - \\sin(q_1) \\cos(q_1 + q_2)\\right]$$

Applying the trigonometric angle subtraction identity $\\sin(A - B) = \\sin(A)\\cos(B) - \\cos(A)\\sin(B)$:
$$\\det(\\mathbf{J}) = l_1 l_2 \\sin((q_1 + q_2) - q_1) = \\mathbf{l_1 l_2 \\sin(q_2)}$$

Look at how elegant this result is:
**The determinant depends ONLY on the elbow angle $q_2$!**

---

### 3. The Mathematical Proof of Singularities

When is $\\det(\\mathbf{J}) = 0$?
$$\\det(\\mathbf{J}) = 0 \\iff \\sin(q_2) = 0 \\iff \\mathbf{q_2 = 0^\\circ \\quad \\text{or} \\quad q_2 = 180^\\circ}$$

* At $q_2 = 0^\\circ$ (arm fully outstretched): $\\det(\\mathbf{J}) = 0$.
* At $q_2 = 180^\\circ$ (arm folded flat): $\\det(\\mathbf{J}) = 0$.

Because $\\det(\\mathbf{J}) = 0$, **the Jacobian cannot be inverted**! 
Dividing by zero causes required joint velocities to explode toward infinity: $\\dot{q} \\to \\infty$.

This algebraically proves the two physical singularities we discovered in Phase 2!"""
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
        "content": """### 1. The Problem with Pure Inversion Near Singularities

When a robot's hand approaches the workspace boundary ($r \\to l_1 + l_2$), $\\det(J) \\to 0$.
Even if the desired Cartesian velocity is small ($v = 0.01\\text{ m/s}$), pure inversion commands:
$$\\dot{q} = J^{-1} v = \\frac{1}{\\det(J)} \\cdot [\\dots] \\approx \\frac{1}{0.0001} \\times 0.01 = \\mathbf{100\\text{ rad/s (Violent Joint Shudder!)}}$$

In real hardware, this blows motor fuses or triggers emergency torque shutoffs.

---

### 2. The Levenberg-Marquardt / Damped Least Squares (DLS) Solution

Instead of solving the exact equation $J \\dot{q} = v$, DLS solves an **optimization problem**:
$$\\min_{\\dot{q}} \\; \\|J \\dot{q} - v\\|^2 + \\lambda^2 \\|\\dot{q}\\|^2$$

* Term 1 ($\\|J \\dot{q} - v\\|^2$): Minimize Cartesian tracking error.
* Term 2 ($\\lambda^2 \\|\\dot{q}\\|^2$): Penalize large joint velocities (damping).

The closed-form analytical solution is the **Damped Pseudoinverse**:
$$\\mathbf{J^\\dagger = J^T (J J^T + \\lambda^2 I)^{-1}}$$

Where:
* $\\lambda$ is the **damping coefficient** (e.g. $\\lambda = 0.05$).
* $I$ is the identity matrix.

#### Why DLS Never Fails:
* Far from singularities: $\\lambda^2 \\ll \\det(J)$, so $J^\\dagger \\approx J^{-1}$ (perfect tracking).
* Near singularities: $\\lambda^2$ prevents the denominator from approaching zero, keeping $\\dot{q}$ strictly bounded!

This is the exact algorithm running in `run_sim.py` for the Unitree G1 humanoid!"""
    },
    {
        "id": "3.4",
        "phase": "Phase 3: The Shape",
        "title": "Tracing 2D Parametric Shapes (Circles & Closed Curves)",
        "status": "pending",
        "xp": 250,
        "g1_connection": "When the Unitree G1 turns a steering wheel, polishes a curved tabletop, or turns a valve, it tracks continuous 2D/3D parametric curves in task space using closed-loop Cartesian trajectory tracking.",
        "content": """### 1. From Lines to Shapes

In Phase 2, you made the arm trace a 1D line segment. 
Now, we expand to **2D closed curves**: circles, ellipses, and polygons.

A circle of radius $R$ centered at $(x_c, z_c)$ is parameterized by:
$$x(t) = x_c + R \\cos(\\omega t)$$
$$z(t) = z_c + R \\sin(\\omega t)$$

Taking time derivatives gives the analytical feedforward velocity:
$$\\dot{x}(t) = -R \\omega \\sin(\\omega t)$$
$$\\dot{z}(t) = R \\omega \\cos(\\omega t)$$

---

### 2. Closed-Loop Cartesian Velocity Control

To prevent numerical drift over long simulation runs, controllers combine feedforward velocity with proportional position error feedback:

$$\\mathbf{v}_{\\text{cmd}} = \\mathbf{v}_{\\text{desired}} + K_p \\cdot (\\mathbf{x}_{\\text{desired}} - \\mathbf{x}_{\\text{actual}})$$

Then, at every simulation step:
1. Compute $\\mathbf{v}_{\\text{cmd}}$.
2. Solve $\\dot{\\mathbf{q}} = \\mathbf{J}^\\dagger \\mathbf{v}_{\\text{cmd}}$.
3. Integrate joint position: $\\mathbf{q}_{\\text{next}} = \\mathbf{q} + \\dot{\\mathbf{q}} \\Delta t$.
4. Set `data.qpos = q_next` and watch the arm trace a **perfect, continuous circle**!"""
    },
    {
        "id": "3.5",
        "phase": "Phase 3: The Shape",
        "title": "Scaling to 3D & The 7-DoF Unitree G1 Humanoid Arm",
        "status": "pending",
        "xp": 300,
        "g1_connection": "This is the direct bridge to the official UniBot challenge. You will inspect models/unitree_g1/g1.xml, understand its 7 arm joints, and use MuJoCo's built-in Jacobian engine (mj_jacSite) to command 3D hand poses.",
        "content": """### 1. Transitioning to 6D Spatial Task Space

In 3D space, an end-effector has **6 degrees of freedom**:
* 3 Translational: $(x, y, z)$
* 3 Rotational: $(\\omega_x, \\omega_y, \\omega_z)$ or roll, pitch, yaw.

The spatial Jacobian has shape **$6 \\times n$**, where $n$ is the number of arm joints.

For the Unitree G1 arm ($n = 7$ joints):
$$\\mathbf{J} \\in \\mathbb{R}^{6 \\times 7}$$

$$\\begin{bmatrix} v_x \\\\ v_y \\\\ v_z \\\\[4pt] \\omega_x \\\\ \\omega_y \\\\ \\omega_z \\end{bmatrix} = \\mathbf{J}_{6 \\times 7} \\cdot \\begin{bmatrix} \\dot{q}_1 \\\\ \\dot{q}_2 \\\\ \\vdots \\\\ \\dot{q}_7 \\end{bmatrix}$$

---

### 2. Kinematic Redundancy: Why 7 Joints?

A task in 3D requires 6 degrees of freedom. The G1 arm has 7 joints:
$$\\text{Redundant DoFs} = 7 - 6 = 1$$

Because $n > m$, the system has **infinite solutions** for any target hand pose!
* The robot can hold a cup fixed in space while swiveling its elbow up or down.
* We can use the extra degree of freedom to **avoid joint limits, dodge obstacles, or minimize energy** using **Null-Space Projection**:

$$\\dot{\\mathbf{q}} = \\mathbf{J}^\\dagger \\mathbf{v} + (\\mathbf{I} - \\mathbf{J}^\\dagger \\mathbf{J}) \\dot{\\mathbf{q}}_{\\text{null}}$$

Where $(\\mathbf{I} - \\mathbf{J}^\\dagger \\mathbf{J})$ projects secondary goals into the null-space without disturbing the primary hand motion!

In Phase 3, you will control this exact 7-DoF arm in MuJoCo!"""
    }
]

with open(os.path.join(HERE, "data", "glossary.json"), "r", encoding="utf-8") as f:
    glossary = json.load(f)

payload = {
    "daily_missions": daily_missions,
    "lessons": lessons,
    "glossary": glossary
}

# 1. Update data.js
out_path = os.path.join(HERE, "data.js")
with open(out_path, "w", encoding="utf-8") as f:
    f.write("/** Auto-generated valid data bundle */\nconst PORTAL_DATA = " + json.dumps(payload, indent=2, ensure_ascii=False) + ";\nif (typeof window !== 'undefined') window.PORTAL_DATA = PORTAL_DATA;\nif (typeof module !== 'undefined') module.exports = PORTAL_DATA;\n")

# 2. Update data/lessons.json
lessons_json_path = os.path.join(HERE, "data", "lessons.json")
with open(lessons_json_path, "w", encoding="utf-8") as f:
    json.dump(lessons, f, indent=2, ensure_ascii=False)

print(f"Successfully generated {out_path} and {lessons_json_path}")
