# CrypCal

Secure, minimal, open-source end-to-end encrypted chat and voice/video calling.

Built on the [Matrix](https://matrix.org) protocol with [Synapse](https://github.com/element-hq/synapse) homeserver, [LiveKit](https://livekit.io) SFU for calls, and a custom React PWA client.

## Features

- **End-to-end encrypted** — All messages and calls are encrypted by default. The server never sees your content.
- **Voice & video calls** — Real-time calls via MatrixRTC + LiveKit SFU with E2E media encryption.
- **Minimal UI** — Two screens: conversation list and conversation view. That's it.
- **Self-hostable** — One `docker compose up -d` to run the entire stack.
- **PWA** — Installable on any device, no app store required.
- **100% open source** — Every dependency is OSI-licensed. No telemetry, no analytics, no CDNs.

## Quick Start (5 minutes)

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose
- A domain name (for production) or `localhost` (for development)

### 1. Clone and setup

```bash
git clone https://github.com/your-org/crypcal.git
cd crypcal

# Generate secrets and configuration
# Windows:
powershell -ExecutionPolicy Bypass -File scripts/setup.ps1
# Linux/macOS:
bash scripts/setup.sh
```

### 2. Start the stack

```bash
# Using Make:
make up

# Or directly:
docker compose -f infra/docker-compose.yml --env-file .env up -d
```

### 3. Create your first user

```bash
make register USER=alice PASS=YourSecurePassword123
```

### 4. Open the app

Navigate to `https://localhost` (accept the self-signed certificate warning for local dev).

## Architecture

```
┌─────────────────┐    HTTPS    ┌──────────┐
│  CrypCal Client  │ ──────────▶│  Caddy   │
│  (React PWA)    │    :443    │(Rev Proxy)│
└─────────────────┘            └──────────┘
         │                          │
         │ WebRTC                   ├── /_matrix/*  → Synapse
         │                          ├── /lk-jwt/*   → lk-jwt-service
         ▼                          └── /livekit/*  → LiveKit SFU
┌─────────────────┐
│   LiveKit SFU   │◀── JWT auth ── lk-jwt-service
│  (Media Server) │
└─────────────────┘            ┌──────────┐
         │                      │PostgreSQL│
    TURN relay                  └──────────┘
         │
┌─────────────────┐
│     coturn       │
│  (TURN/STUN)    │
└─────────────────┘
```

## Stack

| Component | Technology | License |
|-----------|-----------|---------|
| Protocol | Matrix | Apache-2.0 |
| Homeserver | Synapse | Apache-2.0 |
| Database | PostgreSQL 16 | PostgreSQL |
| Reverse Proxy | Caddy | Apache-2.0 |
| TURN/STUN | coturn | BSD |
| SFU | LiveKit | Apache-2.0 |
| JWT Auth | lk-jwt-service | Apache-2.0 |
| Client | React 19 + Vite | MIT |
| Crypto | matrix-sdk-crypto-wasm (Rust) | Apache-2.0 |
| CSS | Tailwind CSS 4 | MIT |
| Icons | Lucide | ISC |
| State | Zustand | MIT |

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Decisions](docs/DECISIONS.md)
- [Threat Model](docs/THREAT-MODEL.md)
- [Security](docs/SECURITY.md)
- [Licenses](docs/LICENSES.md)
- [Plan](docs/PLAN.md)

## Development

```bash
# Install client dependencies
cd apps/web
npm install

# Start dev server (with proxy to local Caddy)
npm run dev

# Type check
npm run typecheck

# Lint
npm run lint

# Test
npm run test
```

## License

[Apache-2.0](LICENSE)
