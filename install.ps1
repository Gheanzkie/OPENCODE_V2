# OPENCODE_HACKER one-shot setup - run once after copying/cloning this folder
# to any PC. Offline-first, idempotent, component-checked:
#   1. component check  - every component is verified by its real artifact
#                         (exe/package/shim), not just "some command exists"
#   2. install gaps     - missing components install from the bundled offline\
#                         payloads (npm cache + portable Node runtime). The
#                         network is only touched when the bundle is absent
#                         or incomplete (explicit [RETRY] line).
#   3. wire + verify     - `opencode` command shims point at THIS folder's
#                         launcher, user PATH registration, end-to-end
#                         `opencode --version` through the real shim.
# Exit code: 0 = every required component ready, 1 = something failed.
param(
    [switch]$NoPause
)

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot

$offlineCache      = Join-Path $root 'offline\npm-cache'
$bundledNode       = Join-Path $root 'offline\nodejs'
$hasBundle         = Test-Path (Join-Path $offlineCache '_cacache')
$hasBundledNode    = Test-Path (Join-Path $bundledNode 'node.exe')

# component bookkeeping for the final SUCCESS / FAILED banner
$script:done   = New-Object 'System.Collections.Generic.List[string]'
$script:failed = New-Object 'System.Collections.Generic.List[string]'
$script:warned = New-Object 'System.Collections.Generic.List[string]'

function Exit-Pause([int]$code) {
    if (-not $NoPause) {
        Write-Host ""
        Write-Host " Press any key to exit..." -ForegroundColor White -NoNewline
        if ([Console]::IsInputRedirected) { Write-Host "" }
        else { try { $null = [Console]::ReadKey($true); Write-Host "" } catch { Write-Host "" } }
    }
    exit $code
}

function Which($name) {
    $c = Get-Command $name -ErrorAction SilentlyContinue
    if ($c) { return @($c)[0].Source }
    return $null
}

function Invoke-Npm {
    # Runs npm in $WorkDir (folder-local) or the current dir (globals).
    # Captures $LASTEXITCODE immediately; npm's own console output flows
    # through untouched. Returns the exit code (1 on invocation error).
    param([string[]]$NpmArgs, [string]$WorkDir = '')
    $pushed = $false
    if ($WorkDir) { Push-Location $WorkDir; $pushed = $true }
    try {
        & npm @NpmArgs
        return $LASTEXITCODE
    } catch {
        Write-Host "   npm invocation error: $_" -ForegroundColor Red
        return 1
    } finally {
        if ($pushed) { Pop-Location }
    }
}

function Test-FolderDeps {
    # True when every dependency declared in <root>\<Dir>\package.json already
    # has its package.json under <root>\<Dir>\node_modules\<name>.
    param([string]$Dir)
    $pkgFile = Join-Path $root (Join-Path $Dir 'package.json')
    if (-not (Test-Path $pkgFile)) { return $true }
    try { $pkg = Get-Content $pkgFile -Raw | ConvertFrom-Json } catch { return $false }
    $names = @()
    if ($pkg.PSObject.Properties['dependencies'] -and $pkg.dependencies) {
        $names += $pkg.dependencies.PSObject.Properties.Name
    }
    if ($pkg.PSObject.Properties['devDependencies'] -and $pkg.devDependencies) {
        $names += $pkg.devDependencies.PSObject.Properties.Name
    }
    $nmRoot = Join-Path $root (Join-Path $Dir 'node_modules')
    foreach ($n in $names) {
        if (-not (Test-Path (Join-Path $nmRoot (Join-Path $n 'package.json')))) { return $false }
    }
    return $true
}

