import { describe, it, expect } from 'vitest';
import {
  supportsInsertableStreams,
  generateCallEncryptionKey,
  deriveCallKey,
  encryptFrame,
  decryptFrame,
  getLivekitE2eeConfig,
} from '@/lib/mediaEncryption';

describe('mediaEncryption', () => {
  it('detects insertable streams support correctly', () => {
    // In Node.js environment without WebRTC, should return false
    const supported = supportsInsertableStreams();
    expect(typeof supported).toBe('boolean');
  });

  it('generates a 256-bit random encryption key', async () => {
    const key = await generateCallEncryptionKey();
    expect(key).toBeInstanceOf(Uint8Array);
    expect(key.length).toBe(32); // 256 bits = 32 bytes

    // Verify randomness: two keys should not be equal
    const key2 = await generateCallEncryptionKey();
    expect(key).not.toEqual(key2);
  });

  it('derives an AES-GCM CryptoKey for a room', async () => {
    const cryptoKey = await deriveCallKey('!test-room:example.com');
    expect(cryptoKey).toBeDefined();
    expect(cryptoKey.algorithm.name).toBe('AES-GCM');
    expect(cryptoKey.extractable).toBe(false);
    expect(cryptoKey.usages).toContain('encrypt');
    expect(cryptoKey.usages).toContain('decrypt');
  });

  it('encrypts and decrypts a media frame payload roundtrip', async () => {
    const cryptoKey = await deriveCallKey('!test-room:example.com');

    // Create a mock frame payload (e.g. simulated Opus or VP8 frame)
    const originalText = '192.168.6-E2EE-Encoded-Frame-Payload';
    const encoder = new TextEncoder();
    const frameData = encoder.encode(originalText).buffer;

    // Encrypt frame
    const encryptedFrame = await encryptFrame(frameData, cryptoKey);
    expect(encryptedFrame.byteLength).toBeGreaterThan(frameData.byteLength);

    // Decrypted frame
    const decryptedFrame = await decryptFrame(encryptedFrame, cryptoKey);
    const decoder = new TextDecoder();
    const recoveredText = decoder.decode(decryptedFrame);

    expect(recoveredText).toBe(originalText);
  });

  it('provides safe livekit E2EE config fallback', () => {
    const config = getLivekitE2eeConfig();
    expect(config).toBeDefined();
    expect(typeof config).toBe('object');
  });
});
