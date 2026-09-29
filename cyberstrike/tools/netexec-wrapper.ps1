# NetExec (nxc) Wrapper
# Usage: .\netexec-wrapper.ps1 -target <ip> -protocol <smb|winrm|ssh|rdp> -username <user> -password <pass>
param(
    [string]$target,
    [string]$protocol = "smb",
    [string]$username,
    [string]$password,
    [string]$hash,
    [switch]$brute,
    [string]$wordlist = "C:\cyberstrike\.cyberstrike\wordlists\common-paths.txt",
    [switch]$exec,
    [string]$command
)

$nxcPath = "C:\cyberstrike\tools\nxc.exe"
if (-not (Test-Path $nxcPath)) {
    Write-Host "[!] nxc.exe not found. Install with: pip install netexec"
    exit 1
}

if ($brute) {
    Write-Host "[*] Brute forcing $protocol on $target"
    if ($username) {
        & $nxcPath $protocol $target -u $username -p $password --no-bruteforce --continue-on-success
    } else {
        & $nxcPath $protocol $target -u $wordlist -p $wordlist --no-bruteforce --continue-on-success
    }
} elseif ($exec) {
    Write-Host "[*] Executing command on $target via $protocol"
    if ($hash) {
        & $nxcPath $protocol $target -u $username -H $hash -x $command
    } else {
        & $nxcPath $protocol $target -u $username -p $password -x $command
    }
} else {
    Write-Host "[*] Testing $protocol on $target"
    if ($hash) {
        & $nxcPath $protocol $target -u $username -H $hash
    } else {
        & $nxcPath $protocol $target -u $username -p $password
    }
}
