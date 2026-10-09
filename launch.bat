@echo off
title FocusPulse AI Launcher
echo ============================================================
echo   Starting FocusPulse AI Local Server...
echo ============================================================
cd /d "%~dp0"
if not exist ".venv\Scripts\python.exe" (
    echo Creating isolated Python environment...
    py -m venv .venv
    if errorlevel 1 goto setup_failed
)
if not exist ".venv\Scripts\aiohttp.marker" (
    echo Installing local server dependencies...
    .venv\Scripts\python.exe -m pip install -r requirements.txt
    if errorlevel 1 goto setup_failed
    echo installed>.venv\Scripts\aiohttp.marker
)
.venv\Scripts\python.exe run_server.py
if %ERRORLEVEL% NEQ 0 echo Secure local server exited with an error.
pause
goto :eof

:setup_failed
echo.
echo Could not create the Python environment or install dependencies.
echo Install Python 3 and ensure this machine can access PyPI, then run this launcher again.
pause
