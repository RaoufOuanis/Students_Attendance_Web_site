@echo off
cd /d D:\raouf
start "" /b PowerShell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -Command "& { $url = & 'D:\raouf\start-cloudflared.ps1'; if ($url) { $url = $url.Trim(); Set-Clipboard -Value $url; Start-Process $url; Start-Process 'file:///D:/raouf/cloudflared.qr.png' } }"
exit /b 0
