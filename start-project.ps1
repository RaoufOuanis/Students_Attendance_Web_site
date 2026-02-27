$ErrorActionPreference = 'Stop'

$projectDir = 'D:\raouf'
$nodeExe = 'C:\Program Files\nodejs\node.exe'
$mysqlExe = 'C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe'
$mysqldExe = 'C:\Program Files\MySQL\MySQL Server 8.4\bin\mysqld.exe'
$dataDir = 'D:\mysql-data'

$appOut = Join-Path $projectDir 'app.out.log'
$appErr = Join-Path $projectDir 'app.err.log'
$mysqlOut = Join-Path $projectDir 'mysqld.out.log'
$mysqlErr = Join-Path $projectDir 'mysqld.stderr.log'

function Wait-Port($port, $timeoutSec = 20) {
    $start = Get-Date
    while (((Get-Date) - $start).TotalSeconds -lt $timeoutSec) {
        $listen = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Where-Object { $_.State -eq 'Listen' }
        if ($listen) { return $true }
        Start-Sleep -Milliseconds 500
    }
    return $false
}

if (!(Test-Path $nodeExe)) { throw "Node introuvable: $nodeExe" }
if (!(Test-Path $mysqlExe)) { throw "mysql.exe introuvable: $mysqlExe" }
if (!(Test-Path $mysqldExe)) { throw "mysqld.exe introuvable: $mysqldExe" }
if (!(Test-Path $dataDir)) { throw "Dossier data MySQL introuvable: $dataDir" }

# 1) Démarrer MySQL si nécessaire
$mysqlListening = Get-NetTCPConnection -LocalPort 3306 -ErrorAction SilentlyContinue | Where-Object { $_.State -eq 'Listen' }
if (-not $mysqlListening) {
    Remove-Item $mysqlOut, $mysqlErr -ErrorAction SilentlyContinue
    Start-Process -FilePath $mysqldExe -ArgumentList @('--console', "--datadir=$dataDir", '--port=3306', '--bind-address=127.0.0.1') -RedirectStandardOutput $mysqlOut -RedirectStandardError $mysqlErr -WindowStyle Hidden | Out-Null
    if (-not (Wait-Port 3306 25)) {
        Write-Host 'MySQL ne démarre pas. Voir logs:' -ForegroundColor Red
        Write-Host $mysqlErr -ForegroundColor Yellow
        exit 1
    }
}

# 2) Vérifier connexion MySQL
& $mysqlExe -h 127.0.0.1 -P 3306 -u root -pwifakstif19000 -e "SELECT 1;" | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host 'Connexion MySQL échouée (root/wifakstif19000).' -ForegroundColor Red
    exit 1
}

# 3) Démarrer Node si nécessaire
$nodeListening = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | Where-Object { $_.State -eq 'Listen' }
if (-not $nodeListening) {
    Remove-Item $appOut, $appErr -ErrorAction SilentlyContinue
    Start-Process -FilePath $nodeExe -ArgumentList @('express.js') -WorkingDirectory $projectDir -RedirectStandardOutput $appOut -RedirectStandardError $appErr -WindowStyle Hidden | Out-Null
    if (-not (Wait-Port 3000 20)) {
        Write-Host 'Application Node ne démarre pas. Voir logs:' -ForegroundColor Red
        Write-Host $appErr -ForegroundColor Yellow
        exit 1
    }
}

Write-Host 'OK: MySQL (3306) et Node (3000) sont démarrés.' -ForegroundColor Green
Write-Host 'App: http://localhost:3000'
Write-Host 'Admin: http://localhost:3000/admin'
