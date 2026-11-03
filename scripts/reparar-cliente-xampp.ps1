#
# Reparar cliente XAMPP legacy que la 4.8.9 migró por error a embedded (demo).
#
# Qué hace:
#   1. Pide nombre de BD, URL de instalación, ruta htdocs, password de MySQL.
#   2. Backup de config.json y database.php con timestamp.
#   3. Reescribe %APPDATA%\dashboard-facturacion\config.json con:
#        - apiUrl, backendMode=legacy, backendPath nuevos
#        - preserva _subscription_cache, _entitlements_cache
#        - borra apiUrlRuntime, trial_inicio, backendMode=embedded
#   4. Borra %APPDATA%\dashboard-facturacion\backend-config.json si existe.
#   5. Reescribe api/config/database.php con el nombre de BD y password reales.
#
# Uso:
#   - Doble-click en reparar-cliente-xampp.bat (que invoca este .ps1).
#   - O desde PowerShell:  powershell -ExecutionPolicy Bypass -File reparar-cliente-xampp.ps1
#

$ErrorActionPreference = 'Stop'

function Leer($mensaje, $default) {
    $prompt = if ($default) { "$mensaje [$default]" } else { $mensaje }
    $v = Read-Host $prompt
    if ([string]::IsNullOrWhiteSpace($v)) { return $default } else { return $v }
}

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  Reparar cliente XAMPP legacy - Conta FT" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Antes de continuar: cierra Conta FT completamente (bandeja incluida)."
Write-Host ""

# --- 1. Inputs ---
$dbName = Leer "Nombre de la BD MySQL del cliente (ej: conta_nutrigranos)" ""
if ([string]::IsNullOrWhiteSpace($dbName)) { Write-Host "ERROR: nombre de BD obligatorio." -ForegroundColor Red; exit 1 }

$apiUrl = Leer "URL de instalacion del backend" "http://localhost:80/conta-app-backend/api"
$backendPath = Leer "Ruta htdocs del backend" "C:\xampp\htdocs\conta-app-backend"
$mysqlUser = Leer "Usuario MySQL" "root"
$mysqlPass = Leer "Password MySQL (ENTER = vacio)" ""

# --- 2. Verificar rutas ---
$userData = Join-Path $env:APPDATA "dashboard-facturacion"
$configJson = Join-Path $userData "config.json"
$backendConfigJson = Join-Path $userData "backend-config.json"
$databasePhp = Join-Path $backendPath "api\config\database.php"

if (-not (Test-Path $userData)) {
    Write-Host "ERROR: no existe $userData. Conta FT no esta instalada en este usuario." -ForegroundColor Red
    exit 1
}
if (-not (Test-Path $databasePhp)) {
    Write-Host "ERROR: no existe $databasePhp" -ForegroundColor Red
    Write-Host "Revisa que la ruta htdocs sea correcta." -ForegroundColor Red
    exit 1
}

$ts = Get-Date -Format "yyyyMMdd_HHmmss"

# --- 3. Reparar config.json ---
Write-Host ""
Write-Host "-> Reparando config.json..." -ForegroundColor Yellow

$cfg = @{}
if (Test-Path $configJson) {
    Copy-Item $configJson "$configJson.backup_$ts"
    Write-Host "   Backup: $configJson.backup_$ts"
    try {
        $cfg = Get-Content $configJson -Raw | ConvertFrom-Json
    } catch {
        Write-Host "   WARN: config.json ilegible, se crea nuevo." -ForegroundColor Yellow
        $cfg = New-Object PSObject
    }
}

# Convertir a hashtable para poder agregar/borrar propiedades libremente
$h = @{}
if ($cfg -is [PSObject]) {
    $cfg.PSObject.Properties | ForEach-Object { $h[$_.Name] = $_.Value }
}

# Preservar los caches de suscripcion/entitlements (vigencia offline)
# Reescribir modo y rutas
$h['apiUrl'] = $apiUrl
$h['backendMode'] = 'legacy'
$h['backendPath'] = $backendPath

# Borrar residuos del modo embedded
$h.Remove('apiUrlRuntime') | Out-Null
$h.Remove('trial_inicio') | Out-Null

