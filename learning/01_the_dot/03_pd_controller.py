import os
import time
import mujoco
import mujoco.viewer

here = os.path.dirname(os.path.abspath(__file__))
model_path = os.path.join(here, "pendulum.xml")

model = mujoco.MjModel.from_xml_path(model_path)
data = mujoco.MjData(model)

data.qpos[0] = 2.8
data.qvel[0] = 0
data.ctrl[0] = 3.77

target = 3.14
kp = 20.0
kd = 2.0

step_count = 0
with mujoco.viewer.launch_passive(model, data) as viewer:
    viewer.cam.distance = 2.5
    viewer.cam.lookat = [0.0, 0.0, 1.0]
    viewer.cam.elevation = -15
    viewer.cam.azimuth = 90

    while viewer.is_running():
        e = target - data.qpos[0]
        tp = kp * e
        td = -kd * data.qvel[0]
        data.ctrl[0] = tp + td

        mujoco.mj_step(model, data)
        viewer.sync()

        step_count += 1

        if step_count % 100 == 0:
            print(data.qpos[0], data.qvel[0], data.ctrl[0])
            print(e, tp, "\n")

        time.sleep(model.opt.timestep)

    