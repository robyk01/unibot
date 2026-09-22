import os
import time
import math
import mujoco
import mujoco.viewer
import numpy as np

here = os.path.dirname(os.path.abspath(__file__))
model_path = os.path.join(here, "double_pendulum.xml")

model = mujoco.MjModel.from_xml_path(model_path)
data = mujoco.MjData(model)

l1 = abs(model.body("forearm").pos[2])
l2 = abs(model.site("fingertip").pos[2])
data.qpos[0] = np.deg2rad(30)
data.qpos[1] = np.deg2rad(45)
v = np.array([0.1, 0])

def jacobian(l1, l2, q1, q2):
    j = np.zeros((2, model.nv))

    j[0][0] = -(l1 * math.cos(q1) + l2 * math.cos(q1 + q2))
    j[0][1] = -(l2 * math.cos(q1 + q2))
    j[1][0] = l1 * math.sin(q1) + l2 * math.sin(q1 + q2)
    j[1][1] = l2 * math.sin(q1 + q2)

    return j

with mujoco.viewer.launch_passive(model, data) as viewer:
    viewer.cam.distance = 2.5
    viewer.cam.lookat = [0.0, 0.0, 1.0]
    viewer.cam.elevation = -20
    viewer.cam.azimuth = 90

    while viewer.is_running():
        mujoco.mj_forward(model, data)

        q1, q2 = data.qpos

        J = jacobian(l1, l2, q1, q2)

        det_J = -l1 * l2 * math.sin(q2)

        if abs(det_J) > 1e-4:
            adj_J = np.array([[l2 * math.sin(q1 + q2), l2 * math.cos(q1 + q2)],
                     [-l1 * math.sin(q1) - l2 * math.sin(q1 + q2), -l1 * math.cos(q1) - l2 * math.cos(q1 + q2)]])
            inv_J = 1 / det_J * adj_J

            qdot = inv_J @ v

            data.qpos += qdot * model.opt.timestep

            print(qdot)
            print(f"det: {det_J:+.4f} | joint speed: {np.linalg.norm(qdot):.2f} rad/s")

        else:
            print("Singularity found!")


        viewer.sync()
        time.sleep(model.opt.timestep)
