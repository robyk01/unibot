# UniBot: Humanoid Robotics Learning Lab

A from-scratch, first-principles journey through robotics, dynamics, kinematics, and control theory—progressing from 1-DoF pendulum dynamics to whole-body humanoid manipulation on the **Unitree G1**.

---

## Curriculum & Project Structure

```text
unibot/
├── learning/
│   ├── 01_the_dot/           # Phase 1: 1-DoF Pendulum & Closed-Loop Control
│   │   ├── pendulum.xml          # Minimal MuJoCo 1-DoF pendulum model
│   │   ├── 01_inspect_physics.py # Exploring generalized coordinates (qpos, qvel, ctrl)
│   │   ├── 02_hold_horizontal.py # Open-loop gravity compensation torque
│   │   ├── 03_pd_controller.py   # Closed-loop PD position control
│   │   └── 04_balance.py         # Inverted pendulum balance & disturbance rejection
│   └── 02_the_line/          # Phase 2: 2-DoF Planar Arm & Kinematics
│       ├── crane.xml             # Hand-authored 2-link kinematic tree
│       ├── double_pendulum.xml   # Planar 2-DoF arm with shoulder and elbow
│       ├── 01_fk.py              # Analytical Forward Kinematics verification
│       └── 02_ik.py              # Analytical Inverse Kinematics, singularities & Cartesian line following
├── models/                   # High-fidelity robot models (Unitree G1, H1, Dual-Arm)
├── portal/                   # Interactive learning portal & 3D Three.js visualizer
└── .gitignore                # Build and bytecode ignore rules
```

---

## Roadmap

###  Phase 1: The Dot (1-DoF Control)
* **MuJoCo Core Architecture**: State inspection (`qpos`, `qvel`, `qfrc_applied`).
* **Physics & Dynamics**: Gravity torque $\tau = m g l \sin(\theta)$ and passive damping.
* **Control Theory**: Tuning $K_p$ and $K_d$ gains, gravity compensation, and closed-loop disturbance rejection at $\theta = 180^\circ$.

###  Phase 2: The Line (2-DoF Kinematics)
* **Forward Kinematics (FK)**: Analytical trigonometric mapping from joint angles to Cartesian space.
* **Analytical Inverse Kinematics (IK)**: Law of Cosines derivation, elbow-up ($-\arccos$) vs. elbow-down ($+\arccos$) branches.
* **Workspace & Singularities**: Handling boundary conditions ($r = l_1 + l_2$, $r = |l_1 - l_2|$) and numerical precision clipping.
* **Trajectory Generation**: Proving why joint interpolation sweeps curved arcs and implementing Cartesian-space straight-line tracking.

### ⏳ Phase 3: The Shape (Spatial Manipulators & The Jacobian)
* **Velocity Kinematics**: Deriving the Jacobian matrix $J(q)$.
* **Differential Inverse Kinematics**: $\dot{q} = J^{-1} v$.
* **Trajectory Tracking**: Tracing 2D shapes and expanding to the 7-DoF Unitree G1 humanoid arm.

---

## Getting Started

### Prerequisites
* Python 3.10+
* MuJoCo (`pip install mujoco`)

### Running the Learning Labs
```bash
# Phase 1: Inverted Pendulum Balance
python learning/01_the_dot/04_balance.py

# Phase 2: Forward Kinematics
python learning/02_the_line/01_fk.py

# Phase 2: Inverse Kinematics & Cartesian Line Tracking
python learning/02_the_line/02_ik.py
```

### Launching the Interactive Portal
```bash
python portal/serve.py
# Open http://localhost:8000 in your browser
```
