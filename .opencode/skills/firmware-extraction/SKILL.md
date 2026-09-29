# Firmware Extraction Skill

## Triggers
"firmware", "router", "iot", "binwalk", "uboot", "extract", "unpack", "emulate", "qime", "hardware", "embedded", "jtag", "uart", "serial"

## Overview
Router/IoT firmware extraction, analysis, and vulnerability discovery. Covers binwalk extraction, filesystem analysis, emulation, and hardware debugging interfaces.

## Prerequisitesites
- binwalk
- firmware-mod-kit
- qemu / qemu-system
- ghidra / ida
- flashrom
- OpenOCD

## Attack Chain

### Phase 1: Firmware Acquisition
```bash
# Download from vendor
curl -O https://vendor.com/firmware/latest.bin

# Extract from device
dd if=/dev/mtd0 of=firmware.bin bs=1M

# Serial dump (UART)
picocom -b 115200 /dev/ttyUSB0 > firmware_dump.bin

# JTAG dump
openocd -f interface/jtag.cfg -f target/device.cfg -c "dump_image firmware.bin 0x0 0x1000000"
```

### Phase 2: Extraction
```bash
# Binwalk signature scan
binwalk firmware.bin

# Binwalk extraction
binwalk -e firmware.bin

# Deep extraction
binwalk -Me firmware.bin

# Firmware-mod-kit
extract-firmware.sh firmware.bin

# Squashfs unsquash
unsquashfs -d output_dir filesystem.squashfs
```

### Phase 3: Filesystem Analysis
```bash
# Find credentials
grep -r "password" output_dir/
grep -r "admin" output_dir/etc/
cat output_dir/etc/shadow
cat output_dir/etc/passwd

# Find config files
find output_dir/ -name "*.conf" -o -name "*.cfg" -o -name "*.ini"
find output_dir/ -name "*.xml" -o -name "*.json"

# Find private keys
find output_dir/ -name "*.pem" -o -name "*.key" -o -name "*.crt"
openssl rsa -in output_dir/etc/ssl/server.key -text -noout

# Find backdoors
grep -r "backdoor" output_dir/
grep -r "debug" output_dir/etc/
find output_dir/ -name "*telnet*" -o -name "*ssh*"
```

### Phase 4: Emulation
```bash
# QEMU full system
qemu-system-mips -M malta -kernel output_dir/vmlinux -hda output_dir/rootfs.ext2 -append "root=/dev/sda console=ttyS0" -nographic

# QEMU user mode
qemu-mips-static -L output_dir output_dir/bin/busybox

# Firmware rehosting
python3 firmadyne.py -i firmware.bin -q output_dir
```

### Phase 5: Vulnerability Discovery
```bash
# Binary analysis
file output_dir/bin/*
checksec --file=output_dir/bin/httpd

# String analysis
strings output_dir/bin/httpd | grep -i "version\|debug\|admin\|password"
strings output_dir/bin/httpd | grep -E "([0-9]{1,3}\.){3}[0-9]{1,3}"

# Known CVE matching
python cve-bin-tool firmware.bin

# Default credential check
python routerpwn.py -t output_dir
```

### Phase 6: Hardware Debugging
```bash
# UART serial
picocom -b 115200 /dev/ttyUSB0

# SPI flash dump
flashrom -p linux_spi:dev=/dev/spidev0.0 -r firmware_dump.bin

# JTAG boundary scan
openocd -f interface/jtag.cfg -f target/device.cfg -c "scan_chain"

# Ghidra analysis
analyzeHeadless . firmware.gpr -import firmware.bin -postScript StringSearch.java
```

## Chain Patterns
- Firmware download → extract → default creds → device access
- Firmware extract → hardcoded key → decrypt config → admin creds
- Emulate → fuzz → RCE → exploit real device
- UART → root shell → dump flash → analyze → find vuln
- JTAG → memory dump → extract keys → decrypt traffic
