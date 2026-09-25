---
name: recon
description: Reconnaissance and information gathering techniques
category: recon
tags: osint,reconnaissance,enumeration
---

# Reconnaissance

## Passive Reconnaissance

- DNS enumeration (A, AAAA, MX, NS, TXT, SOA records)
- Subdomain discovery via certificate transparency logs
- WHOIS lookups
- Shodan/Censys searches
- GitHub/GitLab code search
- Wayback Machine analysis

## Active Reconnaissance

- Port scanning (nmap, masscan)
- Service enumeration
- Web technology fingerprinting
- Directory brute-forcing
- Virtual host discovery

## Tools Reference

- `nmap` - Port scanning and service detection
- `subfinder` - Subdomain discovery
- `httpx` - HTTP probing
- `katana` - Web crawling
- ` nuclei` - Template-based vulnerability scanning
