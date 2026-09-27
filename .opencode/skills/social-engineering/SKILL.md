---
name: social-engineering
description: Social engineering attacks including phishing, pretexting, vishing, and physical security. Use when testing human security awareness, red team engagements, or physical penetration testing. Triggers on "social engineering", "phishing", "pretexting", "vishing", "physical", "tailgating", "impersonation".
category: social-engineering
tags: social-engineering,phishing,pretexting,vishing,physical,tailgating,impersonation,awareness
---

# Social Engineering

## Phishing

### Email Phishing
- Spoof sender address
- Clone legitimate login page
- Use urgency/fear tactics
- Track clicks with GoPhish

### Spear Phishing
- Research target (LinkedIn, social media)
- Personalize email
- Reference real projects/colleagues
- Use target's language/style

### Whaling
- Target executives
- Fake legal documents
- Fake wire transfer requests
- Fake board communications

## Vishing (Voice Phishing)

### Techniques
- Spoof caller ID
- Pose as IT support
- Pose as bank/authority
- Create urgency

### Tools
- `twilio` - Programmatic calls
- `spoofcard` - Caller ID spoofing

## Pretexting

### Common Pretexts
- IT support: "We need to verify your credentials"
- HR: "We need to update your payroll info"
- Delivery: "Package needs signature"
- Executive: "Urgent wire transfer needed"

### Steps
1. Research target
2. Build believable scenario
3. Establish trust
4. Execute request
5. Cover tracks

## Physical Security

### Tailgating
- Follow authorized personnel
- Carry boxes/equipment
- Dress appropriately
- Be confident

### Badge Cloning
- Clone RFID badges
- Copy visual badge design
- Use social engineering to gain access

### Lock Picking
- Pin tumbler locks
- Bump keys
- Electronic lock bypass

## Tools

| Tool | Purpose |
|------|---------|
| `GoPhish` | Phishing framework |
| `SET` | Social Engineering Toolkit |
| `King Phisher` | Phishing campaign management |
| `twilio` | Programmatic calls |
| `spoofcard` | Caller ID spoofing |

## Output Format

```
[SOCIAL-ENG] <attack type> against <target>
  Vector: <email/phone/physical>
  Pretext: <scenario>
  Success: <yes/no>
  Impact: <access gained/data exposed>
  Remediation: <training/policy/technical control>
```
