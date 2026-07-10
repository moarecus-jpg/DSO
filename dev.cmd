@echo off
REM Zagon z Node 22 (Cursor helper) — ce npm run dev ne dela na Node 24
set "NODE22=%LOCALAPPDATA%\Programs\cursor\resources\app\resources\helpers"
if exist "%NODE22%\node.exe" (
  set "PATH=%NODE22%;%PATH%"
) else (
  echo Namesti Node 22 LTS ali odpri terminal v Cursorju.
)
cd /d "%~dp0"
call npm.cmd run dev
