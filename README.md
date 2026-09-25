# opencode-cli

Single source of truth for this machine's opencode CLI configuration
(hacker persona + default/stock persona).

## Why this folder exists

Originally lived in the Windows Temp folder, which Windows can clear at any
time. Moved to C:\xampp\htdocs\opencode-cli on 2026-09-25 so the setup is permanent.

## What reads it

`C:\cyberstrike\opencode.ps1` — the launcher, invoked by the `opencode` shim on PATH.
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

    opencode                          # persona menu (or last chosen)
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

Earlier launcher versions are kept beside it: `C:\cyberstrike\opencode.ps1.bak-tree-*`
