# CrypCal Architecture

## System Overview

CrypCal is a self-hostable, end-to-end encrypted chat and calling application built on the Matrix protocol. All server components run as Docker containers orchestrated by Docker Compose.

## Component Diagram

```mermaid
graph TB
    subgraph Client["CrypCal PWA Client"]
        direction TB
        UI["React 19 UI"]
        SDK["matrix-js-sdk"]
        Crypto["Rust Crypto WASM<br/>(Olm/Megolm E2EE)"]
        LKClient["livekit-client<br/>(WebRTC)"]
        IDB["IndexedDB<br/>(Encrypted Store)"]
    end

    subgraph Proxy["Reverse Proxy"]
        Caddy["Caddy 2<br/>(TLS 1.3, Security Headers)"]
    end

    subgraph Server["Application Servers"]
        Synapse["Synapse<br/>(Matrix Homeserver)"]
        JWT["lk-jwt-service<br/>(MatrixRTC Auth)"]
        LK["LiveKit SFU<br/>(Media Server)"]
    end

    subgraph Data["Data Layer"]
        PG["PostgreSQL 16<br/>(Encrypted at rest)"]
    end

    subgraph Network["Network Services"]
        CoTURN["coturn<br/>(TURN/STUN)"]
    end

    UI --> SDK
    UI --> LKClient
    SDK --> Crypto
    SDK --> IDB
    Crypto --> IDB

    SDK -->|"HTTPS :443"| Caddy
    LKClient -->|"WSS :443"| Caddy
    LKClient -->|"WebRTC UDP/TCP"| LK
    LKClient -->|"TURN relay"| CoTURN

    Caddy -->|"/_matrix/*"| Synapse
    Caddy -->|"/lk-jwt/*"| JWT
    Caddy -->|"/livekit/*"| LK

    Synapse --> PG
    JWT --> LK
    Synapse -.->|"TURN credentials"| CoTURN
```

## Data Flow

### Message Flow (E2EE)

```mermaid
sequenceDiagram
    participant A as Alice (Client)
    participant S as Synapse (Server)
    participant B as Bob (Client)

    Note over A: Plaintext message
    A->>A: Encrypt with Megolm session key
    A->>S: Send encrypted event (ciphertext)
    Note over S: Server sees only ciphertext.<br/>Cannot decrypt.
    S->>B: Deliver encrypted event
    B->>B: Decrypt with Megolm session key
    Note over B: Plaintext message
```

### Call Flow (MatrixRTC + LiveKit)

```mermaid
sequenceDiagram
    participant A as Alice
    participant S as Synapse
    participant JWT as lk-jwt-service
    participant LK as LiveKit SFU
    participant B as Bob

    A->>S: Send m.call.member state event
    S->>B: Deliver call state event
    A->>JWT: Request LiveKit token (Matrix auth)
    JWT->>JWT: Validate Matrix access token
    JWT->>A: Return LiveKit JWT
    A->>LK: Connect (WebRTC + JWT)
    B->>JWT: Request LiveKit token
    JWT->>B: Return LiveKit JWT
    B->>LK: Connect (WebRTC + JWT)
    Note over LK: SFU forwards encrypted<br/>media frames it cannot decrypt
    A->>LK: Encrypted audio/video
    LK->>B: Forward encrypted audio/video
```

## Security Architecture

### Trust Boundaries

1. **Client boundary**: The client holds all encryption keys. E2EE happens entirely within the client. The server never has access to plaintext content.
2. **Server boundary**: The server processes encrypted events and metadata (timestamps, room membership, typing indicators). It cannot read message content or media.
3. **Network boundary**: All traffic is TLS 1.3 encrypted. WebRTC media uses DTLS-SRTP with additional E2E encryption via insertable streams.

### Key Management

- **Olm**: 1:1 ratcheting protocol for key exchange between devices
- **Megolm**: Group encryption for room messages (one key per session)
- **Cross-signing**: Device verification chains anchored to a master signing key
- **Key backup**: Encrypted server-side backup with user-held recovery key (AES-256)

### What the Server Operator Can See

| Data | Visible to Server? |
|------|:------------------:|
| Message content | ❌ No |
| File content | ❌ No |
| Call audio/video | ❌ No |
| Who is talking to whom | ✅ Yes (room membership) |
| When messages are sent | ✅ Yes (timestamps) |
| Message size | ✅ Yes (ciphertext length) |
| User presence/online status | ✅ Yes |
| Device IDs | ✅ Yes |
| IP addresses | ⚠️ Minimized (rate-limiting only) |

## Directory Structure

```
CrypCal/
├── apps/web/              # React PWA client
│   ├── src/
│   │   ├── components/    # UI components
│   │   ├── hooks/         # React hooks (rooms, timeline, call)
│   │   ├── lib/           # Core: Matrix client, store, encryption
│   │   └── utils/         # Helpers
│   └── public/            # Static assets, PWA manifest
├── infra/                 # Docker Compose infrastructure
│   ├── caddy/             # Reverse proxy config
│   ├── synapse/           # Homeserver config
│   ├── coturn/            # TURN/STUN config
│   ├── livekit/           # SFU config
│   └── postgres/          # Database init
├── scripts/               # Setup, perf, TLS check
└── docs/                  # Documentation
```
