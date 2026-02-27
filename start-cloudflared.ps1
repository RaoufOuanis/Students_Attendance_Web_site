$ErrorActionPreference = 'Stop'

$projectDir = 'D:\raouf'
$cloudflaredExe = 'D:\raouf\tools\cloudflared.exe'
$startProject = 'D:\raouf\start-project.ps1'
$tunnelLog = 'D:\raouf\cloudflared.log'
$urlFile = 'D:\raouf\cloudflared.url.txt'
$nodeExe = 'C:\Program Files\nodejs\node.exe'
$qrFile = 'D:\raouf\cloudflared.qr.png'

if (!(Test-Path $cloudflaredExe)) { throw "cloudflared introuvable: $cloudflaredExe" }
if (!(Test-Path $startProject)) { throw "Script projet introuvable: $startProject" }
if (!(Test-Path $nodeExe)) { throw "Node introuvable: $nodeExe" }

# 1) S'assurer que l'app locale tourne (MySQL + Node)
& $startProject | Out-Null

# 2) Éviter les doublons cloudflared
Get-Process -Name cloudflared -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Milliseconds 400

# 3) Lancer un Quick Tunnel Cloudflare vers localhost:3000
Remove-Item $tunnelLog -ErrorAction SilentlyContinue
Remove-Item $urlFile -ErrorAction SilentlyContinue
Start-Process -FilePath $cloudflaredExe -ArgumentList @('tunnel','--url','http://localhost:3000','--protocol','http2','--no-autoupdate','--logfile',$tunnelLog,'--loglevel','info') -WorkingDirectory $projectDir -WindowStyle Hidden | Out-Null

# 4) Attendre l'URL publique
$publicUrl = $null
$start = Get-Date
while (((Get-Date) - $start).TotalSeconds -lt 25) {
    if (Test-Path $tunnelLog) {
        $line = Select-String -Path $tunnelLog -Pattern 'https://[-a-zA-Z0-9]+\.trycloudflare\.com' -AllMatches | Select-Object -Last 1
        if ($line) {
            $publicUrl = $line.Matches[0].Value
            break
        }
    }
    Start-Sleep -Milliseconds 500
}

if (-not $publicUrl) {
    $start = Get-Date
    while (((Get-Date) - $start).TotalSeconds -lt 25) {
        if (Test-Path $tunnelLog) {
            $line = Select-String -Path $tunnelLog -Pattern 'https://[a-zA-Z0-9-]+\.trycloudflare\.com' -AllMatches | Select-Object -Last 1
            if ($line) {
                $publicUrl = $line.Matches[0].Value
                break
            }
        }
        Start-Sleep -Milliseconds 500
    }
}

if (-not $publicUrl) {
    Write-Output ''
    exit 0
}

Set-Content -Path $urlFile -Value $publicUrl -Encoding ASCII
try {
    & $nodeExe -e "const QRCode=require('qrcode'); const url=process.argv[1]; QRCode.toFile('D:/raouf/cloudflared.qr.png', url, { margin: 1, width: 320 }, (err)=>{ if(err){ console.error(err); process.exit(1); } });" -- $publicUrl | Out-Null
} catch {
}

Write-Output $publicUrl
