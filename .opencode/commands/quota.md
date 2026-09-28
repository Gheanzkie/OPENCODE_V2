---
description: Daily model quota summary — Freebuff-style (counters reset at local midnight)
---

## ◆ quota — daily model quotas

**Freebuff pool** (freebuff-proxy @ `localhost:8081/v1`, source: `cyberstrike/cyberstrike.example.json`)

| Model | Daily cap | Context / Output |
|---|---|---|
| DeepSeek V4 Flash `deepseek/deepseek-v4-flash` | unmetered | 1M / 131K |
| MiMo 2.5 `mimo/mimo-v2.5` | unlimited (all tiers) | 1M / 131K |
| GPT-5.6 Luna `openai/gpt-5.6-luna` | **4/day** | 1M / 131K |
| GLM 5.3 Flash `z-ai/glm-5.3-flash` | **2/day** | 262K / 32K |
| Solar Pro 4 `upstage/solar-pro4` | limited/day (cap not in config — set it in the dashboard) | 1M / 131K |

**Freebuff Freebucks rules (official):** 100 Freebucks every day, refill **00:00 Pacific**, no carry-over. Hours = 100 ÷ model rate — Space Bunny Alpha 0 · GLM 5.3 Flash 20h · Solar Mini 4 20h · MiMo 2.6 Flash 10h · Solar Pro 4 10h · DeepSeek V4.1 Flash 6h · Muse Spark 1.2 6h · GPT-6 Luna 5h · MiMo 2.6 Pro 3h. Hour totals are NOT additive — spend the pool on any mix. Limited mode: 6 one-hour sessions/day (up to 7 via the Earn page). Gemini 3.8 Flash needs a paid plan.

**Track & renew:**
- `opencode-accounts.html` (dashboard @ `127.0.0.1:8787`) — Model quotas + Email pool tabs: 68-model counters, renew pool, daily reset countdown (merged from the old quota-dashboard.html).
- `freebuff-dashboard.html` — proxy pool view + session tracker (offline-capable).

**Session functions (opencode):** `opencode -c` continue last session · `opencode -s <id>` resume a specific one · `opencode session` manage sessions · `opencode stats` token usage.
