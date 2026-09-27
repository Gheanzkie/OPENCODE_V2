---
name: ctf-solver
description: CTF challenge solving across Web, Pwn, Rev, Crypto, Forensics, Misc, and AI security. Use when solving CTF challenges, hackthebox, tryhackme, or picoCTF. Triggers on "ctf", "hackthebox", "tryhackme", "picoctf", "challenge", "flag", "pwn", "rev", "crypto", "forensics".
category: ctf
tags: ctf,hackthebox,tryhackme,picoctf,challenge,flag,pwn,rev,crypto,forensics,web
---

# CTF Solver

## Category Routing

| Category | Focus |
|----------|-------|
| Web | HTTP services, source review, auth, SSRF, SQLi, XSS, deserialization |
| Pwn | Binary exploitation, heap/stack/kernel, docker/WSL/remote drift |
| Rev | ELF/PE, Android, VM/bytecode, packers, runtime and memory dump |
| Crypto | RSA, ECC, PRNG, encodings, custom ciphers, oracle attacks |
| Forensics | PCAP, disk/memory, stego, documents, malware triage, artifacts |
| Misc | Jails, OSINT, encodings, games/VMs, protocols, multimodal media |
| AI Sec | LLM agents, prompt injection, model artifacts, adversarial ML |

## Web Challenges

### Methodology
1. Enumerate all endpoints
2. Identify input vectors
3. Test for injection (SQL, XSS, SSTI, CMDi)
4. Check auth/session handling
5. Test file upload
6. Look for IDOR/BOLA
7. Check for SSRF
8. Review source code for hints

### Common Patterns
- SQLi in login forms
- XSS in search/reflection
- SSTI in template rendering
- File upload → webshell
- IDOR in API endpoints
- SSRF in webhook/proxy features
- JWT manipulation
- Deserialization in API params

## Pwn Challenges

### Methodology
1. Check protections: `checksec --file=binary`
2. Identify vulnerability type (overflow, UAF, double-free, etc.)
3. Find offset to return address
4. Build ROP chain or shellcode
5. Exploit locally, then remotely

### Common Patterns
- Buffer overflow → ret2win
- Format string → arbitrary write
- Heap UAF → tcache poisoning
- Integer overflow → buffer overflow
- ROP chain → execve("/bin/sh")

## Rev Challenges

### Methodology
1. Identify file type: `file binary`
2. Check if packed: `strings binary | grep -i upx`
3. Decompile: Ghidra/IDA
4. Analyze key functions
5. Understand algorithm
6. Write solver script

### Common Patterns
- Custom encryption → reverse algorithm
- VM-based → understand opcodes
- Anti-debugging → patch checks
- String obfuscation → dynamic analysis

## Crypto Challenges

### Methodology
1. Identify cipher/algorithm
2. Check for weak parameters
3. Look for oracle/padding attacks
4. Apply known attacks

### Common Patterns
- RSA: small e, common factor, Wiener's attack
- AES: ECB mode, padding oracle
- Custom: frequency analysis, known plaintext
- PRNG: predict from outputs

## Forensics Challenges

### Methodology
1. Identify file type
2. Extract metadata
3. Carve files
4. Analyze network traffic
5. Look for hidden data

### Common Patterns
- Steganography in images
- File carving from disk image
- PCAP analysis → extract files
- Memory dump → extract credentials
- Document metadata → hidden flags

## Output Format

```
[FLAG] <category> - <challenge name>
  Flag: <flag_value>
  Method: <technique used>
  Steps:
    1. <step 1>
    2. <step 2>
    3. <step 3>
```
