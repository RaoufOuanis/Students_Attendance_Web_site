@echo off
set "PUBLIC_URL="
if exist "D:\raouf\cloudflared.url.txt" (
  set /p PUBLIC_URL=<"D:\raouf\cloudflared.url.txt"
)
if not defined PUBLIC_URL (
  echo URL introuvable. Lancez d'abord Lancer-Tunnel.cmd
  exit /b 1
)
echo Ouverture: %PUBLIC_URL%
start "" "%PUBLIC_URL%" >nul 2>&1
explorer "%PUBLIC_URL%" >nul 2>&1
PowerShell -NoProfile -Command "Start-Process '%PUBLIC_URL%'" >nul 2>&1
exit /b 0
