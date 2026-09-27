---
name: infrastructure
description: Infrastructure security including IoT, routers, SCADA, and network devices. Use when testing embedded systems, industrial control systems, or network infrastructure. Triggers on "iot", "router", "scada", "ics", "embedded", "network device", "firewall", "switch".
category: infrastructure
tags: iot,router,scada,ics,embedded,network-device,firewall,switch,modbus,snmp
---

# Infrastructure Security

## IoT Security

### Common Vulnerabilities
- Default credentials
- Hardcoded API keys
- Insecure update mechanisms
- Lack of encryption
- Debug interfaces exposed
- Weak authentication

### Tools
- `nmap` - Port scanning
- `hydra` - Password brute force
- `binwalk` - Firmware analysis
- `firmwalker` - Firmware scanning
- `mqtt` - MQTT client
- `zigbee` - Zigbee analysis

### Firmware Analysis
```bash
# Extract firmware
binwalk -e firmware.bin

# Analyze extracted files
find -type f -exec file {} \;

# Search for secrets
grep -r "password\|api_key\|secret" .
```

## Router Security

### Default Credentials
- Check for default passwords
- Common: admin/admin, admin/password, root/root

### Common Vulnerabilities
- CSRF
- Command injection
- Authentication bypass
- WPS vulnerabilities
- UPnP abuse

### Tools
- `nmap` - Port scanning
- `hydra` - Password brute force
- `routerscan` - Router vulnerability scanner
- `wpscrack` - WPS PIN cracking

## SCADA/ICS Security

### Protocols
- Modbus
- DNP3
- S7comm
- BACnet
- OPC UA

### Common Vulnerabilities
- No authentication
- No encryption
- Command injection
- Replay attacks

### Tools
- `nmap` - Port scanning with ICS scripts
- `modbus` - Modbus client
- `s7` - S7comm client
- `scada` - SCADA tools

## Network Device Security

### Switches
- VLAN hopping
- STP manipulation
- MAC flooding
- CDP/LLDP abuse

### Firewalls
- Rule bypass
- VPN misconfigurations
- Management interface exposure

### Tools
- `nmap` - Port scanning
- `masscan` - Fast port scanning
- `responder` - LLMNR/NBTNS/MDNS poisoning
- `bettercap` - Network attack tool

## Output Format

```
[HIT] <vulnerability> in <device/system>
  Type: <IoT/router/SCADA/network device>
  Vector: <how it was exploited>
  Impact: <physical access/data exposure/system compromise>
  Remediation: <fix>
```
