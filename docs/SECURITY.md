# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 0.x (current) | ✅ Active development |

## Reporting a Vulnerability

If you discover a security vulnerability in CrypCal, please report it responsibly.

### How to Report

1. **Do NOT open a public GitHub issue** for security vulnerabilities.
2. Send an email to: `security@crypcal.example.com` (replace with your actual contact)
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

### What to Expect

- **Acknowledgement**: Within 48 hours of your report
- **Initial assessment**: Within 5 business days
- **Fix timeline**: Critical vulnerabilities patched within 7 days; High within 14 days
- **Disclosure**: Coordinated disclosure after the fix is released. We will credit you unless you prefer anonymity.

### Scope

The following are in scope:
- CrypCal web client (`apps/web/`)
- Infrastructure configurations (`infra/`)
- Setup and deployment scripts (`scripts/`)
- Any dependency that we ship or configure

The following are out of scope:
- Vulnerabilities in upstream projects (Synapse, LiveKit, coturn) — report these to the respective projects
- Social engineering attacks
- Denial of service attacks against the infrastructure

## Security Best Practices for Deployers

1. **Keep software updated**: Run `docker compose pull` regularly to get security patches
2. **Use strong secrets**: Always run the setup script to generate cryptographic secrets; never use defaults
3. **Enable disk encryption**: Use LUKS or cloud disk encryption for the PostgreSQL volume
4. **Restrict SSH access**: Use key-based authentication, disable root login
5. **Monitor logs**: Check Caddy and Synapse logs for unusual activity
6. **Backup regularly**: Maintain off-site backups of the PostgreSQL database and Synapse media store
7. **Review the threat model**: Understand what the server operator can and cannot see in `docs/THREAT-MODEL.md`

## Cryptographic Primitives

CrypCal relies on the following audited cryptographic implementations:

| Purpose | Algorithm | Implementation |
|---------|-----------|---------------|
| Message encryption | Megolm (AES-256-CTR + HMAC-SHA-256) | matrix-sdk-crypto-wasm (Rust) |
| Key exchange | Olm (Double Ratchet, Curve25519) | matrix-sdk-crypto-wasm (Rust) |
| Password hashing | Argon2id | Synapse (server-side) |
| TLS | TLS 1.3 (AES-256-GCM) | Caddy |
| Media encryption | AES-128-CTR (attachments) | matrix-js-sdk |
| Call media encryption | SFrame / Insertable Streams | livekit-client |
