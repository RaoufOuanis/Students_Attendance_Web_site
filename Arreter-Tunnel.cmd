@echo off
taskkill /F /IM cloudflared.exe >nul 2>&1
echo Tunnel cloudflared arrete.
