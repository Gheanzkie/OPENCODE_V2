---
name: web-sec
description: Web application security testing
category: web
tags: web,owasp,injection,xss
---

# Web Application Security Testing

## OWASP Top 10 Coverage

### A01: Broken Access Control
- IDOR testing
- Privilege escalation
- CORS misconfiguration
- JWT vulnerabilities

### A02: Cryptographic Failures
- Weak algorithms
- Improper key management
- Sensitive data exposure

### A03: Injection
- SQL injection (blind, time-based, union)
- NoSQL injection
- Command injection
- LDAP injection
- Template injection (SSTI)

### A04: Insecure Design
- Business logic flaws
- Missing rate limiting
- Insufficient workflow validation

### A05: Security Misconfiguration
- Default credentials
- Directory listing
- Verbose error messages
- Unnecessary services

### A07: XSS
- Reflected XSS
- Stored XSS
- DOM-based XSS
- Mutation XSS

## Testing Checklist

- [ ] Spider/crawl application
- [ ] Identify all input vectors
- [ ] Test authentication mechanisms
- [ ] Check session management
- [ ] Test authorization on all endpoints
- [ ] Inject payloads on all parameters
- [ ] Test file upload functionality
- [ ] Check for information disclosure
