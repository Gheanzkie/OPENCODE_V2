@echo off
REM Race Condition / TOCTOU Tester
REM Usage: race.cmd <url> --count <num> [--method <GET|POST>] [--data <payload>]

set URL=%1
set COUNT=20
set METHOD=GET
set DATA=

:parse
if "%2"=="" goto run
if "%2"=="--count" set COUNT=%3
if "%2"=="--method" set METHOD=%3
if "%2"=="--data" set DATA=%3
shift
shift
goto parse

:run
echo [*] Race condition test: %URL%
echo [*] Count: %COUNT%
echo [*] Method: %METHOD%

for /L %%i in (1,1,%COUNT%) do (
    start /B curl -s -X %METHOD% -d "%DATA%" "%URL%" -o nul -w "%%{http_code}" -s
)

echo [*] Fired %COUNT% requests
echo [*] Check for race condition effects
