#!/bin/bash
# detect_ips.sh: Detect non-loopback IPv4 addresses, excluding bridges if needed
# Usage: ./detect_ips.sh [interface_pattern] (e.g., 'X*' for X1/X2)

INTERFACE_PATTERN="${1:-.*}"  # Default: all interfaces
IPS=()

for iface in $(ip link show | grep -E "^[0-9]+: $INTERFACE_PATTERN" | awk '{print $2}' | sed 's/://'); do
    ip_addr=$(ip addr show "$iface" | grep -oP 'inet \K[\d.]+' | head -1)
    if [ -n "$ip_addr" ] && [ "$ip_addr" != "127.0.0.1" ]; do
        IPS+=("$ip_addr")
    fi
done

# Output as space-separated for Corefile injection
echo "${IPS[*]}"