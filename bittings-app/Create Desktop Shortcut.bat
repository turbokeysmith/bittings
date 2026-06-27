@echo off
REM  One-time setup: puts TWO "Bittings" app icons on this PC's Desktop -
REM    * Bittings        = the real staff app
REM    * Bittings Demo    = the investor demo (sample data)
REM  Double-click this once. Then use the icons to open each in app mode.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0_make-shortcut.ps1"
echo.
pause
