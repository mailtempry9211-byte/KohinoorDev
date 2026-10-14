@echo off
REM Starts the Phone Link server and dashboard in two separate windows.
REM Place this file in the project root (the folder that contains "server" and "dashboard").
REM Double-click it, or run it from PowerShell/cmd.

set "ROOT=%~dp0"

echo Installing/checking server dependencies...
call npm.cmd install --prefix "%ROOT%server"

echo Installing/checking dashboard dependencies...
call npm.cmd install --prefix "%ROOT%dashboard"

echo Starting server...
start "Phone Link - SERVER" cmd /k "cd /d "%ROOT%server" && npm.cmd run dev"

echo Waiting a few seconds for the server to come up...
timeout /t 4 /nobreak >nul

echo Starting dashboard...
start "Phone Link - DASHBOARD" cmd /k "cd /d "%ROOT%dashboard" && npm.cmd run dev"

echo.
echo Both windows are starting. Check the SERVER window for the LAN IP
echo to enter in the Android app, and open the dashboard URL it prints
echo (usually http://localhost:3000 or 3001) in your browser.
echo.
pause
