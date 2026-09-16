/**
 * useTimeline — Subscribe to the message timeline for a room.
 * Returns messages grouped by sender for the conversation view.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import type { MatrixClient, MatrixEvent } from 'matrix-js-sdk';
import { RoomEvent, MsgType } from 'matrix-js-sdk';

export interface TimelineMessage {
  eventId: string;
  sender: string;
  senderName: string;
  content: string;
  timestamp: number;
  type: 'text' | 'image' | 'file' | 'audio' | 'video' | 'encrypted' | 'other';
  isMe: boolean;
  /** For encrypted files, the decrypted content URL */
  mediaUrl?: string;
  fileName?: string;
}

export interface MessageGroup {
  sender: string;
  senderName: string;
  isMe: boolean;
  messages: TimelineMessage[];
}

export function useTimeline(client: MatrixClient | null, roomId: string | null) {
  const [messages, setMessages] = useState<TimelineMessage[]>([]);
  const [isLoading, _setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const processEvent = useCallback(
    (event: MatrixEvent): TimelineMessage | null => {
      if (!client) return null;
      const myUserId = client.getUserId();
      const room = roomId ? client.getRoom(roomId) : null;
      const member = room?.getMember(event.getSender() || '');

      const type = event.getType();
      if (type !== 'm.room.message' && type !== 'm.room.encrypted') {
        return null;
      }

      const content = event.getContent();
      let msgType: TimelineMessage['type'] = 'text';
      let displayContent = '';
      let mediaUrl: string | undefined;
      let fileName: string | undefined;

      if (type === 'm.room.encrypted' && !content.msgtype) {
        msgType = 'encrypted';
        displayContent = 'Unable to decrypt';
      } else {
        switch (content.msgtype) {
          case 'm.text':
            msgType = 'text';
            displayContent = content.body || '';
            break;
          case 'm.image':
            msgType = 'image';
            displayContent = content.body || 'Image';
            if (content.url) {
              mediaUrl = client.mxcUrlToHttp(content.url) || undefined;
            }
            break;
          case 'm.file':
            msgType = 'file';
            displayContent = content.body || 'File';
            fileName = content.body;
            break;
          case 'm.audio':
            msgType = 'audio';
            displayContent = content.body || 'Audio';
            break;
          case 'm.video':
            msgType = 'video';
            displayContent = content.body || 'Video';
            break;
          default:
            msgType = 'other';
            displayContent = content.body || '';
        }
      }

      return {
        eventId: event.getId() || '',
        sender: event.getSender() || '',
        senderName: member?.name || event.getSender() || 'Unknown',
        content: displayContent,
        timestamp: event.getTs(),
        type: msgType,
        isMe: event.getSender() === myUserId,
        mediaUrl,
        fileName,
      };
    },
    [client, roomId],
  );

  const updateTimeline = useCallback(() => {
    if (!client || !roomId) {
      setMessages([]);
      return;
    }

    const room = client.getRoom(roomId);
    if (!room) {
      setMessages([]);
      return;
    }

    const events = room.getLiveTimeline().getEvents();
    const processed = events
      .map(processEvent)
      .filter((m): m is TimelineMessage => m !== null);

    setMessages(processed);
  }, [client, roomId, processEvent]);

  useEffect(() => {
    if (!client || !roomId) return;

    // Initial load
    updateTimeline();

    // Mark room as read
    const room = client.getRoom(roomId);
    if (room) {
      const lastEvent = room.getLastLiveEvent();
      if (lastEvent) {
        client.sendReadReceipt(lastEvent).catch(() => {});
      }
    }

    // Subscribe to new messages
    const onTimeline = () => updateTimeline();
    const onDecrypted = () => updateTimeline();

    client.on(RoomEvent.Timeline, onTimeline);
    client.on('Event.decrypted' as any, onDecrypted);

    return () => {
      client.removeListener(RoomEvent.Timeline, onTimeline);
      client.removeListener('Event.decrypted' as any, onDecrypted);
    };
  }, [client, roomId, updateTimeline]);

  /**
   * Send a text message (always encrypted).
   */
  const sendMessage = useCallback(
    async (text: string) => {
      if (!client || !roomId) return;
      await client.sendTextMessage(roomId, text);
    },
    [client, roomId],
  );

  /**
   * Send an encrypted file attachment.
   * Files are encrypted client-side before upload when the room has encryption enabled.
   */
  const sendFile = useCallback(
    async (file: File) => {
      if (!client || !roomId) return;

      const room = client.getRoom(roomId);
      const isEncrypted = room?.hasEncryptionStateEvent() ?? false;
      const msgtype = file.type.startsWith('image/') ? MsgType.Image : MsgType.File;

      const clientWithCrypto = client as any;
      if (isEncrypted && typeof clientWithCrypto.encryptAndUploadFile === 'function') {
        // Encrypted upload: encrypt client-side, upload ciphertext, embed keys in event
        const { content_uri, file: encryptedFileInfo } = await clientWithCrypto.encryptAndUploadFile(file);
        await client.sendMessage(roomId, {
          msgtype,
          body: file.name,
          file: encryptedFileInfo,
          url: content_uri,
          info: {
            size: file.size,
            mimetype: file.type,
          },
        } as any);
      } else {
        // Fallback for unencrypted rooms (should not happen in 192.168.6) or SDK versions
        // without encryptAndUploadFile — upload plaintext
        const response = await client.uploadContent(file);
        await client.sendMessage(roomId, {
          msgtype,
          body: file.name,
          url: response.content_uri,
          info: {
            size: file.size,
            mimetype: file.type,
          },
        } as any);
      }
    },
    [client, roomId],
  );

  /**
   * Group messages by sender for display.
   */
  const groupedMessages: MessageGroup[] = [];
  let currentGroup: MessageGroup | null = null;

  for (const msg of messages) {
    if (!currentGroup || currentGroup.sender !== msg.sender) {
      currentGroup = {
        sender: msg.sender,
        senderName: msg.senderName,
        isMe: msg.isMe,
        messages: [msg],
      };
      groupedMessages.push(currentGroup);
    } else {
      currentGroup.messages.push(msg);
    }
  }

  return {
    messages,
    groupedMessages,
    sendMessage,
    sendFile,
    isLoading,
    scrollRef,
  };
}
