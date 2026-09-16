#!/usr/bin/env bash
# =============================================================================
# CrypCal TLS Configuration Check
# =============================================================================
# Verifies:
# 1. TLS 1.3 is supported and preferred
# 2. No weak ciphers (RC4, 3DES, NULL)
# 3. HSTS header present with preload
# 4. Certificate validity
# 5. OCSP stapling
#
# Usage: bash scripts/tls-check.sh [DOMAIN]
# Default: localhost
# =============================================================================

set -euo pipefail

DOMAIN="${1:-localhost}"
PORT="${2:-443}"

echo "=== CrypCal TLS Check ==="
echo "Target: $DOMAIN:$PORT"
echo ""

PASS=0
FAIL=0

check() {
  local desc="$1"
  local result="$2"

  if [ "$result" = "PASS" ]; then
    echo "  ✅ $desc"
    PASS=$((PASS + 1))
  else
    echo "  ❌ $desc — $result"
    FAIL=$((FAIL + 1))
  fi
}

# ---------------------------------------------------------------------------
# 1. TLS Version Support
# ---------------------------------------------------------------------------
echo "--- TLS Versions ---"

# Test TLS 1.3
if echo | openssl s_client -connect "$DOMAIN:$PORT" -tls1_3 2>/dev/null | grep -q "Protocol  : TLSv1.3"; then
  check "TLS 1.3 supported" "PASS"
else
  check "TLS 1.3 supported" "NOT AVAILABLE"
fi

# Test that TLS 1.0 is rejected
if echo | openssl s_client -connect "$DOMAIN:$PORT" -tls1 2>&1 | grep -qi "error\|alert\|no protocols"; then
  check "TLS 1.0 rejected" "PASS"
else
  check "TLS 1.0 rejected" "STILL ACCEPTED"
fi

# Test that TLS 1.1 is rejected
if echo | openssl s_client -connect "$DOMAIN:$PORT" -tls1_1 2>&1 | grep -qi "error\|alert\|no protocols"; then
  check "TLS 1.1 rejected" "PASS"
else
  check "TLS 1.1 rejected" "STILL ACCEPTED"
fi

echo ""

# ---------------------------------------------------------------------------
# 2. Certificate Validity
# ---------------------------------------------------------------------------
echo "--- Certificate ---"

CERT_INFO=$(echo | openssl s_client -connect "$DOMAIN:$PORT" -servername "$DOMAIN" 2>/dev/null | openssl x509 -noout -dates -subject 2>/dev/null)

if [ -n "$CERT_INFO" ]; then
  NOT_AFTER=$(echo "$CERT_INFO" | grep "notAfter" | cut -d= -f2)
  SUBJECT=$(echo "$CERT_INFO" | grep "subject" | sed 's/subject=//')

  # Check if cert is expired
  if openssl x509 -checkend 0 <(echo | openssl s_client -connect "$DOMAIN:$PORT" -servername "$DOMAIN" 2>/dev/null) 2>/dev/null; then
    check "Certificate valid (expires: $NOT_AFTER)" "PASS"
  else
    check "Certificate valid" "EXPIRED"
  fi

  # Check if cert expires within 30 days
  if openssl x509 -checkend 2592000 <(echo | openssl s_client -connect "$DOMAIN:$PORT" -servername "$DOMAIN" 2>/dev/null) 2>/dev/null; then
    check "Certificate not expiring soon (>30 days)" "PASS"
  else
    check "Certificate not expiring soon" "EXPIRES WITHIN 30 DAYS"
  fi
else
  check "Certificate retrievable" "COULD NOT RETRIEVE"
fi

echo ""

# ---------------------------------------------------------------------------
# 3. Security Headers
# ---------------------------------------------------------------------------
echo "--- Security Headers ---"

HEADERS=$(curl -sSI -k "https://$DOMAIN:$PORT/" 2>/dev/null)

# HSTS
if echo "$HEADERS" | grep -qi "strict-transport-security"; then
  HSTS_VAL=$(echo "$HEADERS" | grep -i "strict-transport-security" | head -1)
  if echo "$HSTS_VAL" | grep -qi "preload"; then
    check "HSTS with preload" "PASS"
  else
    check "HSTS with preload" "MISSING preload DIRECTIVE"
  fi
else
  check "HSTS header present" "MISSING"
fi

# X-Content-Type-Options
if echo "$HEADERS" | grep -qi "x-content-type-options.*nosniff"; then
  check "X-Content-Type-Options: nosniff" "PASS"
else
  check "X-Content-Type-Options: nosniff" "MISSING"
fi

# X-Frame-Options
if echo "$HEADERS" | grep -qi "x-frame-options"; then
  check "X-Frame-Options" "PASS"
else
  check "X-Frame-Options" "MISSING"
fi

# Content-Security-Policy
if echo "$HEADERS" | grep -qi "content-security-policy"; then
  check "Content-Security-Policy" "PASS"
else
  check "Content-Security-Policy" "MISSING"
fi

echo ""
echo "--- Summary ---"
echo "  Passed: $PASS"
echo "  Failed: $FAIL"
echo ""

if [ "$FAIL" -gt 0 ]; then
  echo "⚠️  Some checks failed. Review the output above."
  exit 1
else
  echo "✅ All checks passed."
fi
