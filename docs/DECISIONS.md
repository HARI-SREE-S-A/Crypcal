# Architecture Decision Records

Decisions are recorded in reverse chronological order. Each entry is immutable once written; supersede with a new entry if a decision changes.

---

## ADR-005: Setup Script in Both PowerShell and Bash

**Date:** 2026-09-14
**Status:** Accepted
**Context:** The development environment is Windows, but the deployment target is Linux (Oracle Cloud ARM). The setup script needs to generate secrets and configuration files.
**Decision:** Provide `scripts/setup.ps1` for Windows local development and `scripts/setup.sh` for Linux deployment. Both generate identical `.env` files and configs.
**Consequence:** Developers on either OS can set up the project without additional tooling.

---

## ADR-004: Self-Signed Certs for Development, Let's Encrypt for Production

**Date:** 2026-09-14
**Status:** Accepted
**Context:** TLS is required everywhere (HTTPS, TURN-TLS). Local development needs certs but can't use Let's Encrypt without a public domain.
**Decision:** Setup script generates self-signed certs for local dev. Caddy handles automatic Let's Encrypt in production mode. The `TLS_MODE` env var switches between modes.
**Consequence:** `make up` works immediately after `make setup` without any domain registration.

---

## ADR-003: Synapse over Conduwuit/Tuwunel

**Date:** 2026-09-14
**Status:** Accepted
**Context:** Rust homeservers (Conduwuit, Tuwunel) offer lower resource usage but need evaluation for MatrixRTC stability and full MSC support.
**Decision:** Use Synapse (Python, Apache-2.0) for Milestone 1. It has the most complete MatrixRTC support, native Simplified Sliding Sync (MSC4186) since v1.114, and the largest deployment base. Document Conduwuit as a future option if resource constraints arise.
**Consequence:** Higher memory usage (~300-500 MB) but guaranteed feature coverage. The 24 GB Oracle Cloud free tier makes this a non-issue.

---

## ADR-002: React 19 + Vite over SvelteKit

**Date:** 2026-09-14
**Status:** Accepted
**Context:** User preference for React. The `matrix-js-sdk` is a JavaScript SDK with first-class React integration patterns. Element Call (the reference MatrixRTC client) is React-based.
**Decision:** React 19 + Vite + TypeScript. Tailwind CSS 4 for styling per user preference.
**Consequence:** Larger ecosystem, easier to reference Element Call's patterns, but slightly larger bundle than SvelteKit equivalent. Bundle target (< 400 KB gzipped) is still achievable with tree-shaking.

---

## ADR-001: Matrix Protocol as the Foundation

**Date:** 2026-09-14
**Status:** Accepted
**Context:** Need an open, E2EE-by-default messaging protocol with voice/video support. Alternatives considered: XMPP (Jabber), Signal Protocol (custom server), custom WebSocket protocol.
**Decision:** Matrix protocol with Synapse homeserver. Reasons:
- Open standard with formal spec (matrix.org)
- E2EE (Olm/Megolm) built into the protocol
- MatrixRTC (MSC4143) provides native WebRTC calling via SFU
- Federation-capable (disabled by default per spec, but available)
- Rich SDK ecosystem (`matrix-js-sdk` with Rust crypto)
- Active development and audited cryptography
**Consequence:** Depends on Matrix ecosystem health. Protocol complexity is higher than a custom WebSocket solution, but security and interoperability benefits outweigh this.
