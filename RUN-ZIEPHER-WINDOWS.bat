@echo off
setlocal
cd /d "%~dp0"

echo.
echo Ziepher AI local launcher
echo =========================
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo Node.js 22.16 or newer is required.
  echo Download it from the official Node.js website, then run this file again.
  pause
  exit /b 1
)

if not exist ".env.local" (
  copy /Y ".env.example" ".env.local" >nul
)

call npm.cmd config set registry https://registry.npmjs.org/
if errorlevel 1 (
  echo Could not configure the public npm registry.
  pause
  exit /b 1
)

if not exist "node_modules\.bin\next.cmd" (
  echo Installing Ziepher AI dependencies. This may take several minutes...
  call npm.cmd ci --include=dev --no-audit --no-fund --progress=false
  if errorlevel 1 (
    echo.
    echo Installation failed. Check your internet connection and try again.
    pause
    exit /b 1
  )
)

echo.
echo Starting Ziepher AI at http://localhost:3000
start "" "http://localhost:3000"
call npm.cmd run dev

echo.
echo Ziepher AI stopped.
pause
