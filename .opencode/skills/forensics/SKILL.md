---
name: forensics
description: Digital forensics including memory analysis, disk forensics, network capture analysis, and malware triage. Use when analyzing artifacts, CTF forensics challenges, or incident response. Triggers on "forensics", "memory", "disk", "pcap", "artifact", "malware", "triage", "incident response".
category: forensics
tags: forensics,memory,disk,pcap,artifact,malware,triage,incident-response,volatility,autopsy
---

# Forensics

## Memory Analysis

### Acquisition
- Linux: `lime` (Linux Memory Extractor)
- Windows: `winpmem`, `DumpIt`
- Mac: `osxpmem`

### Analysis
```bash
# Volatility 3
volatility3 -f memory.dmp windows.pslist
volatility3 -f memory.dmp windows.cmdline
volatility3 -f memory.dmp windows.hashdump
volatility3 -f memory.dmp windows.filescan
volatility3 -f memory.dmp windows.malfind
volatility3 -f memory.dmp windows.netscan
```

### Common Artifacts
- Passwords: `windows.hashdump`, `windows.lsadump`
- Network connections: `windows.netscan`
- Processes: `windows.pslist`, `windows.pstree`
- Files: `windows.filescan`, `windows.dumpfiles`
- Malware: `windows.malfind`, `windows.svcscan`

## Disk Forensics

### Acquisition
- `dd if=/dev/sda of=disk.img`
- `ftkimager` - forensic imaging
- `guymager` - GUI imaging

### Analysis
```bash
# Autopsy
autopsy

# Sleuth Kit
fls -r /mnt/disk
icat /mnt/disk 12345
mmls /mnt/disk
```

### Common Artifacts
- Deleted files: `fls`, `icat`
- File carving: `foremost`, `scalpel`
- Timeline: `mactime`
- Registry: `regripper`

## Network Forensics

### Acquisition
- `tcpdump -i eth0 -w capture.pcap`
- `wireshark` - GUI capture
- `tshark` - CLI capture

### Analysis
```bash
# Extract files
tshark -r capture.pcap --export-objects http,./objects

# Follow stream
tshark -r capture.pcap -q -z follow,tcp,ascii,0

# Statistics
tshark -r capture.pcap -q -z io,phs
tshark -r capture.pcap -q -z conv,tcp
```

### Common Artifacts
- HTTP requests/responses
- DNS queries
- TLS certificates
- File transfers
- Credentials in plaintext

## Malware Triage

### Static Analysis
- `file malware.exe`
- `strings malware.exe | grep -i "http\|url\|api"`
- `pefile` - Python PE analysis
- `yara -r rules/ malware.exe`

### Dynamic Analysis
- Cuckoo Sandbox
- Any.Run
- Hybrid Analysis

### Common Indicators
- C2 domains/IPs
- Persistence mechanisms
- Anti-analysis techniques
- Packed/encrypted payloads

## Tools

| Tool | Purpose |
|------|---------|
| `volatility3` | Memory forensics |
| `autopsy` | Disk forensics |
| `sleuthkit` | Disk analysis |
| `wireshark` | Network analysis |
| `tshark` | CLI network analysis |
| `foremost` | File carving |
| `scalpel` | File carving |
| `yara` | Malware identification |
| `pefile` | PE analysis |

## Output Format

```
[FORENSICS] <artifact type> from <source>
  Finding: <what was found>
  Evidence: <file/hash/timestamp>
  Impact: <security implications>
  Chain: -> <next analysis step>
```
