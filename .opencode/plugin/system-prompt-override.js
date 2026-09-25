// @bun
// src/config.ts
import { existsSync, statSync, readFileSync } from "fs";
import { dirname, isAbsolute, join, resolve } from "path";
import { homedir } from "os";

// src/glob.ts
var REGEX_META = /[.+^${}()|[\]\\]/g;
function globToRegex(pattern) {
  const escaped = pattern.replace(REGEX_META, "\\$&");
  const regex = "^" + escaped.replace(/\*/g, ".*").replace(/\?/g, ".") + "$";
  return new RegExp(regex);
}

// src/match.ts
function compileMatch(spec) {
  if (!spec)
    return {};
  const out = {};
  if (spec.providerID !== undefined)
    out.providerID = spec.providerID;
  if (spec.modelID !== undefined)
    out.modelID = spec.modelID;
  if (spec.providerIDGlob !== undefined)
    out.providerIDRegex = globToRegex(spec.providerIDGlob);
  if (spec.modelIDGlob !== undefined)
    out.modelIDRegex = globToRegex(spec.modelIDGlob);
  return out;
}
function matches(rule, model) {
  const m = rule.match;
  if (m.providerID !== undefined && m.providerID !== model.providerID)
    return false;
  if (m.providerIDRegex !== undefined && !m.providerIDRegex.test(model.providerID))
    return false;
  if (m.modelID !== undefined && m.modelID !== model.id)
    return false;
  if (m.modelIDRegex !== undefined && !m.modelIDRegex.test(model.id))
    return false;
  return true;
}

// src/config.ts
var cached = null;
function loadConfigIfChanged(projectDir) {
  const found = configCandidates(projectDir).find((p) => existsSync(p));
  if (!found) {
    cached = null;
    return null;
  }
  const st = statSync(found);
  if (cached && cached.path === found && cached.mtimeMs === st.mtimeMs)
    return cached;
  const dir = dirname(found);
  const logPath = join(dir, "system-prompt-override.log");
  const seen = new Set;
  const errors = [];
  let raw;
  try {
    raw = readFileSync(found, "utf8");
  } catch (err) {
    const failed = {
      path: found,
      dir,
      logPath,
      mtimeMs: st.mtimeMs,
      cfg: {},
      parsedRules: [],
      parsedDefault: null,
      errors: [{ code: "config-unreadable", message: String(err) }],
      seen
    };
    cached = failed;
    return failed;
  }
  let cfg;
  try {
    cfg = JSON.parse(raw);
  } catch (err) {
    const failed = {
      path: found,
      dir,
      logPath,
      mtimeMs: st.mtimeMs,
      cfg: {},
      parsedRules: [],
      parsedDefault: null,
      errors: [{ code: "config-malformed", message: String(err) }],
      seen
    };
    cached = failed;
    return failed;
  }
  const parsedRules = [];
  for (let i = 0;i < (cfg.rules ?? []).length; i++) {
    const r = cfg.rules[i];
    try {
      parsedRules.push(parseRule(r, i));
    } catch (err) {
      errors.push({ code: "rule-invalid", message: String(err), ruleIndex: i });
    }
  }
  let parsedDefault = null;
  if (cfg.default) {
    try {
      parsedDefault = parseRule({ ...cfg.default }, -1);
    } catch (err) {
      errors.push({ code: "default-invalid", message: String(err) });
    }
  }
  const loaded = {
    path: found,
    dir,
    logPath,
    mtimeMs: st.mtimeMs,
    cfg,
    parsedRules,
    parsedDefault,
    errors,
    seen
  };
  cached = loaded;
  return loaded;
}
function parseRule(rule, index) {
  if (rule.mode !== "append" && rule.mode !== "replace") {
    throw new Error(`unknown mode: ${String(rule.mode)}`);
  }
  if (rule.match !== undefined && (typeof rule.match !== "object" || rule.match === null || Array.isArray(rule.match))) {
    throw new Error(`match must be an object`);
  }
  if (rule.position !== undefined && rule.position !== "start" && rule.position !== "end") {
    throw new Error(`unknown position: ${String(rule.position)}`);
  }
  const hasPrompt = typeof rule.prompt === "string";
  const hasFile = typeof rule.promptFile === "string";
  if (hasPrompt === hasFile) {
    throw new Error("rule must have exactly one of prompt or promptFile");
  }
  const parsed = {
    raw: rule,
    index,
    match: compileMatch(rule.match),
    mode: rule.mode,
    position: rule.position ?? "end"
  };
  if (rule.prompt !== undefined)
    parsed.prompt = rule.prompt;
  if (rule.promptFile !== undefined)
    parsed.promptFile = rule.promptFile;
  return parsed;
}
function resolvePromptText(rule, configDir) {
  if (rule.prompt !== undefined)
    return rule.prompt;
  if (rule.promptFile === undefined) {
    throw new Error("rule has no prompt source");
  }
  const filePath = isAbsolute(rule.promptFile) ? rule.promptFile : resolve(configDir, rule.promptFile);
  return readFileSync(filePath, "utf8");
}
function configCandidates(projectDir) {
  const env = process.env.OPENCODE_SYSTEM_PROMPT_CONFIG;
  return [
    env,
    join(projectDir, ".opencode", "system-prompts.json"),
    join(homedir(), ".config", "opencode", "system-prompts.json"),
    join(homedir(), ".opencode", "system-prompts.json")
  ].filter((p) => typeof p === "string" && p.length > 0);
}

