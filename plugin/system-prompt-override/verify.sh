#!/usr/bin/env bash
#
# Guards the vendored system-prompt-override plugin.
#
# The deployed file is the pinned upstream release PLUS one tracked local patch
# (patches/0001-route-plugin-errors-to-logfile.patch). This script fails if the
# file drifts from that, or if either invariant below is broken.
#
# History: a previous local reformat of this file silently dropped the
# module-scope `var cached = null;` declaration, so the plugin threw
# `ReferenceError: cached is not defined` on every request and opencode painted
# the stack trace over the TUI. The patch exists for the same reason: the
# upstream plugin logs failures with console.error, which opencode renders as an
# overlay on the TUI.
#
# Run after any re-vendor, rebuild, or formatting pass:
#
#   bash plugin/system-prompt-override/verify.sh
#
set -euo pipefail

PIN_VERSION="0.2.5"
LOCAL_PATCH="patches/0001-route-plugin-errors-to-logfile.patch"
# sha256 of upstream dist/index.js with LOCAL_PATCH applied (LF)
EXPECTED_PIN="58ca7e91c3b5882ccd405aab11b6a350210dc44f94179f235d3b974dad3e104f"
DEPLOYED=".opencode/plugin/system-prompt-override.js"

cd "$(dirname "$0")/../.."

if [ ! -f "$DEPLOYED" ]; then
  echo "FAIL: $DEPLOYED is missing" >&2
  exit 1
fi

fail=0

# Strip CR so a core.autocrlf checkout of the same content is not reported as drift.
actual=$(tr -d '\r' < "$DEPLOYED" | sha256sum | cut -d' ' -f1)

if [ "$actual" != "$EXPECTED_PIN" ]; then
  echo "FAIL: $DEPLOYED has drifted from opencode-sysprompt-override@$PIN_VERSION + $LOCAL_PATCH" >&2
  echo "  expected  $EXPECTED_PIN" >&2
  echo "  actual    $actual" >&2
  echo "" >&2
  echo "This file must not be hand-edited or reformatted. Re-vendor it instead:" >&2
  echo "  curl -fsSL https://cdn.jsdelivr.net/npm/opencode-sysprompt-override@$PIN_VERSION/dist/index.js -o $DEPLOYED" >&2
  echo "  patch -p0 $DEPLOYED < plugin/system-prompt-override/$LOCAL_PATCH" >&2
  echo "If you upgraded on purpose, update EXPECTED_PIN in this script." >&2
  fail=1
fi

# Invariant 1: the declaration whose loss caused the TUI crash dump. Checked
# separately from the hash so the failure names the real cause.
if ! grep -q '^var cached = null;' "$DEPLOYED"; then
  echo "FAIL: module-scope 'var cached = null;' is missing from $DEPLOYED" >&2
  echo "      loadConfigIfChanged() will throw 'ReferenceError: cached is not defined'" >&2
  fail=1
fi

# Invariant 2: no console output. Anything the plugin writes to console is
# rendered by opencode as an overlay on top of the TUI, so plugin failures must
# go to system-prompt-override.log instead.
if grep -nE 'console\.[a-z]+[[:space:]]*\(' "$DEPLOYED"; then
  echo "FAIL: $DEPLOYED calls console.* - opencode paints plugin console output over the TUI" >&2
  echo "      Route it to writeLog() instead (see $LOCAL_PATCH)" >&2
  fail=1
fi

if [ "$fail" -ne 0 ]; then
  exit 1
fi

echo "OK: $DEPLOYED matches opencode-sysprompt-override@$PIN_VERSION + $LOCAL_PATCH (sha256 $EXPECTED_PIN)"
