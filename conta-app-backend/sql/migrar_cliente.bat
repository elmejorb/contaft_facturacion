@echo off
REM ================================================================
REM MIGRAR CLIENTE Conta FT — Aplicar todos los scripts en orden
REM ================================================================
REM Uso:
REM   migrar_cliente.bat NOMBRE_BD [PASSWORD]
REM
REM Ejemplos:
REM   migrar_cliente.bat conta_icoplastic           (XAMPP default, sin password)
REM   migrar_cliente.bat conta_icoplastic root      (MySQL con password root)
REM   migrar_cliente.bat conta_icoplastic mipass123 (password personalizada)
REM
REM Corre en orden:
REM   1) auditar_bd.sql             → diagnostico ANTES
REM   2) actualizacion_completa.sql → aplica migraciones idempotentes
REM   3) reparar_autoincrement.sql  → PK + AUTO_INCREMENT en tablas legacy
REM   4) optimizar_indices.sql      → indices de performance
REM   5) auditar_bd.sql             → diagnostico DESPUES (confirmacion)
REM ================================================================

setlocal enabledelayedexpansion

if "%~1"=="" (
    echo.
    echo ERROR: Falta el nombre de la base de datos
    echo.
    echo Uso: migrar_cliente.bat NOMBRE_BD [PASSWORD]
    echo.
    echo Ejemplos:
    echo   migrar_cliente.bat conta_icoplastic           ^(sin password^)
    echo   migrar_cliente.bat conta_icoplastic root      ^(con password root^)
    echo.
    exit /b 1
)

set DB=%~1

REM Password opcional. Si no viene, se conecta sin -p (XAMPP default sin password).
REM Si viene, se usa -pPASSWORD (sin espacio, es la sintaxis de mysql.exe).
set PWD_ARG=
if not "%~2"=="" set PWD_ARG=-p%~2

set MYSQL="C:\xampp\mysql\bin\mysql.exe"
set MYSQL_ALT="C:\WebServer\mysql\bin\mysql.exe"

REM Detectar cual mysql.exe existe
if not exist %MYSQL% (
    if exist %MYSQL_ALT% (
        set MYSQL=%MYSQL_ALT%
    ) else (
        echo ERROR: No se encontro mysql.exe en:
        echo   %MYSQL%
        echo   %MYSQL_ALT%
        exit /b 2
    )
)

set SCRIPT_DIR=%~dp0

echo.
echo ================================================================
echo   MIGRAR BD: %DB%
if "%~2"=="" (
    echo   MODO: sin password ^(XAMPP default^)
) else (
    echo   MODO: con password
)
echo ================================================================
echo.

echo [1/5] Auditoria INICIAL...
echo ----------------------------------------
%MYSQL% -uroot %PWD_ARG% %DB% < "%SCRIPT_DIR%auditar_bd.sql"
if errorlevel 1 (
    echo.
    echo ERROR: Fallo la conexion o la BD no existe.
    echo Verifique:
    echo   - MySQL este corriendo ^(XAMPP Control Panel^)
    echo   - La BD "%DB%" exista
    echo   - Si tiene password, pasarla como segundo argumento
    exit /b 3
)
echo.

echo [2/5] Aplicando actualizacion_completa.sql...
echo ----------------------------------------
%MYSQL% -uroot %PWD_ARG% %DB% < "%SCRIPT_DIR%actualizacion_completa.sql" 2>&1 | findstr /V "^$"
echo.

echo [3/5] Reparando PRIMARY KEYs y AUTO_INCREMENT...
echo ----------------------------------------
%MYSQL% -uroot %PWD_ARG% %DB% < "%SCRIPT_DIR%reparar_autoincrement.sql" 2>&1 | findstr /V "^$"
echo.

echo [4/5] Creando indices de performance...
echo ----------------------------------------
%MYSQL% -uroot %PWD_ARG% %DB% < "%SCRIPT_DIR%optimizar_indices.sql" 2>&1 | findstr /V "^$"
echo.

echo [5/5] Auditoria FINAL (deberia estar todo OK)...
echo ----------------------------------------
%MYSQL% -uroot %PWD_ARG% %DB% < "%SCRIPT_DIR%auditar_bd.sql"
echo.

echo ================================================================
echo   MIGRACION COMPLETA
echo ================================================================
echo.
endlocal
