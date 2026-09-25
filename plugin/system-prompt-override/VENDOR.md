# system-prompt-override (vendored)

`.opencode/plugin/system-prompt-override.js` is **not** hand-written here. It is a
copy of the published artifact for the npm package
[`opencode-sysprompt-override`](https://www.npmjs.com/package/opencode-sysprompt-override),
plus one tracked local patch. Upstream documents the drop-in install as:

    # 4. Drop the plugin in (one file, no install).
    curl -fsSL https://cdn.jsdelivr.net/npm/opencode-sysprompt-override/dist/index.js \
      -o .opencode/plugin/system-prompt-override.js

## Pin

| field        | value                                                              |
|--------------|--------------------------------------------------------------------|
| package      | `opencode-sysprompt-override`                                       |
| version      | `0.2.5`                                                             |
| artifact     | `dist/index.js`                                                     |
| local patch  | `patches/0001-route-plugin-errors-to-logfile.patch`                 |
| sha256       | `58ca7e91c3b5882ccd405aab11b6a350210dc44f94179f235d3b974dad3e104f`  |
| local        | `.opencode/plugin/system-prompt-override.js`                        |

The sha256 is of **upstream 0.2.5 with the patch applied** — that is the deployed
file. `verify.sh` enforces it.

## Invariants (enforced by verify.sh)

1. Module-scope `var cached = null;` is present.
2. The file contains **no `console.*` calls**.

## Why invariant 1: reformatting lost the declaration

A previous local version of this file was a **beautified rewrite** of the upstream
bundle. Reformatting dropped

```js
var cached = null;
```

which made `loadConfigIfChanged()` throw `ReferenceError: cached is not defined` on
every `experimental.chat.system.transform` call. Upstream `0.2.5` contains the
declaration; the reformat is what removed it.

So: **do not hand-edit, prettify, de-bundle or "clean up" this file.** Changes go in
a patch (see below), not in the vendored copy.

## Why invariant 2: console output is painted over the TUI

Upstream logs failures with `console.error`, and opencode renders plugin console
output as an overlay on top of the TUI. When an `Error` is passed to
`console.error` it is formatted with its code frame and full stack, which buries
the chat — that is the overlay this repo hit.

`patches/0001-route-plugin-errors-to-logfile.patch` replaces both call sites with
`writeLog()`:

| site | before | after |
|---|---|---|
| `plugin()` catch handler | `console.error("[opencode-sysprompt-override] handler crashed:", err)` | append `{ code: "handler-crashed", message, stack }` to `.opencode/system-prompt-override.log` |
| `reportError()` | `console.error(formatStderrLine(...))` | same line recorded as `line` in the existing log event |

`writeLog()` already swallows its own I/O errors, so a failure to log can never
fall back to console and repaint the TUI.

Note: with `"lenient": false` in `.opencode/system-prompts.json`, a config error
still injects a `<SYSTEM POLICY ERROR: ...>` block into the *system prompt*. That is
upstream's intended fail-loud behaviour and is visible only to the model, never to
the TUI.

## Verify

    bash plugin/system-prompt-override/verify.sh

## Re-vendor (upgrade)

    curl -fsSL https://cdn.jsdelivr.net/npm/opencode-sysprompt-override@<version>/dist/index.js \
      -o .opencode/plugin/system-prompt-override.js
    patch -p0 .opencode/plugin/system-prompt-override.js \
      < plugin/system-prompt-override/patches/0001-route-plugin-errors-to-logfile.patch
    sha256sum .opencode/plugin/system-prompt-override.js   # update EXPECTED_PIN in verify.sh
    bash plugin/system-prompt-override/verify.sh

If the patch does not apply cleanly, upstream changed those call sites — inspect
them before forcing it through, and keep both invariants intact.
