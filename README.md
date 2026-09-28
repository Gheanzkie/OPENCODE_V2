# OPENCODE_HACKER

Standalone CyberStrike opencode box: mimo anti-refusal + anti-killswitch live
entirely inside this folder. Nothing here is written to
`%USERPROFILE%\.config\opencode` unless you run `opencode.ps1` (the optional
persona launcher) on purpose.

## Quickstart (fresh clone, new PC)

    install.cmd                 # one shot: opencode-ai + freebuff + folder deps + wires `opencode`
    start.cmd                   # = CYBERSTRIKE_PERSONA=hacker + quota dashboard + TUI

`install.cmd` is idempotent: it installs the global tools if missing, runs
`npm install` in the three folder-local package.json dirs (node_modules is
gitignored), and rewrites the `opencode` command shims in `%APPDATA%\npm` to
point at this folder's `opencode.ps1` (the stock shims are kept as
`*.stock` backups). Every path in `opencode.ps1` derives from its own location
(`$PSScriptRoot`), so the folder works from **any** clone path — nothing is
hardcoded to `C:\OPENCODE_HACKER` anymore.

`start.cmd` only sets a process env var and starts opencode with this folder as
the project - it does not touch the global opencode config beyond the persona
overlay `opencode.ps1` installs on launch. What loads from the folder alone:

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

Monitor: everything lives in ONE dashboard — `opencode-accounts.html` served at
`http://127.0.0.1:8787/` (three tabs, list-style rows): **Accounts** (add /
apply / clear API keys via the loopback API), **Model quotas** (all 68 models,
used/quota bars, daily reset countdown, mark exhausted) and **Email pool**
(single + bulk add, per-email countdown, renew-now / renew-all-due). Quota
state lives in the browser's localStorage (key `qd_state_v1`, unchanged from
the old `quota-dashboard.html`, which was removed and merged in here). Plain
interactive launches (bare `opencode`, or `start.cmd`
with no args) auto-open the dashboard in the default browser and print a
Freebuff-style launch header (`◆ opencode <model> · <cwd>`); subcommands
(`opencode --version`, `run`, `-DryRun`) never do. In-chat `/quota` prints the
Freebuff-style quota summary (`.opencode/commands/quota.md`).

`freebuff-dashboard.html` — FreeBuff pool view: live proxy pool (renders only
when a freebuff-proxy is up on :8081/:8099), offline-capable session tracker,
5-model pool quotas, official Freebucks rules. See `install.cmd` for the
optional `freebuff` CLI it can install.

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
