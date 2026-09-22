// Barrel exports for lib
export { getClient, loginWithPassword, restoreSession, logout } from './matrix';
export { useAppStore, getSortedRooms } from './store';
export type { AppView, Theme, CallState } from './store';
export {
  createEncryptedRoom,
  isRoomEncrypted,
  getRoomVerificationStatus,
  getRoomEncryptionAlgorithm,
  isRoomProperlyEncrypted,
} from './encryption';
export type { RoomVerificationStatus } from './encryption';
export {
  buildIceServers,
  scoreCandidatePriority,
  logIceCandidate,
} from './ice';
export {
  supportsInsertableStreams,
  generateCallEncryptionKey,
  deriveCallKey,
  encryptFrame,
  decryptFrame,
  getLivekitE2eeConfig,
} from './mediaEncryption';
export { generateShortId, isValidShortId, formatShortId } from './shortId';
export {
  verifyAdminPassword,
  lookupByShortId,
  checkUserStatus,
  requestAccess,
  findOrRegister,
  getPendingUsers,
  getAllUsers,
  approveUser,
  rejectUser,
} from './supabase';
export type { UserRecord } from './supabase';
