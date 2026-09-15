import os
import time
import mujoco
import mujoco.viewer
import math

here = os.path.dirname(os.path.abspath(__file__))
model_path = os.path.join(here, "double_pendulum.xml")

model = mujoco.MjModel.from_xml_path(model_path)
data = mujoco.MjData(model)

data.qpos[0] = 0.4
data.qpos[1] = 0.6
data.qvel[0] = 0
data.ctrl[0] = 0
z0 = model.body("upper_arm").pos[2]
l1 = abs(model.body("forearm").pos[2])
l2 = abs(model.site("fingertip").pos[2])


def forward_kinematics(q1, q2):
    x1 = l1 * math.sin(q1)
    z1 = -l1 * math.cos(q1)

    x_tip = x1 + l2 * math.sin(q1 + q2)
    z_tip = z1 - l2 * math.cos(q1 + q2)

    return (x_tip, z_tip)

step_count = 0
with mujoco.viewer.launch_passive(model, data) as viewer:
    viewer.cam.distance = 2.5
    viewer.cam.lookat = [0.0, 0.0, 1.0]
    viewer.cam.elevation = -20
    viewer.cam.azimuth = 90

    while viewer.is_running():
        # mujoco.mj_step(model, data) # advance dynamics
        mujoco.mj_forward(model, data) # advance kinematics
        viewer.sync()

        x_tip, z_tip = forward_kinematics(data.qpos[0], data.qpos[1])
        x_world = -x_tip
        z_world = z0 + z_tip

        print(data.site("fingertip").xpos, x_world, z_world)

        time.sleep(model.opt.timestep)
