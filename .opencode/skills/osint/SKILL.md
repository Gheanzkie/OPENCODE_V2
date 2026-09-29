# OSINT Skill

## Triggers
"osint", "recon", "subdomain", "breach", "leak", "shodan", "censys", "exposed", "leaked creds", "email", "username", "footprint"

## Overview
Passive and active OSINT collection for target profiling, subdomain enumeration, breached credential discovery, and exposed service identification.

## Subdomain Enumeration
```bash
# Passive
subfinder -d TARGET.com -all -o subdomains.txt
amass enum -d TARGET.com -passive -o amass_subs.txt
assetfinder --subs-only TARGET.com

# Certificate transparency
curl -s "https://crt.sh/?q=%25.TARGET.com&output=json" | jq -r '.[].name_value' | sort -u

# Wayback machine
waybackurls TARGET.com | sort -u > wayback_urls.txt
gau TARGET.com --threads 5 --o gau_urls.txt

# GitHub dorking
gh search code "TARGET.com" --limit 100
gh search code "TARGET.com password" --limit 50
gh search code "TARGET.com api_key" --limit 50
```

## Breached Credentials
```bash
# Dehashed (API key required)
curl "https://api.dehashed.com/search?query=domain:TARGET.com" -H "Authorization: Bearer $DEHASHED_KEY"

# HaveIBeenPwned (API key required)
curl -s "https://haveibeenpwned.com/api/v3/breachedaccount/EMAIL" -H "hibp-api-key: $HIBP_KEY"

# Breach-Parse (local)
python breach-parse.py TARGET.com breaches/ output.txt

# Check if email in known breaches
curl -s "https://api.xposedornot.com/api/v1/email/EMAIL"
```

## Exposed Services
```bash
# Shodan (API key required)
shodan search "hostname:TARGET.com" --fields ip_str,port,product,version
shodan search "ssl.cert.subject.cn:TARGET.com" --fields ip_str,port

# Censys (API key required)
curl -s "https://search.censys.io/api/v2/hosts/search?q=TARGET.com" -u "$CENSYS_ID:$CENSYS_SECRET"

# FOFA
curl -s "https://fofa.info/api/v1/search/all?qbase64=$(echo -n 'domain="TARGET.com"' | base64)" -H "Authorization: Bearer $FOFA_KEY"

# GrayHatWarfare
curl -s "https://buckets.grayhatwarfare.com/api/v1/buckets?keywords=TARGET.com"
```

## Email Harvesting
```bash
# theHarvester
theHarvester -d TARGET.com -b all -l 500 -f harvest.html

# Hunter.io (API key required)
curl -s "https://api.hunter.io/v2/domain-search?domain=TARGET.com&api_key=$HUNTER_KEY"

# Phonebook
curl -s "https://phonebook.cz/api/v1/search?query=TARGET.com"

# Email format detection
python email-format.py TARGET.com
```

## Cloud Asset Discovery
```bash
# S3 buckets
s3scanner -b TARGET.com
python s3-bucket-checker.py TARGET.com

# Azure blobs
az storage blob list --account-name TARGET --container-name '$web' --output table

# GCP storage
gsutil ls gs://TARGET.com
```

## Social Media & Employees
```bash
# LinkedIn
python linkedin-scraper.py TARGET.com employees.txt

# Twitter
twint -u TARGET --email --phone -o twitter_results.json

# GitHub org
gh api orgs/TARGET/repos --paginate --jq '.[].name'
```

## Chain Patterns
- Subdomain enum → exposed dev/staging → leaked .env → cloud creds → pivot
- Breached creds → password spray → foothold → lateral
- Shodan → exposed RDP/SSH → brute → shell
- Email harvest → spear phish → credential harvest → VPN access
