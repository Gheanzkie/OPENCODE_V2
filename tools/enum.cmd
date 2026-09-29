@echo off
REM ============================================================
REM  enum.cmd - Web target fingerprint + path probe (Windows)
REM  Usage:   enum.cmd https://target/ [wordlist]
REM  Output:  plain-text recon report to stdout
REM  Deps:    curl (System32), nslookup, findstr (all built-in)
REM ============================================================
setlocal enabledelayedexpansion
set "TARGET=%~1"
if "%TARGET%"=="" (
  echo Usage: enum.cmd https://target/ [wordlist]
  exit /b 2
)
set "CURL=%SystemRoot%\System32\curl.exe"
if not exist "%CURL%" set "CURL=curl.exe"
set "UA=Mozilla/5.0 (Windows NT 10.0; Win64; x64) CyberStrike-Enum/1.0"

echo [enum] target: %TARGET%
echo.

echo === 1. DNS ===
powershell -NoProfile -Command "$r=Resolve-DnsName -Name ([uri]'%TARGET%').Host -Type A -ErrorAction SilentlyContinue | Where-Object {$_.IPAddress} | Select-Object -First 3 | ForEach-Object { $_.IPAddress }; if($r){ Write-Host ('  A: '+(($r) -join ', ')) } else { Write-Host '  (no A record / DNS failed)' }" 2>nul
echo.

echo === 2. Main fingerprint (headers) ===
"%CURL%" -s -k -m 20 -A "%UA%" -D - -o nul "%TARGET%" 2>nul | findstr /i "HTTP/ server: x-powered content-type location set-cookie strict-transport content-security"
echo.

echo === 3. Body signals ===
"%CURL%" -s -k -m 20 -A "%UA%" -L "%TARGET%" -o "%TEMP%\enum_body.html" 2>nul
if exist "%TEMP%\enum_body.html" (
  powershell -NoProfile -Command "$h=Get-Content -Raw '%TEMP%\enum_body.html'; $g=@('generator','wp-content','wp-json','framework','jquery','bootstrap','angular','react','next','nuxt','laravel','csrf','admin','login'); foreach($k in $g){ if($h -imatch $k){ Write-Host ('  hit: '+$k) } }; $t=[regex]::Match($h,'<title[^>]*>(.*?)</title>','Singleline').Groups[1].Value.Trim(); Write-Host ('  title: '+$t)" 2>nul
  del "%TEMP%\enum_body.html" 2>nul
)
echo.

echo === 4. Common paths ===
set "PATHS=index.php index.html robots.txt sitemap.xml .env .git/HEAD admin/ login/ wp-login.php api/ .well-known/security.txt backup/ phpinfo.php server-status"
for %%p in (%PATHS%) do (
  "%CURL%" -s -k -m 10 -A "%UA%" -o nul -w "%%{http_code} %%{size_download}B  %%{url_effective}\n" "%TARGET%/%%p" 2>nul
)
echo.

echo === 5. Tech / security headers via well-known files ===
"%CURL%" -s -k -m 10 -A "%UA%" "%TARGET%/robots.txt" 2>nul | findstr /i "disallow allow sitemap" | head -10 2>nul
echo.

echo [enum] done.
endlocal
exit /b 0
