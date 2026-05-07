@echo off
title KadeHub - Smart Shop Platform

echo Starting KadeHub...

:: Start Backend
start "KadeHub Backend" cmd /k "cd /d C:\xampp\htdocs\Kadehub\backend && node dist/main.js"

:: Wait 3 seconds for backend to start
timeout /t 3 /nobreak > nul

:: Start Frontend
start "KadeHub Frontend" cmd /k "cd /d C:\xampp\htdocs\Kadehub\frontend && node server.js"

:: Wait 3 seconds then open browser
timeout /t 3 /nobreak > nul
start http://localhost:3000/login

echo KadeHub is running!
echo Backend:  http://localhost:3001
echo Frontend: http://localhost:3000
