@echo off
REM ================================================================
REM VERIFICAR MIGRACION Conta FT
REM ================================================================
REM Corre en el PC del cliente para confirmar que migrar_cliente.bat
REM realmente aplico todas las mejoras a la BD. Reporta [OK] o [FALTA]
REM para cada elemento critico.
REM
REM Uso:
REM   verificar_migracion.bat NOMBRE_BD [PASSWORD]
REM
REM Ejemplos:
REM   verificar_migracion.bat conta_icoplastic
REM   verificar_migracion.bat conta_icoplastic root
REM ================================================================

setlocal

if "%~1"=="" (
    echo.
    echo Uso: verificar_migracion.bat NOMBRE_BD [PASSWORD]
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

set SCRIPT_DIR=%~dp0

echo.
echo ================================================================
echo   VERIFICAR MIGRACION Conta FT
echo   BD: %DB%
echo   Fecha: %DATE% %TIME%
echo ================================================================
echo.

%MYSQL% -uroot %PWD_ARG% %DB% < "%SCRIPT_DIR%verificar_migracion.sql"

echo.
echo ================================================================
echo   Si ve algun [FALTA], corra:
echo     migrar_cliente.bat %DB% %~2
echo.
echo   Si todo es [OK], la BD esta al dia.
echo ================================================================
echo.

endlocal
