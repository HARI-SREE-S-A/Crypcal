#!/usr/bin/env bash
# =============================================================================
# CrypCal Setup Script (Linux/macOS/WSL)
# Generates secrets, .env file, and templated configs
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "=== CrypCal Setup ==="
echo ""

# ---------------------------------------------------------------------------
# Helper: generate a random hex string
# ---------------------------------------------------------------------------
gen_secret() {
  openssl rand -hex 32
}

gen_short_secret() {
  openssl rand -hex 16
}

# ---------------------------------------------------------------------------
# Generate .env if it doesn't exist
# ---------------------------------------------------------------------------
ENV_FILE="$PROJECT_ROOT/.env"

if [ -f "$ENV_FILE" ]; then
  echo "[!] .env already exists. To regenerate, delete it first."
  echo "    Loading existing .env..."
else
  echo "[+] Generating secrets and creating .env..."

  POSTGRES_PASSWORD=$(gen_secret)
  SYNAPSE_REGISTRATION_SHARED_SECRET=$(gen_secret)
  SYNAPSE_MACAROON_SECRET_KEY=$(gen_secret)
  SYNAPSE_FORM_SECRET=$(gen_secret)
  TURN_SHARED_SECRET=$(gen_secret)
  LIVEKIT_API_KEY="API$(gen_short_secret)"
  LIVEKIT_API_SECRET=$(gen_secret)

  cat > "$ENV_FILE" <<EOF
# CrypCal Environment — Generated $(date -u +"%Y-%m-%dT%H:%M:%SZ")
# DO NOT COMMIT THIS FILE

# Domain & Server
CRYPCAL_DOMAIN=localhost
CRYPCAL_SERVER_NAME=localhost

# PostgreSQL
POSTGRES_DB=synapse
POSTGRES_USER=synapse
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}

# Synapse
SYNAPSE_REGISTRATION_SHARED_SECRET=${SYNAPSE_REGISTRATION_SHARED_SECRET}
SYNAPSE_MACAROON_SECRET_KEY=${SYNAPSE_MACAROON_SECRET_KEY}
SYNAPSE_FORM_SECRET=${SYNAPSE_FORM_SECRET}

# coturn
TURN_SHARED_SECRET=${TURN_SHARED_SECRET}
TURN_REALM=localhost

# LiveKit
LIVEKIT_API_KEY=${LIVEKIT_API_KEY}
LIVEKIT_API_SECRET=${LIVEKIT_API_SECRET}

# TLS
TLS_MODE=local
EOF

  echo "[+] .env created with generated secrets"
fi

# Load .env
set -a
source "$ENV_FILE"
set +a

# ---------------------------------------------------------------------------
# Generate Synapse homeserver.yaml from template
# ---------------------------------------------------------------------------
echo "[+] Generating Synapse config from template..."

SYNAPSE_GEN_DIR="$PROJECT_ROOT/infra/synapse/generated"
mkdir -p "$SYNAPSE_GEN_DIR"

sed \
  -e "s|__CRYPCAL_DOMAIN__|${CRYPCAL_DOMAIN}|g" \
  -e "s|__POSTGRES_USER__|${POSTGRES_USER}|g" \
  -e "s|__POSTGRES_PASSWORD__|${POSTGRES_PASSWORD}|g" \
  -e "s|__POSTGRES_DB__|${POSTGRES_DB}|g" \
  -e "s|__SYNAPSE_REGISTRATION_SHARED_SECRET__|${SYNAPSE_REGISTRATION_SHARED_SECRET}|g" \
  -e "s|__SYNAPSE_MACAROON_SECRET_KEY__|${SYNAPSE_MACAROON_SECRET_KEY}|g" \
  -e "s|__SYNAPSE_FORM_SECRET__|${SYNAPSE_FORM_SECRET}|g" \
  -e "s|__TURN_SHARED_SECRET__|${TURN_SHARED_SECRET}|g" \
  "$PROJECT_ROOT/infra/synapse/homeserver.yaml" \
  > "$SYNAPSE_GEN_DIR/homeserver.yaml"

echo "[+] Synapse config written to infra/synapse/generated/homeserver.yaml"

