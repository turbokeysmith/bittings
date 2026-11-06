@echo off
REM  One-time setup: puts a "Bittings" app icon on this laptop's Desktop.
REM  Double-click this once. Then use the Bittings icon for the demo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0_make-shortcut.ps1"
echo.
pause