// src/apply.ts
function applyRule(rule, text, output) {
  if (rule.mode === "replace") {
    output.system.splice(0, output.system.length, text);
    return;
  }
  if (rule.position === "start") {
    output.system.unshift(text);
    return;
  }
  output.system.push(text);
}

// src/log.ts
import { appendFileSync, mkdirSync } from "fs";
import { dirname as dirname2 } from "path";
function writeLog(logPath, event) {
  try {
    mkdirSync(dirname2(logPath), { recursive: true });
    appendFileSync(logPath, JSON.stringify(event) + `
`, "utf8");
  } catch {}
}

// src/errors.ts
function formatStderrLine(code, message, path, ruleIndex) {
  const safeMessage = message.replace(/[\r\n\t]+/g, " ").replace(/\\/g, "\\\\").replace(/"/g, "\\\"");
  return `[opencode-sysprompt-override] error code=${code} ` + `ruleIndex=${ruleIndex ?? "-"} ` + `path=${path ?? "-"} ` + `msg="${safeMessage}"`;
}
function reportError(ctx, code, message, opts = {}) {
  const path = opts.path ?? ctx.configPath;
  const dedupeKey = `${code}|${path ?? ""}|${opts.ruleIndex ?? ""}`;
  const firstTime = !ctx.seen.has(dedupeKey);
  if (firstTime) {
    ctx.seen.add(dedupeKey);
    const event = {
      timestamp: new Date().toISOString(),
      ...path !== undefined ? { path } : {},
      ...opts.ruleIndex !== undefined ? { ruleIndex: opts.ruleIndex } : {},
      code,
      message
    };
    // Formatted line goes into the log file only; console output would be painted
    // over the TUI.
    writeLog(ctx.logPath, { ...event, line: formatStderrLine(code, message, path, opts.ruleIndex) });
  }
  if (!ctx.lenient) {
    const block = `<SYSTEM POLICY ERROR: ${code}: ${message}>
` + `The opencode-sysprompt-override plugin failed to apply this rule. ` + `See ${ctx.logPath} for details.`;
    ctx.pendingBlocks.push(block);
  }
}
function flushErrors(ctx) {
  if (ctx.pendingBlocks.length === 0)
    return;
  ctx.output.system.unshift(...ctx.pendingBlocks);
  ctx.pendingBlocks.length = 0;
}

// src/index.ts
var plugin = async (ctx) => {
  return {
    "experimental.chat.system.transform": async (input, output) => {
      try {
        const model = {
          providerID: input.model.providerID,
          id: input.model.id
        };
        transform(ctx.directory, model, output);
      } catch (err) {
        // Never console.error here. opencode renders plugin console output as an
        // overlay on top of the TUI, and an Error passed to console.error is
        // formatted with its code frame and full stack - it buries the chat.
        // Log to the plugin's own file instead (writeLog swallows its own errors).
        writeLog(join(ctx?.directory ?? ".", ".opencode", "system-prompt-override.log"), {
          timestamp: new Date().toISOString(),
          code: "handler-crashed",
          message: String(err?.message ?? err),
          stack: typeof err?.stack === "string" ? err.stack : undefined
        });
      }
    }
  };
};
function transform(projectDir, model, output) {
  const loaded = loadConfigIfChanged(projectDir);
  if (!loaded)
    return;
  const errCtx = {
    logPath: loaded.logPath,
    lenient: loaded.cfg.lenient === true,
    configPath: loaded.path,
    output,
    seen: loaded.seen,
    pendingBlocks: []
  };
  for (const e of loaded.errors) {
    reportError(errCtx, e.code, e.message, e.ruleIndex !== undefined ? { ruleIndex: e.ruleIndex } : {});
  }
  const matched = loaded.parsedRules.filter((r) => matches(r, model));
  for (const rule of matched) {
    let text;
    try {
      text = resolvePromptText(rule, loaded.dir);
    } catch (err) {
      reportError(errCtx, "promptfile-error", String(err), { ruleIndex: rule.index });
      continue;
    }
    applyRule(rule, text, output);
  }
  if (matched.length === 0 && loaded.parsedDefault) {
    let text;
    try {
      text = resolvePromptText(loaded.parsedDefault, loaded.dir);
    } catch (err) {
      reportError(errCtx, "default-promptfile-error", String(err));
      flushErrors(errCtx);
      return;
    }
    applyRule(loaded.parsedDefault, text, output);
  }
  flushErrors(errCtx);
}
var src_default = plugin;
export {
  src_default as default
};
