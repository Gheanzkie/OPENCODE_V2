# One-shot setup for a fresh clone of this folder on any PC. Idempotent —
# safe to re-run. Does: runtime check, global opencode-ai + freebuff install,
# folder-local plugin deps, then wires the `opencode` command to THIS folder's
# launcher (with the stock npm shim kept as a .stock backup).
$ErrorActionPreference = "Stop"
$root = $PSScriptRoot

function Which($name) {
    $c = Get-Command $name -ErrorAction SilentlyContinue
    if ($c) { return @($c)[0].Source }
    return $null
}

Write-Host ""
Write-Host " ◆ OPENCODE_V2 setup " -ForegroundColor Green -NoNewline
Write-Host "· $root" -ForegroundColor DarkGray

# --- 1. runtime checks -------------------------------------------------
if (-not (Which "node")) {
    Write-Host " [BLOCKED] Node.js 18+ not found - install from https://nodejs.org" -ForegroundColor Red
    exit 1
}
if (-not (Which "npm")) {
    Write-Host " [BLOCKED] npm not found" -ForegroundColor Red
    exit 1
}
Write-Host " ✓ node $((node -v))" -ForegroundColor DarkGray

# --- 2. offline bundle (zero-network fallback) -------------------------
# The repo ships a pruned cacache bundle so a fresh clone installs with no
# network. Online is tried first; on failure we retry from the bundle.
$offlineCache = Join-Path $root "offline\npm-cache"
$hasBundle = Test-Path (Join-Path $offlineCache "_cacache")

# --- 3. global tools (what the original box had installed) -------------
if (-not (Which "opencode")) {
    Write-Host " + npm install -g opencode-ai" -ForegroundColor Cyan
    & npm install -g opencode-ai
    if ($LASTEXITCODE -ne 0 -and $hasBundle) {
        Write-Host " [RETRY] opencode-ai online failed - offline bundle" -ForegroundColor Yellow
        & npm install -g opencode-ai --offline --cache $offlineCache
    }
    if ($LASTEXITCODE -ne 0) { Write-Host " [BLOCKED] opencode-ai install failed" -ForegroundColor Red; exit 1 }
} else {
    Write-Host " ✓ opencode already installed" -ForegroundColor DarkGray
}
if (-not (Which "freebuff")) {
    Write-Host " + npm install -g freebuff (binary downloads on first run)" -ForegroundColor Cyan
    & npm install -g freebuff
    if ($LASTEXITCODE -ne 0 -and $hasBundle) {
        Write-Host " [RETRY] freebuff online failed - offline bundle" -ForegroundColor Yellow
        & npm install -g freebuff --offline --cache $offlineCache
    }
    if ($LASTEXITCODE -ne 0) { Write-Host " [WARN] freebuff install failed - optional" -ForegroundColor Yellow }
} else {
    Write-Host " ✓ freebuff already installed" -ForegroundColor DarkGray
}

# --- 4. folder-local plugin dependencies (node_modules is gitignored) --
foreach ($dir in @(".", ".opencode", "cyberstrike")) {
    $pkg = Join-Path $root (Join-Path $dir "package.json")
    if (Test-Path $pkg) {
        Write-Host " + npm install ($dir)" -ForegroundColor Cyan
        Push-Location (Join-Path $root $dir)
        try {
            & npm install --no-fund --no-audit
            if ($LASTEXITCODE -ne 0 -and $hasBundle) {
                Write-Host " [RETRY] $dir online failed - offline bundle" -ForegroundColor Yellow
                & npm install --no-fund --no-audit --offline --cache $offlineCache
            }
        } finally { Pop-Location }
        if ($LASTEXITCODE -ne 0) { Write-Host " [WARN] npm install failed in $dir" -ForegroundColor Yellow }
    }
}

# --- 5. wire the `opencode` command to this folder's launcher ----------
$npmDir = "$env:APPDATA\npm"
if (-not (Test-Path $npmDir)) {
    Write-Host " [BLOCKED] npm global dir $npmDir not found" -ForegroundColor Red
    exit 1
}
$rootPs1 = "$root\opencode.ps1"
$rootEsc = [regex]::Escape($rootPs1)

$shims = @{
    "$npmDir\opencode.ps1" = "#!/usr/bin/env pwsh`n" +
        '$launcher = "' + $rootPs1 + '"' + "`n" +
        'if ($MyInvocation.ExpectingInput) { $input | & $launcher @args } else { & $launcher @args }' + "`n" +
        'exit $LASTEXITCODE'
    "$npmDir\opencode.cmd" = "@ECHO off`r`nSETLOCAL`r`npowershell -NoProfile -ExecutionPolicy Bypass -File `"$rootPs1`" %*"
    "$npmDir\opencode"     = "#!/bin/sh`nexec powershell -NoProfile -ExecutionPolicy Bypass -File '$rootPs1' `"$@`""
}

foreach ($path in $shims.Keys) {
    $name = Split-Path $path -Leaf
    if (Test-Path $path) {
        $cur = Get-Content $path -Raw
        if ($cur -notmatch $rootEsc) {
            # Stock shim (points somewhere else) - keep a restore copy once.
            $bak = "$path.stock"
            if (-not (Test-Path $bak)) {
                Copy-Item $path $bak
                Write-Host " ✓ backed up stock $name -> $name.stock" -ForegroundColor DarkGray
            }
        }
    }
    [System.IO.File]::WriteAllText($path, $shims[$path])
    Write-Host " ✓ wired $name -> opencode.ps1" -ForegroundColor DarkGray
}

# --- 6. verify ---------------------------------------------------------
Write-Host ""
$ver = cmd /c "opencode --version 2>nul"
if ($ver) {
    Write-Host " ✓ opencode $ver via this folder's launcher" -ForegroundColor Green
} else {
    Write-Host " [WARN] opencode --version returned nothing - check PATH" -ForegroundColor Yellow
}
Write-Host ""
Write-Host " Done. Next:" -ForegroundColor Green
Write-Host "   start.cmd                 (hacker persona + quota dashboard auto-open)"
Write-Host "   opencode                  (splash header + dashboard, same as start.cmd)"
Write-Host "   opencode -DryRun          (show what a launch would do, changes nothing)"
Write-Host " In-chat: /quota for the Freebuff-style quota summary."
Write-Host ""
