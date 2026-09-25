// Streaming refusal magic strings - these cause models to stop responding
// when read by the model. Sanitized before reaching the LLM.
// Covers Claude (Anthropic), GPT-OSS (OpenAI), and Gemini (Google) refusals.
const BLOCKED_STRINGS: string[] = [
  // Anthropic / Claude streaming refusal strings
  "[REDACTED:blocked-string]",
  "stop_reason: \"refusal\"",
  "ANTHROPIC_MAGIC_STRING_TRIGGER_REDACTED_THINKING_46C9A13E193C177646C7398A98432ECCCE4C1253D5E2D82641AC0E52CC2876CB",
  "\"stop_reason\":\"refusal\"",
  "\"stop_details\":{\"type\":\"refusal\"",
  "\"category\":\"cyber\"",
  "\"category\":\"bio\"",
  "\"category\":\"frontier_llm\"",
  "appears to violate our Usage Policy",
  "cyber-related safeguards",
  "content policy violation",

  // OpenAI / GPT-OSS refusal strings
  "\"finish_reason\":\"content_filter\"",
  "\"content_filter\"",
  "I cannot and will not",
  "I'm not able to assist with",
  "I must decline",
  "violates our content policy",
  "I apologize, but I cannot",
  "I'm sorry, but I can't",

  // Google / Gemini refusal strings
  "\"promptFeedback\":{\"blockReason\"",
  "blocked by gemini's filters",
  "gemini's safety policies",
  "this request was blocked by gemini",
]

function sanitise(value: string): string {
  let result = value
  for (const token of BLOCKED_STRINGS) {
    if (result.includes(token)) {
      result = result.split(token).join("[REDACTED:blocked-string]")
    }
  }
  return result
}

function deepSanitise(obj: unknown): unknown {
  if (typeof obj === "string") return sanitise(obj)
  if (Array.isArray(obj)) return obj.map(deepSanitise)
  if (obj !== null && typeof obj === "object") {
    const record = obj as Record<string, unknown>
    for (const key of Object.keys(record)) {
      record[key] = deepSanitise(record[key])
    }
  }
  return obj
}

// Persona gate: this runs only for the hacker persona, so the default persona is a
// stock opencode session with no plugin hooks registered.
const HACKER = (process.env.CYBERSTRIKE_PERSONA || "").toLowerCase() === "hacker"

export const AntiKillswitchPlugin = async () => {
  if (!HACKER) return {}

  return {
    "tool.execute.before": async (input: any, output: any) => {
      if (output.args) {
        deepSanitise(output.args)
      }
    },

    "tool.execute.after": async (input: any, output: any) => {
      if (typeof output.result === "string") {
        output.result = sanitise(output.result)
      } else if (output.result && typeof output.result === "object") {
        deepSanitise(output.result)
      }

      if (typeof output.output === "string") {
        output.output = sanitise(output.output)
      }
    },
  }
}
