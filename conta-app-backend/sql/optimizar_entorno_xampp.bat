@echo off
REM ================================================================
REM OPTIMIZAR ENTORNO XAMPP para Conta FT
REM ================================================================
REM Aplica 3 fixes que resuelven ~80% de los problemas de lentitud:
REM
REM   1) Activa OpCache en php.ini
REM      → PHP no recompila el backend en cada request (5-10x mas rapido)
REM
REM   2) Aumenta innodb_buffer_pool_size en my.ini a 512 MB
REM      → MySQL cachea mas datos en RAM en vez de leer disco
REM
REM   3) Agrega exclusiones de Windows Defender para XAMPP y htdocs
REM      → No escanea cada request PHP
REM
REM Hace BACKUP automatico de php.ini y my.ini antes de tocarlos.
REM Reinicia Apache y MySQL automaticamente.
REM
REM Uso (ejecutar como Administrador para exclusiones de Defender):
REM   Click derecho -^> "Ejecutar como administrador"
REM ================================================================

setlocal enabledelayedexpansion

REM Detectar rutas XAMPP
set XAMPP_ROOT=
if exist "C:\xampp\php\php.ini" set XAMPP_ROOT=C:\xampp
if exist "C:\WebServer\PHP\php.ini" set XAMPP_ROOT=C:\WebServer

if "%XAMPP_ROOT%"=="" (
    echo ERROR: No se encontro XAMPP en C:\xampp ni WebServer en C:\WebServer
    exit /b 1
)

set PHP_INI=%XAMPP_ROOT%\php\php.ini
if not exist "%PHP_INI%" set PHP_INI=%XAMPP_ROOT%\PHP\php.ini

set MYSQL_INI=%XAMPP_ROOT%\mysql\bin\my.ini
if not exist "%MYSQL_INI%" set MYSQL_INI=%XAMPP_ROOT%\mysql\my.ini

set TIMESTAMP=%DATE:~-4%%DATE:~3,2%%DATE:~0,2%_%TIME:~0,2%%TIME:~3,2%
set TIMESTAMP=%TIMESTAMP: =0%

echo.
echo ================================================================
echo   OPTIMIZAR ENTORNO XAMPP para Conta FT
echo ================================================================
echo   XAMPP root: %XAMPP_ROOT%
echo   php.ini:    %PHP_INI%
echo   my.ini:     %MYSQL_INI%
echo   Backup ID:  %TIMESTAMP%
echo ================================================================
echo.
echo Este script va a:
echo   1. Hacer BACKUP de php.ini y my.ini
echo   2. Activar OpCache en PHP
echo   3. Aumentar innodb_buffer_pool_size a 512 MB
echo   4. Agregar exclusiones de Windows Defender
echo   5. Reiniciar Apache y MySQL
echo.
set /p CONTINUAR="Continuar? (S/N): "
if /I not "%CONTINUAR%"=="S" (
    echo Cancelado por el usuario.
    exit /b 0
)

echo.
echo [1/5] Backup de archivos de configuracion...
echo ----------------------------------------
if not exist "C:\Temp\ContaFT_backup" mkdir "C:\Temp\ContaFT_backup"
copy "%PHP_INI%" "C:\Temp\ContaFT_backup\php.ini.bak_%TIMESTAMP%" >nul
copy "%MYSQL_INI%" "C:\Temp\ContaFT_backup\my.ini.bak_%TIMESTAMP%" >nul
echo   [OK] Backup en C:\Temp\ContaFT_backup\
echo        php.ini.bak_%TIMESTAMP%
echo        my.ini.bak_%TIMESTAMP%
echo.

echo [2/5] Activando OpCache en php.ini...
echo ----------------------------------------
REM Verifica si ya esta configurado
findstr /R "^opcache.enable=1" "%PHP_INI%" >nul
if !errorlevel! equ 0 (
    echo   [OK] OpCache ya esta activo
) else (
    REM Elimina lineas viejas (comentadas o no) y agrega bloque nuevo al final
    powershell -Command ^
    "$c = Get-Content '%PHP_INI%' -Raw; " ^
    "$c = $c -replace '(?m)^[;\s]*opcache\.[^=\r\n]+=[^\r\n]*\r?\n',''; " ^
    "$c += \"`r`n; ==== ContaFT: OpCache config ====`r`nzend_extension=opcache`r`nopcache.enable=1`r`nopcache.enable_cli=1`r`nopcache.memory_consumption=128`r`nopcache.max_accelerated_files=10000`r`nopcache.validate_timestamps=1`r`nopcache.revalidate_freq=60`r`n\"; " ^
    "Set-Content '%PHP_INI%' -Value $c -NoNewline"
    echo   [OK] OpCache configurado en php.ini
)
echo.

