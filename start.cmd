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
opencode %*
exit /b %ERRORLEVEL%
