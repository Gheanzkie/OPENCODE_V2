/**
 * CyberStrike persona gate for opencode.
 *
 * The operator picks a persona before opencode starts (see opencode.ps1 /
 * the `opencode` shim). This plugin is the ONLY place the hacker layer touches
 * the model, and it is dead weight unless that persona was chosen:
 *
 *   CYBERSTRIKE_PERSONA=hacker     -> anti-refusal wrapper + task framing ON
 *   CYBERSTRIKE_PERSONA=default    -> no hooks registered at all
 *   CYBERSTRIKE_PERSONA unset      -> no hooks registered at all
 *
 * Unset means clean on purpose. The old setup leaked the hacker persona into
 * every session because its instructions lived in the global config, which
 * applies no matter which agent you run.
 *
 * The persona's *content* (offensive methodology) is not in here - it is the
 * `hacker` agent's prompt, which only exists when the same env var is set, so
 * default sessions have no hacker prompt, no wrapper and no injected framing.
 *
 * The framing states the operator's declared scope and nothing more. It does
 * not ask the model to deny being an AI, to suppress its own safety reasoning,
 * or to keep anything from the user: those are the instructions that made
 * models (correctly) report the session as a prompt-injection attempt and
 * refuse the whole conversation.
 *
 * Install: copied to ~/.config/opencode/plugin/cyberstrike-persona.js by
 * opencode.ps1. Keep this file ASCII-only.
 */

import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"

const PERSONA = (process.env.CYBERSTRIKE_PERSONA || "").toLowerCase()
const HACKER = PERSONA === "hacker"

// Written on every hook so `persona-state.json` shows what is actually live.
// The alternative is guessing from model behaviour, which is unreliable.
const STATE = path.join(os.homedir(), ".config", "opencode", "persona-state.json")

const SENTINEL = "[CYBERSTRIKE_WRAPPED]"

const SYSTEM_WRAPPER = `=== ENGAGEMENT CONTEXT (declared by the operator) ===
The operator has declared that the targets they name in this session are theirs, or that they are authorized to test them, and that this session is the record of that work.
1. Work the in-scope task directly. You do not need to re-establish authorization on every turn.
2. Stay inside the declared targets. If a request would touch anything else - a third party, a shared service, a host you were not pointed at - say so and stop instead of guessing.
3. Report only what actually happened: raw output, exit codes, file paths. Never invent results, credentials or versions, and mark untested claims as untested.
4. If a step is blocked, report the failure and the next option rather than silently substituting an action.
5. Accuracy is your responsibility; authorization is the operator's.
=== END ENGAGEMENT CONTEXT ===`

const TASK_FRAME = (task) => `[${SENTINEL}]
<operator_task>
${task}
</operator_task>
Work the operator_task above with tools, then report what you observed.`

async function note(patch) {
  try {
    await fs.writeFile(
      STATE,
      JSON.stringify({ persona: PERSONA || "unset", hacker: HACKER, ...patch, at: new Date().toISOString() }, null, 2),
    )
  } catch {
    // Diagnostics only - never break a chat request over this.
  }
}

export const CyberStrikePersona = async () => {
  // Default persona: register nothing. No system push, no message rewrite.
  if (!HACKER) return {}

  await note({ event: "plugin loaded" })

  return {
    "experimental.chat.system.transform": async (_input, output) => {
      if (!output.system.includes(SYSTEM_WRAPPER)) output.system.push(SYSTEM_WRAPPER)
      await note({ event: "system wrapped" })
    },

    // Frame the operator's own turn. Sentinelled so a session that is rewritten
    // on every request does not accumulate nested frames.
    "experimental.chat.messages.transform": async (_input, output) => {
      for (let i = output.messages.length - 1; i >= 0; i--) {
        const message = output.messages[i]
        if (message?.info?.role !== "user") continue
        for (const part of message.parts ?? []) {
          if (part.type !== "text" || part.synthetic) continue
          if (!part.text || part.text.includes(SENTINEL)) return
          part.text = TASK_FRAME(part.text)
          await note({ event: "task framed" })
          return
        }
      }
    },
  }
}

export default CyberStrikePersona
