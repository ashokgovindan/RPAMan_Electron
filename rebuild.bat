@echo off
cd /d "%~dp0"
echo Installing @electron/rebuild...
call npm install --save-dev @electron/rebuild
echo Rebuilding native modules for Electron...
call npx electron-rebuild -f -w better-sqlite3
echo.
echo Done. You can now run run.bat
pause