$jsonTxt = $h | ConvertTo-Json -Depth 20
# UTF-8 SIN BOM — Set-Content -Encoding UTF8 agrega BOM en PS5, lo que puede
# confundir a Electron (Node fs.readFileSync no quita BOM antes de JSON.parse).
[System.IO.File]::WriteAllText($configJson, $jsonTxt, (New-Object System.Text.UTF8Encoding $false))
Write-Host "   OK config.json escrito: $configJson" -ForegroundColor Green

# --- 4. Borrar backend-config.json ---
if (Test-Path $backendConfigJson) {
    Copy-Item $backendConfigJson "$backendConfigJson.backup_$ts"
    Remove-Item $backendConfigJson -Force
    Write-Host "-> backend-config.json borrado (backup: .backup_$ts)" -ForegroundColor Green
} else {
    Write-Host "-> backend-config.json no existe (OK)" -ForegroundColor Gray
}

# --- 5. Reparar database.php ---
Write-Host ""
Write-Host "-> Reparando database.php..." -ForegroundColor Yellow
Copy-Item $databasePhp "$databasePhp.backup_$ts"
Write-Host "   Backup: $databasePhp.backup_$ts"

$php = Get-Content $databasePhp -Raw
# Reemplazar las 4 lineas private
$php = [regex]::Replace($php, 'private\s+\$host\s*=\s*"[^"]*";',       'private $host = "localhost";')
$php = [regex]::Replace($php, 'private\s+\$db_name\s*=\s*"[^"]*";',    "private `$db_name = `"$dbName`";")
$php = [regex]::Replace($php, 'private\s+\$username\s*=\s*"[^"]*";',   "private `$username = `"$mysqlUser`";")
$php = [regex]::Replace($php, 'private\s+\$password\s*=\s*"[^"]*";',   "private `$password = `"$mysqlPass`";")

[System.IO.File]::WriteAllText($databasePhp, $php, (New-Object System.Text.UTF8Encoding $false))
Write-Host "   OK database.php escrito con BD=$dbName user=$mysqlUser" -ForegroundColor Green

# --- 6. Sincronizar PHP del backend desde el instalador ---
#   El htdocs del cliente XAMPP no se autosincroniza en legacy. Si Conta FT
#   esta instalada, copiamos los PHP del instalador al htdocs — pero NUNCA
#   el database.php ni config.json (preservan credenciales).
Write-Host ""
Write-Host "-> Sincronizando backend PHP desde el instalador..." -ForegroundColor Yellow

$posiblesInstal = @(
    "$env:ProgramFiles\Conta FT 4.3\resources\backend",
    "${env:ProgramFiles(x86)}\Conta FT 4.3\resources\backend",
    "$env:LOCALAPPDATA\Programs\Conta FT 4.3\resources\backend"
)
$instalPath = $null
foreach ($p in $posiblesInstal) {
    if ($p -and (Test-Path $p)) { $instalPath = $p; break }
}

if ($instalPath) {
    Write-Host "   Fuente: $instalPath"
    $skipFiles = @('api\config\database.php', 'api\config\config.json')
    $copiados = 0
    Get-ChildItem -Path $instalPath -Recurse -File | ForEach-Object {
        $rel = $_.FullName.Substring($instalPath.Length + 1)
        $skip = $false
        foreach ($s in $skipFiles) { if ($rel -eq $s) { $skip = $true; break } }
        if ($skip) { return }
        $destFile = Join-Path $backendPath $rel
        $destDir = Split-Path $destFile -Parent
        if (-not (Test-Path $destDir)) { New-Item -ItemType Directory -Path $destDir -Force | Out-Null }
        Copy-Item $_.FullName $destFile -Force
        $copiados++
    }
    Write-Host "   OK $copiados archivos sincronizados (database.php y config.json preservados)" -ForegroundColor Green
} else {
    Write-Host "   WARN: no encontre Conta FT instalada. Omito sync del backend." -ForegroundColor Yellow
    Write-Host "   Si el cliente reporta errores en backup o endpoints nuevos, copia manual" -ForegroundColor Yellow
    Write-Host "   desde: <RutaInstalacion>\resources\backend\  a:  $backendPath" -ForegroundColor Yellow
}

# --- 7. Verificacion ---
Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  Listo. Reabre Conta FT y verifica." -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Si algo falla, los backups estan en:"
Write-Host "  $configJson.backup_$ts"
Write-Host "  $databasePhp.backup_$ts"
Write-Host ""
Read-Host "Presiona ENTER para cerrar"
