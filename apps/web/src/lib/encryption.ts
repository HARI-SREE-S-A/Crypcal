/**
 * 192.168.6 E2EE Enforcement
 *
 * Ensures all rooms are created with encryption enabled.
 * E2EE cannot be turned off from the UI.
 */
import type { MatrixClient, ICreateRoomOpts } from 'matrix-js-sdk';
import { Visibility, Preset } from 'matrix-js-sdk';
import { ENCRYPTION_ALGORITHM } from '@/utils/constants';

/**
 * Default room creation options — always encrypted.
 */
const ENCRYPTED_ROOM_DEFAULTS: ICreateRoomOpts = {
  visibility: Visibility.Private,
  preset: Preset.PrivateChat,
  initial_state: [
    {
      type: 'm.room.encryption',
      state_key: '',
      content: {
        algorithm: ENCRYPTION_ALGORITHM,
      },
    },
    {
      type: 'm.room.guest_access',
      state_key: '',
      content: {
        guest_access: 'forbidden',
      },
    },
  ],
};

/**
 * Create a new encrypted room. Encryption is always enabled.
 * This is the ONLY way to create rooms in 192.168.6.
 */
export async function createEncryptedRoom(
  client: MatrixClient,
  options: {
    name?: string;
    inviteUserIds?: string[];
    isDirect?: boolean;
  },
): Promise<string> {
  const createOpts: ICreateRoomOpts = {
    ...ENCRYPTED_ROOM_DEFAULTS,
    name: options.name,
    invite: options.inviteUserIds,
    is_direct: options.isDirect ?? false,
  };

  const result = await client.createRoom(createOpts);
  return result.room_id;
}

/**
 * Check if a room has encryption enabled.
 */
export function isRoomEncrypted(client: MatrixClient, roomId: string): boolean {
  const room = client.getRoom(roomId);
  if (!room) return false;

  const encEvent = room.currentState.getStateEvents('m.room.encryption', '');
  return encEvent !== null && encEvent !== undefined;
}

/**
 * Get the verification status of all devices in a room.
 * Returns 'verified' if ALL devices are verified, 'unverified' if any are not.
 */
export type RoomVerificationStatus = 'verified' | 'unverified' | 'unknown';

export async function getRoomVerificationStatus(
  client: MatrixClient,
  roomId: string,
): Promise<RoomVerificationStatus> {
  const crypto = client.getCrypto();
  if (!crypto) return 'unknown';

  const room = client.getRoom(roomId);
  if (!room) return 'unknown';

  const members = room.getJoinedMembers();
  const myUserId = client.getUserId();

  for (const member of members) {
    if (member.userId === myUserId) continue;

    const userVerification = await crypto.getUserVerificationStatus(member.userId);
    if (!userVerification.isCrossSigningVerified()) {
      return 'unverified';
    }
  }

  return 'verified';
}

/**
 * Get the encryption algorithm used in a room.
 */
export function getRoomEncryptionAlgorithm(
  client: MatrixClient,
  roomId: string,
): string | null {
  const room = client.getRoom(roomId);
  if (!room) return null;

  const encEvent = room.currentState.getStateEvents('m.room.encryption', '');
  if (!encEvent) return null;

  return encEvent.getContent().algorithm || null;
}

/**
 * Verify that a room is using the expected encryption algorithm.
 * Returns false if encryption is missing or uses an unexpected algorithm.
 */
export function isRoomProperlyEncrypted(
  client: MatrixClient,
  roomId: string,
): boolean {
  const algo = getRoomEncryptionAlgorithm(client, roomId);
  return algo === ENCRYPTION_ALGORITHM;
}