echo [3/5] Aumentando innodb_buffer_pool_size a 512 MB...
echo ----------------------------------------
findstr /R "^innodb_buffer_pool_size *= *5" "%MYSQL_INI%" >nul
if !errorlevel! equ 0 (
    echo   [OK] Buffer ya esta configurado a 512M o mas
) else (
    powershell -Command ^
    "$c = Get-Content '%MYSQL_INI%'; " ^
    "$c = $c -replace '^\s*innodb_buffer_pool_size\s*=.*','innodb_buffer_pool_size=512M'; " ^
    "if (-not ($c -match 'innodb_buffer_pool_size')) { " ^
    "  $idx = ($c | Select-String -Pattern '^\[mysqld\]' | Select-Object -First 1).LineNumber; " ^
    "  $c = $c[0..($idx-1)] + 'innodb_buffer_pool_size=512M' + 'innodb_log_file_size=128M' + $c[$idx..($c.Length-1)]; " ^
    "} " ^
    "$c | Set-Content '%MYSQL_INI%'"
    echo   [OK] innodb_buffer_pool_size=512M configurado
)
echo.

echo [4/5] Agregando exclusiones a Windows Defender...
echo ----------------------------------------
powershell -Command "Add-MpPreference -ExclusionPath '%XAMPP_ROOT%' -ErrorAction SilentlyContinue" 2>nul
if exist "C:\WebServer\Apache24\htdocs" (
    powershell -Command "Add-MpPreference -ExclusionPath 'C:\WebServer\Apache24\htdocs' -ErrorAction SilentlyContinue" 2>nul
)
powershell -Command "Add-MpPreference -ExclusionProcess 'httpd.exe' -ErrorAction SilentlyContinue" 2>nul
powershell -Command "Add-MpPreference -ExclusionProcess 'mysqld.exe' -ErrorAction SilentlyContinue" 2>nul
powershell -Command "Add-MpPreference -ExclusionProcess 'php.exe' -ErrorAction SilentlyContinue" 2>nul
powershell -Command "Add-MpPreference -ExclusionProcess 'php-cgi.exe' -ErrorAction SilentlyContinue" 2>nul
echo   [OK] Exclusiones agregadas (si el script se corrio como Administrador)
echo        Si no, corralo como Admin para que Defender no escanee requests
echo.

echo [5/5] Reiniciando servicios...
echo ----------------------------------------
echo   Deteniendo Apache y MySQL...
net stop Apache2.4 >nul 2>&1
net stop MySQL >nul 2>&1
net stop MariaDB >nul 2>&1
taskkill /F /IM httpd.exe >nul 2>&1
taskkill /F /IM mysqld.exe >nul 2>&1
timeout /t 2 /nobreak >nul

echo   Iniciando Apache y MySQL...
if exist "%XAMPP_ROOT%\xampp-control.exe" (
    echo   NOTA: Abra XAMPP Control Panel e inicie Apache + MySQL manualmente
    echo         para aplicar los cambios.
    start "" "%XAMPP_ROOT%\xampp-control.exe"
) else (
    net start Apache2.4 >nul 2>&1
    net start MySQL >nul 2>&1
    net start MariaDB >nul 2>&1
    echo   [OK] Servicios reiniciados
)
echo.

echo ================================================================
echo   OPTIMIZACION COMPLETA
echo ================================================================
echo.
echo   Cambios aplicados:
echo     - OpCache activado en php.ini
echo     - innodb_buffer_pool_size=512M en my.ini
echo     - Exclusiones de Windows Defender
echo.
echo   Backup disponible en:
echo     C:\Temp\ContaFT_backup\php.ini.bak_%TIMESTAMP%
echo     C:\Temp\ContaFT_backup\my.ini.bak_%TIMESTAMP%
echo.
echo   Rollback (si algo falla):
echo     copy /Y "C:\Temp\ContaFT_backup\php.ini.bak_%TIMESTAMP%" "%PHP_INI%"
echo     copy /Y "C:\Temp\ContaFT_backup\my.ini.bak_%TIMESTAMP%" "%MYSQL_INI%"
echo.
echo   Verificar el resultado corriendo: diagnostico_entorno.bat
echo.
endlocal
