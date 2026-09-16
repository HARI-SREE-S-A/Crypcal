import { describe, it, expect, beforeEach } from 'vitest';
import {
  verifyAdminPassword,
  requestAccess,
  authenticateUser,
  checkUserStatus,
  lookupByShortId,
  getPendingUsers,
  getAllUsers,
  approveUser,
  rejectUser,
  resetLocalUsersForTesting,
} from '@/lib/supabase';
import { isValidShortId } from '@/lib/shortId';

describe('supabase & user management module', () => {
  beforeEach(() => {
    resetLocalUsersForTesting();
  });

  it('verifies admin password correctly', () => {
    expect(verifyAdminPassword('admin1921686')).toBe(true);
    expect(verifyAdminPassword('wrongpassword')).toBe(false);
  });

  it('submits an access request with name and password, assigning a 6-character short ID', async () => {
    const user = await requestAccess('Bob Builder', 'secret123');

    expect(user.display_name).toBe('Bob Builder');
    expect(user.status).toBe('pending');
    expect(isValidShortId(user.short_id)).toBe(true);

    const pending = await getPendingUsers();
    expect(pending.some((u) => u.short_id === user.short_id)).toBe(true);
  });

  it('authenticates approved users and blocks pending users', async () => {
    const user = await requestAccess('Sarah Connor', 'pass999');

    // Attempt login while pending
    const pendingAuth = await authenticateUser(user.short_id, 'pass999');
    expect(pendingAuth.success).toBe(false);
    expect(pendingAuth.error).toContain('awaiting administrator approval');

    // Admin approves user
    await approveUser(user.id);

    // Wrong password
    const wrongAuth = await authenticateUser(user.short_id, 'wrongpass');
    expect(wrongAuth.success).toBe(false);
    expect(wrongAuth.error).toContain('Incorrect password');

    // Correct login by Short ID
    const goodAuth = await authenticateUser(user.short_id, 'pass999');
    expect(goodAuth.success).toBe(true);
    expect(goodAuth.user?.display_name).toBe('Sarah Connor');

    // Login by Name also works
    const nameAuth = await authenticateUser('Sarah Connor', 'pass999');
    expect(nameAuth.success).toBe(true);
  });

  it('does not return pending or rejected users in public lookupByShortId', async () => {
    const user = await requestAccess('Dave Miller', 'pass123');

    // Should return null while status is 'pending'
    const pendingLookup = await lookupByShortId(user.short_id);
    expect(pendingLookup).toBeNull();

    // Reject user
    await rejectUser(user.id);
    const rejectedLookup = await lookupByShortId(user.short_id);
    expect(rejectedLookup).toBeNull();
  });

  it('approves a user and enables discovery by short ID', async () => {
    const user = await requestAccess('Alice Smith', 'alice123');

    const approved = await approveUser(user.id);
    expect(approved).toBe(true);

    // Now lookupByShortId should succeed!
    const found = await lookupByShortId(user.short_id);
    expect(found).not.toBeNull();
    expect(found?.display_name).toBe('Alice Smith');
    expect(found?.status).toBe('approved');
    expect(found?.approved_at).toBeDefined();

    // Pending list should no longer include Alice
    const pending = await getPendingUsers();
    expect(pending.some((u) => u.short_id === user.short_id)).toBe(false);

    // All users list should show Alice
    const all = await getAllUsers();
    expect(all.some((u) => u.short_id === user.short_id && u.status === 'approved')).toBe(true);
  });
});
