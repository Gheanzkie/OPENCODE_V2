---
name: bug-bounty
description: Bug bounty hunting workflow with deterministic scope safety, hunt memory, finding validation, and submission-ready reports. Use when hunting bugs on HackerOne, Bugcrowd, Intigriti, or Immunefi. Triggers on "bug bounty", "hackerone", "bugcrowd", "intigriti", "immunefi", "hunt", "vulnerability research".
category: bugbounty
tags: bug-bounty,hackerone,bugcrowd,intigriti,immunefi,hunt,vulnerability-research,scope-safety
---

# Bug Bounty Hunting

## Core Principles

1. **Scope first, always** — deterministic scope checker gates targets
2. **No out-of-scope requests** — every request hash-chained in audit log
3. **Deterministic reproducibility** — finding is REAL only on K/K reproductions
4. **Expected-value memory** — learn from confirmed/rejected history

## Hunt Workflow

### Phase 1: Recon
- Subdomain enumeration
- Content discovery
- Technology fingerprinting
- JavaScript analysis
- Parameter discovery

### Phase 2: Hunt
- Test each in-scope asset
- Track findings in hunt journal
- Validate with K/K reproductions
- Classify by severity

### Phase 3: Validate
- Run finding check K times
- REAL only on K/K
- Route failures to needs-manual lane
- Never declare a bug real on model judgment alone

### Phase 4: Report
- Executive summary
- Technical details
- Proof of concept
- Remediation
- CVSS score

## Scope Safety

- Target must match in-scope pattern
- No exclusion match
- CIDR containment check
- Wildcard domain matching
- Excludes priority over includes

## Finding Validation Gate

Every finding must pass:
1. Reproducible K/K times
2. In-scope target
3. Not a duplicate
4. Has business impact
5. Has clear remediation

## Severity Classification

| Severity | CVSS | Examples |
|----------|------|----------|
| Critical | 9.0-10.0 | RCE, SQLi with data exfil, auth bypass |
| High | 7.0-8.9 | IDOR, SSRF to internal, stored XSS |
| Medium | 4.0-6.9 | Reflected XSS, CSRF, open redirect |
| Low | 0.1-3.9 | Info disclosure, missing headers |
| Info | 0.0 | Best practice violations |

## Output Format

```
[HIT] <vulnerability> at <endpoint>
  Severity: <Critical/High/Medium/Low>
  CVSS: <score>
  PoC: <exact request>
  Reproduction: <K/K successful>
  Impact: <business impact>
  Remediation: <fix>
```
