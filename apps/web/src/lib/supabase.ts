/**
 * 192.168.6 User Management & Messaging Client.
 *
 * Provides:
 * - Direct registration with Name + Password/PIN (NO Matrix account needed)
 * - Automatic unique 6-character Short ID generation (e.g. ABC123)
 * - Admin approval workflow
 * - Authentication by Short ID or Name
 * - Room message persistence with cross-tab/realtime synchronization
 * - Full local fallback (works 100% in browser even before Supabase keys are configured)
 */
import { generateShortId } from './shortId';

export interface UserRecord {
  id: string;
  short_id: string;
  display_name: string;
  password_hash?: string;
  status: 'pending' | 'approved' | 'rejected';
  is_admin: boolean;
  created_at: string;
  approved_at?: string;
}

export interface StoredMessage {
  eventId: string;
  sender: string;
  senderName: string;
  content: string;
  timestamp: number;
  isMe: boolean;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || 'admin1921686';

const USERS_STORAGE_KEY = 'one92168_registered_users';
const MESSAGES_STORAGE_KEY = 'one92168_room_messages';

let inMemoryUsers: UserRecord[] = [];
let inMemoryMessages: Record<string, StoredMessage[]> = {};

/**
 * Hash a password using Web Crypto SHA-256.
 */
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`one92168_salt_${password}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Get users from local storage or memory.
 */
function getLocalUsers(): UserRecord[] {
  if (typeof localStorage !== 'undefined') {
    try {
      const raw = localStorage.getItem(USERS_STORAGE_KEY);
      if (!raw) return [];
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }
  return inMemoryUsers;
}

/**
 * Save users to local store or memory.
 */
function saveLocalUsers(users: UserRecord[]): void {
  inMemoryUsers = users;
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
    } catch (err) {
      console.warn('[Storage] Could not persist users:', err);
    }
  }
}

/**
 * Get all room messages from local store.
 */
export function getLocalRoomMessages(roomId: string): StoredMessage[] {
  if (typeof localStorage !== 'undefined') {
    try {
      const raw = localStorage.getItem(MESSAGES_STORAGE_KEY);
      if (!raw) return [];
      const all = JSON.parse(raw);
      return all[roomId] || [];
    } catch {
      return [];
    }
  }
  return inMemoryMessages[roomId] || [];
}

/**
 * Save a message to the room's persistent history.
 */
export function saveLocalRoomMessage(roomId: string, message: StoredMessage): void {
  if (typeof localStorage !== 'undefined') {
    try {
      const raw = localStorage.getItem(MESSAGES_STORAGE_KEY);
      const all = raw ? JSON.parse(raw) : {};
      if (!all[roomId]) all[roomId] = [];
      all[roomId].push(message);
      localStorage.setItem(MESSAGES_STORAGE_KEY, JSON.stringify(all));
    } catch (err) {
      console.warn('[Storage] Could not persist message:', err);
    }
  }
  if (!inMemoryMessages[roomId]) inMemoryMessages[roomId] = [];
  inMemoryMessages[roomId].push(message);
}

/**
 * Clear fallback users for testing.
 */
export function resetLocalUsersForTesting(): void {
  inMemoryUsers = [];
  inMemoryMessages = {};
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.removeItem(USERS_STORAGE_KEY);
      localStorage.removeItem(MESSAGES_STORAGE_KEY);
    } catch {
      // Ignore
    }
  }
}

/**
 * Helper to execute Supabase PostgREST queries when configured.
 */
async function supabaseFetch<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T | null> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return null;
  }

  const url = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/${endpoint.replace(/^\//, '')}`;
  const headers: Record<string, string> = {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
    ...(options.headers as Record<string, string> || {}),
  };

  try {
    const res = await fetch(url, { ...options, headers });
    if (!res.ok) {
      const errorText = await res.text();
      console.warn(`[Supabase] Request failed (${res.status}):`, errorText);
      return null;
    }
    return res.json() as Promise<T>;
  } catch (err) {
    console.warn('[Supabase] Network error:', err);
    return null;
  }
}

/**
 * Verify admin password.
 */
export function verifyAdminPassword(password: string): boolean {
  return password.trim() === ADMIN_PASSWORD;
}

/**
 * Look up approved user by 6-character short ID (e.g. 'KPR472').
 */
export async function lookupByShortId(shortId: string): Promise<UserRecord | null> {
  const normalizedId = shortId.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');

  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    const data = await supabaseFetch<UserRecord[]>(
      `users?short_id=eq.${encodeURIComponent(normalizedId)}&status=eq.approved&select=*`,
    );
    if (data && data.length > 0) return data[0]!;
  }

  const localUsers = getLocalUsers();
  return (
    localUsers.find(
      (u) => u.short_id === normalizedId && u.status === 'approved',
    ) || null
  );
}

