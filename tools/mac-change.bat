@echo off
:: CyberStrike MAC Changer Wrapper
:: Auto-elevates to Administrator

:: Check for admin
net session >/dev/null 2>&1
if %errorLevel% neq 0 (
    echo [!] Requesting Administrator privileges...
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

:: Run MAC changer
echo === CyberStrike MAC Changer ===
echo.
powershell -ExecutionPolicy Bypass -File "C:\cyberstrike\tools\mac-changer.ps1" %*
echo.
pause
