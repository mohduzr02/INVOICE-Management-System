@echo off
title InvoicePro GST - Local Computer Launcher
color 0b
echo ===============================================================================
echo                InvoicePro GST - Indian GST Billing & Accounting
echo                      Running Locally on Your Computer
echo ===============================================================================
echo.
echo Storage Mode: Local Storage / Firebase Spark Free
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH!
    echo Please download and install Node.js (v18 or higher) from:
    echo https://nodejs.org/
    echo.
    pause
    exit /b 1
)

where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] npm is not found in PATH!
    pause
    exit /b 1
)

if not exist node_modules (
    echo [INFO] First time setup: Installing local dependencies...
    call npm install
    if %errorlevel% neq 0 (
        echo [ERROR] npm install encountered an issue.
        pause
        exit /b 1
    )
)

echo.
echo [INFO] Starting InvoicePro GST local server on http://localhost:3000 ...
echo [INFO] Opening default browser...
start "" http://localhost:3000

call npm run dev
pause
