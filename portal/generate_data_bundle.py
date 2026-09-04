import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))

daily_missions = [
    {
        "id": "D-01",
        "title": "Step Size Sensitivity Test",
        "xp": 40,
        "description": "In 01_inspect_physics.py, change timestep from 0.002 to 0.02 and 0.0002. Observe numerical stability.",
        "completed": False
    },
    {
        "id": "D-02",
        "title": "Zero-Damping Energy Check",
        "xp": 50,
        "description": "Set joint damping to 0.0 in XML and verify that max amplitude is perfectly conserved across 20 cycles.",
        "completed": False
    },
    {
        "id": "D-03",
        "title": "Torque Limits Verification",
        "xp": 60,
        "description": "Add gear or ctrlrange attribute to your actuator in XML and test what happens when motor torque saturates.",
        "completed": False
    }
]

lessons = [
    {
        "id": "1.1",
        "phase": "Phase 1: The Dot",
        "title": "MuJoCo Core Architecture & State Vectors",
        "status": "completed",
        "xp": 50,
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
        "content": """### 1. Actuation Architecture: The `data.ctrl` Vector

To transform a passive linkage into an active robot, actuators are declared in the XML model:

```xml
<actuator>
  <motor name="shoulder_motor" joint="pin"/>
</actuator>
```

A `<motor>` actuator in MuJoCo directly injects generalized forces along the joint degree of freedom. For revolute joints, `data.ctrl[i]` specifies joint torque $\\tau$ in Newton-meters ($\text{N}\\cdot\\text{m}$).

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
        "title": "Feedback Control: From Pure P to PD Control",
        "status": "in_progress",
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
        "content": """### 1. Why Start with Pure P Control?

Before understanding PD control, we **must understand P (Proportional) control on its own**.

In Mission 1.3, we used an open-loop torque ($3.77\\text{ N}\\cdot\\text{m}$). It worked only for $90^\\circ$ when starting from rest. If we want the robot to move from $0^\\circ$ to any arbitrary target angle (e.g. $45^\\circ$ or $90^\\circ$), the motor must react to where it currently is:

$$e(t) = q_{\\text{target}} - q_{\\text{actual}}(t)$$
$$\\tau_P = K_p \\cdot e(t)$$

#### The Physical Meaning of $K_p$ (The Virtual Spring)
$K_p$ acts as a **virtual torsional spring** connecting the arm to the target setpoint:
* When $e$ is large (far from target) $\\rightarrow$ spring pulls hard.
* When $e = 0$ (at target) $\\rightarrow$ spring exerts zero force.

#### The Fatal Flaw of Pure P Control: Endless Oscillations!
If you attach a weight to a physical spring and pull it, does it stop at the center? **No!**
It accelerates toward the center, reaches maximum speed right at the target, overshoots to the other side, and bounces back and forth forever!
**A pure P controller has zero damping.** It converts potential error energy into kinetic speed energy and back again.

---

### 2. Enter the D Term: The Virtual Shock Absorber

To stop the oscillations, we must add a brake that actively **dissipates kinetic energy**.
That is the **Derivative (D) term**:

$$\\tau_D = -K_d \\cdot \\dot{q} = -K_d \\cdot q_{\\text{vel}}$$

#### The Physical Meaning of $K_d$ (The Virtual Damper)
* When moving fast toward the target, $\\tau_D$ pushes in the **opposite direction of motion**, slowing the arm down just before it hits the target!
* When the arm is stationary ($\\dot{q} = 0$), the damper exerts **zero force** and does not resist holding.

---

### 3. The Full PD Equation

Combining the virtual spring and the virtual damper yields the complete Proportional-Derivative controller:

$$\\tau(t) = K_p \\cdot (q_{\\text{target}} - q_{\\text{actual}}) - K_d \\cdot q_{\\text{vel}}$$

* **Proportional (P)**: $K_p \\cdot (q_{\\text{target}} - q_{\\text{actual}})$ acts as a virtual spring pulling toward the target.
* **Derivative (D)**: $-K_d \\cdot q_{\\text{vel}}$ acts as a virtual shock absorber braking the motion.

### 4. Lab Mission: Write 03_pd_controller.py

In our upcoming hands-on lab:
1. **Step 1**: Implement pure P control ($K_d = 0$). Witness the overshoot and oscillation firsthand.
2. **Step 2**: Add the D term ($K_d > 0$). Watch the arm decelerate smoothly and lock onto the target like a precision instrument!"""
    },
    {
        "id": "1.5",
        "phase": "Phase 1: The Dot",
        "title": "Phase 1 Boss Fight: The Inverted Pendulum Balance Challenge",
        "status": "pending",
        "xp": 200,
        "g1_connection": "Humanoid walking is fundamentally modeled as an 3D Inverted Pendulum (LIPM - Linear Inverted Pendulum Model). If you can stabilize an inverted pendulum against perturbations, you have mastered the core stabilization principle behind bipedal balance.",
        "content": """### Phase 1 Capstone Challenge: Balancing at 180°

In this boss challenge, you start the pendulum near the inverted upright position ($q_{\\text{pos}} = 3.14\\text{ rad}$) and write a PD controller with gravity compensation to keep it balanced upright even when subjected to external disturbances or pushes."""
    },
    {
        "id": "2.1",
        "phase": "Phase 2: The Line",
        "title": "2-DoF Planar Arm & Forward Kinematics (FK)",
        "status": "pending",
        "xp": 120,
        "g1_connection": "Each arm of the G1 has 7 joints. Forward Kinematics is how the robot calculates where its hand palm is in 3D Cartesian coordinates relative to its torso.",
        "content": """### Roadmap Preview: 2-DoF Kinematics

In Phase 2, we introduce a second revolute joint, forming a two-link planar arm operating in the $(X, Y)$ plane. Forward Kinematics determines the Cartesian coordinates of the end-effector given joint angles $(\\theta_1, \\theta_2)$."""
    },
    {
        "id": "2.2",
        "phase": "Phase 2: The Line",
        "title": "Analytical Inverse Kinematics (IK) & The Law of Cosines",
        "status": "pending",
        "xp": 150,
        "g1_connection": "When you want the robot to reach for a cup on a table, you specify the cup's coordinates (x, y, z). Inverse Kinematics solves for the exact shoulder and elbow angles required to reach that point.",
        "content": """### Roadmap Preview: Analytical Inverse Kinematics

Given a target $(x, y)$, calculate the required joint angles $(\\theta_1, \\theta_2)$ using trigonometry."""
    },
    {
        "id": "3.1",
        "phase": "Phase 3: The Shape",
        "title": "3D Manipulators & The Jacobian Matrix",
        "status": "pending",
        "xp": 200,
        "g1_connection": "The official UniBot challenge uses Damped Least Squares Jacobian Inverse Kinematics in run_sim.py. In Phase 3, you will derive and understand this exact mathematical matrix yourself.",
        "content": """### Roadmap Preview: Spatial Manipulators & Jacobians

Phase 3 transitions to 6-DoF spatial manipulators, mapping end-effector Cartesian velocities to joint velocities via the Jacobian matrix $J(q)$."""
    }
]

with open(os.path.join(HERE, "data", "glossary.json"), "r", encoding="utf-8") as f:
    glossary = json.load(f)

payload = {
    "daily_missions": daily_missions,
    "lessons": lessons,
    "glossary": glossary
}

out_path = os.path.join(HERE, "data.js")
with open(out_path, "w", encoding="utf-8") as f:
    f.write("/** Auto-generated valid data bundle */\nconst PORTAL_DATA = " + json.dumps(payload, indent=2, ensure_ascii=False) + ";\nif (typeof window !== 'undefined') window.PORTAL_DATA = PORTAL_DATA;\nif (typeof module !== 'undefined') module.exports = PORTAL_DATA;\n")

print(f"Successfully generated {out_path}")
