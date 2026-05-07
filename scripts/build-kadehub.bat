@echo off
title Building KadeHub for Production

echo ========================================
echo Building KadeHub Backend...
echo ========================================
cd /d C:\xampp\htdocs\Kadehub\backend
call npm run build

echo.
echo ========================================
echo Building KadeHub Frontend...
echo ========================================
cd /d C:\xampp\htdocs\Kadehub\frontend
call npm run build

echo.
echo ========================================
echo Build Complete!
echo ========================================
echo.
echo Next steps:
echo 1. Make sure MySQL is running in XAMPP
echo 2. Run start-kadehub.bat to launch the app
echo.
pause
