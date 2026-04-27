@echo off
title Klosseland Server
echo.
echo  ============================
echo    Klosseland LAN Server
echo  ============================
echo.
echo  Building game...
call npm run build
if errorlevel 1 (
  echo.
  echo  Build failed! Check the output above.
  pause
  exit /b 1
)
echo.
echo  Starting server on port 3001...
echo  Your kids can connect at http://[your-ip]:3001
echo  Press Ctrl+C to stop the server.
echo.
node server/index.js
pause
