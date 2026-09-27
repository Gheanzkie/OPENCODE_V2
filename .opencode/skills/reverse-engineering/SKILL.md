---
name: reverse-engineering
description: Reverse engineering of ELF, PE, .NET, and packed binaries. Use when analyzing malware, CTF rev challenges, or understanding unknown binaries. Triggers on "reverse", "reversing", "elf", "pe", "dotnet", "unpack", "decompile", "ghidra", "ida", "radare2".
category: reverse-engineering
tags: reverse-engineering,elf,pe,dotnet,unpack,decompile,ghidra,ida,radare2,malware,analysis
---

# Reverse Engineering

## ELF Analysis (Linux)

### Static Analysis
```bash
file binary
readelf -h binary
readelf -S binary
readelf -s binary
objdump -d binary
strings binary | grep -i "flag\|password\|secret"
```

### Dynamic Analysis
```bash
ltrace ./binary
strace ./binary
gdb ./binary
```

### Common Patterns
- `main` → `__libc_start_main` call
- `strcmp` → password check
- `fopen` → file read
- `socket` → network communication

## PE Analysis (Windows)

### Static Analysis
```bash
file binary.exe
objdump -d binary.exe
strings binary.exe | grep -i "http\|url\|api\|key"
```

### Dynamic Analysis
```bash
# x64dbg
# OllyDbg
# WinDbg
```

### Common Patterns
- `WinMain` → entry point
- `CreateFile` → file operations
- `RegOpenKey` → registry access
- `InternetOpen` → network communication

## .NET Analysis

### Decompilation
```bash
# ILSpy
ilspycmd binary.exe

# dnSpy
# dotPeek
```

### Common Patterns
- `Main` → entry point
- `File.ReadAllText` → file read
- `WebClient.DownloadString` → network
- `Process.Start` → code execution

## Packed Binaries

### Detection
```bash
file binary
strings binary | grep -i "upx\|aspack\|pecompact"
```

### Unpacking
```bash
# UPX
upx -d binary

# Generic
# Find OEP, dump memory, rebuild imports
```

## Anti-Debugging

### Techniques
- `IsDebuggerPresent`
- `CheckRemoteDebuggerPresent`
- `NtQueryInformationProcess`
- Timing checks
- `int 2d`

### Bypass
- Patch checks
- Use hardware breakpoints
- Use ScyllaHide

## Tools

| Tool | Purpose |
|------|---------|
| `Ghidra` | Free reverse engineering suite |
| `IDA Pro` | Commercial disassembler |
| `radare2` | CLI reverse engineering |
| `rizin` | Fork of radare2 |
| `Cutter` | GUI for radare2 |
| `x64dbg` | Windows debugger |
| `OllyDbg` | Windows debugger |
| `ILSpy` | .NET decompiler |
| `dnSpy` | .NET debugger/decompiler |

## Output Format

```
[REV] <binary> - <finding>
  Type: <ELF/PE/.NET/Packed>
  Entry: <entry point>
  Key Functions: <list>
  Algorithm: <description>
  Solver: <script to solve>
```
