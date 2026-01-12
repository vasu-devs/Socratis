@echo off
echo ========================================
echo   Starting Socratis LiveKit Agent
echo ========================================
echo.

cd /d "%~dp0server\agent"

echo Checking Python installation...
python --version
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.8 or higher
    pause
    exit /b 1
)

echo.
echo Starting LiveKit agent...
echo Press Ctrl+C to stop the agent
echo.

python agent.py dev

pause
