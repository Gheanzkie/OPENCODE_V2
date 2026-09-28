@echo off
setlocal
rem CyberStrike standalone launcher - OPENCODE_HACKER
rem Clone this folder anywhere, run start.cmd, done. Does NOT write to
rem %USERPROFILE%\.config\opencode - everything (agent, plugins, anti-refusal,
rem anti-killswitch, system prompts) lives inside this folder.
set "CYBERSTRIKE_PERSONA=hacker"
cd /d "%~dp0"
where opencode >nul 2>&1
if errorlevel 1 (
  echo [BLOCKED] opencode not on PATH. Install first: npm install -g opencode-ai
  exit /b 1
)
rem Auto-open the quota dashboard on a plain interactive launch (no args).
rem Flag tells opencode.ps1 the browser is already open (no double tab).
if "%~1"=="" if exist "%~dp0quota-dashboard.html" (
  start "" "%~dp0quota-dashboard.html"
  set "CYBERSTRIKE_DASH_OPENED=1"
)
opencode %*
exit /b %ERRORLEVEL%
