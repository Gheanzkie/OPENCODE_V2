---
name: crypto-attacks
description: Cryptographic attacks including RSA, AES, PRNG, padding oracle, and side-channel attacks. Use when attacking weak crypto, CTF crypto challenges, or analyzing encryption implementations. Triggers on "crypto", "rsa", "aes", "prng", "padding oracle", "side-channel", "encrypt", "decrypt", "cipher".
category: crypto
tags: crypto,rsa,aes,prng,padding-oracle,side-channel,encrypt,decrypt,cipher,attack
---

# Crypto Attacks

## RSA Attacks

### Small Exponent (e=3)
- If m^3 < n, cube root recovers plaintext
- Chinese Remainder Theorem attack for multiple ciphertexts

### Common Factor
- GCD of two moduli reveals shared prime

### Wiener's Attack
- Small private exponent d
- Continued fraction expansion

### Fermat Factorization
- p and q close together
- n = a^2 - b^2

### Bleichenbacher's Attack
- Padding oracle on PKCS#1 v1.5

## AES Attacks

### ECB Mode
- Identical plaintext blocks → identical ciphertext blocks
- Pattern leakage

### CBC Mode
- Bit flipping: modify ciphertext to change plaintext
- Padding oracle: decrypt via padding validation

### CTR Mode
- Nonce reuse: XOR two ciphertexts to get XOR of plaintexts

## PRNG Attacks

### Mersenne Twister
- Observe 624 outputs to predict future outputs
- Untemper state to recover internal state

### Linear Congruential Generator
- Solve for parameters from outputs

### Java Random
- 48-bit state, predictable from outputs

## Padding Oracle Attacks

### CBC Padding Oracle
- Modify ciphertext block, observe padding valid/invalid
- Recover plaintext byte by byte

### POODLE
- SSLv3 padding oracle

## Side-Channel Attacks

### Timing
- Measure execution time to recover secrets

### Power Analysis
- Simple/Differential power analysis

### Cache
- Flush+Reload, Prime+Probe

## Tools

| Tool | Purpose |
|------|---------|
| `sage` | Mathematical computations |
| `RsaCtfTool` | RSA CTF challenges |
| `hashcat` | Password/hash cracking |
| `john` | Password cracking |
| `openssl` | Certificate/crypto analysis |
| `CyberChef` | Data analysis |

## Output Format

```
[HIT] <vulnerability> in <target>
  Type: <RSA/AES/PRNG/Padding Oracle>
  Attack: <technique>
  PoC: <exact steps>
  Impact: <data exposure/decryption>
  Remediation: <fix>
```
