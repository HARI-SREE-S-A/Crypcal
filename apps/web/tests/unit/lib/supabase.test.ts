import { describe, it, expect, beforeEach } from 'vitest';
import {
  verifyAdminPassword,
  requestAccess,
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

  it('submits an access request and assigns a unique 6-character short ID', async () => {
    const user = await requestAccess('Bob Builder', '@bob:matrix.org');

    expect(user.display_name).toBe('Bob Builder');
    expect(user.matrix_user_id).toBe('@bob:matrix.org');
    expect(user.status).toBe('pending');
    expect(isValidShortId(user.short_id)).toBe(true);

    const pending = await getPendingUsers();
    expect(pending.some((u) => u.short_id === user.short_id)).toBe(true);
  });

  it('checks user status by Matrix User ID or Short ID', async () => {
    const user = await requestAccess('Carol Danvers', '@carol:matrix.org');

    const byMatrixId = await checkUserStatus('@carol:matrix.org');
    expect(byMatrixId?.short_id).toBe(user.short_id);
    expect(byMatrixId?.status).toBe('pending');

    const byShortId = await checkUserStatus(user.short_id);
    expect(byShortId?.display_name).toBe('Carol Danvers');
  });

  it('does not return pending or rejected users in public lookupByShortId', async () => {
    const user = await requestAccess('Dave Miller', '@dave:matrix.org');

    // Should return null while status is 'pending'
    const pendingLookup = await lookupByShortId(user.short_id);
    expect(pendingLookup).toBeNull();

    // Reject user
    await rejectUser(user.id);
    const rejectedLookup = await lookupByShortId(user.short_id);
    expect(rejectedLookup).toBeNull();
  });

  it('approves a user and enables discovery by short ID', async () => {
    const user = await requestAccess('Alice Smith', '@alice:matrix.org');

    const approved = await approveUser(user.id);
    expect(approved).toBe(true);

    // Now lookupByShortId should succeed!
    const found = await lookupByShortId(user.short_id);
    expect(found).not.toBeNull();
    expect(found?.display_name).toBe('Alice Smith');
    expect(found?.matrix_user_id).toBe('@alice:matrix.org');
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
