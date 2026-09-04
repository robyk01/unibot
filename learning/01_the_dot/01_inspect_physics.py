"""
Lesson 1.1: The Simulation Skeleton & Inspecting Physics State
------------------------------------------------------------
In this script, we:
1. Load our simple pendulum model.
2. Tilt it to 90 degrees (1.57 radians).
3. Let it swing under gravity and print data.qpos and data.qvel.
"""

import os
import time
import mujoco
import mujoco.viewer

# 1. Path to our XML model
HERE = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(HERE, "pendulum.xml")

# 2. Load model (static blueprint) and data (live dynamic state)
model = mujoco.MjModel.from_xml_path(MODEL_PATH)
data = mujoco.MjData(model)

# -------------------------------------------------------------
# Setting Initial State:
# data.qpos has 1 number because our robot has only 1 joint.
# 0.0 radians = pointing straight down (stable equilibrium)
# 1.57 radians (pi/2) = horizontal (pointing forward)
# -------------------------------------------------------------
data.qpos[0] = 1.57  # Start at horizontal
data.qvel[0] = 1.0   # Released from rest (zero initial speed)

print("=" * 60)
print("🚀 Launching MuJoCo Viewer!")
print("   - Red rod starts horizontal (1.57 rad).")
print("   - Watch the values print in this terminal as it swings.")
print("   - In the 3D window, you can right-click + drag to rotate/pan.")
print("   - Close the 3D window when you want to stop.")
print("=" * 60)

# 3. Open the visual 3D window
step_count = 0
with mujoco.viewer.launch_passive(model, data) as viewer:
    viewer.cam.distance = 2.5
    viewer.cam.lookat = [0.0, 0.0, 1.0]
    viewer.cam.elevation = -15
    viewer.cam.azimuth = 90
    while viewer.is_running():
        # Step the physics forward by one tick (default: 0.002 seconds)
        mujoco.mj_step(model, data)

        # Update the visual scene
        viewer.sync()

        step_count += 1
        # Every 100 physics steps (~0.2 seconds), print the current state
        if step_count % 100 == 0:
            angle_rad = data.qpos[0]
            angle_deg = angle_rad * (180.0 / 3.14159)
            speed = data.qvel[0]
            print(f"Time: {data.time:5.2f}s | Angle: {angle_rad:6.2f} rad ({angle_deg:6.1f}°) | Speed: {speed:6.2f} rad/s")

        # Sleep a tiny bit to match real-time (physics step is 2ms)
        time.sleep(model.opt.timestep)

        if abs(data.qpos[0]) < 0.05 and abs(data.qvel[0]) < 0.05:
            print("Pendulum in rest")
            break
