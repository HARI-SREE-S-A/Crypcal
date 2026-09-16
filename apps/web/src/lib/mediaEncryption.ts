/**
 * E2E Media Encryption — Insertable Streams
 *
 * Wraps LiveKit's built-in E2EE support using the Insertable Streams API
 * (a.k.a. Encoded Transform) to encrypt audio/video frames before they
 * leave the sender's device. The SFU cannot decrypt the frames.
 *
 * This module provides the key management bridge between Matrix cross-signing
 * keys and LiveKit's frame encryption.
 *
 * Browser support: Chrome 86+, Edge 86+, Firefox 117+, Safari 15.4+
 */

/**
 * Check if the browser supports Insertable Streams (Encoded Transform API).
 */
export function supportsInsertableStreams(): boolean {
  return (
    typeof RTCRtpSender !== 'undefined' &&
    'transform' in RTCRtpSender.prototype
  );
}

/**
 * Generate a random encryption key for a call session.
 * Uses Web Crypto API for cryptographic randomness.
 *
 * @returns A 256-bit key as a Uint8Array
 */
export async function generateCallEncryptionKey(): Promise<Uint8Array> {
  const key = new Uint8Array(32); // 256-bit
  crypto.getRandomValues(key);
  return key;
}

/**
 * Derive a shared encryption key from a Matrix room's cross-signing identity.
 *
 * TODO(E2EE): This currently generates a RANDOM key each call, meaning each
 * participant derives a different key and cannot decrypt each other's frames.
 * Must implement proper key sharing via Matrix to-device encrypted events
 * (m.call.encryption_keys) or integrate with MatrixRTC key exchange.
 *
 * @param _roomId - The Matrix room ID (currently unused)
 * @returns A CryptoKey suitable for AES-GCM encryption
 */
export async function deriveCallKey(_roomId: string): Promise<CryptoKey> {
  // WARNING: This does NOT derive a shared key — each participant gets a different key.
  // See TODO above. This function is non-functional for multi-party encryption.
  const rawKey = await generateCallEncryptionKey();

  return crypto.subtle.importKey(
    'raw',
    rawKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

/**
 * Encrypt a single media frame using AES-256-GCM.
 *
 * Frame format: [IV (12 bytes)] [encrypted payload + GCM tag]
 *
 * Note: LiveKit's built-in E2EE handles this automatically when
 * `e2ee` is enabled in the Room options. This function is provided
 * for reference and custom implementations.
 *
 * @param frame - The encoded media frame
 * @param key - The encryption key
 * @returns The encrypted frame with IV prepended
 */
export async function encryptFrame(
  frame: ArrayBuffer,
  key: CryptoKey,
): Promise<ArrayBuffer> {
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    frame,
  );

  // Prepend IV to encrypted data
  const result = new Uint8Array(iv.length + encrypted.byteLength);
  result.set(iv, 0);
  result.set(new Uint8Array(encrypted), iv.length);

  return result.buffer;
}

/**
 * Decrypt a single media frame.
 *
 * @param frame - The encrypted frame (IV + ciphertext)
 * @param key - The decryption key
 * @returns The decrypted frame
 */
export async function decryptFrame(
  frame: ArrayBuffer,
  key: CryptoKey,
): Promise<ArrayBuffer> {
  const data = new Uint8Array(frame);
  const iv = data.slice(0, 12);
  const ciphertext = data.slice(12);

  return crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext,
  );
}

/**
 * Get the E2EE configuration for LiveKit Room.
 *
 * TODO(E2EE): This currently returns an empty config object. LiveKit's
 * built-in frame encryption requires an ExternalE2EEKeyProvider and a
 * Web Worker for SFrame. Implement key injection from Matrix to-device
 * messages when call E2EE is properly integrated.
 *
 * @see https://docs.livekit.io/guides/e2ee/
 */
export function getLivekitE2eeConfig(): { e2ee?: { keyProvider: unknown } } | Record<string, never> {
  if (!supportsInsertableStreams()) {
    console.warn('[E2EE] Insertable Streams not supported — media encryption disabled');
    return {};
  }

  // TODO(E2EE): Return actual E2EE config with ExternalE2EEKeyProvider
  // when key sharing via Matrix to-device events is implemented.
  return {};
}
