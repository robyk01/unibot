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
        "title": "Velocity Kinematics & The 2-DoF Analytical Jacobian",
        "status": "completed",
        "xp": 200,
        "g1_connection": "On the Unitree G1 humanoid, each arm has 7 degrees of freedom in 3D space. You cannot use the Law of Cosines on 7 spatial joints! The G1 control system continuously computes the 6x7 Jacobian matrix J(q) at 1 kHz in run_sim.py to map joint motor velocities into 6D Cartesian twists (linear and angular velocities) of the hand.",
        "quiz": {
            "question": "If Joint 1 is moving at dq1/dt = 2.0 rad/s while Joint 2 is held completely stationary (dq2/dt = 0), what is the resulting Cartesian velocity of the fingertip?",
            "options": [
                "The velocity is zero because Joint 2 is locked",
                "The velocity vector is exactly 2.0 * J_1(q) (the first column of the Jacobian scaled by 2)",
                "The velocity equals the determinant of J(q)",
                "The velocity cannot be determined without inverting the Jacobian matrix"
            ],
            "correct": 1,
            "explanation": "Because v = J_1(q)*dq1 + J_2(q)*dq2, setting dq2 = 0 leaves v = 2.0 * J_1(q). The columns of the Jacobian physically represent the Cartesian velocity vectors produced per unit velocity of each individual joint!"
        },
        "content": """### 1. The Architectural Breakdown of Analytical Inverse Kinematics

In Phase 2, we solved Inverse Kinematics for our 2-DoF planar arm using elementary Euclidean trigonometry (the Law of Cosines). That analytical approach worked smoothly because:
1. The manipulator was strictly planar ($X$-$Z$ plane).
2. The kinematic chain had only **2 links and 2 joints**.
3. The geometry formed a closed triangle between the shoulder, elbow, and target.

#### Why Analytical Trigonometry Fails for General Manipulators
Real robotic systems—such as 6-DoF industrial manipulators (UR5, KUKA) and **7-DoF humanoid arms (Unitree G1)**—operate in 3D space with multiple coupled degrees of freedom. Their forward kinematics equations form high-degree systems of coupled, transcendental trigonometric equations:

$$\\mathbf{x} = f(\\mathbf{q})$$

* **The Pieper Criterion**: In robotics mathematics, closed-form analytical inverse kinematics is solvable for 6-DoF arms if and only if three consecutive revolute joint axes intersect at a single point (forming a spherical wrist) or are parallel.
* **Redundant Manipulators**: For a 7-DoF arm like the Unitree G1, the system is kinematically redundant ($n=7$ joints vs. $m=6$ Cartesian degrees of freedom). There are infinitely many joint configurations that place the hand at the exact same Cartesian pose. Analytical position IK does not exist in closed form.

#### The Breakthrough: Differential Velocity Kinematics
Instead of attempting to invert non-linear trigonometric equations at the position level, modern robotics shifts to the **differential (velocity) domain**.

* While position forward kinematics $\\mathbf{x} = f(\\mathbf{q})$ is globally **non-linear**,
* The velocity mapping $\\dot{\\mathbf{x}} = \\mathbf{J}(\\mathbf{q}) \\dot{\\mathbf{q}}$ is **locally linear**!

Solving a linear system of equations $\\mathbf{A}\\mathbf{x} = \\mathbf{b}$ is computationally fast, numerically well-understood, and easily executed at 1,000 Hz on embedded microcontrollers.

---

### 2. Mathematical Definition of the Manipulator Jacobian

Let the robot's configuration be described by a vector of generalized joint coordinates:
$$\\mathbf{q} = \\begin{bmatrix} q_1 \\\\ q_2 \\\\ \\vdots \\\\ q_n \\end{bmatrix} \\in \\mathbb{R}^n$$

Let the end-effector pose in task space be described by an $m$-dimensional vector:
$$\\mathbf{x} = \\begin{bmatrix} x_1 \\\\ x_2 \\\\ \\vdots \\\\ x_m \\end{bmatrix} \\in \\mathbb{R}^m$$

The forward kinematics function is:
$$\\mathbf{x} = f(\\mathbf{q})$$

Taking the total time derivative of each Cartesian coordinate $x_i$ using the multivariate chain rule:
$$\\dot{x}_i = \\frac{d x_i}{dt} = \\sum_{j=1}^n \\frac{\\partial f_i}{\\partial q_j} \\frac{dq_j}{dt} = \\sum_{j=1}^n \\frac{\\partial f_i}{\\partial q_j} \\dot{q}_j$$

In compact matrix-vector notation:
$$\\dot{\\mathbf{x}} = \\mathbf{J}(\\mathbf{q}) \\dot{\\mathbf{q}}$$

The matrix $\\mathbf{J}(\\mathbf{q}) \\in \\mathbb{R}^{m \\times n}$ is the **Manipulator Jacobian Matrix**, defined element-wise as:
$$J_{ij}(\\mathbf{q}) = \\frac{\\partial f_i(\\mathbf{q})}{\\partial q_j}$$

* **Number of Rows ($m$)**: The dimension of the Cartesian task space (e.g. $m=2$ for planar translation, $m=3$ for 3D translation, $m=6$ for 3D translation + rotation).
* **Number of Columns ($n$)**: The number of generalized joint coordinates (e.g. $n=2$ for our planar arm, $n=7$ for the Unitree G1 arm).

> **Crucial Property**: The Jacobian $\\mathbf{J}(\\mathbf{q})$ is **not constant**. It is a function of the instantaneous joint configuration $\\mathbf{q}$. As the robot moves through its workspace, the linear velocity mapping changes continuously at every microsecond.

---

### 3. Step-by-Step Calculus Derivation for Our 2-DoF Arm

Let us derive every single entry of the Jacobian matrix for our 2-DoF planar manipulator from first principles.

#### Coordinate Frame & Angle Conventions
* Base shoulder pivot located at $(x_0, z_0) = (0, 1.0)$.
* Link lengths: $l_1 = 0.4\\text{ m}$, $l_2 = 0.3\\text{ m}$.
* $q_1$: Shoulder angle relative to downward vertical ($+Z$ points upward in world frame).
* $q_2$: Elbow angle relative to the extension of the upper arm.

Recall our Forward Kinematics equations:
$$x(q_1, q_2) = l_1 \\sin(q_1) + l_2 \\sin(q_1 + q_2)$$
$$z(q_1, q_2) = z_0 - l_1 \\cos(q_1) - l_2 \\cos(q_1 + q_2)$$

The Jacobian is a $2 \\times 2$ matrix:
$$\\mathbf{J}(\\mathbf{q}) = \\begin{bmatrix} \\frac{\\partial x}{\\partial q_1} & \\frac{\\partial x}{\\partial q_2} \\\\ \\frac{\\partial z}{\\partial q_1} & \\frac{\\partial z}{\\partial q_2} \\end{bmatrix}$$

#### Derivation of the First Row (Horizontal Velocity $\\dot{x}$):
1. Differentiating $x$ with respect to $q_1$:
   $$\\frac{\\partial x}{\\partial q_1} = \\frac{\\partial}{\\partial q_1}\\left[l_1 \\sin(q_1)\\right] + \\frac{\\partial}{\\partial q_1}\\left[l_2 \\sin(q_1 + q_2)\\right]$$
   Using the derivative of $\\sin(u)$ and the chain rule $\\frac{\\partial(q_1 + q_2)}{\\partial q_1} = 1$:
   $$\\frac{\\partial x}{\\partial q_1} = l_1 \\cos(q_1) + l_2 \\cos(q_1 + q_2)$$

2. Differentiating $x$ with respect to $q_2$:
   $$\\frac{\\partial x}{\\partial q_2} = \\frac{\\partial}{\\partial q_2}\\left[l_1 \\sin(q_1)\\right] + \\frac{\\partial}{\\partial q_2}\\left[l_2 \\sin(q_1 + q_2)\\right]$$
   Since $l_1 \\sin(q_1)$ is constant with respect to $q_2$, its derivative is $0$:
   $$\\frac{\\partial x}{\\partial q_2} = 0 + l_2 \\cos(q_1 + q_2) \\cdot 1 = l_2 \\cos(q_1 + q_2)$$

#### Derivation of the Second Row (Vertical Velocity $\\dot{z}$):
1. Differentiating $z$ with respect to $q_1$:
   $$\\frac{\\partial z}{\\partial q_1} = \\frac{\\partial}{\\partial q_1}[z_0] - l_1 \\frac{\\partial}{\\partial q_1}[\\cos(q_1)] - l_2 \\frac{\\partial}{\\partial q_1}[\\cos(q_1 + q_2)]$$
   Recalling that $\\frac{d}{du}[-\\cos(u)] = \\sin(u)$:
   $$\\frac{\\partial z}{\\partial q_1} = 0 - l_1(-\\sin(q_1)) - l_2(-\\sin(q_1 + q_2)) = l_1 \\sin(q_1) + l_2 \\sin(q_1 + q_2)$$

2. Differentiating $z$ with respect to $q_2$:
   $$\\frac{\\partial z}{\\partial q_2} = 0 - 0 - l_2(-\\sin(q_1 + q_2)) = l_2 \\sin(q_1 + q_2)$$

#### The Complete 2-DoF Analytical Jacobian:
$$\\mathbf{J}(\\mathbf{q}) = \\begin{bmatrix} l_1 \\cos(q_1) + l_2 \\cos(q_1 + q_2) & l_2 \\cos(q_1 + q_2) \\\\ l_1 \\sin(q_1) + l_2 \\sin(q_1 + q_2) & l_2 \\sin(q_1 + q_2) \\end{bmatrix}$$

---

### 4. Physical Meaning: Column-Vector Decomposition

To develop true mechanical intuition, write $\\mathbf{J}(\\mathbf{q})$ as a set of column vectors:
$$\\mathbf{J}(\\mathbf{q}) = \\begin{bmatrix} \\mathbf{J}_1(\\mathbf{q}) & \\mathbf{J}_2(\\mathbf{q}) \\end{bmatrix}$$

Where:
$$\\mathbf{J}_1(\\mathbf{q}) = \\begin{bmatrix} l_1 \\cos(q_1) + l_2 \\cos(q_1 + q_2) \\\\ l_1 \\sin(q_1) + l_2 \\sin(q_1 + q_2) \\end{bmatrix}, \\quad \\mathbf{J}_2(\\mathbf{q}) = \\begin{bmatrix} l_2 \\cos(q_1 + q_2) \\\\ l_2 \\sin(q_1 + q_2) \\end{bmatrix}$$

By the definition of matrix-vector multiplication:
$$\\mathbf{v} = \\begin{bmatrix} \\dot{x} \\\\ \\dot{z} \\end{bmatrix} = \\mathbf{J}_1(\\mathbf{q}) \\dot{q}_1 + \\mathbf{J}_2(\\mathbf{q}) \\dot{q}_2$$

#### Physical Meaning of Column 1 ($\\mathbf{J}_1$):
* Suppose Joint 2 is locked ($\\dot{q}_2 = 0$) and Joint 1 rotates at unit speed $\\dot{q}_1 = 1\\text{ rad/s}$.
* Then $\\mathbf{v} = \\mathbf{J}_1(\\mathbf{q})$.
* Therefore, **Column 1 is the instantaneous linear velocity vector of the fingertip caused exclusively by the rotation of the shoulder!**
* Geometrically, $\\mathbf{J}_1$ is strictly perpendicular to the vector connecting the shoulder pivot to the fingertip.

#### Physical Meaning of Column 2 ($\\mathbf{J}_2$):
* Suppose Joint 1 is locked ($\\dot{q}_1 = 0$) and Joint 2 rotates at unit speed $\\dot{q}_2 = 1\\text{ rad/s}$.
* Then $\\mathbf{v} = \\mathbf{J}_2(\\mathbf{q})$.
* Therefore, **Column 2 is the instantaneous linear velocity vector of the fingertip caused exclusively by the rotation of the elbow!**
* Geometrically, $\\mathbf{J}_2$ is strictly perpendicular to the forearm link, and its magnitude is:
  $$\\|\\mathbf{J}_2\\| = \\sqrt{\\left[l_2 \\cos(q_1 + q_2)\\right]^2 + \\left[l_2 \\sin(q_1 + q_2)\\right]^2} = l_2 \\sqrt{\\cos^2(\\dots) + \\sin^2(\\dots)} = l_2$$
  This directly matches basic circular physics: $v = \\omega r = (1\\text{ rad/s}) \\times l_2 = l_2$!

---

### 5. The Geometric Cross-Product Formulation (University-Grade Robotics)

In 3D spatial robotics, computing the Jacobian by symbolically differentiating trigonometric expressions is tedious and error-prone. Standard university textbooks (Lynch & Park, Craig, Siciliano) formulate the Jacobian using **rigid-body kinematics and vector cross-products**.

For any revolute joint $i$ with:
* Unit vector along the joint rotation axis: $\\hat{\\mathbf{z}}_{i-1}$
* Position vector of the joint pivot: $\\mathbf{p}_{i-1}$
* Position vector of the end-effector: $\\mathbf{p}_{\\text{tip}}$

The linear velocity contribution $\\mathbf{J}_{v, i}$ and angular velocity contribution $\\mathbf{J}_{\\omega, i}$ are:
$$\\mathbf{J}_{v, i} = \\hat{\\mathbf{z}}_{i-1} \\times (\\mathbf{p}_{\\text{tip}} - \\mathbf{p}_{i-1})$$
$$\\mathbf{J}_{\\omega, i} = \\hat{\\mathbf{z}}_{i-1}$$

This cross-product formula—$(\\text{axis of rotation}) \\times (\\text{lever arm to end-effector})$—is the exact mathematical foundation used by MuJoCo's C-engine (`mj_jacSite`)!

---

### 6. Concrete Numerical Walkthrough: Hand Calculation

Let us compute an explicit numerical example to build total confidence before writing code.

#### Given Parameters:
* Link lengths: $l_1 = 0.4\\text{ m}$, $l_2 = 0.3\\text{ m}$.
* Configuration: $q_1 = 30^\\circ = \\frac{\\pi}{6}\\text{ rad} \\approx 0.5236\\text{ rad}$.
* Configuration: $q_2 = 45^\\circ = \\frac{\\pi}{4}\\text{ rad} \\approx 0.7854\\text{ rad}$.
* Cumulative angle: $q_1 + q_2 = 75^\\circ = \\frac{5\\pi}{12}\\text{ rad} \\approx 1.3090\\text{ rad}$.

#### Trigonometric Values:
$$\\cos(30^\\circ) = \\frac{\\sqrt{3}}{2} \\approx 0.8660, \\quad \\sin(30^\\circ) = 0.5000$$
$$\\cos(75^\\circ) = \\frac{\\sqrt{6} - \\sqrt{2}}{4} \\approx 0.2588, \\quad \\sin(75^\\circ) = \\frac{\\sqrt{6} + \\sqrt{2}}{4} \\approx 0.9659$$

#### Evaluating Matrix Entries:
* $J_{11} = 0.4(0.8660) + 0.3(0.2588) = 0.3464 + 0.0776 = 0.4240\\text{ m}$
* $J_{12} = 0.3(0.2588) = 0.0776\\text{ m}$
* $J_{21} = 0.4(0.5000) + 0.3(0.9659) = 0.2000 + 0.2898 = 0.4898\\text{ m}$
* $J_{22} = 0.3(0.9659) = 0.2898\\text{ m}$

$$\\mathbf{J}(\\mathbf{q}) = \\begin{bmatrix} 0.4240 & 0.0776 \\\\ 0.4898 & 0.2898 \\end{bmatrix}$$

#### Applying Joint Velocities:
Suppose the motors are spinning at:
$$\\dot{\\mathbf{q}} = \\begin{bmatrix} \\dot{q}_1 \\\\ \\dot{q}_2 \\end{bmatrix} = \\begin{bmatrix} 1.0\\text{ rad/s} \\\\ -2.0\\text{ rad/s} \\end{bmatrix}$$

The resulting Cartesian velocity of the fingertip is:
$$\\mathbf{v} = \\mathbf{J}(\\mathbf{q}) \\dot{\\mathbf{q}} = \\begin{bmatrix} 0.4240 & 0.0776 \\\\ 0.4898 & 0.2898 \\end{bmatrix} \\begin{bmatrix} 1.0 \\\\ -2.0 \\end{bmatrix}$$

$$v_x = (0.4240)(1.0) + (0.0776)(-2.0) = 0.4240 - 0.1552 = \\mathbf{+0.2688\\text{ m/s}}$$
$$v_z = (0.4898)(1.0) + (0.2898)(-2.0) = 0.4898 - 0.5796 = \\mathbf{-0.0898\\text{ m/s}}$$

**Interpretation**: The fingertip is simultaneously moving forward along $+X$ at $0.269\\text{ m/s}$ and downward along $-Z$ at $0.090\\text{ m/s}$.

---

### 7. MuJoCo Implementation: `mj_jacSite`

In MuJoCo, you do not need to derive Jacobians by hand for complex robots. MuJoCo provides the high-performance C function:

```python
jacp = np.zeros((3, model.nv))  # Translational Jacobian (3 x nv)
jacr = np.zeros((3, model.nv))  # Rotational Jacobian (3 x nv)
mujoco.mj_jacSite(model, data, jacp, jacr, site_id)
```

* `jacp[0, :]`: Partial derivatives for $X$ velocity with respect to all degrees of freedom.
* `jacp[2, :]`: Partial derivatives for $Z$ velocity with respect to all degrees of freedom.

In our upcoming coding lab, you will calculate your analytical Jacobian function in Python and verify that it matches MuJoCo's C engine to within $10^{-9}$ numerical tolerance!"""
    },
    {
        "id": "3.2",
        "phase": "Phase 3: The Shape",
        "title": "Differential Inverse Kinematics & Matrix Inversion",
        "status": "in_progress",
        "xp": 220,
        "g1_connection": "In run_sim.py, when the Unitree G1 humanoid tracks a 3D hand trajectory, it inverts the Jacobian at every 1 ms simulation step to calculate required joint motor velocities: dq = J^-1 * v. Understanding when and why J^-1 fails is the key to preventing violent motor shudder near singularities.",
        "quiz": {
            "question": "Why does the determinant of the 2-DoF planar arm's Jacobian det(J) depend ONLY on the elbow angle q2, completely independent of the shoulder angle q1?",
            "options": [
                "Because the shoulder motor is fixed to the world base, so rotating the entire arm as a rigid unit does not change its internal shape or stretching capacity",
                "Because MuJoCo ignores the first joint during dynamics integration",
                "Because the determinant of any matrix is always independent of the first variable",
                "Because Link 1 has no mass"
            ],
            "correct": 0,
            "explanation": "Rotating the shoulder angle q1 simply rotates the entire arm as a rigid structure around the base without altering its internal posture, reachability, or distance between links. Only bending the elbow (q2) changes the arm's geometry, reachability, and proximity to singularities!"
        },
        "content": """### 1. From Forward Velocity to Inverse Velocity Control

In Lesson 3.1, we mastered **Forward Velocity Kinematics**:
$$\\mathbf{v} = \\mathbf{J}(\\mathbf{q}) \\dot{\\mathbf{q}}$$

Given the joint motor speeds $\\dot{\\mathbf{q}}$, multiplying by $\\mathbf{J}(\\mathbf{q})$ tells us how fast the hand moves in Cartesian space $\\mathbf{v}$.

However, in autonomous robotics, our problem is almost always the **exact reverse**:
1. A path planner commands: *\"Move the robot hand forward at $v_x = 0.2\\text{ m/s}$ and upward at $v_z = 0.05\\text{ m/s}$.\"*
2. We know the desired Cartesian velocity $\\mathbf{v}^* = [v_x^*, v_z^*]^T$.
3. We must solve for the required joint motor velocities $\\dot{\\mathbf{q}}^* = [\\dot{q}_1^*, \\dot{q}_2^*]^T$.

This is called **Differential Inverse Kinematics (Differential IK)**:
$$\\mathbf{J}(\\mathbf{q}) \\dot{\\mathbf{q}}^* = \\mathbf{v}^* \\implies \\mathbf{\\dot{q}^* = J(q)^{-1} v^*}$$

---

### 2. Linear Algebra Review: Analytical Inversion of a 2x2 Matrix

For any general $2 \\times 2$ matrix:
$$\\mathbf{A} = \\begin{bmatrix} a & b \\\\ c & d \\end{bmatrix}$$

The matrix inverse $\\mathbf{A}^{-1}$ exists if and only if the **determinant** $\\det(\\mathbf{A}) \\ne 0$, and is given by:
$$\\mathbf{A}^{-1} = \\frac{1}{\\det(\\mathbf{A})} \\text{adj}(\\mathbf{A}) = \\frac{1}{ad - bc} \\begin{bmatrix} d & -b \\\\ -c & a \\end{bmatrix}$$

#### What Does the Determinant Mean Geometrically?
* The determinant $\\det(\\mathbf{A})$ measures the **area scaling factor** of the linear transformation.
* If you take a unit square in joint-velocity space ($[0, 1] \\times [0, 1]$), multiplying it by $\\mathbf{J}(\\mathbf{q})$ maps it into a parallelogram in Cartesian velocity space. The area of that parallelogram is exactly $|\\det(\\mathbf{J})|$!
* If $\\det(\\mathbf{J}) = 0$, the parallelogram has **zero area**—the 2D velocity space has collapsed into a 1D line! Inversion is impossible because you cannot divide by zero.

---

### 3. Exhaustive Step-by-Step Derivation of $\\det(\\mathbf{J})$ for Our 2-DoF Arm

Recall our analytical Jacobian matrix for the 2-DoF planar arm (accounting for the $+Y$ joint rotation axis):
$$\\mathbf{J}(\\mathbf{q}) = \\begin{bmatrix} J_{11} & J_{12} \\\\ J_{21} & J_{22} \\end{bmatrix} = \\begin{bmatrix} -l_1 \\cos(q_1) - l_2 \\cos(q_1 + q_2) & -l_2 \\cos(q_1 + q_2) \\\\ l_1 \\sin(q_1) + l_2 \\sin(q_1 + q_2) & l_2 \\sin(q_1 + q_2) \\end{bmatrix}$$

Let us compute $\\det(\\mathbf{J}) = J_{11} J_{22} - J_{12} J_{21}$ with zero skipped steps:

#### Step 3.1: Multiplying the Diagonal Terms ($J_{11} \\cdot J_{22}$)
$$J_{11} J_{22} = \\left[-l_1 \\cos(q_1) - l_2 \\cos(q_1 + q_2)\\right] \\cdot \\left[l_2 \\sin(q_1 + q_2)\\right]$$
$$= -l_1 l_2 \\cos(q_1) \\sin(q_1 + q_2) - l_2^2 \\cos(q_1 + q_2) \\sin(q_1 + q_2)$$

#### Step 3.2: Multiplying the Off-Diagonal Terms ($J_{12} \\cdot J_{21}$)
$$J_{12} J_{21} = \\left[-l_2 \\cos(q_1 + q_2)\\right] \\cdot \\left[l_1 \\sin(q_1) + l_2 \\sin(q_1 + q_2)\\right]$$
$$= -l_1 l_2 \\sin(q_1) \\cos(q_1 + q_2) - l_2^2 \\cos(q_1 + q_2) \\sin(q_1 + q_2)$$

#### Step 3.3: Subtracting the Two Products ($J_{11} J_{22} - J_{12} J_{21}$)
$$\\det(\\mathbf{J}) = \\left[-l_1 l_2 \\cos(q_1) \\sin(q_1 + q_2) - l_2^2 \\cos(q_1 + q_2) \\sin(q_1 + q_2)\\right] - \\left[-l_1 l_2 \\sin(q_1) \\cos(q_1 + q_2) - l_2^2 \\cos(q_1 + q_2) \\sin(q_1 + q_2)\\right]$$

Notice that the $-l_2^2 \\cos(q_1 + q_2) \\sin(q_1 + q_2)$ terms **cancel out completely**:
$$\\det(\\mathbf{J}) = -l_1 l_2 \\cos(q_1) \\sin(q_1 + q_2) + l_1 l_2 \\sin(q_1) \\cos(q_1 + q_2)$$
$$= -l_1 l_2 \\left[\\cos(q_1) \\sin(q_1 + q_2) - \\sin(q_1) \\cos(q_1 + q_2)\\right]$$

#### Step 3.4: Applying Trigonometric Angle-Difference Identity
Recall the trigonometric identity:
$$\\sin(A - B) = \\sin(A) \\cos(B) - \\cos(A) \\sin(B)$$

Let $A = q_1 + q_2$ and $B = q_1$:
$$\\sin((q_1 + q_2) - q_1) = \\sin(q_1 + q_2) \\cos(q_1) - \\cos(q_1 + q_2) \\sin(q_1)$$

Substitute this into our determinant expression:
$$\\mathbf{\\det(J) = -l_1 l_2 \\sin(q_2)}$$

> **The Grand Insight**:  
> The determinant depends **exclusively on the elbow angle $q_2$**!  
> The shoulder angle $q_1$ does not appear anywhere in $\\det(\\mathbf{J})$. Why? Because rotating $q_1$ simply revolves the entire arm as a rigid structure around the shoulder without changing its internal shape, stretch, or dexterity. Only the elbow angle $q_2$ alters the arm's geometry!

---

### 4. Constructing the Complete Analytical Inverse Matrix $\\mathbf{J}^{-1}$

Using the $2 \\times 2$ inversion formula:
$$\\mathbf{J}^{-1} = \\frac{1}{\\det(\\mathbf{J})} \\begin{bmatrix} J_{22} & -J_{12} \\\\ -J_{21} & J_{11} \\end{bmatrix}$$

Substituting our exact terms:
$$\\mathbf{J}^{-1} = \\frac{1}{-l_1 l_2 \\sin(q_2)} \\begin{bmatrix} l_2 \\sin(q_1 + q_2) & l_2 \\cos(q_1 + q_2) \\\\ -l_1 \\sin(q_1) - l_2 \\sin(q_1 + q_2) & -l_1 \\cos(q_1) - l_2 \\cos(q_1 + q_2) \\end{bmatrix}$$

Distributing the negative sign from the denominator into the matrix:
$$\\mathbf{J}^{-1} = \\frac{1}{l_1 l_2 \\sin(q_2)} \\begin{bmatrix} -l_2 \\sin(q_1 + q_2) & -l_2 \\cos(q_1 + q_2) \\\\ l_1 \\sin(q_1) + l_2 \\sin(q_1 + q_2) & l_1 \\cos(q_1) + l_2 \\cos(q_1 + q_2) \\end{bmatrix}$$

---

### 5. The Mathematical & Physical Proof of Singularities

Look at the denominator of $\\mathbf{J}^{-1}$:
$$\\text{Denominator} = l_1 l_2 \\sin(q_2)$$

When does this denominator equal zero?
$$\\det(\\mathbf{J}) = 0 \\iff \\sin(q_2) = 0 \\iff \\mathbf{q_2 = 0^\\circ \\quad \\text{or} \\quad q_2 = 180^\\circ}$$

#### Singularity Case A: Maximum Stretch ($q_2 = 0^\\circ$)
* The upper arm and forearm align into a single straight line ($r = l_1 + l_2 = 0.7\\text{ m}$).
* The columns of $\\mathbf{J}$ become parallel.
* If you command a radial velocity pointing outward ($v_{\\text{radial}} > 0$), the required joint speed is:
  $$\\dot{\\mathbf{q}} = \\frac{1}{0} \\cdot \\mathbf{v} \\longrightarrow \\infty$$
* **Physical consequence**: The motor tries to spin infinitely fast, causing severe joint shudder, current saturation, or actuator shutdown!

#### Singularity Case B: Full Retraction ($q_2 = 180^\\circ$)
* The forearm folds completely backward onto the upper arm ($r = |l_1 - l_2| = 0.1\\text{ m}$).
* The arm cannot move radially inward toward the shoulder.

---

### 6. The Manipulability Ellipsoid (Yoshikawa's Metric)

How can a robot tell whether it is *close* to a singularity before it actually hits one?

In 1985, Tsuneo Yoshikawa introduced the **Manipulability Measure** $w(\\mathbf{q})$:
$$w(\\mathbf{q}) = \\sqrt{\\det(\\mathbf{J} \\mathbf{J}^T)}$$

For a square matrix ($m = n = 2$):
$$w(\\mathbf{q}) = |\\det(\\mathbf{J})| = l_1 l_2 |\\sin(q_2)|$$

#### The Velocity Ellipsoid:
If the robot's motors are limited to a unit ball of joint velocities $(\\dot{q}_1^2 + \\dot{q}_2^2 \\le 1)$, the reachable Cartesian velocities form an **ellipse** in the $(v_x, v_z)$ plane:
$$\\mathbf{v}^T (\\mathbf{J} \\mathbf{J}^T)^{-1} \\mathbf{v} \\le 1$$

* **At $q_2 = 90^\\circ$ ($w = 0.12$, Maximum Dexterity)**:
  The ellipsoid is wide, fat, and isotropic. The robot can accelerate equally well in all directions.
* **Near a Singularity (e.g. $q_2 = 2^\\circ$, $w = 0.004$)**:
  The ellipsoid flattens into an extremely thin needle. Moving along the major axis requires almost zero motor effort, but moving along the minor axis (radial) requires massive, near-infinite motor speeds!

---

### 7. Concrete Numerical Walkthrough: Hand Calculation

Let us walk through an explicit numerical inversion and velocity command.

#### Given Parameters:
* Link lengths: $l_1 = 0.4\\text{ m}$, $l_2 = 0.3\\text{ m}$.
* Configuration: $q_1 = 30^\\circ = \\frac{\\pi}{6}\\text{ rad}$, $q_2 = 45^\\circ = \\frac{\\pi}{4}\\text{ rad}$.
* Cumulative angle: $q_1 + q_2 = 75^\\circ = \\frac{5\\pi}{12}\\text{ rad}$.

#### Step 1: Compute the Determinant
$$\\det(\\mathbf{J}) = -l_1 l_2 \\sin(q_2) = -(0.4)(0.3) \\sin(45^\\circ) = -0.12 \\times 0.7071 = \\mathbf{-0.08485\\text{ m}^2}$$

Because $\\det(\\mathbf{J}) \\ne 0$, the matrix is non-singular and invertible!

#### Step 2: Compute $\\mathbf{J}^{-1}$
Recall our numerical $\\mathbf{J}$ at this configuration:
$$\\mathbf{J} = \\begin{bmatrix} -0.4240 & -0.0776 \\\\ 0.4898 & 0.2898 \\end{bmatrix}$$

Using the inverse formula:
$$\\mathbf{J}^{-1} = \\frac{1}{-0.08485} \\begin{bmatrix} 0.2898 & 0.0776 \\\\ -0.4898 & -0.4240 \\end{bmatrix} = \\begin{bmatrix} -3.4154 & -0.9146 \\\\ 5.7725 & 4.9971 \\end{bmatrix}$$

#### Step 3: Command a Cartesian Velocity
Suppose we want the fingertip to move **purely horizontally forward** at $v_x^* = 0.1\\text{ m/s}$, with zero vertical drift ($v_z^* = 0.0\\text{ m/s}$):
$$\\mathbf{v}^* = \\begin{bmatrix} 0.1 \\\\ 0.0 \\end{bmatrix}\\text{ m/s}$$

What joint velocities must the motors spin at?
$$\\dot{\\mathbf{q}}^* = \\mathbf{J}^{-1} \\mathbf{v}^* = \\begin{bmatrix} -3.4154 & -0.9146 \\\\ 5.7725 & 4.9971 \\end{bmatrix} \\begin{bmatrix} 0.1 \\\\ 0.0 \\end{bmatrix}$$

$$\\dot{q}_1^* = (-3.4154)(0.1) + (-0.9146)(0.0) = \\mathbf{-0.3415\\text{ rad/s}}$$
$$\\dot{q}_2^* = (5.7725)(0.1) + (4.9971)(0.0) = \\mathbf{+0.5773\\text{ rad/s}}$$

**Verification**:
Multiplying $\\mathbf{J} \\dot{\\mathbf{q}}^*$:
$$v_x = (-0.4240)(-0.3415) + (-0.0776)(0.5773) = 0.1448 - 0.0448 = \\mathbf{0.1000\\text{ m/s}} \\quad \\checkmark$$
$$v_z = (0.4898)(-0.3415) + (0.2898)(0.5773) = -0.1673 + 0.1673 = \\mathbf{0.0000\\text{ m/s}} \\quad \\checkmark$$

The fingertip moves in a laser-straight horizontal line!"""
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

$$\\begin{bmatrix} v_x \\\\ v_y \\\\ v_z \\\\ \\omega_x \\\\ \\omega_y \\\\ \\omega_z \\end{bmatrix} = \\mathbf{J}_{6 \\times 7} \\cdot \\begin{bmatrix} \\dot{q}_1 \\\\ \\dot{q}_2 \\\\ \\vdots \\\\ \\dot{q}_7 \\end{bmatrix}$$

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
