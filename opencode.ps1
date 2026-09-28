# No param block on purpose. opencode's own flags (-m, -v, -c, -s, -p, --version,
# debug config, run ...) collide with PowerShell parameter binding: a ValidateSet
# param used to swallow bare positionals (opencode debug config died with
# "argument debug does not belong to the set"), and single-letter flags collided
# with common parameters. Every argument is parsed by hand instead, so opencode
# always receives exactly what it was given.
$ErrorActionPreference = "Stop"

$DryRun = $false
$Persona = $null
$RemainingArgs = @()
for ($i = 0; $i -lt $args.Count; $i++) {
    $a = [string]$args[$i]
    if ($a -match '^-{1,2}Menu$') {
        # Persona menu is gone. Swallow the legacy flag so it never reaches opencode.
    } elseif ($a -match '^-{1,2}DryRun$') {
        $DryRun = $true
    } elseif ($a -match '^-{1,2}Persona$') {
        $i++
        if ($i -lt $args.Count) { $Persona = [string]$args[$i] }
    } elseif ($a -match '^-{1,2}Persona:') {
        $Persona = $a -replace '^-{1,2}Persona:', ''
    } else {
        $RemainingArgs += $a
    }
}
if ($Persona -and $Persona -notin @("hacker", "default")) {
    Write-Error "Unknown persona '$Persona' (expected hacker or default)"
    exit 1
}

# No persona menu, no prompt: launching opencode never blocks on Read-Host.
# Explicit -Persona wins, then a persona inherited from the calling shell,
# then hacker. Scripted `opencode run` calls behave the same as interactive ones.
if ($Persona) {
    $env:CYBERSTRIKE_PERSONA = $Persona
} elseif (-not $env:CYBERSTRIKE_PERSONA) {
    $env:CYBERSTRIKE_PERSONA = "hacker"
}

$isHacker = $env:CYBERSTRIKE_PERSONA -eq "hacker"

# A default session must be indistinguishable from a stock opencode install. `--pure`
# (added below) only stops *plugins*; two other external surfaces keep loading, and
# both of them are CyberStrike-specific here:
#   - skills auto-loaded from ~/.claude/skills and ~/.agents/skills
#   - CLAUDE.md merging from ~/.claude/CLAUDE.md
# Disable both for default. They are explicitly unset for hacker so a persona switch
# in the same shell cannot inherit the previous run's isolation.
if ($isHacker) {
    Remove-Item Env:OPENCODE_DISABLE_EXTERNAL_SKILLS -ErrorAction SilentlyContinue
    Remove-Item Env:OPENCODE_DISABLE_CLAUDE_CODE -ErrorAction SilentlyContinue
} else {
    $env:OPENCODE_DISABLE_EXTERNAL_SKILLS = "1"
    $env:OPENCODE_DISABLE_CLAUDE_CODE = "1"
}

# Ensure the plugin directory exists and the persona plugin is installed
$pluginDir = "$HOME\.config\opencode\plugin"
if (-not (Test-Path $pluginDir)) {
    New-Item -ItemType Directory -Force -Path $pluginDir | Out-Null
}
Copy-Item "C:\OPENCODE_HACKER\persona\cyberstrike-persona.js" "$pluginDir\cyberstrike-persona.js" -Force

# Keep the folder the single source of truth for every plugin opencode loads:
# refresh the remaining CyberStrike plugin sources from it on each launch.
$srcPlugin = "C:\OPENCODE_HACKER\plugin"
New-Item -ItemType Directory -Force -Path "$pluginDir\cyberstrike" | Out-Null
New-Item -ItemType Directory -Force -Path "$pluginDir\anti-claude-refusals\.opencode\plugins" | Out-Null
Copy-Item "$srcPlugin\cyberstrike\index.js","$srcPlugin\cyberstrike\index.ts","$srcPlugin\cyberstrike\skills.ts" "$pluginDir\cyberstrike\" -Force
Copy-Item "$srcPlugin\anti-claude-refusals\.opencode\plugins\anti-killswitch.ts" "$pluginDir\anti-claude-refusals\.opencode\plugins\" -Force

