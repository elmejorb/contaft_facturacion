@echo off
REM ================================================================
REM DIAGNOSTICO DE ENTORNO Conta FT
REM ================================================================
REM Corre en el PC del cliente para reportar el estado de MySQL, PHP,
REM OpCache, Windows Defender e indices criticos.
REM
REM Uso:
REM   diagnostico_entorno.bat NOMBRE_BD [PASSWORD]
REM ================================================================

setlocal

if "%~1"=="" (
    echo.
    echo Uso: diagnostico_entorno.bat NOMBRE_BD [PASSWORD]
    echo.
    exit /b 1
)

set DB=%~1
set PWD_ARG=
if not "%~2"=="" set PWD_ARG=-p%~2

set MYSQL="C:\xampp\mysql\bin\mysql.exe"
if not exist %MYSQL% set MYSQL="C:\WebServer\mysql\bin\mysql.exe"
if not exist %MYSQL% (
    echo ERROR: No se encontro mysql.exe
    exit /b 1
)

set PHP="C:\xampp\php\php.exe"
if not exist %PHP% set PHP="C:\WebServer\PHP\php.exe"

set SCRIPT_DIR=%~dp0

echo.
echo ================================================================
echo   DIAGNOSTICO ENTORNO Conta FT
echo   BD: %DB%
echo   Fecha: %DATE% %TIME%
echo ================================================================
echo.

REM ---- Info del sistema ----
echo === INFO DEL SISTEMA ===
wmic cpu get name /value 2>nul | findstr /R "Name="
wmic os get Caption,TotalVisibleMemorySize /value 2>nul | findstr /R "Caption\|TotalVisibleMemorySize"
wmic diskdrive get MediaType /value 2>nul | findstr "MediaType"
echo.

REM ---- Diagnostico MySQL ----
%MYSQL% -uroot %PWD_ARG% %DB% -e "SELECT 1;" >nul 2>&1
if !errorlevel! neq 0 (
    echo [ERROR] No se puede conectar a la BD %DB%.
    echo         Verifique credenciales y que MySQL este corriendo.
    exit /b 2
)
%MYSQL% -uroot %PWD_ARG% %DB% < "%SCRIPT_DIR%diagnostico_entorno.sql"

echo.

REM ---- Diagnostico OpCache/Defender via PHP ----
if exist %PHP% (
    %PHP% "%SCRIPT_DIR%diagnostico_opcache.php"
) else (
    echo [SKIP] php.exe no encontrado — no se puede diagnosticar OpCache
)

echo.
echo ================================================================
echo   DIAGNOSTICO COMPLETO
echo ================================================================
echo.
echo   Si ve [PROBLEMA] o [FALTA]:
echo     1. Correr:  migrar_cliente.bat %DB% %~2
echo     2. Correr:  optimizar_entorno_xampp.bat  (como Administrador)
echo     3. Volver a correr este diagnostico y confirmar que todo sea [OK]
echo.

endlocal
