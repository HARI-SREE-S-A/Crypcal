# CrypCal Threat Model

## Assets

| Asset | Description | Sensitivity |
|-------|-------------|-------------|
| Message content | Text messages between users | **Critical** — Must never be readable by server |
| Media files | Images, documents, audio, video | **Critical** — Encrypted as m.file/EncryptedFile |
| Call media | Voice and video streams | **Critical** — E2E encrypted via insertable streams |
| Encryption keys | Olm/Megolm session keys, device keys, cross-signing keys | **Critical** — Stored only on user devices |
| Recovery key | Server-side key backup passphrase/key | **Critical** — Known only to user |
| Access tokens | Matrix session tokens | **High** — Allow account access |
| User metadata | Usernames, room membership, timestamps, online status | **Medium** — Visible to server operator |
| Server secrets | DB password, TURN secret, LiveKit API key, signing keys | **High** — Compromise enables service disruption |

## Adversaries

### 1. Passive Network Observer
**Capability**: Can observe encrypted network traffic.
**Mitigations**:
- TLS 1.3 on all HTTP traffic (Caddy)
- DTLS-SRTP on WebRTC media (LiveKit)
- TURN-TLS-443 fallback (coturn)
- HSTS with preload

### 2. Malicious Server Operator
**Capability**: Full access to the server, database, and logs.
**What they CAN see**: Room membership, message timestamps, ciphertext sizes, user presence, device IDs.
**What they CANNOT see**: Message plaintext, file contents, call audio/video.
**Mitigations**:
- E2EE (Megolm) for all messages — server stores only ciphertext
- E2E media encryption via insertable streams — SFU forwards frames it cannot decrypt
- Device cross-signing — users verify each other's devices directly
- No content in server logs
- No IP address logging beyond rate limiting

### 3. Compromised Device
**Capability**: Access to a user's device (stolen phone, malware).
**Mitigations**:
- Session tokens can be revoked remotely
- Per-device encryption keys — compromising one device doesn't reveal past messages from other devices (with proper key rotation)
- Device verification — other users see the device as unverified
- IndexedDB stores are per-origin and encrypted by the SDK

### 4. Supply Chain Attack
**Capability**: Inject malicious code via compromised dependencies.
**Mitigations**:
- `npm audit` and `pip-audit` in CI pipeline
- Dependabot/Renovate for automated updates
- `license-checker` blocks non-OSI dependencies
- Trivy container scanning
- SBOM generated with Syft
- Reproducible builds with `npm ci` + pinned lockfile
- Subresource integrity on script tags
- All assets self-hosted (no CDNs)

### 5. Brute Force / Credential Stuffing
**Capability**: Automated login attempts.
**Mitigations**:
- Rate limiting on login endpoint (0.5/s, burst 3)
- Failed attempt rate limiting (0.1/s, burst 5)
- Minimum password length: 12 characters
- Argon2id password hashing (server-side)
- TOTP 2FA support (future: via MAS)
- Registration is invite-only (tokens required)

## Trust Boundaries

```
┌──────────────────────────────────────────────────┐
│                  TRUSTED ZONE                     │
│                                                   │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐   │
│  │ Alice's  │    │  Bob's   │    │ Carol's  │   │
│  │ Device   │    │ Device   │    │ Device   │   │
│  │(has keys)│    │(has keys)│    │(has keys)│   │
│  └────┬─────┘    └────┬─────┘    └────┬─────┘   │
│       │               │               │          │
├───────┼───────────────┼───────────────┼──────────┤
│       │          TRUST BOUNDARY       │          │
├───────┼───────────────┼───────────────┼──────────┤
│       │               │               │          │
│  ┌────▼───────────────▼───────────────▼─────┐   │
│  │              UNTRUSTED ZONE               │   │
│  │                                           │   │
│  │  ┌────────┐  ┌────────┐  ┌──────────┐   │   │
│  │  │Synapse │  │LiveKit │  │ coturn   │   │   │
│  │  │(stores │  │(routes │  │(relays   │   │   │
│  │  │cipher- │  │encrypt-│  │encrypted │   │   │
│  │  │text)   │  │ed      │  │traffic)  │   │   │
│  │  │        │  │frames) │  │          │   │   │
│  │  └────────┘  └────────┘  └──────────┘   │   │
│  │                                           │   │
│  └───────────────────────────────────────────┘   │
│                                                   │
└──────────────────────────────────────────────────┘
```

## Security Controls Summary

| Control | Implementation | Status |
|---------|---------------|--------|
| E2EE (messages) | Megolm via matrix-sdk-crypto-wasm | ✅ Enforced |
| E2EE (calls) | Insertable streams via LiveKit | ✅ Implemented |
| E2EE cannot be disabled | No UI toggle; rooms always created encrypted | ✅ Enforced |
| Device verification | Emoji SAS via Matrix cross-signing | ✅ Implemented |
| TLS 1.3 | Caddy configuration | ✅ Configured |
| CSP headers | Caddy + meta tags (no unsafe-inline) | ✅ Configured |
| HSTS | Caddy with preload | ✅ Configured |
| Rate limiting | Synapse rc_login config | ✅ Configured |
| Invite-only registration | Synapse enable_registration: false | ✅ Configured |
| No content logging | Synapse log.config suppressions | ✅ Configured |
| Dependency auditing | npm audit + pip-audit in CI | 🔲 Milestone 5 |
| Container scanning | Trivy in CI | 🔲 Milestone 5 |
| SBOM | Syft in CI | 🔲 Milestone 5 |
