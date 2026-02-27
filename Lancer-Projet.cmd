@echo off
cd /d D:\raouf
start "" /b PowerShell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "D:\raouf\start-project.ps1" >nul 2>&1
exit /b 0
