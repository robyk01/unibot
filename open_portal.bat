@echo off
title Robotics Lab Portal
cd /d "D:\Projects\unibot"
echo ===================================================
echo   Starting Robotics Lab Portal & Dashboard...
echo ===================================================
start "" "http://localhost:8000"
python portal/serve.py
pause
