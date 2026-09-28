@echo off
setlocal
rem OPENCODE_V2 one-shot setup - run once after cloning this folder anywhere.
rem Installs the runtime (opencode-ai, freebuff), folder-local deps, and wires
rem the `opencode` command to this folder's launcher. Idempotent.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0install.ps1" %*
exit /b %ERRORLEVEL%
