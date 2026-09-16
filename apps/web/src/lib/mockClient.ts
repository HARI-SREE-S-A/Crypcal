/**
 * Mock Matrix Client for Demo / Preview Mode.
 *
 * Provides a fully interactive in-memory MatrixClient simulation
 * 192.168.6 without a running Synapse backend.
 */
import type { MatrixClient, Room, MatrixEvent } from 'matrix-js-sdk';

interface MockMessageData {
  eventId: string;
  sender: string;
  senderName: string;
  content: string;
  timestamp: number;
  isMe: boolean;
}

export function createMockMatrixClient(username = 'alice'): MatrixClient {
  const myUserId = `@${username}:matrix.org`;
  const bobUserId = '@bob:matrix.org';
  const carolUserId = '@carol:matrix.org';

  // In-memory room messages
  const roomMessages: Record<string, MockMessageData[]> = {
    '!bob:matrix.org': [
      {
        eventId: '$evt_1',
        sender: bobUserId,
        senderName: 'Bob Miller',
        content: 'Hey Alice! The 192.168.6 E2EE setup looks incredible.',
        timestamp: Date.now() - 1000 * 60 * 15,
        isMe: false,
      },
      {
        eventId: '$evt_2',
        sender: myUserId,
        senderName: 'Alice',
        content: 'Thanks Bob! All Megolm ratchet sessions and cross-signing keys are active.',
        timestamp: Date.now() - 1000 * 60 * 12,
        isMe: true,
      },
      {
        eventId: '$evt_3',
        sender: bobUserId,
        senderName: 'Bob Miller',
        content: 'Want to jump on a quick encrypted voice or video call to test latency?',
        timestamp: Date.now() - 1000 * 60 * 5,
        isMe: false,
      },
    ],
    '!secops:matrix.org': [
      {
        eventId: '$evt_4',
        sender: carolUserId,
        senderName: 'Carol Danvers',
        content: 'Trivy container scan and OWASP baseline audits passed in CI.',
        timestamp: Date.now() - 1000 * 60 * 60 * 2,
        isMe: false,
      },
      {
        eventId: '$evt_5',
        sender: bobUserId,
        senderName: 'Bob Miller',
        content: 'TURN relay over UDP is delivering under 35ms latency in testing.',
        timestamp: Date.now() - 1000 * 60 * 45,
        isMe: false,
      },
    ],
    '!dev:matrix.org': [
      {
        eventId: '$evt_6',
        sender: myUserId,
        senderName: 'Alice',
        content: 'Frontend bundle is 81KB gzipped — well under budget.',
        timestamp: Date.now() - 1000 * 60 * 60 * 5,
        isMe: true,
      },
    ],
  };

  const listeners: Record<string, Array<(...args: unknown[]) => void>> = {};

  const emit = (event: string, ...args: unknown[]) => {
    listeners[event]?.forEach((cb) => {
      try {
        cb(...args);
      } catch (err) {
        console.error('Error in mock event listener:', err);
      }
    });
  };

  const createMockRoom = (id: string, name: string, members: string[]): Room => {
    return {
      roomId: id,
      name,
      getLastActiveTimestamp: () => {
        const msgs = roomMessages[id];
        return msgs && msgs.length > 0 ? msgs[msgs.length - 1]!.timestamp : Date.now();
      },
      getLastLiveEvent: () => {
        const msgs = roomMessages[id];
        const lastMsg = msgs && msgs.length > 0 ? msgs[msgs.length - 1] : null;
        if (!lastMsg) return null;
        return {
          getTs: () => lastMsg.timestamp,
        } as unknown as MatrixEvent;
      },
      getUnreadNotificationCount: () => (id === '!bob:matrix.org' ? 1 : 0),
      hasEncryptionStateEvent: () => true,
      getAvatarUrl: () => null,
      getJoinedMembers: () => members.map((u) => ({ userId: u })),
      getMember: (userId: string) => ({
        name: userId.includes('bob') ? 'Bob Miller' : userId.includes('carol') ? 'Carol Danvers' : 'Alice',
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
          const msgs = roomMessages[id] || [];
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
    createMockRoom('!bob:matrix.org', 'Bob Miller', [myUserId, bobUserId]),
    createMockRoom('!secops:matrix.org', 'Security Operations', [myUserId, bobUserId, carolUserId]),
    createMockRoom('!dev:matrix.org', 'Infra & Core Team', [myUserId, bobUserId]),
  ];

  const mockCrypto = {
    getUserVerificationStatus: async () => ({
      isCrossSigningVerified: () => true,
    }),
    getUserDeviceInfo: async (userIds: string[]) => {
      const map = new Map();
      const devicesMap = new Map();
      devicesMap.set('ONE92168_WEB_01', {
        displayName: 'Chrome on macOS (Current)',
      });
      devicesMap.set('ONE92168_PWA_02', {
        displayName: '192.168.6 Mobile PWA',
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
    baseUrl: 'https://demo.matrix.org',
    getUserId: () => myUserId,
    getDeviceId: () => 'ONE92168_WEB_01',
    getAccessToken: () => 'mock_token_demo_alice_123',
    getRooms: () => roomsList,
    getRoom: (id: string) => roomsList.find((r) => r.roomId === id) || null,
    getUser: (uid: string) => ({
      userId: uid,
      displayName: uid.includes('alice') ? 'Alice (You)' : uid.includes('bob') ? 'Bob Miller' : 'Carol Danvers',
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
        eventId: `$evt_${Date.now()}`,
        sender: myUserId,
        senderName: 'Alice',
        content: content.body || '',
        timestamp: Date.now(),
        isMe: true,
      };
      if (!roomMessages[roomId]) roomMessages[roomId] = [];
      roomMessages[roomId].push(msg);

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
      const newRoomId = `!room_${Date.now()}:matrix.org`;
      const newRoom = createMockRoom(newRoomId, opts.name || 'New Encrypted Chat', [myUserId, ...(opts.invite || [])]);
      roomsList.unshift(newRoom);
      roomMessages[newRoomId] = [];
      emit('sync', 'SYNCING');
      return { room_id: newRoomId };
    },
    uploadContent: async (file: File) => {
      return { content_uri: URL.createObjectURL(file) };
    },
    logout: async () => {},
  } as unknown as MatrixClient;

  return client;
}
