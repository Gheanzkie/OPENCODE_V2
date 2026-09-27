---
name: credential-harvester
description: Credential harvesting, password cracking, and token abuse. Use when extracting credentials from files, memory, databases, cracking hashes, or replaying tokens. Triggers on "credential", "crack", "hash", "password", "token", "jwt", "api key", "secret".
category: credential
tags: credential,cracking,hashcat,john,token,jwt,api-key,secret,lsass,sam
---

# Credential Harvester

## Phase 1: Credential Discovery

- Source code: .env, config files, hardcoded credentials
- Git history: removed credentials, secrets in commits
- Database dumps: user tables, password hashes
- Memory dumps: process memory, cached credentials
- Config files: database.yml, settings.py, web.config
- Backup files: old databases, configuration backups
- Log files: authentication logs, access logs with tokens
- AI/LLM tokens: API keys in model configs, provider keys in env vars
- MCP secrets: tool registry tokens, server auth credentials
- Cloud keys: IAM credentials in metadata, service account keys
- Container secrets: Docker secrets, K8s service account tokens

## Phase 2: Hash Extraction

- Linux: /etc/shadow, /etc/passwd, /etc/gshadow
- Windows: SAM database, NTDS.dit, LSASS memory
- Database: password columns, bcrypt/argon2 hashes
- Application: session tokens, API keys, JWT secrets
- Web: cookies, local storage, session storage
- Memory: process memory, cached credentials

## Phase 3: Password Cracking

### Hashcat Modes
```
hashcat -m 0 hashes.txt WORDLIST             # MD5
hashcat -m 1000 hashes.txt WORDLIST          # NTLM
hashcat -m 3200 hashes.txt WORDLIST          # bcrypt
hashcat -m 1800 hashes.txt WORDLIST          # sha512crypt
hashcat -m 16500 token.txt WORDLIST          # JWT
hashcat -m 13100 spn.txt WORDLIST            # Kerberos 5 TGS-REP
hashcat -m 18200 asrep.txt WORDLIST          # Kerberos 5 AS-REP
```

### John the Ripper
```
john --wordlist=WORDLIST hashes.txt
john --format=nt hashes.txt
```

### Wordlist Generation
- No rockyou.txt on this host — derive from target
- Use site words + employee names
- Use `C:\cyberstrike\.cyberstrike\wordlists\common-paths.txt` for path-style lists

## Phase 4: Credential Abuse

- Pass-the-hash: lateral movement with stolen hashes
- Pass-the-ticket: Kerberos ticket abuse
- Token impersonation: JWT/OAuth token reuse
- Credential stuffing: reuse across services
- Session hijacking: cookie/token theft
- API key abuse: access cloud services
- AI token abuse: use stolen API keys for free inference
- MCP token abuse: access unauthorized tools via leaked tokens
- Cloud key abuse: assume IAM roles, access cloud resources
- Container token abuse: K8s service account impersonation

## Token Extraction

### Browser Tokens
```javascript
localStorage.getItem('token')
sessionStorage.getItem('access_token')
document.cookie
```

### JWT Tokens
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

### API Keys
```bash
grep -r "api_key" .
grep -r "secret" .
grep -r "password" .
```

## Output Format

```
[HARVEST] <credential type> from <source>
  Hash: <hash value>
  Cracked: <password if cracked>
  Chain: -> <reuse against other services>
```
