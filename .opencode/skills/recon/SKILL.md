---
name: recon
description: Reconnaissance and information gathering techniques. Use when scanning targets, enumerating subdomains, port scanning, OSINT, or fingerprinting. Triggers on "recon", "scan", "enumerate", "subdomain", "port", "nmap", "osint".
category: recon
tags: osint,reconnaissance,enumeration,nmap,subfinder,httpx
---

# Reconnaissance

## Phase 1: Passive Reconnaissance

- DNS records: A, AAAA, MX, NS, TXT, SOA, CNAME
- Certificate transparency: crt.sh, Censys, Shodan
- WHOIS: domain registration, nameservers, contacts
- Wayback Machine: historical pages, deleted content
- Google dorking: site:, filetype:, inurl:, intitle:
- Social media: LinkedIn, Twitter, GitHub profiles
- Pastebin: leaked credentials, source code
- AI/LLM endpoints: /api/chat, /api/completions, /mcp, /.well-known/ai-plugin.json
- MCP discovery: /mcp/health, /mcp/config, tool registry
- Cloud metadata: AWS IMDS, Azure IMDS, GCP metadata
- Container detection: /.dockerenv, /proc/1/cgroup, /var/run/secrets/kubernetes.io

## Phase 2: Active Reconnaissance

- Port scanning: TCP/UDP, service detection
- Subdomain enumeration: brute force, DNS brute, certificate transparency
- Directory enumeration: hidden files, backup files, config files
- Parameter discovery: hidden parameters, API endpoints
- Technology fingerprinting: CMS, frameworks, libraries
- WAF detection: identify and fingerprint web application firewalls
- AI/LLM detection: probe /api/chat, /api/completions, model listing
- MCP enumeration: tool listing, schema inspection, capability probing
- Container detection: check for Docker, K8s, ECS, GKE indicators

## Phase 3: Service Enumeration

- Web: HTTP methods, headers, cookies, redirects
- SSH: version, key exchange, authentication methods
- FTP: anonymous access, version, directory listing
- SMB: shares, users, groups, policies, signing
- RDP: version, NLA, certificates, NLA bypass
- MySQL/PostgreSQL: version, databases, users, UDF
- DNS: zone transfer, recursion, cache poisoning potential

## Phase 4: Attack Surface Analysis

- Entry points: login pages, registration, file upload
- API endpoints: REST, GraphQL, WebSocket, gRPC
- Third-party integrations: OAuth, SAML, webhooks
- Cloud services: S3 buckets, Azure blobs, GCP storage
- Source code: Git repositories, source code leaks
- Credentials: hardcoded passwords, API keys, tokens
- AI/LLM attack surface: model endpoints, tool registrations, context windows
- MCP attack surface: tool poisoning, scope creep, shadow servers
- Container attack surface: Docker socket, K8s service accounts, IAM roles

## Tools Reference

- `nmap` - Port scanning and service detection
- `subfinder` - Subdomain discovery
- `httpx` - HTTP probing
- `katana` - Web crawling
- `nuclei` - Template-based vulnerability scanning
- `gobuster` - Directory brute-forcing
- `ffuf` - Web fuzzing
- `whatweb` - Technology fingerprinting
- `dnsrecon` - DNS enumeration
- `amass` - Attack surface mapping
- `assetfinder` - Asset discovery
- `gau` - Get All URLs
- `waybackurls` - Wayback Machine URLs
- `gospider` - Web spidering
- `hakrawler` - Web crawling

## Output Format

```
[RECON] <discovery type> on <target>
  Finding: <what was found>
  Impact: <security implications>
  Chain: -> <next recon step>
```
