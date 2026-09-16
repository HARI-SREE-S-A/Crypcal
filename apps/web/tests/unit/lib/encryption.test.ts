import { describe, it, expect, vi } from 'vitest';
import {
  createEncryptedRoom,
  isRoomEncrypted,
  getRoomVerificationStatus,
  getRoomEncryptionAlgorithm,
  isRoomProperlyEncrypted,
} from '@/lib/encryption';
import { ENCRYPTION_ALGORITHM } from '@/utils/constants';
import type { MatrixClient, Room } from 'matrix-js-sdk';

describe('encryption enforcement', () => {
  it('creates an encrypted room with required defaults', async () => {
    const mockCreateRoom = vi.fn().mockResolvedValue({ room_id: '!newroom:localhost' });
    const mockClient = {
      createRoom: mockCreateRoom,
    } as unknown as MatrixClient;

    const roomId = await createEncryptedRoom(mockClient, {
      name: 'Secret Chat',
      inviteUserIds: ['@bob:localhost'],
      isDirect: true,
    });

    expect(roomId).toBe('!newroom:localhost');
    expect(mockCreateRoom).toHaveBeenCalledTimes(1);

    const callArgs = mockCreateRoom.mock.calls[0][0];
    expect(callArgs.name).toBe('Secret Chat');
    expect(callArgs.invite).toEqual(['@bob:localhost']);
    expect(callArgs.is_direct).toBe(true);

    // Verify m.room.encryption initial_state is enforced
    const encState = callArgs.initial_state.find(
      (s: { type: string }) => s.type === 'm.room.encryption',
    );
    expect(encState).toBeDefined();
    expect(encState.content.algorithm).toBe(ENCRYPTION_ALGORITHM);
  });

  it('checks if a room is encrypted', () => {
    const mockRoomEncrypted = {
      currentState: {
        getStateEvents: vi.fn((type: string) => {
          if (type === 'm.room.encryption') {
            return { getContent: () => ({ algorithm: ENCRYPTION_ALGORITHM }) };
          }
          return null;
        }),
      },
    } as unknown as Room;

    const mockRoomUnencrypted = {
      currentState: {
        getStateEvents: vi.fn(() => null),
      },
    } as unknown as Room;

    const mockClient = {
      getRoom: vi.fn((id: string) => {
        if (id === '!enc:localhost') return mockRoomEncrypted;
        if (id === '!unenc:localhost') return mockRoomUnencrypted;
        return null;
      }),
    } as unknown as MatrixClient;

    expect(isRoomEncrypted(mockClient, '!enc:localhost')).toBe(true);
    expect(isRoomEncrypted(mockClient, '!unenc:localhost')).toBe(false);
    expect(isRoomEncrypted(mockClient, '!nonexistent:localhost')).toBe(false);
  });

  it('checks room encryption algorithm and validation', () => {
    const mockRoomWithOlm = {
      currentState: {
        getStateEvents: vi.fn((type: string) => {
          if (type === 'm.room.encryption') {
            return { getContent: () => ({ algorithm: ENCRYPTION_ALGORITHM }) };
          }
          return null;
        }),
      },
    } as unknown as Room;

    const mockRoomWithWrongAlgo = {
      currentState: {
        getStateEvents: vi.fn((type: string) => {
          if (type === 'm.room.encryption') {
            return { getContent: () => ({ algorithm: 'm.dummy.algorithm' }) };
          }
          return null;
        }),
      },
    } as unknown as Room;

    const mockClient = {
      getRoom: vi.fn((id: string) => {
        if (id === '!correct:localhost') return mockRoomWithOlm;
        if (id === '!wrong:localhost') return mockRoomWithWrongAlgo;
        return null;
      }),
    } as unknown as MatrixClient;

    expect(getRoomEncryptionAlgorithm(mockClient, '!correct:localhost')).toBe(ENCRYPTION_ALGORITHM);
    expect(isRoomProperlyEncrypted(mockClient, '!correct:localhost')).toBe(true);

    expect(getRoomEncryptionAlgorithm(mockClient, '!wrong:localhost')).toBe('m.dummy.algorithm');
    expect(isRoomProperlyEncrypted(mockClient, '!wrong:localhost')).toBe(false);

    expect(getRoomEncryptionAlgorithm(mockClient, '!missing:localhost')).toBeNull();
    expect(isRoomProperlyEncrypted(mockClient, '!missing:localhost')).toBe(false);
  });

  it('evaluates room verification status', async () => {
    const mockRoom = {
      getJoinedMembers: () => [
        { userId: '@alice:localhost' },
        { userId: '@bob:localhost' },
      ],
    } as unknown as Room;

    const mockCryptoVerified = {
      getUserVerificationStatus: vi.fn().mockResolvedValue({
        isCrossSigningVerified: () => true,
      }),
    };

    const mockClientVerified = {
      getCrypto: () => mockCryptoVerified,
      getRoom: () => mockRoom,
      getUserId: () => '@alice:localhost',
    } as unknown as MatrixClient;

    const statusVerified = await getRoomVerificationStatus(mockClientVerified, '!room:localhost');
    expect(statusVerified).toBe('verified');

    const mockCryptoUnverified = {
      getUserVerificationStatus: vi.fn().mockResolvedValue({
        isCrossSigningVerified: () => false,
      }),
    };

    const mockClientUnverified = {
      getCrypto: () => mockCryptoUnverified,
      getRoom: () => mockRoom,
      getUserId: () => '@alice:localhost',
    } as unknown as MatrixClient;

    const statusUnverified = await getRoomVerificationStatus(mockClientUnverified, '!room:localhost');
    expect(statusUnverified).toBe('unverified');
  });
});
