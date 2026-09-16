/** Application-wide constants */

/** Matrix homeserver base URL — defaults to matrix.org for free hosted deployment */
export const HOMESERVER_URL =
  import.meta.env.VITE_HOMESERVER_URL || 'https://matrix-client.matrix.org';

/** LiveKit JWT service endpoint (only used in self-hosted mode) */
export const LK_JWT_URL =
  import.meta.env.VITE_LK_JWT_URL || `${HOMESERVER_URL}/lk-jwt`;

/** App name shown in UI */
export const APP_NAME = '192.168.6';

/** Encryption algorithm — Megolm, always */
export const ENCRYPTION_ALGORITHM = 'm.megolm.v1.aes-sha2';

/** Supabase configuration (free tier — user registry + admin approval) */
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

/** Media constraints */
export const AUDIO_CONSTRAINTS: MediaTrackConstraints = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
};

export const VIDEO_CONSTRAINTS: MediaTrackConstraints = {
  width: { ideal: 1280 },
  height: { ideal: 720 },
  frameRate: { ideal: 30, max: 30 },
};
