# Report Generation Skill

## Triggers
"report", "cvss", "finding", "remediation", "executive summary", "assessment", "pentest report", "vulnerability report", "html report", "pdf report"

## Overview
Automated security assessment report generation with CVSS scoring, structured findings, executive summaries, and remediation roadmaps.

## Report Structure

### Executive Summary
- Engagement overview
- Risk rating (Critical/High/Medium/Low)
- Key findings count
- Business impact summary
- Top 3 recommendations

### Findings Table
| ID | Title | Severity | CVSS | CWE | Status | Affected |
|----|-------|----------|------|-----|--------|----------|

### Detailed Findings
For each finding:
- Title
- Severity (Critical/High/Medium/Low/Info)
- CVSS 3.1 Score + Vector
- CWE ID
- Description
- Affected Component
- Proof of Concept (with raw evidence)
- Impact
- Remediation
- References

### Remediation Roadmap
- Immediate (0-30 days)
- Short-term (30-90 days)
- Long-term (90+ days)

## CVSS 3.1 Scoring

### Critical (9.0-10.0)
- Remote code execution without authentication
- Full system compromise
- Data breach with sensitive data exposure

### High (7.0-8.9)
- Authentication bypass
- SQL injection with data exfiltration
- Privilege escalation to admin
- SSRF to internal services

### Medium (4.0-6.9)
- Stored XSS
- CSRF on sensitive actions
- Information disclosure
- Missing security headers

### Low (0.1-3.9)
- Clickjacking
- Missing cookie flags
- Verbose error messages

### Info (0.0)
- Version disclosure
- Missing security headers

## Report Templates

### HTML Report
```html
<!DOCTYPE html>
<html>
<head>
    <title>Security Assessment Report - TARGET</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .critical { color: #d32f2f; }
        .high { color: #f57c00; }
        .medium { color: #fbc02d; }
        .low { color: #388e3c; }
        .info { color: #1976d2; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f5f5f5; }
        .finding { margin: 20px 0; padding: 15px; border-left: 4px solid; }
        .evidence { background: #f5f5f5; padding: 10px; font-family: monospace; }
    </style>
</head>
<body>
    <h1>Security Assessment Report</h1>
    <h2>TARGET</h2>
    <p>Date: DATE</p>
    
    <h2>Executive Summary</h2>
    <p>SUMMARY</p>
    
    <h2>Findings Summary</h2>
    <table>
        <tr><th>Severity</th><th>Count</th></tr>
        <tr><td class="critical">Critical</td><td>N</td></tr>
        <tr><td class="high">High</td><td>N</td></tr>
        <tr><td class="medium">Medium</td><td>N</td></tr>
        <tr><td class="low">Low</td><td>N</td></tr>
    </table>
    
    <h2>Detailed Findings</h2>
    <!-- Findings here -->
    
    <h2>Remediation Roadmap</h2>
    <h3>Immediate (0-30 days)</h3>
    <ul><li>ITEM</li></ul>
    <h3>Short-term (30-90 days)</h3>
    <ul><li>ITEM</li></ul>
    <h3>Long-term (90+ days)</h3>
    <ul><li>ITEM</li></ul>
</body>
</html>
```

## Usage
```bash
# Generate report from findings
python report_gen.py --findings findings.json --target TARGET --output report.html

# Generate with CVSS scoring
python report_gen.py --findings findings.json --cvss --output report.html

# Generate PDF
python report_gen.py --findings findings.json --pdf --output report.pdf
```

## Chain Patterns
- Findings → CVSS score → severity → report
- Evidence → PoC → impact → remediation
- Critical findings → immediate action → verify fix
