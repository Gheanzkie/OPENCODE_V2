@echo off
setlocal
rem Start the local dashboard APIs (loopback only) without launching the TUI:
rem   accounts API  127.0.0.1:8787                accounts-server.js
rem   freebuff API  127.0.0.1:8081 + 127.0.0.1:8099   freebuff-api.js
rem Each server exits instantly if its port is already served (idempotent).
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 (
  echo [BLOCKED] node not on PATH. Install Node.js first.
  exit /b 1
)
start "accounts-api" node "%~dp0accounts-server.js"
start "freebuff-api" node "%~dp0freebuff-api.js"
echo [READY] accounts http://127.0.0.1:8787/   freebuff http://127.0.0.1:8081/admin   admin http://127.0.0.1:8099/admin/api/tokens
exit /b 0
