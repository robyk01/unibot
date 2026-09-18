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
x = 0
xa, za = 0.2, 0.7
xb, zb = 0.5, 0.7
s = 0
ds = 0.005

def ik(xi, zi):
    delta_x = xi - x
    delta_z = zi - z0

    r = math.sqrt(delta_x ** 2 + delta_z ** 2)

    if l1 + l2 < r:
        scale = (l1 + l2) / r

        delta_x = delta_x * scale
        delta_z = delta_z * scale

        r = l1 + l2
        print("Target clamped to outer boundary.")

    elif abs(l1 - l2) > r:
        scale = abs(l1 - l2) / r

        delta_x = delta_x * scale
        delta_z = delta_z * scale

        r = abs(l1 - l2)
        print("Target clamped to inner boundary.")

    cos_theta2 = (r ** 2 - l1 ** 2 - l2 ** 2) / (2 * l1 * l2)
    cos_theta2 = max(-1.0, min(1.0, cos_theta2))
    theta2 = math.acos(cos_theta2)

    theta1 = math.atan2(delta_x, -delta_z) - math.atan2(l2 * math.sin(theta2), l1 + l2 * math.cos(theta2))

    return (theta1, theta2)

with mujoco.viewer.launch_passive(model, data) as viewer:
    viewer.cam.distance = 2.5
    viewer.cam.lookat = [0.0, 0.0, 1.0]
    viewer.cam.elevation = -20
    viewer.cam.azimuth = 90

    while viewer.is_running():
        # mujoco.mj_step(model, data)
        mujoco.mj_forward(model, data)
        viewer.sync()

        
        s += ds
        if s >= 1 or s <= 0.0:
            ds = -ds

        x_target = xa + s * (xb - xa)
        z_target = za + s * (zb - za)

        q1, q2 = ik(x_target, z_target)
        if q1 is not None and q2 is not None:
            data.qpos[0] = -q1
            data.qpos[1] = -q2

        print(q1, q2, data.site("fingertip").xpos)

        time.sleep(model.opt.timestep)