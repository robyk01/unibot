import time
import math
import os
import mujoco
import mujoco.viewer

here = os.path.dirname(os.path.abspath(__file__))
model_path = os.path.join(here, "double_pendulum.xml")

model = mujoco.MjModel.from_xml_path(model_path)
data = mujoco.MjData(model)

l1 = 0.4
l2 = 0.3
z0 = 1.0
x0 = 0

# Line endpoints (horizontal line at z = 0.7m)
xa, za = 0.2, 0.7
xb, zb = 0.5, 0.7

s = 0.0
ds = 0.005  # Smooth direction step

def ik(xi, zi):
    delta_x = xi - x0
    delta_z = zi - z0

    r = math.sqrt(delta_x ** 2 + delta_z ** 2)

    if r > (l1 + l2):
        scale = (l1 + l2) / r
        delta_x *= scale
        delta_z *= scale
        r = l1 + l2
    elif r < abs(l1 - l2):
        scale = abs(l1 - l2) / r
        delta_x *= scale
        delta_z *= scale
        r = abs(l1 - l2)

    cos_theta2 = (r ** 2 - l1 ** 2 - l2 ** 2) / (2 * l1 * l2)
    cos_theta2 = max(-1.0, min(1.0, cos_theta2))
    theta2 = -math.acos(cos_theta2)

    theta1 = math.atan2(delta_x, -delta_z) - math.atan2(l2 * math.sin(theta2), l1 + l2 * math.cos(theta2))

    return (theta1, theta2)

with mujoco.viewer.launch_passive(model, data) as viewer:
    viewer.cam.distance = 2.5
    viewer.cam.lookat = [0.0, 0.0, 1.0]
    viewer.cam.elevation = -20
    viewer.cam.azimuth = 90

    while viewer.is_running():
        # Advance interpolation progress smoothly back and forth
        s += ds
        if s >= 1.0 or s <= 0.0:
            ds = -ds

        xt = xa + s * (xb - xa)
        zt = za + s * (zb - za)

        q1, q2 = ik(xt, zt)
        if q1 is not None and q2 is not None:
            data.qpos[0] = -q1
            data.qpos[1] = -q2

        mujoco.mj_forward(model, data)
        viewer.sync()

        time.sleep(model.opt.timestep)
