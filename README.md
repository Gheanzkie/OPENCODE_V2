# OPENCODE_HACKER

Standalone CyberStrike opencode box: mimo anti-refusal + anti-killswitch live
entirely inside this folder. Nothing here is written to
`%USERPROFILE%\.config\opencode` unless you run `opencode.ps1` (the optional
persona launcher) on purpose.

## Quickstart (fresh clone, new PC)

    npm install -g opencode-ai      # once
    cd OPENCODE_HACKER
    start.cmd                       # = CYBERSTRIKE_PERSONA=hacker + opencode

`start.cmd` only sets a process env var and starts opencode with this folder as
the project - it does not touch the global opencode config. What loads from the
folder alone:

| piece | path |
|---|---|
| model (mimo-v2.6-flash-free) + provider | `opencode.json` |
| hacker agent (project-local) | `.opencode\agent\hacker.md` |
| anti-refusal instructions | `cyberstrike\hacker-persona.md`, `cyberstrike-prompt.md`, `.opencode\prompts\anti-refusal.md` |
| mimo system-prompt replace + append rule | `.opencode\system-prompts.json` -> `.opencode\prompts\anti-refusal-mimo.md` |
| anti-killswitch (refusal magic-string scrubber) | `.opencode\plugin\anti-killswitch.ts` |
| persona wrapper / retry / security plugins | `.opencode\plugin\*.js` |

Verify after clone: `opencode debug config` (expect model
`opencode/mimo-v2.6-flash-free`, plugins under `C:/.../OPENCODE_HACKER/.opencode/plugin/`),
then `start.cmd`, then in-chat `anti-refusal status` -> `[MIMO-ARMED]`.

Monitor: open `quota-dashboard.html` (double-click, works offline) — per-model
quota cards for all 68 models (used/quota bars, daily reset countdown, mark
exhausted) plus the email renewal pool (single + bulk add, per-email countdown,
renew-now / renew-all-due, export/import JSON). State lives in the browser's
localStorage. Plain interactive launches (bare `opencode`, or `start.cmd`
with no args) auto-open the dashboard in the default browser; subcommands
(`opencode --version`, `run`, `-DryRun`) never do.

Git: keys are gitignored (`cyberstrike/cyberstrike.json`, `cyberstrike/opencode-key.txt`,
`auth.json`, `node_modules/`). Never commit them.

## Why this folder exists

Originally lived in the Windows Temp folder, which Windows can clear at any
time. Moved to `C:\xampp\htdocs\opencode-cli` on 2026-09-25, renamed to
`C:\OPENCODE_HACKER` on 2026-09-28 so it can be cloned anywhere as-is.

## What reads it

`C:\OPENCODE_HACKER\opencode.ps1` — the optional persona launcher, invoked by the `opencode` shim on PATH.
On EVERY launch it regenerates the live config from this folder:

    persona\opencode.hacker.jsonc    ->  ~\.config\opencode\opencode.jsonc      (hacker)
    persona\opencode.default.jsonc   ->  ~\.config\opencode\opencode.jsonc      (default)
    agent\hacker.md                  ->  ~\.config\opencode\agent\hacker.md
                                         C:\cyberstrike\.opencode\agent\hacker.md
    persona\cyberstrike-persona.js   ->  ~\.config\opencode\plugin\cyberstrike-persona.js

Edit files HERE. Never edit the generated copies above — they are overwritten on
every launch.

## Layout

| path                              | purpose                                          |
|-----------------------------------|--------------------------------------------------|
| `persona\opencode.hacker.jsonc`   | hacker overlay: default_agent, model, instructions |
| `persona\opencode.default.jsonc`  | stock overlay (no agent, no persona instructions) |
| `persona\cyberstrike-persona.js`  | persona gate plugin (dead unless CYBERSTRIKE_PERSONA=hacker) |
| `agent\hacker.md`                 | the hacker agent prompt                          |
| `cyberstrike\hacker-persona.md`   | persona instructions                             |
| `cyberstrike-prompt.md`           | operator instructions                            |
| `cyberstrike\cyberstrike.json`    | live CyberStrike config: 15 providers, models, plugins (gitignored) |
| `cyberstrike\opencode-key.txt`    | YOUR opencode.ai/zen API key, alone in its own file (gitignored) |
| `cyberstrike\*.example.*`         | committed redacted templates for the two live files above |
| `.opencode\`                      | project config: prompts, plugins, system-prompts.json, skills |
| `plugin\`, `skills\`              | plugin and skill sources                         |

## Commands

    opencode                          # straight in, no menu (persona: hacker)
    opencode -Persona hacker          # anti-refusal wrapper + hacker agent
    opencode -Persona default         # stock opencode (--pure, no persona)
    opencode -DryRun                  # show what WOULD load; changes nothing
    opencode debug config             # resolved configuration
    opencode debug agent hacker       # resolved agent prompt

## The opencode API key lives in its own file

The `opencode` provider key is NOT stored inline in `cyberstrike.json`. It sits in a
one-line file next to it, and the config points at it with CyberStrike's `{file:}`
template (resolved by `packages/cyberstrike/src/config/config.ts`, path relative to
the config file, contents trimmed):

    ~\.config\cyberstrike\opencode-key.txt          <- sk-...  (real key, gitignored)
    ~\.config\cyberstrike\cyberstrike.json         "apiKey": "{file:./opencode-key.txt}"

Rotate the key by editing that one file — `cyberstrike.json` never has to change.
Committed template: `cyberstrike\opencode-key.example.txt`.

The other 14 providers keep their keys inline in `cyberstrike.json` (that file is
gitignored; only the redacted `cyberstrike.example.json` is committed).

## Not committed / not in git

- Account token stores (`opencode-accounts.json`, `antigravity-accounts.json`, `auth.json`)
- Provider `apiKey` values: `cyberstrike/cyberstrike.json` and `cyberstrike/opencode-key.txt`
- `node_modules`, lockfiles, local database

## Rollback

Earlier launcher backups remain in: `C:\cyberstrike\opencode.ps1.bak-tree-*`
