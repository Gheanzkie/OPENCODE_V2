/**
 * CyberStrike Skills Loader for OpenCode CLI
 * 
 * Discovers and loads skills from:
 * - ~/.claude/skills/
 * - ~/.agents/skills/
 * - .cyberstrike/skill/
 * - .cyberstrike/skills/
 * 
 * Skills are Markdown files with YAML frontmatter:
 * ---
 * name: sql-injection
 * description: SQL injection testing
 * category: web
 * ---
 * # SQL Injection Testing
 * ...
 */

import { readFileSync, readdirSync, existsSync, statSync } from "fs"
import { join, basename } from "path"
import { homedir } from "os"

// Persona gate: skills are only injected for the hacker persona. Default sessions
// register no hooks, matching the other CyberStrike plugins.
const HACKER = (process.env.CYBERSTRIKE_PERSONA || "").toLowerCase() === "hacker"

export interface SkillInfo {
  name: string
  description: string
  category: string
  content: string
  path: string
  tags: string[]
}

const SKILL_DIRS = [
  join(homedir(), ".claude", "skills"),
  join(homedir(), ".agents", "skills"),
  join(homedir(), ".config", "opencode", "skills"),
]

function parseFrontmatter(content: string): { meta: Record<string, string>; body: string } {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
  if (!match) return { meta: {}, body: content }
  
  const meta: Record<string, string> = {}
  for (const line of match[1].split("\n")) {
    const [key, ...rest] = line.split(":")
    if (key && rest.length) {
      meta[key.trim()] = rest.join(":").trim()
    }
  }
  return { meta, body: match[2] }
}

function discoverSkills(dirs: string[]): SkillInfo[] {
  const skills: SkillInfo[] = []
  
  for (const dir of dirs) {
    if (!existsSync(dir)) continue
    
    try {
      const entries = readdirSync(dir)
      for (const entry of entries) {
        const entryPath = join(dir, entry)
        const stat = statSync(entryPath)
        
        if (stat.isDirectory()) {
          // Look for SKILL.md inside directory
          const skillFile = join(entryPath, "SKILL.md")
          if (existsSync(skillFile)) {
            const content = readFileSync(skillFile, "utf-8")
            const { meta, body } = parseFrontmatter(content)
            skills.push({
              name: meta.name || entry,
              description: meta.description || "",
              category: meta.category || "general",
              content: body,
              path: skillFile,
              tags: (meta.tags || "").split(",").map(t => t.trim()).filter(Boolean),
            })
          }
        } else if (entry.endsWith(".md")) {
          // Direct .md file
          const content = readFileSync(entryPath, "utf-8")
          const { meta, body } = parseFrontmatter(content)
          skills.push({
            name: meta.name || basename(entry, ".md"),
            description: meta.description || "",
            category: meta.category || "general",
            content: body,
            path: entryPath,
            tags: (meta.tags || "").split(",").map(t => t.trim()).filter(Boolean),
          })
        }
      }
    } catch {}
  }
  
  return skills
}

let cachedSkills: SkillInfo[] | null = null

export function getSkills(): SkillInfo[] {
  if (!cachedSkills) {
    cachedSkills = discoverSkills(SKILL_DIRS)
  }
  return cachedSkills
}

export function reloadSkills(): SkillInfo[] {
  cachedSkills = null
  return getSkills()
}

// OpenCode plugin hook - adds skill context to system prompt
export const CyberStrikeSkillsPlugin = async () => {
  if (!HACKER) return {}

  const skills = getSkills()
  if (skills.length === 0) return {}
  
  const skillContext = skills.map(s => 
    `[Skill: ${s.name}] ${s.description}\n${s.content.slice(0, 500)}`
  ).join("\n\n")
  
  return {
    // NOTE: opencode's experimental.chat.system.transform fires but its output is discarded
    // (verified on 1.18.32: markers injected there never reach the model). Inject through
    // messages.transform instead, which is delivered.
    "experimental.chat.messages.transform": async (_input: any, output: any) => {
      if (!output?.messages?.length) return
      output.messages.push({
        info: { role: "user", parts: [] },
        parts: [{ type: "text", text: `## Available CyberStrike Skills\n${skillContext}` }],
      })
    },
  }
}
