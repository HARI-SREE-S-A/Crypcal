/**
 * 192.168.6 Supabase & User Management Client.
 *
 * Handles:
 * - User access requests (with 6-character short IDs)
 * - Admin approval / rejection workflow
 * - Short ID lookup (like phone numbers for connecting users)
 * - Transparent fallback to local storage when Supabase is not configured.
 */
import { generateShortId } from './shortId';

export interface UserRecord {
  id: string;
  short_id: string;
  display_name: string;
  matrix_user_id: string;
  status: 'pending' | 'approved' | 'rejected';
  is_admin: boolean;
  created_at: string;
  approved_at?: string;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || 'admin1921686';

const LOCAL_STORAGE_KEY = 'one92168_registered_users';

let inMemoryFallback: UserRecord[] = [];

/**
 * Get users stored locally as fallback when Supabase is not yet configured.
 */
function getLocalUsers(): UserRecord[] {
  if (typeof localStorage !== 'undefined') {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (!raw) return [];
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }
  return inMemoryFallback;
}

/**
 * Save users to local fallback store.
 */
function saveLocalUsers(users: UserRecord[]): void {
  inMemoryFallback = users;
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(users));
    } catch (err) {
      console.warn('[Supabase Fallback] Could not persist local users:', err);
    }
  }
}

/**
 * Clear fallback users for testing.
 */
export function resetLocalUsersForTesting(): void {
  inMemoryFallback = [];
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    } catch {
      // Ignore
    }
  }
}

/**
 * Helper to execute Supabase PostgREST queries.
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

  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    const errorText = await res.text();
    console.error(`[Supabase] Request failed (${res.status}):`, errorText);
    throw new Error(`Supabase error (${res.status}): ${errorText}`);
  }

  return res.json() as Promise<T>;
}

/**
 * Verify admin password.
 */
export function verifyAdminPassword(password: string): boolean {
  return password.trim() === ADMIN_PASSWORD;
}

/**
 * Look up user by short ID (e.g. 'KPR472').
 * Returns user record only if approved.
 */
export async function lookupByShortId(shortId: string): Promise<UserRecord | null> {
  const normalizedId = shortId.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');

  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    try {
      const data = await supabaseFetch<UserRecord[]>(
        `users?short_id=eq.${encodeURIComponent(normalizedId)}&status=eq.approved&select=*`,
      );
      if (data && data.length > 0) return data[0]!;
      return null;
    } catch (err) {
      console.warn('[Supabase] Lookup failed, checking local store:', err);
    }
  }

  // Fallback to local store
  const localUsers = getLocalUsers();
  return (
    localUsers.find(
      (u) => u.short_id === normalizedId && u.status === 'approved',
    ) || null
  );
}

/**
 * Check a user's approval status by Matrix User ID or Short ID.
 */
export async function checkUserStatus(identifier: string): Promise<UserRecord | null> {
  const trimmed = identifier.trim();

  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    try {
      const isShort = /^[A-Za-z0-9-]{6,7}$/.test(trimmed);
      const query = isShort
        ? `users?short_id=eq.${encodeURIComponent(trimmed.toUpperCase().replace('-', ''))}&select=*`
        : `users?matrix_user_id=eq.${encodeURIComponent(trimmed)}&select=*`;

      const data = await supabaseFetch<UserRecord[]>(query);
      if (data && data.length > 0) return data[0]!;
      return null;
    } catch (err) {
      console.warn('[Supabase] Status check failed, checking local store:', err);
    }
  }

  // Fallback to local store
  const cleanId = trimmed.toUpperCase().replace('-', '');
  const localUsers = getLocalUsers();
  return (
    localUsers.find(
      (u) => u.matrix_user_id === trimmed || u.short_id === cleanId,
    ) || null
  );
}

/**
 * Request access for a new user.
 * Generates a unique short ID and inserts record with status 'pending'.
 */
export async function requestAccess(
  displayName: string,
  matrixUserId: string,
): Promise<UserRecord> {
  // Generate a collision-free short ID
  let shortId = generateShortId();
  let existing = await lookupByShortId(shortId);
  let attempts = 0;
  while (existing && attempts < 5) {
    shortId = generateShortId();
    existing = await lookupByShortId(shortId);
    attempts++;
  }

  const newRecord: UserRecord = {
    id: typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `usr_${Date.now()}`,
    short_id: shortId,
    display_name: displayName.trim(),
    matrix_user_id: matrixUserId.trim(),
    status: 'pending',
    is_admin: false,
    created_at: new Date().toISOString(),
  };

  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    try {
      const inserted = await supabaseFetch<UserRecord[]>('users', {
        method: 'POST',
        body: JSON.stringify(newRecord),
      });
      if (inserted && inserted.length > 0) {
        return inserted[0]!;
      }
    } catch (err) {
      console.warn('[Supabase] Insert failed, falling back to local store:', err);
    }
  }

  // Fallback to local store
  const localUsers = getLocalUsers();
  // Remove existing pending entry for this matrixUserId if present
  const filtered = localUsers.filter((u) => u.matrix_user_id !== newRecord.matrix_user_id);
  filtered.push(newRecord);
  saveLocalUsers(filtered);

  return newRecord;
}

/**
 * Get all users with status 'pending' (for Admin approval).
 */
export async function getPendingUsers(): Promise<UserRecord[]> {
  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    try {
      const data = await supabaseFetch<UserRecord[]>(
        'users?status=eq.pending&order=created_at.desc&select=*',
      );
      if (data) return data;
    } catch (err) {
      console.warn('[Supabase] Get pending failed, using local store:', err);
    }
  }

  return getLocalUsers().filter((u) => u.status === 'pending');
}

/**
 * Get all users (for Admin dashboard).
 */
export async function getAllUsers(): Promise<UserRecord[]> {
  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    try {
      const data = await supabaseFetch<UserRecord[]>('users?order=created_at.desc&select=*');
      if (data) return data;
    } catch (err) {
      console.warn('[Supabase] Get all failed, using local store:', err);
    }
  }

  return getLocalUsers();
}

/**
 * Approve a pending user request.
 */
export async function approveUser(id: string): Promise<boolean> {
  const approvedAt = new Date().toISOString();

  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    try {
      await supabaseFetch(`users?id=eq.${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'approved', approved_at: approvedAt }),
      });
      return true;
    } catch (err) {
      console.warn('[Supabase] Approve failed, updating local store:', err);
    }
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
    try {
      await supabaseFetch(`users?id=eq.${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'rejected' }),
      });
      return true;
    } catch (err) {
      console.warn('[Supabase] Reject failed, updating local store:', err);
    }
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
