@echo off
title Building Portfolio for kadehub.com/portfolio

if "%PORTFOLIO_DIR%"=="" set PORTFOLIO_DIR=C:\Project\portfolio
set TARGET_DIR=C:\xampp\htdocs\Kadehub\frontend\public\portfolio

echo ========================================
echo Building Portfolio (Astro)...
echo ========================================
cd /d %PORTFOLIO_DIR%
call npm run build
if errorlevel 1 (
  echo Portfolio build failed.
  pause
  exit /b 1
)

echo.
echo ========================================
echo Copying to frontend\public\portfolio...
echo ========================================
if exist "%TARGET_DIR%" rmdir /s /q "%TARGET_DIR%"
xcopy "%PORTFOLIO_DIR%\dist" "%TARGET_DIR%\" /e /i /q /y

echo.
echo ========================================
echo Done! Commit frontend\public\portfolio and push to deploy.
echo ========================================
pause
