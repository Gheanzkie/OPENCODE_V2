---
name: security-reporting
description: Security assessment reporting including CVSS scoring, structured findings, executive summaries, and remediation roadmaps. Use when generating pentest reports, vulnerability assessments, or security audit reports. Triggers on "report", "cvss", "finding", "remediation", "executive summary", "assessment".
category: reporting
tags: report,cvss,finding,remediation,executive-summary,assessment,pentest-report
---

# Security Reporting

## Report Structure

### 1. Executive Summary
- Engagement overview
- Scope and objectives
- Key findings (top 3-5)
- Risk rating
- Recommendations summary

### 2. Scope and Methodology
- Targets in scope
- Testing period
- Methodology used
- Tools employed
- Limitations

### 3. Findings Summary
| Severity | Count |
|----------|-------|
| Critical | X |
| High | X |
| Medium | X |
| Low | X |
| Info | X |

### 4. Detailed Findings
For each finding:
- Title
- Severity (CVSS score)
- Affected component
- Description
- Steps to reproduce
- Evidence (screenshots, logs, PoC)
- Business impact
- Remediation
- References

### 5. Attack Narrative
- Initial access
- Privilege escalation
- Lateral movement
- Data access
- Persistence

### 6. Credentials Discovered
- Username/password pairs
- Hashes (with crack status)
- Tokens/API keys
- Reuse across services

### 7. Remediation Roadmap
- Immediate actions (0-30 days)
- Short-term actions (30-90 days)
- Long-term actions (90+ days)

### 8. Appendices
- Tools used
- References
- Glossary

## CVSS Scoring

### v3.1 Base Metrics

#### Attack Vector (AV)
- Network (N): 0.85
- Adjacent (A): 0.62
- Local (L): 0.55
- Physical (P): 0.20

#### Attack Complexity (AC)
- Low (L): 0.77
- High (H): 0.44

#### Privileges Required (PR)
- None (N): 0.85
- Low (L): 0.62
- High (H): 0.27

#### User Interaction (UI)
- None (N): 0.85
- Required (R): 0.62

#### Scope (S)
- Unchanged (U): 6.42
- Changed (C): 7.52

#### Confidentiality/Integrity/Availability (C/I/A)
- High (H): 0.56
- Low (L): 0.22
- None (N): 0.00

### Severity Ratings
| Score | Severity |
|-------|----------|
| 9.0-10.0 | Critical |
| 7.0-8.9 | High |
| 4.0-6.9 | Medium |
| 0.1-3.9 | Low |
| 0.0 | Info |

## Finding Template

```markdown
## [SEVERITY] Finding Title

**CVSS:** X.X (Vector)
**Affected:** component/endpoint
**CWE:** CWE-XXX

### Description
[What is the vulnerability]

### Steps to Reproduce
1. [Step 1]
2. [Step 2]
3. [Step 3]

### Evidence
[Screenshots, logs, PoC]

### Impact
[Business impact]

### Remediation
[How to fix]

### References
[Links to CVE, OWASP, etc.]
```

## Output Format

```
[REPORT] <assessment type> for <target>
  Period: <dates>
  Scope: <targets>
  Findings: <count by severity>
  Top Risk: <highest severity finding>
  Recommendation: <top priority fix>
```
