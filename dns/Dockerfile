# Use the official CoreDNS image as the base (latest stable version)
FROM coredns/coredns:1.11.3

# Install envsubst (from gettext) for template processing
RUN apk add --no-cache gettext

# Metadata for maintainability
LABEL maintainer="Alexander Fugmann <alexander.fugmann@wago.com>"
LABEL description="Wago-DNS: CoreDNS for WAGO AI Suite local DNS resolution"
LABEL version="1.0"
LABEL org.opencontainers.image.source="https://github.com/wago-ai-suite/wago-dns"

# Copy Corefile template and detection script into the container
COPY Corefile.template /etc/coredns/Corefile.template
COPY detect_ips.sh /detect_ips.sh

# Process template and run CoreDNS
ENTRYPOINT ["/bin/sh", "-c", "/detect_ips.sh ${INTERFACE_PATTERN} > /tmp/ips.txt && envsubst < /etc/coredns/Corefile.template > /etc/coredns/Corefile && /coredns -conf /etc/coredns/Corefile"]

# Expose DNS ports
EXPOSE 53/udp 53/tcp

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD dig @127.0.0.1 wago-ai-suite.local || exit 1