# ---------------------------------------------------------------------------
# Generate coturn config from template
# ---------------------------------------------------------------------------
echo "[+] Generating coturn config from template..."

COTURN_GEN_DIR="$PROJECT_ROOT/infra/coturn/generated"
mkdir -p "$COTURN_GEN_DIR"

sed \
  -e "s|__TURN_SHARED_SECRET__|${TURN_SHARED_SECRET}|g" \
  -e "s|__TURN_REALM__|${TURN_REALM}|g" \
  "$PROJECT_ROOT/infra/coturn/turnserver.conf" \
  > "$COTURN_GEN_DIR/turnserver.conf"

echo "[+] coturn config written to infra/coturn/generated/turnserver.conf"

# ---------------------------------------------------------------------------
# Generate LiveKit config from template
# ---------------------------------------------------------------------------
echo "[+] Generating LiveKit config from template..."

LIVEKIT_GEN_DIR="$PROJECT_ROOT/infra/livekit/generated"
mkdir -p "$LIVEKIT_GEN_DIR"

sed \
  -e "s|__LIVEKIT_API_KEY__|${LIVEKIT_API_KEY}|g" \
  -e "s|__LIVEKIT_API_SECRET__|${LIVEKIT_API_SECRET}|g" \
  "$PROJECT_ROOT/infra/livekit/livekit.yaml" \
  > "$LIVEKIT_GEN_DIR/livekit.yaml"

echo "[+] LiveKit config written to infra/livekit/generated/livekit.yaml"

# ---------------------------------------------------------------------------
# Generate self-signed TLS certificates for local development
# ---------------------------------------------------------------------------
if [ "${TLS_MODE}" = "local" ]; then
  CERT_DIR="$PROJECT_ROOT/infra/coturn/certs"
  mkdir -p "$CERT_DIR"

  if [ ! -f "$CERT_DIR/turn.crt" ]; then
    echo "[+] Generating self-signed TLS certificates for coturn..."
    openssl req -x509 -newkey rsa:4096 -keyout "$CERT_DIR/turn.key" \
      -out "$CERT_DIR/turn.crt" -days 365 -nodes \
      -subj "/CN=${CRYPCAL_DOMAIN}" \
      -addext "subjectAltName=DNS:${CRYPCAL_DOMAIN},DNS:localhost,IP:127.0.0.1" \
      2>/dev/null
    echo "[+] Self-signed certs created in infra/coturn/certs/"
  else
    echo "[~] TLS certificates already exist, skipping generation"
  fi
fi

# ---------------------------------------------------------------------------
# Generate Synapse signing key if needed
# ---------------------------------------------------------------------------
SIGNING_KEY="$PROJECT_ROOT/infra/synapse/generated/signing.key"
if [ ! -f "$SIGNING_KEY" ]; then
  echo "[+] Generating Synapse signing key..."
  # The Synapse Docker image will generate this on first run,
  # but we create the directory structure so the mount succeeds
  touch "$SIGNING_KEY"
  echo "[+] Signing key placeholder created (Synapse will generate on first start)"
fi

# ---------------------------------------------------------------------------
# Create empty web-dist directory for Caddy
# ---------------------------------------------------------------------------
mkdir -p "$PROJECT_ROOT/infra/web-dist"
echo '<html><body><h1>CrypCal — Client not yet built</h1><p>Run Milestone 2 to build the web client.</p></body></html>' \
  > "$PROJECT_ROOT/infra/web-dist/index.html"

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
echo ""
echo "=== Setup Complete ==="
echo ""
echo "  .env file:     $ENV_FILE"
echo "  Synapse config: $SYNAPSE_GEN_DIR/homeserver.yaml"
echo "  coturn config:  $COTURN_GEN_DIR/turnserver.conf"
echo "  LiveKit config: $LIVEKIT_GEN_DIR/livekit.yaml"
echo ""
echo "Next steps:"
echo "  1. Review .env and adjust CRYPCAL_DOMAIN if needed"
echo "  2. Run: make up    (or: cd infra && docker compose up -d)"
echo "  3. Create a user:  make register USER=alice PASS=your-secure-password"
echo ""
