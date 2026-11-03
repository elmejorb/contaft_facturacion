@echo off
REM Launcher para reparar-cliente-xampp.ps1 (bypassa ExecutionPolicy restringido).
REM Doble-click aqui para ejecutar.

cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0reparar-cliente-xampp.ps1"
