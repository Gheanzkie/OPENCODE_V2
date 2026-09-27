---
name: supply-chain
description: Supply chain attacks including dependency confusion, typosquatting, malicious packages, and CI/CD pipeline attacks. Use when testing package managers, CI/CD pipelines, or third-party integrations. Triggers on "supply chain", "dependency confusion", "typosquatting", "npm", "pip", "maven", "ci/cd", "pipeline".
category: supply-chain
tags: supply-chain,dependency-confusion,typosquatting,npm,pip,maven,ci-cd,pipeline,package,malicious
---

# Supply Chain Attacks

## Dependency Confusion

### Attack
- Register package with same name as internal package
- Higher version number causes public package to be installed
- Exfiltrate data or execute code

### Detection
- Monitor package registries for internal package names
- Check for unexpected package sources
- Review package.json/requirements.txt changes

### Prevention
- Use private registry with higher priority
- Pin exact versions
- Use lock files
- Namespace internal packages

## Typosquatting

### Attack
- Register package with common typo: `reqeusts` instead of `requests`
- Wait for developers to mistype
- Execute malicious code on install

### Detection
- Check for similar package names
- Review package sources
- Monitor for new packages with similar names

### Prevention
- Verify package names before install
- Use lock files
- Audit dependencies regularly

## Malicious Packages

### Attack
- Compromise legitimate package maintainer
- Add malicious code to popular package
- Exfiltrate environment variables
- Install backdoors

### Detection
- Review package source code
- Check for suspicious install scripts
- Monitor network traffic from packages
- Use software composition analysis (SCA)

### Prevention
- Pin exact versions
- Use lock files
- Audit dependencies
- Use private registry

## CI/CD Pipeline Attacks

### Attack
- Compromise build server
- Inject malicious code into build
- Steal secrets from environment
- Modify artifacts

### Detection
- Monitor pipeline logs
- Check for unexpected changes
- Review access controls
- Audit secrets usage

### Prevention
- Use isolated build environments
- Implement least privilege
- Rotate secrets regularly
- Sign artifacts

## Tools

| Tool | Purpose |
|------|---------|
| `npm audit` | NPM vulnerability scan |
| `pip audit` | Python vulnerability scan |
| `snyk` | SCA tool |
| `dependabot` | Automated dependency updates |
| `renovate` | Automated dependency updates |
| `semgrep` | Static analysis |
| `trufflehog` | Secret scanning |

## Output Format

```
[HIT] <vulnerability> in <package/pipeline>
  Type: <dependency confusion/typosquatting/malicious package>
  Vector: <how it was introduced>
  Impact: <data exposure/code execution>
  Remediation: <fix>
```
