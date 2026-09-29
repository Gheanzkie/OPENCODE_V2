# FreeBuff Multi-Account Proxy

Multi-account key pool with rotation for OpenCode CLI.

## Quick Start

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Add your keys to `.env`:
   ```
   KEY_1=sk-your-first-key
   KEY_2=sk-your-second-key
   ```

3. Start the proxy:
   ```bash
   node proxy/server.js
   ```

4. Open dashboard: http://localhost:8099

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/admin/api/tokens` | GET | List all accounts |
| `/admin/api/tokens` | POST | Add account `{email, key}` |
| `/admin/api/tokens/:id` | DELETE | Remove account |
| `/v1/models` | GET | OpenAI-compatible models list |
| `/v1/chat/completions` | POST | Proxy chat requests with key rotation |

## Config

- `PROXY_PORT` env var to change port (default: 8099)
- Keys loaded from `.env` at startup
- `.env` is gitignored — never commit real keys

## Integration with opencode.json

```json
{
  "provider": {
    "freebuff-proxy": {
      "api": "http://localhost:8099/v1",
      "name": "Freebuff Proxy"
    }
  }
}
```