/**
 * Check a user's approval status by Short ID or Name.
 */
export async function checkUserStatus(identifier: string): Promise<UserRecord | null> {
  const trimmed = identifier.trim();
  const cleanShortId = trimmed.toUpperCase().replace(/[^A-Z0-9]/g, '');

  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    const query = /^[A-Z]{3}[0-9]{3}$/.test(cleanShortId)
      ? `users?short_id=eq.${encodeURIComponent(cleanShortId)}&select=*`
      : `users?display_name=eq.${encodeURIComponent(trimmed)}&select=*`;

    const data = await supabaseFetch<UserRecord[]>(query);
    if (data && data.length > 0) return data[0]!;
  }

  const localUsers = getLocalUsers();
  return (
    localUsers.find(
      (u) =>
        u.short_id === cleanShortId ||
        u.display_name.toLowerCase() === trimmed.toLowerCase(),
    ) || null
  );
}

/**
 * Request access for a new user with Name and Password/PIN.
 * Assigns a unique 6-character Short ID.
 */
export async function requestAccess(
  displayName: string,
  password = 'pass',
): Promise<UserRecord> {
  let shortId = generateShortId();
  let existing = await lookupByShortId(shortId);
  let attempts = 0;
  while (existing && attempts < 5) {
    shortId = generateShortId();
    existing = await lookupByShortId(shortId);
    attempts++;
  }

  const passwordHash = await hashPassword(password);

  const newRecord: UserRecord = {
    id: typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `usr_${Date.now()}`,
    short_id: shortId,
    display_name: displayName.trim(),
    password_hash: passwordHash,
    status: 'pending',
    is_admin: false,
    created_at: new Date().toISOString(),
  };

  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    const inserted = await supabaseFetch<UserRecord[]>('users', {
      method: 'POST',
      body: JSON.stringify(newRecord),
    });
    if (inserted && inserted.length > 0) {
      return inserted[0]!;
    }
  }

  const localUsers = getLocalUsers();
  const filtered = localUsers.filter(
    (u) => u.display_name.toLowerCase() !== newRecord.display_name.toLowerCase(),
  );
  filtered.push(newRecord);
  saveLocalUsers(filtered);

  return newRecord;
}

/**
 * Authenticate a user by 6-character Short ID or Name and Password.
 */
export async function authenticateUser(
  identifier: string,
  password: string,
): Promise<{ success: boolean; user?: UserRecord; error?: string }> {
  const trimmed = identifier.trim();
  const user = await checkUserStatus(trimmed);

  if (!user) {
    return {
      success: false,
      error: 'User not found. Check your 6-character ID or request access.',
    };
  }

  if (user.status === 'pending') {
    return {
      success: false,
      user,
      error: 'Your account is currently awaiting administrator approval.',
    };
  }

  if (user.status === 'rejected') {
    return {
      success: false,
      user,
      error: 'Your access request was declined by the administrator.',
    };
  }

  // Check password if set
  if (user.password_hash) {
    const testHash = await hashPassword(password);
    if (testHash !== user.password_hash) {
      return { success: false, error: 'Incorrect password or PIN.' };
    }
  }

  return { success: true, user };
}

/**
 * Get all users with status 'pending' (for Admin approval).
 */
export async function getPendingUsers(): Promise<UserRecord[]> {
  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    const data = await supabaseFetch<UserRecord[]>(
      'users?status=eq.pending&order=created_at.desc&select=*',
    );
    if (data) return data;
  }

  return getLocalUsers().filter((u) => u.status === 'pending');
}

/**
 * Get all users (for Admin dashboard).
 */
export async function getAllUsers(): Promise<UserRecord[]> {
  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    const data = await supabaseFetch<UserRecord[]>('users?order=created_at.desc&select=*');
    if (data) return data;
  }

  return getLocalUsers();
}

/**
 * Approve a pending user request.
 */
export async function approveUser(id: string): Promise<boolean> {
  const approvedAt = new Date().toISOString();

  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    await supabaseFetch(`users?id=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'approved', approved_at: approvedAt }),
    });
  }

  const localUsers = getLocalUsers();
  const index = localUsers.findIndex((u) => u.id === id || u.short_id === id);
  if (index !== -1) {
    localUsers[index]!.status = 'approved';
    localUsers[index]!.approved_at = approvedAt;
    saveLocalUsers(localUsers);
    return true;
  }
  return false;
}

/**
 * Reject a pending user request.
 */
export async function rejectUser(id: string): Promise<boolean> {
  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    await supabaseFetch(`users?id=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'rejected' }),
    });
  }

  const localUsers = getLocalUsers();
  const index = localUsers.findIndex((u) => u.id === id || u.short_id === id);
  if (index !== -1) {
    localUsers[index]!.status = 'rejected';
    saveLocalUsers(localUsers);
    return true;
  }
  return false;
}
