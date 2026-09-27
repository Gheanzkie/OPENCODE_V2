---
name: redteam-apt
description: APT-level red team operations, post-exploitation, lateral movement, credential harvesting, Active Directory attacks, C2 framework tradecraft, Living off the Land binaries, defense evasion, persistence, cloud APT, data exfiltration, OPSEC. Use when running red team engagements, APT simulations, AD attacks, or post-exploitation. Triggers on "red team", "APT", "post-exploitation", "lateral movement", "AD attacks", "C2", "LotL", "BloodHound", "Kerberoast", "DCSync", "ADCS", "defense evasion".
category: redteam
tags: redteam,apt,post-exploitation,lateral-movement,ad,kerberos,c2,lotl,bloodhound,dcsync,adcs,defense-evasion
---

# Red Team / APT Simulation

## Phase 0: Smart Intake

| Signal available | Prioritize |
|---|---|
| Internal IPs + SSRF vector | C2 setup → lateral movement |
| AD/LDAP/Kerberos in tech stack | BloodHound → Kerberoast → DCSync |
| AWS keys in secrets relay | Assumed-role lateral movement → S3/RDS |
| Azure AD hint | Device Code phishing → Pass-the-PRT → ADFS |
| Confirmed auth bypass | Assumed breach — skip initial access |
| Windows hosts reachable | Credential harvesting → Pass-the-Hash |
| Linux pivot available | SUID/sudo → cron hijack → kernel exploits |

## Phase 1: Build Execution Manifest

Map every discovered asset to a technique ID. Track status: pending → active → done.

## Phase 2: Technique Loader

### Initial Access (rt01)
- HTML smuggling, macro-less Office, LNK/ISO, drive-by, fake CAPTCHA

### C2 Framework (rt02)
- Cobalt Strike malleable profiles, Havoc, Sliver, domain fronting

### Credential Harvesting (rt03)
- LSASS dump, DCSync, SAM, DPAPI, Kerberos ticket extraction

### AD Attacks (rt04)
- BloodHound, Kerberoasting, AS-REP, PTH, PTT, Golden/Silver tickets
- ADCS ESC1-ESC8, certipy workflow, certificate-based persistence
- Constrained/unconstrained delegation, RBCD, S4U2Self/S4U2Proxy
- GPO abuse (T1484.001), ACL abuse chains (T1222), DCShadow

### Lateral Movement (rt05)
- WMI exec, PSExec, DCOM, WinRM, SMB relay, MSSQL xp_cmdshell
- LOLBins, LOLDrivers, LSASS without Mimikatz, certutil/mshta/regsvr32

### Cloud APT (rt06)
- Azure Device Code phishing, Pass-the-PRT, ADFS Golden SAML
- AWS/GCP lateral movement, assumed-role chaining

### Persistence (rt07)
- Registry Run keys, WMI subscriptions, scheduled tasks, DLL hijack

### Defense Evasion (rt08)
- AMSI/ETW bypass, process hollowing, reflective DLL, indirect syscalls

### Data Exfiltration (rt09)
- DNS exfil, HTTPS beaconing, cloud storage staging, encrypted channels

### OPSEC (rt10)
- PPID spoofing, timestomping, log clearing, network noise reduction

## Phase 3: Core Workflow

1. Load only the technique files your manifest requires
2. Execute each technique, mark done
3. For every confirmed technique, write to findings
4. Run completion gate

## Tool Matrix

| Technique | Windows Tool | Remote Tool | MITRE ID |
|-----------|-------------|-------------|----------|
| BloodHound collection | SharpHound.exe | bloodhound-python | T1482 |
| Kerberoasting | Rubeus kerberoast | GetUserSPNs.py | T1558.003 |
| AS-REP Roasting | Rubeus asreproast | GetNPUsers.py | T1558.004 |
| DCSync | mimikatz dcsync | secretsdump.py | T1003.006 |
| Pass-the-Hash | mimikatz sekurlsa::pth | crackmapexec -H | T1550.002 |
| Golden Ticket | mimikatz kerberos::golden | ticketer.py | T1558.001 |
| ADCS ESC1 | Certify.exe | certipy req | T1649 |
| LSASS dump | comsvcs MiniDump | procdump | T1003.001 |
| Lateral WMI | Invoke-WmiMethod | wmiexec.py | T1047 |
| Lateral WinRM | Enter-PSSession | evil-winrm | T1021.006 |
| AMSI bypass | memory patch PS | N/A | T1562.001 |
| Process hollow | C# CreateProcess | N/A | T1055.012 |
| DNS exfil | dnscat2 client | dnscat2 server | T1071.004 |
| Device Code phish | N/A | device_code_phish.py | T1528 |
| ADFS Golden SAML | AADInternals | shimit | T1606.002 |

## Output Format

```
[LATERAL] <from> → <to>
  Method: <technique>
  Command: <exact command>
  MITRE: <technique ID>
```
