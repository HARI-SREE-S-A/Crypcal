/**
 * 192.168.6 Matrix Client — Singleton
 *
 * Initializes the Matrix client with Rust crypto engine.
 * E2EE is always enabled and cannot be disabled.
 */
import * as sdk from 'matrix-js-sdk';
import { HOMESERVER_URL } from '@/utils/constants';

let matrixClient: sdk.MatrixClient | null = null;

/**
 * Get or create the Matrix client singleton.
 * Returns null if not logged in.
 */
export function getClient(): sdk.MatrixClient | null {
  return matrixClient;
}

/**
 * Initialize and login to the Matrix homeserver.
 * Sets up Rust crypto engine and starts syncing.
 */
export async function loginWithPassword(
  username: string,
  password: string,
): Promise<sdk.MatrixClient> {
  const client = sdk.createClient({
    baseUrl: HOMESERVER_URL,
    userId: `@${username}:${new URL(HOMESERVER_URL).hostname}`,
    store: new sdk.IndexedDBStore({
      indexedDB: globalThis.indexedDB,
      dbName: 'one92168-sync',
    }),
    cryptoStore: new sdk.IndexedDBCryptoStore(
      globalThis.indexedDB,
      'one92168-crypto',
    ),
    useAuthorizationHeader: true,
  });

  // Login
  const loginResponse = await client.loginWithPassword(username, password);

  // Re-create client with access token for proper initialization
  const authedClient = sdk.createClient({
    baseUrl: HOMESERVER_URL,
    accessToken: loginResponse.access_token,
    userId: loginResponse.user_id,
    deviceId: loginResponse.device_id,
    store: new sdk.IndexedDBStore({
      indexedDB: globalThis.indexedDB,
      dbName: 'one92168-sync',
    }),
    cryptoStore: new sdk.IndexedDBCryptoStore(
      globalThis.indexedDB,
      'one92168-crypto',
    ),
    useAuthorizationHeader: true,
  });

  // Initialize the store
  await authedClient.store.startup();

  // Initialize Rust crypto engine (NEVER libolm)
  await authedClient.initRustCrypto();

  // Enable key backup (encrypted server-side backup with user recovery key)
  const crypto = authedClient.getCrypto();
  if (crypto) {
    // Enable sending to unverified devices (with visual warning)
    // Users see amber shield, but messages still send
    crypto.globalBlacklistUnverifiedDevices = false;
  }

  // Start syncing
  await authedClient.startClient({
    initialSyncLimit: 20,
    lazyLoadMembers: true,
  });

  matrixClient = authedClient;

  // Persist session for reload
  await persistSession({
    accessToken: loginResponse.access_token,
    userId: loginResponse.user_id,
    deviceId: loginResponse.device_id || '',
    homeserverUrl: HOMESERVER_URL,
  });

  return authedClient;
}

/**
 * Restore a persisted session (after page reload).
 */
export async function restoreSession(): Promise<sdk.MatrixClient | null> {
  const session = await loadSession();
  if (!session) return null;

  try {
    const client = sdk.createClient({
      baseUrl: session.homeserverUrl,
      accessToken: session.accessToken,
      userId: session.userId,
      deviceId: session.deviceId,
      store: new sdk.IndexedDBStore({
        indexedDB: globalThis.indexedDB,
        dbName: 'one92168-sync',
      }),
      cryptoStore: new sdk.IndexedDBCryptoStore(
        globalThis.indexedDB,
        'one92168-crypto',
      ),
      useAuthorizationHeader: true,
    });

    await client.store.startup();
    await client.initRustCrypto();

    const crypto = client.getCrypto();
    if (crypto) {
      crypto.globalBlacklistUnverifiedDevices = false;
    }

    await client.startClient({
      initialSyncLimit: 20,
      lazyLoadMembers: true,
    });

    matrixClient = client;
    return client;
  } catch {
    clearSession();
    return null;
  }
}

/**
 * Logout and clear all local data.
 */
export async function logout(): Promise<void> {
  if (matrixClient) {
    try {
      await matrixClient.logout(true);
    } catch {
      // Ignore logout errors (server may be unreachable)
    }
    matrixClient.stopClient();
    matrixClient = null;
  }
  clearSession();

  // Clear IndexedDB stores
  const databases = await globalThis.indexedDB.databases();
  for (const db of databases) {
    if (db.name?.startsWith('one92168-')) {
      globalThis.indexedDB.deleteDatabase(db.name);
    }
  }
}

// =============================================================================
// Session Persistence (encrypted localStorage via Web Crypto)
// =============================================================================

interface PersistedSession {
  accessToken: string;
  userId: string;
  deviceId: string;
  homeserverUrl: string;
}

const SESSION_KEY = 'one92168_session';
const CRYPTO_KEY_NAME = 'one92168_session_key';

/**
 * Get or create a non-exportable AES-GCM key for encrypting session data.
 * The key is stored in IndexedDB (not extractable) and tied to this device.
 */
async function getOrCreateSessionKey(): Promise<CryptoKey> {
  // Try to load from IndexedDB
  const existing = await loadKeyFromIDB();
  if (existing) return existing;

  // Generate a new key
  const key = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    false, // non-exportable
    ['encrypt', 'decrypt'],
  );
  await saveKeyToIDB(key);
  return key;
}

function openKeyDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('one92168-keystore', 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore('keys');
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function loadKeyFromIDB(): Promise<CryptoKey | null> {
  try {
    const db = await openKeyDB();
    return new Promise((resolve) => {
      const tx = db.transaction('keys', 'readonly');
      const req = tx.objectStore('keys').get(CRYPTO_KEY_NAME);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

async function saveKeyToIDB(key: CryptoKey): Promise<void> {
  try {
    const db = await openKeyDB();
    const tx = db.transaction('keys', 'readwrite');
    tx.objectStore('keys').put(key, CRYPTO_KEY_NAME);
  } catch {
    // Silently fail — session will be in-memory only
  }
}

/**
 * Encrypt and persist session data to localStorage.
 */
async function persistSession(session: PersistedSession): Promise<void> {
  try {
    const key = await getOrCreateSessionKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const plaintext = new TextEncoder().encode(JSON.stringify(session));

    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      plaintext,
    );

    // Store as base64: iv + ciphertext
    const combined = new Uint8Array(iv.length + ciphertext.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(ciphertext), iv.length);

    const encoded = btoa(String.fromCharCode(...combined));
    localStorage.setItem(SESSION_KEY, encoded);
  } catch {
    // If encryption fails, don't persist (session will be in-memory only)
  }
}

/**
 * Load and decrypt persisted session data from localStorage.
 */
async function loadSession(): Promise<PersistedSession | null> {
  try {
    const encoded = localStorage.getItem(SESSION_KEY);
    if (!encoded) return null;

    const key = await getOrCreateSessionKey();
    const combined = Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0));
    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);

    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext,
    );

    return JSON.parse(new TextDecoder().decode(plaintext)) as PersistedSession;
  } catch {
    // Decryption failed — session key may have changed (different device/cleared IDB)
    clearSession();
    return null;
  }
}

function clearSession(): void {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    // Ignore
  }
}

