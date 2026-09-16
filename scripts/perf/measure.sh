#!/usr/bin/env bash
# =============================================================================
# CrypCal Performance Testing Script
# =============================================================================
# Measures:
# 1. Time To First Byte (TTFB)
# 2. Full page load time
# 3. Bundle sizes
# 4. Lighthouse CI scores (if available)
#
# Usage: bash scripts/perf/measure.sh [URL]
# Default URL: https://localhost
# =============================================================================

set -euo pipefail

URL="${1:-https://localhost}"
REPORT_DIR="reports/perf"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo "=== CrypCal Performance Report ==="
echo "URL: $URL"
echo "Time: $(date -Iseconds)"
echo ""

mkdir -p "$REPORT_DIR"

# ---------------------------------------------------------------------------
# 1. TTFB + Transfer Time (curl)
# ---------------------------------------------------------------------------
echo "--- HTTP Timing ---"
curl -sSo /dev/null -w "\
  DNS Lookup:    %{time_namelookup}s\n\
  TCP Connect:   %{time_connect}s\n\
  TLS Handshake: %{time_appconnect}s\n\
  TTFB:          %{time_starttransfer}s\n\
  Total Time:    %{time_total}s\n\
  Download Size: %{size_download} bytes\n\
  HTTP Status:   %{http_code}\n" \
  -k "$URL" 2>/dev/null || echo "  (curl failed — is the server running?)"

echo ""

# ---------------------------------------------------------------------------
# 2. Bundle Size Report
# ---------------------------------------------------------------------------
echo "--- Bundle Sizes ---"

if [ -d "apps/web/dist/assets" ]; then
  echo "  File                              Raw       Gzip"
  echo "  ----                              ---       ----"

  for f in apps/web/dist/assets/*; do
    NAME=$(basename "$f")
    RAW=$(wc -c < "$f" | tr -d ' ')
    RAW_KB=$(echo "scale=1; $RAW / 1024" | bc 2>/dev/null || echo "?")

    if command -v gzip >/dev/null 2>&1; then
      GZIP=$(gzip -c "$f" | wc -c | tr -d ' ')
      GZIP_KB=$(echo "scale=1; $GZIP / 1024" | bc 2>/dev/null || echo "?")
    else
      GZIP_KB="?"
    fi

    printf "  %-35s %6s KB  %6s KB\n" "$NAME" "$RAW_KB" "$GZIP_KB"
  done

  # Total JS (excluding crypto WASM)
  echo ""
  JS_TOTAL=0
  for f in apps/web/dist/assets/*.js; do
    case "$f" in
      *matrix-crypto*) continue ;;
    esac
    SIZE=$(wc -c < "$f" | tr -d ' ')
    JS_TOTAL=$((JS_TOTAL + SIZE))
  done
  JS_KB=$(echo "scale=1; $JS_TOTAL / 1024" | bc 2>/dev/null || echo "?")
  echo "  Total JS (excl. crypto WASM): ${JS_KB} KB"
else
  echo "  (No build found — run 'npm run build' first)"
fi

echo ""

# ---------------------------------------------------------------------------
# 3. Lighthouse CI (if available)
# ---------------------------------------------------------------------------
if command -v lighthouse >/dev/null 2>&1; then
  echo "--- Lighthouse ---"
  lighthouse "$URL" \
    --output=json \
    --output-path="$REPORT_DIR/lighthouse_${TIMESTAMP}.json" \
    --chrome-flags="--headless --ignore-certificate-errors" \
    --only-categories=performance,accessibility,best-practices,seo \
    2>/dev/null

  echo "  Report saved: $REPORT_DIR/lighthouse_${TIMESTAMP}.json"
else
  echo "--- Lighthouse ---"
  echo "  (lighthouse CLI not installed — install via: npm i -g lighthouse)"
fi

echo ""
echo "=== Done ==="
