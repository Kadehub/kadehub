@echo off
title KadeHub Auto Start

:: Start XAMPP MySQL
echo Starting MySQL...
"C:\xampp\mysql\bin\mysqld.exe" --defaults-file="C:\xampp\mysql\bin\my.ini" --standalone
timeout /t 5 /nobreak > nul

:: Start Backend
start "KadeHub Backend" cmd /k "cd /d C:\xampp\htdocs\Kadehub\backend && node dist/main.js"
timeout /t 4 /nobreak > nul

:: Start Frontend
start "KadeHub Frontend" cmd /k "cd /d C:\xampp\htdocs\Kadehub\frontend && node server.js"
timeout /t 3 /nobreak > nul

:: Open browser
start http://localhost:3000/login
