# Third-Party Licenses

CrypCal uses only OSI-approved open-source dependencies. This document lists all runtime dependencies and their licenses.

## Client Dependencies

| Package | License | Purpose |
|---------|---------|---------|
| [react](https://github.com/facebook/react) | MIT | UI framework |
| [react-dom](https://github.com/facebook/react) | MIT | React DOM renderer |
| [matrix-js-sdk](https://github.com/matrix-org/matrix-js-sdk) | Apache-2.0 | Matrix protocol client SDK |
| [@matrix-org/matrix-sdk-crypto-wasm](https://github.com/nicktrav/matrix-rust-sdk) | Apache-2.0 | Rust-based E2EE engine (Olm/Megolm) |
| [livekit-client](https://github.com/livekit/client-sdk-js) | Apache-2.0 | LiveKit WebRTC client SDK |
| [zustand](https://github.com/pmndrs/zustand) | MIT | Lightweight state management |
| [lucide-react](https://github.com/lucide-icons/lucide) | ISC | Icon library (tree-shakeable) |

## Dev Dependencies

| Package | License | Purpose |
|---------|---------|---------|
| [vite](https://github.com/vitejs/vite) | MIT | Build tool + dev server |
| [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react) | MIT | React JSX transform |
| [tailwindcss](https://github.com/tailwindlabs/tailwindcss) | MIT | Utility-first CSS framework |
| [@tailwindcss/vite](https://github.com/tailwindlabs/tailwindcss) | MIT | Tailwind Vite plugin |
| [typescript](https://github.com/microsoft/TypeScript) | Apache-2.0 | Type checking |
| [eslint](https://github.com/eslint/eslint) | MIT | Linting |
| [vitest](https://github.com/vitest-dev/vitest) | MIT | Unit testing |
| [@testing-library/react](https://github.com/testing-library/react-testing-library) | MIT | React component testing |
| [playwright](https://github.com/microsoft/playwright) | Apache-2.0 | E2E browser testing |

## Infrastructure

| Component | License | Purpose |
|-----------|---------|---------|
| [Synapse](https://github.com/element-hq/synapse) | Apache-2.0 | Matrix homeserver |
| [PostgreSQL](https://www.postgresql.org/) | PostgreSQL License (BSD-like) | Database |
| [Caddy](https://github.com/caddyserver/caddy) | Apache-2.0 | Reverse proxy + auto TLS |
| [coturn](https://github.com/coturn/coturn) | BSD 3-Clause | TURN/STUN server |
| [LiveKit Server](https://github.com/livekit/livekit) | Apache-2.0 | Selective Forwarding Unit (SFU) |
| [lk-jwt-service](https://github.com/nicktrav/lk-jwt-service) | Apache-2.0 | LiveKit JWT token issuer |

## Font

CrypCal uses the system font stack (`system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`). No custom font files are included.

## Compliance

The CI pipeline includes a `license-checker` step that automatically blocks any dependency with a non-OSI license. The blocked licenses are:

- GPL-2.0 (GPLv2 only, without the "or later" clause — incompatible with our Apache-2.0 license)
- SSPL (Server Side Public License)
- BSL-1.1 (Business Source License)
- BUSL-1.1 (Business Source License)

To verify compliance locally:

```bash
cd apps/web
npx license-checker --failOn "GPL-2.0;SSPL;BSL-1.1;BUSL-1.1"
```
