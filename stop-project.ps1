$ErrorActionPreference = 'SilentlyContinue'

# Stop Node process listening on port 3000
$nodeConn = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | Where-Object { $_.State -eq 'Listen' } | Select-Object -First 1
if ($nodeConn) {
    Stop-Process -Id $nodeConn.OwningProcess -Force
    Write-Host "Node arrêté (PID=$($nodeConn.OwningProcess))"
}

# Stop MySQL process listening on port 3306
$mysqlConn = Get-NetTCPConnection -LocalPort 3306 -ErrorAction SilentlyContinue | Where-Object { $_.State -eq 'Listen' } | Select-Object -First 1
if ($mysqlConn) {
    Stop-Process -Id $mysqlConn.OwningProcess -Force
    Write-Host "MySQL arrêté (PID=$($mysqlConn.OwningProcess))"
}

# Stop any extra mysqld process left
Get-Process -Name mysqld -ErrorAction SilentlyContinue | Stop-Process -Force
Write-Host 'Arrêt terminé.'
