---
name: cloud-audit
description: Cloud security audit techniques for AWS, Azure, GCP
category: cloud
tags: cloud,aws,azure,gcp,audit
---

# Cloud Security Audit

## AWS

### S3 Bucket Analysis
- Check for public buckets
- Enumerate objects
- Test bucket policies

### IAM
- Enumerate users/roles
- Check for overprivileged policies
- Look for trust relationship issues

### EC2
- IMDS metadata access
- Security group analysis
- Snapshot exposure

### Lambda
- Environment variable secrets
- Overprivileged execution roles
- Layer vulnerabilities

## Azure

### Storage
- Blob container public access
- SAS token exposure
- Storage account keys

### AD
- Consent phishing
- Service principal abuse
- Managed identity exploitation

### Key Vault
- Access policy misconfiguration
- Secret exposure

## GCP

### GCS
- Public bucket enumeration
- Object ACL analysis

### IAM
- Service account key exposure
- IAM role chaining
- Compute instance metadata

### Kubernetes
- GKE node pool security
- Workload identity misconfiguration
