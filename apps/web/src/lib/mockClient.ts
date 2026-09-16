/**
 * Client Implementation for 192.168.6.
 *
 * Provides a fully interactive messaging and calling client
 * backed by persistent storage and real-time BroadcastChannel sync.
 * Zero external Matrix accounts needed.
 */
import type { MatrixClient, Room, MatrixEvent } from 'matrix-js-sdk';
import {
  getLocalRoomMessages,
  saveLocalRoomMessage,
  type StoredMessage,
} from './supabase';

interface MockMessageData {
  eventId: string;
  sender: string;
  senderName: string;
  content: string;
  timestamp: number;
  isMe: boolean;
}

const BROADCAST_NAME = 'one92168_sync_bus';

export function createMockMatrixClient(
  displayName = 'Alice',
  shortId = 'KPR472',
): MatrixClient {
  const myUserId = `@${shortId.toUpperCase()}:192.168.6`;
  const bobUserId = '@BXT091:192.168.6';

  const defaultRoomId = '!bxt091:192.168.6';

  // In-memory room messages cache
  const roomMessages: Record<string, MockMessageData[]> = {};

  // Load existing persistent messages for rooms
  const loadRoomMessages = (id: string): MockMessageData[] => {
    if (!roomMessages[id]) {
      const persisted = getLocalRoomMessages(id);
      if (persisted && persisted.length > 0) {
        roomMessages[id] = persisted;
      } else if (id === defaultRoomId) {
        roomMessages[id] = [
          {
            eventId: '$evt_1',
            sender: bobUserId,
            senderName: 'Bob (BXT091)',
            content: `Hey ${displayName}! Welcome to 192.168.6. Your unique ID is ${shortId}. Share it with friends to chat!`,
            timestamp: Date.now() - 1000 * 60 * 5,
            isMe: false,
          },
        ];
      } else {
        roomMessages[id] = [];
      }
    }
    return roomMessages[id]!;
  };

  loadRoomMessages(defaultRoomId);

  const listeners: Record<string, Array<(...args: unknown[]) => void>> = {};

  const emit = (event: string, ...args: unknown[]) => {
    listeners[event]?.forEach((cb) => {
      try {
        cb(...args);
      } catch (err) {
        console.error('Error in event listener:', err);
      }
    });
  };

  // Cross-tab real-time sync via BroadcastChannel
  let channel: BroadcastChannel | null = null;
  if (typeof BroadcastChannel !== 'undefined') {
    channel = new BroadcastChannel(BROADCAST_NAME);
    channel.onmessage = (event) => {
      const data = event.data;
      if (data?.type === 'NEW_MESSAGE' && data.roomId && data.message) {
        if (!roomMessages[data.roomId]) roomMessages[data.roomId] = [];
        roomMessages[data.roomId]!.push(data.message);
        const room = client.getRoom(data.roomId);
        const mockEvt = {
          getId: () => data.message.eventId,
          getType: () => 'm.room.message',
          getContent: () => ({ msgtype: 'm.text', body: data.message.content }),
          getSender: () => data.message.sender,
          getTs: () => data.message.timestamp,
        } as unknown as MatrixEvent;
        emit('Room.timeline', mockEvt, room);
        emit('sync', 'SYNCING');
      }
    };
  }

  const createMockRoom = (id: string, name: string, members: string[]): Room => {
    return {
      roomId: id,
      name,
      getLastActiveTimestamp: () => {
        const msgs = loadRoomMessages(id);
        return msgs && msgs.length > 0 ? msgs[msgs.length - 1]!.timestamp : Date.now();
      },
      getLastLiveEvent: () => {
        const msgs = loadRoomMessages(id);
        const lastMsg = msgs && msgs.length > 0 ? msgs[msgs.length - 1] : null;
        if (!lastMsg) return null;
        return {
          getTs: () => lastMsg.timestamp,
        } as unknown as MatrixEvent;
      },
      getUnreadNotificationCount: () => 0,
      hasEncryptionStateEvent: () => true,
      getAvatarUrl: () => null,
      getJoinedMembers: () => members.map((u) => ({ userId: u })),
      getMember: (userId: string) => ({
        name: userId === myUserId ? `${displayName} (You)` : userId.replace('@', '').replace(':192.168.6', ''),
      }),
      currentState: {
        getStateEvents: (type: string) => {
          if (type === 'm.room.encryption') {
            return {
              getContent: () => ({ algorithm: 'm.megolm.v1.aes-sha2' }),
            };
          }
          return null;
        },
      },
      getLiveTimeline: () => ({
        getEvents: () => {
          const msgs = loadRoomMessages(id);
          return msgs.map((m) => ({
            getId: () => m.eventId,
            getType: () => 'm.room.message',
            getContent: () => ({ msgtype: 'm.text', body: m.content }),
            getSender: () => m.sender,
            getTs: () => m.timestamp,
          })) as unknown as MatrixEvent[];
        },
      }),
    } as unknown as Room;
  };

  const roomsList: Room[] = [
    createMockRoom(defaultRoomId, 'Bob (BXT091)', [myUserId, bobUserId]),
  ];

  const mockCrypto = {
    getUserVerificationStatus: async () => ({
      isCrossSigningVerified: () => true,
    }),
    getUserDeviceInfo: async (userIds: string[]) => {
      const map = new Map();
      const devicesMap = new Map();
      devicesMap.set('ONE92168_DEVICE', {
        displayName: '192.168.6 Web PWA',
      });
      for (const uid of userIds) {
        map.set(uid, devicesMap);
      }
      return map;
    },
    getDeviceVerificationStatus: async () => ({
      isVerified: () => true,
    }),
    checkKeyBackupAndEnable: async () => ({
      version: '1',
    }),
  };

  const client = {
    baseUrl: 'https://192.168.6.local',
    getUserId: () => myUserId,
    getDeviceId: () => 'ONE92168_DEVICE',
    getAccessToken: () => `token_${shortId}_${Date.now()}`,
    getRooms: () => roomsList,
    getRoom: (id: string) => roomsList.find((r) => r.roomId === id) || null,
    getUser: (uid: string) => ({
      userId: uid,
      displayName: uid === myUserId ? `${displayName} (You)` : uid.replace('@', '').replace(':192.168.6', ''),
    }),
    getCrypto: () => mockCrypto,
    sendReadReceipt: async () => {},
    paginateEventTimeline: async () => false,
    on: (event: string, callback: (...args: unknown[]) => void) => {
      listeners[event] = listeners[event] || [];
      listeners[event].push(callback);
      return client;
    },
    removeListener: (event: string, callback: (...args: unknown[]) => void) => {
      listeners[event] = (listeners[event] || []).filter((cb) => cb !== callback);
      return client;
    },
    sendEvent: async (roomId: string, _type: string, content: { msgtype?: string; body?: string }) => {
      return (client as any).sendMessage(roomId, content);
    },
    sendMessage: async (roomId: string, content: { msgtype?: string; body?: string }) => {
      const msg: MockMessageData = {
        eventId: `$evt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        sender: myUserId,
        senderName: displayName,
        content: content.body || '',
        timestamp: Date.now(),
        isMe: true,
      };

      if (!roomMessages[roomId]) roomMessages[roomId] = [];
      roomMessages[roomId]!.push(msg);

      // Persist to local store
      saveLocalRoomMessage(roomId, msg as StoredMessage);

      // Broadcast to other tabs
      if (channel) {
        try {
          channel.postMessage({
            type: 'NEW_MESSAGE',
            roomId,
            message: { ...msg, isMe: false },
          });
        } catch {
          // Ignore
        }
      }

      // Trigger room timeline event
      const mockEvent = {
        getId: () => msg.eventId,
        getType: () => 'm.room.message',
        getContent: () => content,
        getSender: () => myUserId,
        getTs: () => msg.timestamp,
      } as unknown as MatrixEvent;

      emit('Room.timeline', mockEvent, client.getRoom(roomId));
      return { event_id: msg.eventId };
    },
    createRoom: async (opts: { name?: string; invite?: string[] }) => {
      const partnerId = opts.invite?.[0] || 'Friend';
      const partnerName = opts.name || partnerId.replace('@', '').replace(':192.168.6', '');
      const newRoomId = `!room_${Date.now()}_${Math.random().toString(36).substring(2, 5)}:192.168.6`;
      const newRoom = createMockRoom(newRoomId, partnerName, [myUserId, ...(opts.invite || [])]);
      roomsList.unshift(newRoom);
      roomMessages[newRoomId] = [];
      emit('sync', 'SYNCING');
      return { room_id: newRoomId };
    },
    uploadContent: async (file: File) => {
      return { content_uri: URL.createObjectURL(file) };
    },
    logout: async () => {
      if (channel) {
        try {
          channel.close();
        } catch {
          // Ignore
        }
      }
    },
  } as unknown as MatrixClient;

  return client;
}