# Manage the hacker agent based on persona
$agentDir = "C:\cyberstrike\.opencode\agent"
$globalAgentDir = "$HOME\.config\opencode\agent"
if (-not (Test-Path $agentDir)) { New-Item -ItemType Directory -Force -Path $agentDir | Out-Null }
if (-not (Test-Path $globalAgentDir)) { New-Item -ItemType Directory -Force -Path $globalAgentDir | Out-Null }

$backupHacker = "C:\OPENCODE_HACKER\agent\hacker.md"
$localHacker = "$agentDir\hacker.md"
$globalHacker = "$globalAgentDir\hacker.md"

if ($isHacker) {
    if (Test-Path $backupHacker) {
        Copy-Item $backupHacker $localHacker -Force
        Copy-Item $backupHacker $globalHacker -Force
    }
} else {
    if (Test-Path $localHacker) { Remove-Item $localHacker -Force }
    if (Test-Path $globalHacker) { Remove-Item $globalHacker -Force }
}

# Swap the live opencode config overlay for the chosen persona. The always-loaded
# ~/.config/opencode/opencode.json keeps plugins/providers; the persona-specific
# keys (default_agent, instructions, model) live here so the default persona never
# inherits the hacker agent or the hacker-persona.md instructions file.
$configDir = "$HOME\.config\opencode"
$liveConfig = "$configDir\opencode.jsonc"
$personaConfig = if ($isHacker) {
    "C:\OPENCODE_HACKER\persona\opencode.hacker.jsonc"
} else {
    "C:\OPENCODE_HACKER\persona\opencode.default.jsonc"
}
if (-not (Test-Path $configDir)) { New-Item -ItemType Directory -Force -Path $configDir | Out-Null }
Copy-Item $personaConfig $liveConfig -Force

# Build the opencode argument list. The default persona runs --pure (no external
# plugins at all), so it behaves exactly like a stock opencode install.
$opencodeArgs = @()
if (-not $isHacker) { $opencodeArgs += "--pure" }
if ($RemainingArgs) { $opencodeArgs += $RemainingArgs }

# Run the real opencode executable
$npmDir = "$env:APPDATA\npm"
$opencodeExe = "$npmDir\node_modules\opencode-ai\bin\opencode.exe"

if (-not (Test-Path $opencodeExe)) {
    Write-Error "Could not find opencode-ai executable at $opencodeExe"
    exit 1
}

if ($DryRun) {
    Write-Host ""
    Write-Host "persona        : $($env:CYBERSTRIKE_PERSONA)"
    Write-Host "config overlay : $personaConfig"
    Write-Host "config live    : $liveConfig"
    Write-Host "persona plugin : $pluginDir\cyberstrike-persona.js"
    Write-Host "hacker agent   : $(if (Test-Path $localHacker) { $localHacker } else { '(removed)' })"
    Write-Host "isolation      : $(if ($isHacker) { '(none)' } else { '--pure + OPENCODE_DISABLE_EXTERNAL_SKILLS + OPENCODE_DISABLE_CLAUDE_CODE' })"
    Write-Host "command        : `"$opencodeExe`" $($opencodeArgs -join ' ')"
    exit 0
}

# Auto-open the quota/renewal dashboard in the default browser on a plain
# interactive launch (opencode, no subcommand). start.cmd sets
# CYBERSTRIKE_DASH_OPENED=1 before calling opencode so chained launches only
# open the browser once. A browser failure never blocks the TUI.
if (-not $RemainingArgs -and -not $env:CYBERSTRIKE_DASH_OPENED) {
    $dashboard = Join-Path $PSScriptRoot "quota-dashboard.html"
    if (Test-Path $dashboard) {
        try { Start-Process $dashboard } catch { Write-Warning "dashboard open failed: $_" }
    }
}

if ($MyInvocation.ExpectingInput) {
    $input | & $opencodeExe $opencodeArgs
} else {
    & $opencodeExe $opencodeArgs
}
exit $LASTEXITCODE
