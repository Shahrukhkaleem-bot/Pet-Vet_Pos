@echo off
title VetPet PK - Clinic POS Launcher
echo ===================================================
echo     VetPet PK - Veterinary Clinic & POS System
echo ===================================================
echo.

echo [1/3] Starting Backend Server (Port 5000)...
start "VetPet Backend" /min cmd /c "cd /d c:\vet pet\backend && npm run dev"

timeout /t 2 /nobreak >nul

echo [2/3] Starting Web POS Server (Port 3000)...
start "VetPet Web POS" /min cmd /c "cd /d c:\vet pet\web && npm run dev"

echo Waiting for services to initialize...
timeout /t 5 /nobreak >nul

echo [3/3] Launching VetPet-POS.exe...
start "" "c:\vet pet\pos-desktop\VetPet-POS.exe"

echo.
echo All services launched!
echo - POS Window: Opened
echo - Backend API: http://localhost:5000
echo - Web Dashboard: http://localhost:3000
echo.
pause
