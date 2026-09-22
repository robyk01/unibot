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
qdot = np.array([-1, 2])

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

        jacp = np.zeros((3, model.nv))
        jacr = np.zeros((3, model.nv))

        site_id = model.site("fingertip").id

        mujoco.mj_jacSite(model, data, jacp, jacr, site_id)
        J = np.array([jacp[0, :], jacp[2, :]])

        J_manual = jacobian(l1, l2, data.qpos[0], data.qpos[1])

        diff = np.max(np.abs(J - J_manual))
        print("Matrix Difference:", diff)

        v_mujoco = J @ qdot
        v_manual = J_manual @ qdot
        print("v_mujoco:", v_mujoco, "v_manual:", v_manual)

        viewer.sync()
        time.sleep(model.opt.timestep)
