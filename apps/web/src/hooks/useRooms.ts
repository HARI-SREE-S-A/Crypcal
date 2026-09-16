/**
 * useRooms — Subscribe to the room list from the Matrix SDK.
 * Returns sorted rooms with unread counts.
 */
import { useState, useEffect, useCallback } from 'react';
import type { MatrixClient, Room } from 'matrix-js-sdk';
import { ClientEvent, RoomEvent } from 'matrix-js-sdk';
import { getSortedRooms } from '@/lib/store';

export interface RoomSummary {
  roomId: string;
  name: string;
  lastMessage: string;
  lastMessageTs: number;
  unreadCount: number;
  isEncrypted: boolean;
  avatarUrl: string | null;
  /** The other user's ID in a DM */
  dmUserId: string | null;
}

export function useRooms(client: MatrixClient | null) {
  const [rooms, setRooms] = useState<RoomSummary[]>([]);

  const updateRooms = useCallback(() => {
    if (!client) {
      setRooms([]);
      return;
    }

    const sorted = getSortedRooms(client);
    const summaries = sorted.map((room): RoomSummary => {
      const lastEvent = room.getLastLiveEvent();
      const lastMessage = getLastMessagePreview(room);
      const dmUserId = getDmUserId(client, room);

      return {
        roomId: room.roomId,
        name: room.name || 'Unnamed',
        lastMessage,
        lastMessageTs: lastEvent?.getTs() || 0,
        unreadCount: room.getUnreadNotificationCount() || 0,
        isEncrypted: room.hasEncryptionStateEvent(),
        avatarUrl: room.getAvatarUrl(client.baseUrl, 40, 40, 'crop') || null,
        dmUserId,
      };
    });

    setRooms(summaries);
  }, [client]);

  useEffect(() => {
    if (!client) return;

    // Initial load
    updateRooms();

    // Subscribe to room changes
    const onSync = () => updateRooms();
    const onRoom = () => updateRooms();
    const onTimeline = () => updateRooms();
    const onRoomState = () => updateRooms();

    client.on(ClientEvent.Sync, onSync);
    client.on(ClientEvent.Room, onRoom);
    client.on(RoomEvent.Timeline, onTimeline);
    client.on(RoomEvent.MyMembership, onRoomState);

    return () => {
      client.removeListener(ClientEvent.Sync, onSync);
      client.removeListener(ClientEvent.Room, onRoom);
      client.removeListener(RoomEvent.Timeline, onTimeline);
      client.removeListener(RoomEvent.MyMembership, onRoomState);
    };
  }, [client, updateRooms]);

  return rooms;
}

/**
 * Get a preview string for the last message in a room.
 */
function getLastMessagePreview(room: Room): string {
  const timeline = room.getLiveTimeline().getEvents();
  for (let i = timeline.length - 1; i >= 0; i--) {
    const event = timeline[i]!;
    if (event.getType() === 'm.room.message') {
      const content = event.getContent();
      if (content.msgtype === 'm.text') {
        return content.body || '';
      }
      if (content.msgtype === 'm.image') return '📷 Image';
      if (content.msgtype === 'm.file') return '📎 File';
      if (content.msgtype === 'm.audio') return '🎵 Audio';
      if (content.msgtype === 'm.video') return '🎬 Video';
      return content.body || '';
    }
    if (event.getType() === 'm.room.encrypted') {
      return '🔒 Encrypted message';
    }
  }
  return '';
}

/**
 * Get the DM partner's user ID if this is a direct message room.
 */
function getDmUserId(client: MatrixClient, room: Room): string | null {
  const myUserId = client.getUserId();
  const members = room.getJoinedMembers();

  if (members.length === 2) {
    const other = members.find((m) => m.userId !== myUserId);
    return other?.userId || null;
  }
  return null;
}
