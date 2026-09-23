import time
import os
import math
import numpy as np
import mujoco
import mujoco.viewer

here = os.path.dirname(os.path.abspath(__file__))
model_path = os.path.join(here, "double_pendulum.xml")

model = mujoco.MjModel.from_xml_path(model_path)
data = mujoco.MjData(model)

l1 = abs(model.body("forearm").pos[2])
l2 = abs(model.site("fingertip").pos[2])
data.qpos[0] = np.deg2rad(30)
data.qpos[1] = np.deg2rad(45)
v = np.array([0.1, 0])
lmbda = 0.1

def jacobian(l1, l2, q1, q2):
    j = np.zeros((2, model.nv))
    
    j[0][0] = -(l1 * math.cos(q1) + l2 * math.cos(q1 + q2))
    j[0][1] = -(l2 * math.cos(q1 + q2))
    j[1][0] = l1 * math.sin(q1) + l2 * math.sin(q1 + q2)
    j[1][1] = l2 * math.sin(q1 + q2)

    return j

def pure_inversion(v, q1, q2):    
    det_J = -l1 * l2 * math.sin(q2)

    if abs(det_J) > 1e-4:
        adj_J = np.array([[l2 * math.sin(q1 + q2), l2 * math.cos(q1 + q2)],
                    [-l1 * math.sin(q1) - l2 * math.sin(q1 + q2), -l1 * math.cos(q1) - l2 * math.cos(q1 + q2)]])
        inv_J = 1 / det_J * adj_J

        qdot = inv_J @ v

        print(f"det: {det_J:+.4f} | joint speed: {np.linalg.norm(qdot):.2f} rad/s")
        return qdot

    else:
        print("Singularity found!")
        return

def DLS(J, v):
    JJT = J @ J.T
    lmbda_sqd = lmbda ** 2 * np.eye(2)

    A = JJT + lmbda_sqd
    A_inv = np.linalg.inv(A)

    qdot = J.T @ A_inv @ v
    data.qpos += qdot * model.opt.timestep

    return qdot



with mujoco.viewer.launch_passive(model, data) as viewer:
    viewer.cam.distance = 2.5
    viewer.cam.lookat = [0.0, 0.0, 1.0]
    viewer.cam.elevation = -20
    viewer.cam.azimuth = 90

    while viewer.is_running():
        mujoco.mj_forward(model, data)

        q1, q2 = data.qpos
        J = jacobian(l1, l2, q1, q2)

        qdot_pure = pure_inversion(v, q1, q2)
        qdot_dls = DLS(J, v)

        print(qdot_pure, qdot_dls)

        viewer.sync()

        time.sleep(model.opt.timestep)