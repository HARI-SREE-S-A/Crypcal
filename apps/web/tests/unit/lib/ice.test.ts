import { describe, it, expect, vi } from 'vitest';
import {
  buildIceServers,
  scoreCandidatePriority,
  logIceCandidate,
} from '@/lib/ice';

describe('ICE candidate preference logic', () => {
  it('builds ICE servers with TURN-UDP, TURN-TCP, TURNS, and STUN', () => {
    const servers = buildIceServers('turn.example.com', 'alice', 'secret123');

    expect(servers).toHaveLength(4);
    // UDP relay first
    expect(servers[0].urls).toBe('turn:turn.example.com:3478?transport=udp');
    expect(servers[0].username).toBe('alice');
    expect(servers[0].credential).toBe('secret123');

    // TCP fallback second
    expect(servers[1].urls).toBe('turn:turn.example.com:443?transport=tcp');

    // TURNS TLS third
    expect(servers[2].urls).toBe('turns:turn.example.com:443?transport=tcp');

    // STUN fourth
    expect(servers[3].urls).toBe('stun:turn.example.com:3478');
  });

  it('scores candidates by type and transport protocol', () => {
    // Host UDP candidate: score 300 + 50 = 350
    const hostUdp = {
      candidate: 'candidate:1 1 udp 2130706431 192.168.1.100 50000 typ host',
    } as RTCIceCandidate;
    expect(scoreCandidatePriority(hostUdp)).toBe(350);

    // Host TCP candidate: score 300
    const hostTcp = {
      candidate: 'candidate:2 1 tcp 2130706431 192.168.1.100 50000 typ host',
    } as RTCIceCandidate;
    expect(scoreCandidatePriority(hostTcp)).toBe(300);

    // Server reflexive UDP: 200 + 50 = 250
    const srflxUdp = {
      candidate: 'candidate:3 1 udp 1694498815 203.0.113.1 50000 typ srflx',
    } as RTCIceCandidate;
    expect(scoreCandidatePriority(srflxUdp)).toBe(250);

    // Relay UDP (TURN): 100 + 50 = 150
    const relayUdp = {
      candidate: 'candidate:4 1 udp 16777215 198.51.100.1 50000 typ relay',
    } as RTCIceCandidate;
    expect(scoreCandidatePriority(relayUdp)).toBe(150);

    // Relay TCP (TURN): 100
    const relayTcp = {
      candidate: 'candidate:5 1 tcp 16777215 198.51.100.1 50000 typ relay',
    } as RTCIceCandidate;
    expect(scoreCandidatePriority(relayTcp)).toBe(100);

    // Empty or malformed candidate
    const emptyCandidate = { candidate: '' } as RTCIceCandidate;
    expect(scoreCandidatePriority(emptyCandidate)).toBe(0);
  });

  it('logs ICE candidate information', () => {
    const consoleSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    const candidate = {
      candidate: 'candidate:1 1 udp 2130706431 192.168.1.100 50000 typ host',
      sdpMid: '0',
    } as RTCIceCandidate;

    logIceCandidate(candidate, 'local');
    // In test environment (not PROD), it should log
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
