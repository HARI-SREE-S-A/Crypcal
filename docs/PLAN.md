# CrypCal — Project Plan

## Milestones

### Milestone 1: Infrastructure Up — E2EE Chat via Element Web ⏳
**Goal:** Full server stack running with Docker Compose. Two users can exchange encrypted messages using Element Web as a smoke test.

**Deliverables:**
- Docker Compose with Synapse, PostgreSQL, Caddy, coturn, LiveKit, lk-jwt-service
- Hardened Synapse config (no federation, invite-only, E2EE enforced)
- TURN/STUN with HMAC time-limited credentials
- Self-signed TLS for local dev
- Setup script for secret generation
- Smoke test: two Element Web users exchange encrypted messages

**Status:** In progress

---

### Milestone 2: Minimal Custom Client — Encrypted Chat 🔲
**Goal:** CrypCal PWA client with encrypted 1:1 and group messaging.

**Deliverables:**
- Vite + React 19 + TypeScript + Tailwind CSS 4
- Login with username/password
- Conversation list (Screen 1)
- Conversation view with composer (Screen 2)
- E2EE enforced on all rooms
- Device verification (emoji)
- Encryption shield indicators
- Settings sheet
- PWA installability

**Status:** Not started

---

### Milestone 3: Encrypted Voice Calls 🔲
**Goal:** E2E encrypted audio calls via MatrixRTC + LiveKit.

**Deliverables:**
- MatrixRTC session management
- LiveKit JWT auth flow
- Audio-only call UI
- Insertable streams for E2E media encryption
- Latency display

**Status:** Not started

---

### Milestone 4: Video + Simulcast 🔲
**Goal:** Video calls with AV1/VP9 and adaptive bitrate.

**Deliverables:**
- Video track publishing with simulcast
- AV1 preferred, VP9 fallback
- Adaptive bitrate via dynacast
- Video tiles layout

**Status:** Not started

---

### Milestone 5: Hardening + CI + Docs 🔲
**Goal:** Production-ready with full CI pipeline and documentation.

**Deliverables:**
- GitHub Actions pipeline
- Unit tests + E2E Playwright tests
- Security scanning (Trivy, ZAP)
- SBOM generation
- Performance benchmarks
- Full documentation suite

**Status:** Not started