function Add-UserPath {
    # Returns 'present' | 'added' | 'failed'. Preserves the registry value
    # kind (REG_EXPAND_SZ stays expandable) and never rewrites an entry that
    # already resolves to $dir (expanded comparison).
    param([string]$Dir)
    $norm = $Dir.TrimEnd('\')
    $k = $null
    try {
        $k = [Microsoft.Win32.Registry]::CurrentUser.OpenSubKey('Environment', $true)
        if (-not $k) { return 'failed' }
        $raw = ''
        try { $raw = [string]$k.GetValue('Path', '', [Microsoft.Win32.RegistryValueOptions]::DoNotExpandEnvironmentNames) } catch { $raw = '' }
        $kind = 'String'
        try { $kind = $k.GetValueKind('Path') } catch { $kind = 'String' }
        $entries = @()
        if ($raw) { $entries = @($raw -split ';' | Where-Object { $_ -and $_.Trim() }) }
        foreach ($e in $entries) {
            $ex = [Environment]::ExpandEnvironmentVariables("$e".Trim()).TrimEnd('\')
            if ($ex -ieq $norm) {
                $k.Close()
                if (($env:PATH -split ';') -notcontains $norm -and $env:PATH -notmatch [regex]::Escape($norm)) {
                    $env:PATH = $env:PATH.TrimEnd(';') + ';' + $Dir
                }
                return 'present'
            }
        }
        $newRaw = (@($entries) + $Dir) -join ';'
        $k.SetValue('Path', $newRaw, $kind)
        $k.Close()
        if ($env:PATH -notmatch [regex]::Escape($norm)) {
            $env:PATH = $env:PATH.TrimEnd(';') + ';' + $Dir
        }
        return 'added'
    } catch {
        if ($k) { try { $k.Close() } catch { } }
        return 'failed'
    }
}

function Broadcast-EnvChange {
    # Tell Explorer to reload the user environment so newly opened shells
    # see the PATH updates without a logoff.
    try {
        if (-not ('Win32.CyberStrikeEnv' -as [type])) {
            Add-Type -Namespace Win32 -Name CyberStrikeEnv -MemberDefinition @'
[DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Auto)]
public static extern IntPtr SendMessageTimeout(IntPtr hWnd, uint Msg, UIntPtr wParam, string lParam, uint fuFlags, uint uTimeout, out UIntPtr lpdwResult);
'@
        }
        [UIntPtr]$result = [UIntPtr]::Zero
        [void][Win32.CyberStrikeEnv]::SendMessageTimeout([IntPtr]0xffff, 0x1A, [UIntPtr]::Zero, 'Environment', 2, 5000, [ref]$result)
    } catch { }
}

# ---------------------------------------------------------------------------
Write-Host ""
Write-Host " * OPENCODE_V2 setup " -ForegroundColor Green -NoNewline
Write-Host "* $root" -ForegroundColor DarkGray
$bundleState = @()
if ($hasBundle)   { $bundleState += 'npm-cache' }
if ($hasBundledNode) { $bundleState += 'portable-node' }
$bundleText = if ($bundleState.Count -gt 0) { ($bundleState -join ' + ') } else { 'MISSING (network fallback active)' }
Write-Host "   offline bundle: $bundleText" -ForegroundColor DarkGray

# --- 1. runtime (system node preferred, bundled portable as fallback) ------
$usingBundled = $false
$needBundled = $false
$reason = ''
if (-not (Which 'node') -or -not (Which 'npm')) {
    $needBundled = $true
    $reason = 'node/npm not on PATH'
} else {
    $nv = ''
    try { $nv = (node -v) } catch { $nv = '' }
    $vm = [regex]::Match("$nv", 'v(\d+)')
    $major = 0
    if ($vm.Success) { $major = [int]$vm.Groups[1].Value }
    if ($major -lt 14) {
        $needBundled = $true
        $reason = "system node too old ($nv)"
    }
}
if ($needBundled) {
    if (-not $hasBundledNode) {
        Write-Host " [BLOCKED] Node.js runtime: $reason, and $bundledNode not found" -ForegroundColor Red
        $script:failed.Add("Node.js runtime ($reason; offline\nodejs bundle missing)")
        Exit-Pause 1
    }
    $env:PATH = "$bundledNode;$env:PATH"
    if (-not (Which 'node') -or -not (Which 'npm')) {
        Write-Host " [BLOCKED] bundled Node runtime incomplete at $bundledNode" -ForegroundColor Red
        $script:failed.Add('Node.js runtime (bundled copy incomplete)')
        Exit-Pause 1
    }
    $usingBundled = $true
    $nv = (node -v)
    Write-Host " * node $nv + npm (bundled portable runtime)" -ForegroundColor DarkGray
    $script:done.Add("node $nv + npm (bundled offline runtime)")
} else {
    $nv = (node -v)
    Write-Host " * node $nv + npm (system)" -ForegroundColor DarkGray
    $script:done.Add("node $nv + npm (system)")
}

# --- 2. npm global prefix (dynamic - no hardcoded %APPDATA%\npm) -----------
$npmDir = $null
try { $npmDir = (& npm prefix -g | Select-Object -First 1) } catch { $npmDir = $null }
if ($npmDir) { $npmDir = "$npmDir".Trim().Trim('"') }
if (-not $npmDir) { $npmDir = Join-Path $env:APPDATA 'npm' }
New-Item -ItemType Directory -Force -Path $npmDir | Out-Null

# --- 3. opencode-ai (required, global) -------------------------------------
$ocExe = Join-Path $npmDir 'node_modules\opencode-ai\bin\opencode.exe'
if (Test-Path $ocExe) {
    $v = $null
    try { $v = (& $ocExe --version | Select-Object -First 1) } catch { $v = $null }
    if ($v) {
        Write-Host " * opencode-ai $v - already installed" -ForegroundColor DarkGray
        $script:done.Add("opencode-ai $v (already installed)")
    } else {
        Write-Host " [FAIL] existing opencode-ai install does not run --version" -ForegroundColor Red
        $script:failed.Add('opencode-ai (existing install broken - re-run offline install)')
    }
} else {
    $mode = $null
    if ($hasBundle) {
        Write-Host " + npm install -g opencode-ai [offline bundle]" -ForegroundColor Cyan
        $code = Invoke-Npm @('install', '-g', 'opencode-ai', '--offline', '--cache', $offlineCache, '--no-fund', '--no-audit')
        if ($code -eq 0) { $mode = 'offline' }
    } else {
        Write-Host " + npm install -g opencode-ai [online - offline bundle absent]" -ForegroundColor Cyan
        $code = Invoke-Npm @('install', '-g', 'opencode-ai', '--no-fund', '--no-audit')
        if ($code -eq 0) { $mode = 'online' }
    }
    if (-not $mode -and $hasBundle) {
        Write-Host " [RETRY] offline cache incomplete - trying online" -ForegroundColor Yellow
        $code = Invoke-Npm @('install', '-g', 'opencode-ai', '--no-fund', '--no-audit')
        if ($code -eq 0) { $mode = 'online' }
    }
    if ($mode -and (Test-Path $ocExe)) {
        $v = $null
        try { $v = (& $ocExe --version | Select-Object -First 1) } catch { $v = $null }
        Write-Host " * opencode-ai $(if ($v) { $v } else { 'installed' }) [installed $mode]" -ForegroundColor DarkGray
        $script:done.Add("opencode-ai $(if ($v) { $v } else { '' }) (installed $mode)")
    } else {
        Write-Host " [FAIL] opencode-ai install failed" -ForegroundColor Red
        $script:failed.Add('opencode-ai (global install failed)')
    }
}

# --- 4. freebuff (optional, global) ----------------------------------------
$fbPkg = Join-Path $npmDir 'node_modules\freebuff\package.json'
if (Test-Path $fbPkg) {
    Write-Host " * freebuff - already installed" -ForegroundColor DarkGray
    $script:done.Add('freebuff (already installed)')
} else {
    $mode = $null
    if ($hasBundle) {
        Write-Host " + npm install -g freebuff [offline bundle]" -ForegroundColor Cyan
        $code = Invoke-Npm @('install', '-g', 'freebuff', '--offline', '--cache', $offlineCache, '--no-fund', '--no-audit')
        if ($code -eq 0) { $mode = 'offline' }
    } else {
        Write-Host " + npm install -g freebuff [online - offline bundle absent]" -ForegroundColor Cyan
        $code = Invoke-Npm @('install', '-g', 'freebuff', '--no-fund', '--no-audit')
        if ($code -eq 0) { $mode = 'online' }
    }
    if (-not $mode -and $hasBundle) {
        Write-Host " [RETRY] offline cache incomplete - trying online" -ForegroundColor Yellow
        $code = Invoke-Npm @('install', '-g', 'freebuff', '--no-fund', '--no-audit')
        if ($code -eq 0) { $mode = 'online' }
    }
    if ($mode -and (Test-Path $fbPkg)) {
        Write-Host " * freebuff [installed $mode]" -ForegroundColor DarkGray
        $script:done.Add("freebuff (installed $mode)")
    } else {
        Write-Host " [WARN] freebuff install failed - optional, CLI unavailable" -ForegroundColor Yellow
        $script:warned.Add('freebuff (optional) - install failed')
    }
}

# --- 5. folder-local dependencies (check first, install only gaps) ---------
$folderDirs = @('.', '.opencode', 'cyberstrike', 'mcp-servers\sec-tools')
foreach ($dir in $folderDirs) {
    $pkgFile = Join-Path $root (Join-Path $dir 'package.json')
    if (-not (Test-Path $pkgFile)) { continue }
    if (Test-FolderDeps $dir) {
        Write-Host " * deps $dir - already present" -ForegroundColor DarkGray
        $script:done.Add("deps $dir (already present)")
        continue
    }
    $mode = $null
    $work = Join-Path $root $dir
    if ($hasBundle) {
        Write-Host " + npm install ($dir) [offline bundle]" -ForegroundColor Cyan
        $code = Invoke-Npm @('install', '--no-fund', '--no-audit', '--offline', '--cache', $offlineCache) $work
        if ($code -eq 0) { $mode = 'offline' }
    }
    if (-not $mode) {
        if ($hasBundle) { Write-Host " [RETRY] $dir offline failed - trying online" -ForegroundColor Yellow }
        else { Write-Host " + npm install ($dir) [online - offline bundle absent]" -ForegroundColor Cyan }
        $code = Invoke-Npm @('install', '--no-fund', '--no-audit') $work
        if ($code -eq 0) { $mode = 'online' }
    }
    if ($mode -and (Test-FolderDeps $dir)) {
        Write-Host " * deps $dir [installed $mode]" -ForegroundColor DarkGray
        $script:done.Add("deps $dir (installed $mode)")
    } else {
        Write-Host " [FAIL] npm install ($dir)" -ForegroundColor Red
        $script:failed.Add("npm install ($dir)")
    }
}

# --- 6. wire the `opencode` command to THIS folder's launcher --------------
$rootPs1 = Join-Path $root 'opencode.ps1'
$rootEsc = [regex]::Escape($rootPs1)
$launcherOk = $true
if (-not (Test-Path $rootPs1)) {
    Write-Host " [FAIL] launcher missing: $rootPs1" -ForegroundColor Red
    $script:failed.Add('launcher opencode.ps1 missing from folder')
    $launcherOk = $false
}
if ($launcherOk) {
    $shims = @{
        (Join-Path $npmDir 'opencode.ps1') = "#!/usr/bin/env pwsh`n" +
            '$launcher = "' + $rootPs1 + '"' + "`n" +
            'if ($MyInvocation.ExpectingInput) { $input | & $launcher @args } else { & $launcher @args }' + "`n" +
            'exit $LASTEXITCODE'
        (Join-Path $npmDir 'opencode.cmd') = "@ECHO off`r`nSETLOCAL`r`npowershell -NoProfile -ExecutionPolicy Bypass -File `"$rootPs1`" %*`r`nexit /b %ERRORLEVEL%"
        (Join-Path $npmDir 'opencode')     = "#!/bin/sh`nexec powershell -NoProfile -ExecutionPolicy Bypass -File '$rootPs1' `"$@`""
    }
    foreach ($path in $shims.Keys) {
        $name = Split-Path $path -Leaf
        $needWrite = $true
        if (Test-Path $path) {
            $cur = $null
            try { $cur = Get-Content $path -Raw } catch { $cur = $null }
            if ($cur -and $cur -match $rootEsc) {
                $needWrite = $false
                Write-Host " * shim $name - already wired" -ForegroundColor DarkGray
            } else {
                # Shim points somewhere else (stock npm shim / older clone) -
                # keep a restore copy once, then rewire to this folder.
                $bak = "$path.stock"
                if (-not (Test-Path $bak)) {
                    Copy-Item $path $bak -Force
                    Write-Host " * backed up stock $name -> $name.stock" -ForegroundColor DarkGray
                }
            }
        }
        if ($needWrite) {
            if ($name -eq 'opencode.cmd') {
                # cmd.exe reads batch files in the ANSI codepage; writing UTF-8
                # would corrupt a non-ASCII install path on other PCs.
                $enc = [System.Text.Encoding]::Default
            } elseif ($name -eq 'opencode.ps1') {
                $enc = New-Object System.Text.UTF8Encoding($true)
            } else {
                $enc = New-Object System.Text.UTF8Encoding($false)
            }
            [System.IO.File]::WriteAllText($path, $shims[$path], $enc)
            Write-Host " * wired $name -> opencode.ps1" -ForegroundColor DarkGray
        }
    }
    $script:done.Add("command shims in $npmDir -> $rootPs1")
}

# --- 7. PATH registration (user scope, no admin required) ------------------
if ($usingBundled) {
    $ps1 = Add-UserPath $bundledNode
    if ($ps1 -eq 'failed') {
        Write-Host " [FAIL] cannot add bundled node dir to user PATH" -ForegroundColor Red
        $script:failed.Add("PATH: $bundledNode (write failed)")
    } else {
        Write-Host " * PATH += $bundledNode ($ps1)" -ForegroundColor DarkGray
        $script:done.Add("PATH: bundled node dir ($ps1)")
    }
}
$ps2 = Add-UserPath $npmDir
if ($ps2 -eq 'failed') {
    Write-Host " [FAIL] cannot add npm dir to user PATH - 'opencode' will not resolve" -ForegroundColor Red
    $script:failed.Add("PATH: $npmDir (write failed)")
} else {
    Write-Host " * PATH += $npmDir ($ps2)" -ForegroundColor DarkGray
    $script:done.Add("PATH: $npmDir ($ps2)")
}
if ($usingBundled -or $ps2 -eq 'added') { Broadcast-EnvChange }

# --- 8. verify (3-gate: artifact, PATH resolution, real launch) ------------
Write-Host ""
$ocVer = $null
if (Test-Path $ocExe) {
    try { $ocVer = (& $ocExe --version | Select-Object -First 1) } catch { $ocVer = $null }
}
if ($ocVer) {
    Write-Host " [OK] artifact: opencode.exe $ocVer" -ForegroundColor Green
    $script:done.Add("verify: opencode.exe $ocVer")
} else {
    Write-Host " [FAIL] artifact missing/unrunnable: $ocExe" -ForegroundColor Red
    $script:failed.Add("verify: opencode.exe missing at $ocExe")
}

# Resolve `opencode` from a neutral cwd so a stray launcher in the current
# directory cannot shadow the wired shim during the check.
$first = $null
$neutral = [System.IO.Path]::GetTempPath()
try {
    Push-Location $neutral
    try { $lines = @(cmd /c 'where opencode 2>nul') } finally { Pop-Location }
} catch { $lines = @() }
if ($lines.Count -gt 0) { $first = "$($lines[0])".Trim() }
$npmNorm = $npmDir.TrimEnd('\')
if (-not $first) {
    Write-Host " [FAIL] 'opencode' not found on PATH" -ForegroundColor Red
    $script:failed.Add('verify: opencode not found on PATH')
} elseif (-not $first.StartsWith($npmNorm, [StringComparison]::OrdinalIgnoreCase)) {
    Write-Host " [FAIL] PATH shadow: 'opencode' resolves to $first" -ForegroundColor Red
    Write-Host "        expected under $npmDir" -ForegroundColor Yellow
    $script:failed.Add("verify: PATH shadow - resolves to $first")
} else {
    Write-Host " [OK] command: opencode -> $first" -ForegroundColor Green
    $script:done.Add("verify: command -> $first")
}

# End-to-end: run the wired shim with --version (spawns the real launcher).
$shimCmd = Join-Path $npmDir 'opencode.cmd'
$shimPs1 = Join-Path $npmDir 'opencode.ps1'
$launch = $null
if (Test-Path $shimCmd) { $launch = $shimCmd }
elseif (Test-Path $shimPs1) { $launch = $shimPs1 }
if ($launch) {
    $out = $null
    $rc = -1
    try {
        # Capture ALL output first, then pick the line. Piping the shim
        # straight into `Select-Object -First 1` closes the pipe early, which
        # makes PowerShell report $LASTEXITCODE = -1 even on a clean exit 0.
        $raw = @(& $launch --version 2>&1)
        $rc = $LASTEXITCODE
        $out = @($raw | Where-Object { "$_" -match '\S' } | Select-Object -First 1)
        if ($out.Count -eq 0) { $out = $null }
    } catch {
        $rc = -1
    }
    if ($rc -eq 0 -and $out) {
        Write-Host " [OK] launcher: opencode --version -> $out" -ForegroundColor Green
        $script:done.Add("verify: launcher --version -> $out")
    } else {
        Write-Host " [FAIL] launcher check failed (exit $rc) via $launch" -ForegroundColor Red
        $script:failed.Add("verify: launcher check failed (exit $rc)")
    }
} else {
    Write-Host " [FAIL] no opencode shim found in $npmDir" -ForegroundColor Red
    $script:failed.Add("verify: no shim in $npmDir")
}

# --- 9. result banner ------------------------------------------------------
Write-Host ""
$allOk = ($script:failed.Count -eq 0)
if ($allOk -and $script:warned.Count -eq 0) {
    Write-Host " ===================================================" -ForegroundColor Green
    Write-Host "  SUCCESSFULLY installed ALL components on this PC " -ForegroundColor Green -BackgroundColor Black
    Write-Host " ===================================================" -ForegroundColor Green
    foreach ($c in $script:done) { Write-Host "   * $c" -ForegroundColor DarkGray }
    Write-Host ""
    Write-Host " Done. Next:" -ForegroundColor Green
    Write-Host "   start.cmd                 (hacker persona + quota dashboard auto-open)"
    Write-Host "   opencode                  (splash header + dashboard, same as start.cmd)"
    Write-Host "   opencode -DryRun          (show what a launch would do, changes nothing)"
    Write-Host " In-chat: /quota for the Freebuff-style quota summary."
} elseif ($allOk) {
    Write-Host " ===================================================" -ForegroundColor Green
    Write-Host "  SUCCESS - all required components installed " -ForegroundColor Green -BackgroundColor Black
    Write-Host " ===================================================" -ForegroundColor Green
    foreach ($c in $script:done) { Write-Host "   * $c" -ForegroundColor DarkGray }
    Write-Host " Optional warnings:" -ForegroundColor Yellow
    foreach ($c in $script:warned) { Write-Host "   ! $c" -ForegroundColor Yellow }
    Write-Host ""
    Write-Host " Done. Next: start.cmd   or   opencode" -ForegroundColor Green
} else {
    Write-Host " ===================================================" -ForegroundColor Red
    Write-Host "  INSTALL FAILED - required components missing " -ForegroundColor Red -BackgroundColor Black
    Write-Host " ===================================================" -ForegroundColor Red
    Write-Host " Installed OK:" -ForegroundColor DarkGray
    foreach ($c in $script:done) { Write-Host "   * $c" -ForegroundColor DarkGray }
    if ($script:warned.Count -gt 0) {
        Write-Host " Optional warnings:" -ForegroundColor Yellow
        foreach ($c in $script:warned) { Write-Host "   ! $c" -ForegroundColor Yellow }
    }
    Write-Host " Needs attention:" -ForegroundColor Yellow
    foreach ($c in $script:failed) { Write-Host "   X $c" -ForegroundColor Red }
}
Write-Host ""
if ($allOk) { Exit-Pause 0 } else { Exit-Pause 1 }
