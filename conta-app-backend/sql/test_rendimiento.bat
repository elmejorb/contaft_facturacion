@echo off
REM ================================================================
REM TEST DE RENDIMIENTO Conta FT — Ejecutar en PC del cliente
REM ================================================================
REM Mide donde esta el cuello de botella cuando la app va lenta.
REM Compara tiempos reales contra valores esperados.
REM
REM Uso:
REM   test_rendimiento.bat [NOMBRE_BD] [PASSWORD]
REM
REM Ejemplos:
REM   test_rendimiento.bat conta_icoplastic
REM   test_rendimiento.bat conta_icoplastic root
REM ================================================================

setlocal enabledelayedexpansion

set DB=%~1
if "%DB%"=="" (
    echo.
    echo Uso: test_rendimiento.bat NOMBRE_BD [PASSWORD]
    echo.
    exit /b 1
)

set PWD_ARG=
if not "%~2"=="" set PWD_ARG=-p%~2

set MYSQL="C:\xampp\mysql\bin\mysql.exe"
if not exist %MYSQL% set MYSQL="C:\WebServer\mysql\bin\mysql.exe"
if not exist %MYSQL% (
    echo ERROR: No se encontro mysql.exe
    exit /b 1
)

set REPORT=%TEMP%\contaft_rendimiento_%RANDOM%.txt

echo ================================================================
echo   TEST DE RENDIMIENTO Conta FT
echo   BD: %DB%
echo   Fecha: %DATE% %TIME%
echo ================================================================
echo.
echo Guardando reporte en: %REPORT%
echo.

REM ---- Info sistema ----
echo === INFO DEL SISTEMA === >> "%REPORT%"
echo Fecha: %DATE% %TIME% >> "%REPORT%"
wmic cpu get name /value 2>nul | findstr "Name=" >> "%REPORT%"
wmic os get Caption,Version,TotalVisibleMemorySize /value 2>nul | findstr /R "Caption\|Version\|TotalVisibleMemorySize" >> "%REPORT%"
wmic diskdrive get MediaType /value 2>nul | findstr "MediaType" >> "%REPORT%"
echo. >> "%REPORT%"

echo [1/6] Info del sistema
echo ----------------------------------------
type "%REPORT%"
echo.

REM ---- Test 1: query directa a MySQL (mide MySQL puro) ----
echo [2/6] Query MySQL directa (mide MySQL + disco, sin PHP)
echo ---------------------------------------- >> "%REPORT%"
echo TEST 1: Query directa a MySQL (5 corridas) >> "%REPORT%"
echo ---------------------------------------- >> "%REPORT%"
echo ----------------------------------------
echo   Ejecutando query real del listado de ventas 5 veces...
echo   Valor esperado: menos de 200 ms cada una en Celeron
echo.

for /L %%i in (1,1,5) do (
    %MYSQL% -uroot %PWD_ARG% %DB% -e "SET profiling=1; SELECT v.Factura_N, v.Total FROM tblventas v WHERE v.Fecha >= '2026-07-01' AND v.Fecha < '2026-08-01' ORDER BY v.Factura_N DESC LIMIT 500; SELECT Query_ID, ROUND(Duration*1000,1) as ms FROM information_schema.PROFILING WHERE Query_ID=1;" 2>nul | findstr /R "^1[[:space:]]" > "%TEMP%\q1_%%i.txt"
    for /f "tokens=2" %%m in ('type "%TEMP%\q1_%%i.txt"') do (
        echo   Corrida %%i: %%m ms
        echo Corrida %%i: %%m ms >> "%REPORT%"
    )
    del "%TEMP%\q1_%%i.txt" 2>nul
)
echo. >> "%REPORT%"
echo.

REM ---- Test 2: HTTP request al endpoint (mide toda la pila) ----
echo [3/6] HTTP request al endpoint Apache+PHP+MySQL (fin a fin)
echo ---------------------------------------- >> "%REPORT%"
echo TEST 2: HTTP endpoint /api/ventas/listar.php >> "%REPORT%"
echo ---------------------------------------- >> "%REPORT%"
echo ----------------------------------------
echo   Simula lo que hace la app al abrir Listado de Ventas.
echo   Valor esperado con opcache ON: menos de 300 ms en Celeron
echo   Valor esperado con opcache OFF: 1000-3000 ms en Celeron
echo.

where curl >nul 2>nul
if !errorlevel! neq 0 (
    echo   [SKIP] curl no disponible. Saltando test HTTP.
    echo [SKIP] curl no disponible. >> "%REPORT%"
    goto test3
)

for /L %%i in (1,1,5) do (
    for /f "tokens=*" %%t in ('curl -s -o nul -w "%%{time_total}" "http://localhost/conta-app-backend/api/ventas/listar.php?anio=2026^&mes=7" 2^>nul') do (
        echo   Corrida %%i: %%t s
        echo Corrida %%i: %%t s >> "%REPORT%"
    )
)
echo. >> "%REPORT%"
echo.

