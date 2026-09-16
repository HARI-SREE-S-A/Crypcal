/**
 * ICE candidate preference logic.
 *
 * Prioritizes UDP relay candidates over TCP for lowest latency.
 * Falls back to TCP only when UDP is blocked by restrictive firewalls.
 *
 * Usage: Pass these ICE servers to the LiveKit Room constructor or
 * configure in livekit.yaml server-side.
 */

/**
 * Build the ICE server configuration for WebRTC.
 * Prefers TURN-UDP, then TURN-TCP-443 (firewall-friendly), then STUN.
 */
export function buildIceServers(
  turnDomain: string,
  turnUsername: string,
  turnCredential: string,
): RTCIceServer[] {
  return [
    // 1. TURN over UDP (lowest latency)
    {
      urls: `turn:${turnDomain}:3478?transport=udp`,
      username: turnUsername,
      credential: turnCredential,
    },
    // 2. TURN over TCP on port 443 (firewall-friendly fallback)
    {
      urls: `turn:${turnDomain}:443?transport=tcp`,
      username: turnUsername,
      credential: turnCredential,
    },
    // 3. TURNS over TLS on port 443 (encrypted fallback)
    {
      urls: `turns:${turnDomain}:443?transport=tcp`,
      username: turnUsername,
      credential: turnCredential,
    },
    // 4. STUN (for direct connections when possible)
    {
      urls: `stun:${turnDomain}:3478`,
    },
  ];
}

/**
 * Filter ICE candidates by preference.
 *
 * Orders: host > srflx > relay
 * Within relay: UDP > TCP
 *
 * @param candidate - The RTCIceCandidate to evaluate
 * @returns Priority score (higher = preferred). Returns 0 for unusable candidates.
 */
export function scoreCandidatePriority(candidate: RTCIceCandidate): number {
  const candidateStr = candidate.candidate;
  if (!candidateStr) return 0;

  // Parse candidate type
  const typeMatch = candidateStr.match(/typ (\w+)/);
  const type = typeMatch?.[1] || '';

  // Parse transport protocol
  const isUdp = candidateStr.includes(' udp ') || candidateStr.includes(' UDP ');

  let score = 0;

  // Base score by type (host best for LAN, relay best for NAT traversal)
  switch (type) {
    case 'host':
      score = 300;
      break;
    case 'srflx': // Server Reflexive
      score = 200;
      break;
    case 'prflx': // Peer Reflexive
      score = 150;
      break;
    case 'relay': // TURN relay
      score = 100;
      break;
    default:
      score = 50;
  }

  // Prefer UDP over TCP (+50 bonus)
  if (isUdp) {
    score += 50;
  }

  return score;
}

/**
 * Log ICE candidate information for debugging.
 * Only logs in development mode.
 */
export function logIceCandidate(candidate: RTCIceCandidate, direction: 'local' | 'remote'): void {
  if (import.meta.env.PROD) return;

  const candidateStr = candidate.candidate;
  if (!candidateStr) return;

  const typeMatch = candidateStr.match(/typ (\w+)/);
  const type = typeMatch?.[1] || 'unknown';
  const score = scoreCandidatePriority(candidate);

  console.debug(
    `[ICE] ${direction} candidate: type=${type} score=${score} sdpMid=${candidate.sdpMid}`,
  );
}
