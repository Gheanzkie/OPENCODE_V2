# CyberStrike MAC Address Changer
# Run as Administrator!

param(
    [Parameter(Mandatory=$true)]
    [string]$Interface,
    
    [Parameter(Mandatory=$false)]
    [string]$NewMAC,
    
    [Parameter(Mandatory=$false)]
    [switch]$Random,
    
    [Parameter(Mandatory=$false)]
    [switch]$Show
)

# Check admin rights
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "[!] ERROR: Run this script as Administrator!" -ForegroundColor Red
    Write-Host "Right-click PowerShell -> Run as Administrator" -ForegroundColor Yellow
    exit 1
}

# Get network adapter
$adapter = Get-NetAdapter | Where-Object { $_.Name -eq $Interface -or $_.InterfaceDescription -eq $Interface }
if (-not $adapter) {
    Write-Host "[!] Interface not found: $Interface" -ForegroundColor Red
    Write-Host "Available interfaces:" -ForegroundColor Yellow
    Get-NetAdapter | Format-Table Name, Status, MacAddress -AutoSize
    exit 1
}

function Get-RandomMAC {
    $bytes = @()
    for ($i = 0; $i -lt 6; $i++) {
        $bytes += "{0:X2}" -f (Get-Random -Minimum 0 -Maximum 256)
    }
    # Set first byte to locally administered (not multicast)
    $firstByte = [Convert]::ToInt32($bytes[0], 16) -bor 0x02
    $firstByte = $firstByte -band 0xFE  # Clear multicast bit
    $bytes[0] = "{0:X2}" -f $firstByte
    return ($bytes -join ":")
}

function Set-MACAddress {
    param($AdapterName, $MAC)
    
    # Remove colons/dashes
    $MAC = $MAC -replace "[:\-]", ""
    
    Write-Host "`n[*] Current MAC: $($adapter.MacAddress)" -ForegroundColor Cyan
    Write-Host "[*] Setting MAC to: $MAC" -ForegroundColor Yellow
    
    # Disable adapter
    Write-Host "[*] Disabling adapter..." -ForegroundColor Gray
    Disable-NetAdapter -Name $AdapterName -Confirm:$false
    Start-Sleep -Seconds 2
    
    # Set MAC via registry
    $regPath = "HKLM:\SYSTEM\CurrentControlSet\Control\Class\{4d36e972-e325-11ce-bfc1-08002be10318}"
    $adapterId = $adapter.InterfaceGuid
    
    # Find the correct registry key
    Get-ChildItem $regPath | ForEach-Object {
        $desc = (Get-ItemProperty $_.PSPath).DriverDesc
        $id = (Get-ItemProperty $_.PSPath).NetCfgInstanceId
        if ($id -eq $adapterId) {
            Set-ItemProperty -Path $_.PSPath -Name "NetworkAddress" -Value $MAC
            Write-Host "[+] Registry updated" -ForegroundColor Green
        }
    }
    
    # Enable adapter
    Write-Host "[*] Enabling adapter..." -ForegroundColor Gray
    Enable-NetAdapter -Name $AdapterName -Confirm:$false
    Start-Sleep -Seconds 3
    
    # Verify
    $newAdapter = Get-NetAdapter | Where-Object { $_.Name -eq $Interface }
    Write-Host "[+] New MAC: $($newAdapter.MacAddress)" -ForegroundColor Green
    
    if ($newAdapter.MacAddress -replace "[:\-]", "" -eq $MAC) {
        Write-Host "[+] SUCCESS! MAC address changed!" -ForegroundColor Green
    } else {
        Write-Host "[-] Warning: MAC may not have changed. Try rebooting." -ForegroundColor Yellow
    }
}

function Reset-MACAddress {
    param($AdapterName)
    
    Write-Host "`n[*] Resetting MAC to default..." -ForegroundColor Yellow
    
    $regPath = "HKLM:\SYSTEM\CurrentControlSet\Control\Class\{4d36e972-e325-11ce-bfc1-08002be10318}"
    $adapterId = $adapter.InterfaceGuid
    
    Get-ChildItem $regPath | ForEach-Object {
        $id = (Get-ItemProperty $_.PSPath).NetCfgInstanceId
        if ($id -eq $adapterId) {
            Remove-ItemProperty -Path $_.PSPath -Name "NetworkAddress" -ErrorAction SilentlyContinue
        }
    }
    
    Disable-NetAdapter -Name $AdapterName -Confirm:$false
    Start-Sleep -Seconds 2
    Enable-NetAdapter -Name $AdapterName -Confirm:$false
    Start-Sleep -Seconds 3
    
    $resetAdapter = Get-NetAdapter | Where-Object { $_.Name -eq $Interface }
    Write-Host "[+] MAC reset to: $($resetAdapter.MacAddress)" -ForegroundColor Green
}

# Main logic
if ($Show) {
    Write-Host "`n=== Network Adapters ===" -ForegroundColor Cyan
    Get-NetAdapter | Where-Object { $_.Status -eq "Up" } | Format-Table Name, Status, MacAddress, LinkSpeed -AutoSize
    exit 0
}

if ($Random) {
    $NewMAC = Get-RandomMAC
    Write-Host "[*] Generated random MAC: $NewMAC" -ForegroundColor Cyan
}

if (-not $NewMAC) {
    Write-Host "Usage:" -ForegroundColor Yellow
    Write-Host "  .\mac-changer.ps1 -Interface 'Wi-Fi' -Random" -ForegroundColor White
    Write-Host "  .\mac-changer.ps1 -Interface 'Wi-Fi' -NewMAC 'AA:BB:CC:DD:EE:FF'" -ForegroundColor White
    Write-Host "  .\mac-changer.ps1 -Interface 'Wi-Fi' -Show" -ForegroundColor White
    exit 0
}

Set-MACAddress -AdapterName $Interface -MAC $NewMAC