:test3
REM ---- Test 3: verificar opcache ----
echo [4/6] Estado de OpCache
echo ---------------------------------------- >> "%REPORT%"
echo TEST 3: OpCache >> "%REPORT%"
echo ---------------------------------------- >> "%REPORT%"
echo ----------------------------------------
set PHP="C:\xampp\php\php.exe"
if not exist %PHP% set PHP="C:\WebServer\PHP\php.exe"
if exist %PHP% (
    %PHP% -r "echo function_exists('opcache_get_status') ? (ini_get('opcache.enable') ? '  [OK] OpCache ACTIVO' : '  [PROBLEMA] OpCache DESACTIVADO — cada request de la app recompila el backend PHP') : '  [PROBLEMA] Extension opcache NO CARGADA';" 2>nul
    %PHP% -r "echo PHP_EOL;" 2>nul
    %PHP% -r "echo function_exists('opcache_get_status') ? (ini_get('opcache.enable') ? '[OK] OpCache ACTIVO' : '[PROBLEMA] OpCache DESACTIVADO') : '[PROBLEMA] opcache no cargado';" >> "%REPORT%" 2>nul
    echo. >> "%REPORT%"
) else (
    echo   [SKIP] php.exe no encontrado
    echo [SKIP] php.exe no encontrado >> "%REPORT%"
)
echo.

REM ---- Test 4: buffer MySQL ----
echo [5/6] MySQL InnoDB Buffer
echo ---------------------------------------- >> "%REPORT%"
echo TEST 4: MySQL Buffer >> "%REPORT%"
echo ---------------------------------------- >> "%REPORT%"
echo ----------------------------------------
for /f "skip=1 tokens=2" %%b in ('%MYSQL% -uroot %PWD_ARG% -e "SHOW VARIABLES LIKE 'innodb_buffer_pool_size';" 2^>nul') do (
    set /a MB=%%b/1048576
    echo   innodb_buffer_pool_size: !MB! MB
    echo innodb_buffer_pool_size: !MB! MB >> "%REPORT%"
    if !MB! LSS 256 (
        echo   [PROBLEMA] Muy pequeno para BDs grandes. Recomendado: 512 MB
        echo [PROBLEMA] buffer chico >> "%REPORT%"
    ) else (
        echo   [OK] Buffer suficiente
        echo [OK] buffer OK >> "%REPORT%"
    )
)
echo. >> "%REPORT%"
echo.

REM ---- Test 5: tamano BD ----
echo [6/6] Tamano de la BD y n de tablas
echo ---------------------------------------- >> "%REPORT%"
echo TEST 5: Tamano BD >> "%REPORT%"
echo ---------------------------------------- >> "%REPORT%"
echo ----------------------------------------
%MYSQL% -uroot %PWD_ARG% -e "SELECT CONCAT(ROUND(SUM(data_length+index_length)/1048576,1),' MB') AS tamano, COUNT(*) as tablas FROM information_schema.TABLES WHERE TABLE_SCHEMA='%DB%';" 2>nul | findstr /R "^[0-9]"
%MYSQL% -uroot %PWD_ARG% -e "SELECT CONCAT(ROUND(SUM(data_length+index_length)/1048576,1),' MB') AS tamano, COUNT(*) as tablas FROM information_schema.TABLES WHERE TABLE_SCHEMA='%DB%';" >> "%REPORT%" 2>nul
%MYSQL% -uroot %PWD_ARG% -e "SELECT TABLE_ROWS as ventas FROM information_schema.TABLES WHERE TABLE_SCHEMA='%DB%' AND TABLE_NAME='tblventas';" 2>nul | findstr /R "^[0-9]"
echo. >> "%REPORT%"
echo.

REM ---- Resumen ----
echo ================================================================
echo   VEREDICTO
echo ================================================================
echo.
echo   COMO INTERPRETAR:
echo.
echo   1. Si MySQL directo va rapido (menos de 200 ms) pero HTTP
echo      va lento (mas de 1 s) — es OPCACHE o antivirus.
echo      FIX: correr optimizar_entorno_xampp.bat
echo.
echo   2. Si MySQL directo va lento (mas de 500 ms) — es buffer MySQL
echo      chico o disco lento.
echo      FIX: optimizar_entorno_xampp.bat aumenta el buffer.
echo.
echo   3. Si HTTP va rapido en curl pero la app lo siente lento — es
echo      Electron/Chromium renderizando en Celeron. No hay fix
echo      100%%, hay que reducir cantidad de datos por request.
echo.
echo Reporte guardado en: %REPORT%
echo.
echo Envie el archivo %REPORT% al desarrollador para analisis.
echo.

endlocal
