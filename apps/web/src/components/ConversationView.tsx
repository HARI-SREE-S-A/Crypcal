/**
 * ConversationView — Screen 2
 *
 * Message list (grouped by sender, timestamps on hover), composer with
 * attach button, header with name + encryption shield + call buttons.
 */
import { useState, useEffect, useRef, type FormEvent, type KeyboardEvent } from 'react';
import { ArrowLeft, Phone, Video, Paperclip, Send } from 'lucide-react';
import type { MatrixClient } from 'matrix-js-sdk';
import { useTimeline } from '@/hooks/useTimeline';
import { useCall } from '@/hooks/useCall';
import { useAppStore } from '@/lib/store';
import { EncryptionShield } from './EncryptionShield';
import { MessageBubble } from './MessageBubble';

interface ConversationViewProps {
  client: MatrixClient;
  roomId: string;
}

export function ConversationView({ client, roomId }: ConversationViewProps) {
  const [composerText, setComposerText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);

  const { groupedMessages, sendMessage, sendFile } = useTimeline(client, roomId);
  const { startCall } = useCall(client);
  const navigateBack = useAppStore((s) => s.navigateBack);

  const room = client.getRoom(roomId);
  const roomName = room?.name || 'Unnamed';

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [groupedMessages]);

  // Focus composer on mount
  useEffect(() => {
    composerRef.current?.focus();
  }, [roomId]);

  const handleSend = async (e?: FormEvent) => {
    e?.preventDefault();
    const text = composerText.trim();
    if (!text) return;

    setComposerText('');
    await sendMessage(text);
    composerRef.current?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = async () => {
    const input = fileInputRef.current;
    if (!input?.files?.length) return;

    const file = input.files[0]!;
    await sendFile(file);
    input.value = '';
  };

  return (
    <div className="flex h-dvh flex-col" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Header */}
      <header
        className="flex items-center gap-3 px-2"
        style={{
          minHeight: 'var(--size-touch)',
          borderBottom: '1px solid var(--border-primary)',
          backgroundColor: 'var(--bg-secondary)',
        }}
      >
        {/* Back button */}
        <button
          onClick={navigateBack}
          className="touch-target rounded-md"
          style={{ color: 'var(--text-secondary)' }}
          aria-label="Back to conversations"
        >
          <ArrowLeft size={20} />
        </button>

        {/* Room name + encryption status */}
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <h2
            className="truncate text-sm font-semibold"
            style={{ color: 'var(--text-primary)' }}
          >
            {roomName}
          </h2>
          <EncryptionShield client={client} roomId={roomId} size={14} />
        </div>

        {/* Call buttons */}
        <button
          onClick={() => startCall(roomId, true)}
          className="touch-target rounded-md"
          style={{ color: 'var(--text-secondary)' }}
          aria-label="Voice call"
        >
          <Phone size={18} />
        </button>
        <button
          onClick={() => startCall(roomId, false)}
          className="touch-target rounded-md"
          style={{ color: 'var(--text-secondary)' }}
          aria-label="Video call"
        >
          <Video size={18} />
        </button>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {groupedMessages.length === 0 && (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
              No messages yet. Say hello!
            </p>
          </div>
        )}

        <div className="flex flex-col gap-1">
          {groupedMessages.map((group, gi) => (
            <div key={`group-${gi}`} className="flex flex-col gap-0.5">
              {group.messages.map((msg, mi) => (
                <MessageBubble
                  key={msg.eventId}
                  message={msg}
                  showSender={mi === 0}
                />
              ))}
            </div>
          ))}
        </div>

        <div ref={messagesEndRef} />
      </div>

      {/* Composer */}
      <div
        className="px-4 py-2"
        style={{
          borderTop: '1px solid var(--border-primary)',
          backgroundColor: 'var(--bg-secondary)',
        }}
      >
        <form onSubmit={handleSend} className="flex items-end gap-2">
          {/* Attach button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="touch-target shrink-0 rounded-md"
            style={{ color: 'var(--text-tertiary)' }}
            aria-label="Attach file"
          >
            <Paperclip size={18} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileSelect}
            aria-hidden="true"
          />

          {/* Text input */}
          <textarea
            ref={composerRef}
            value={composerText}
            onChange={(e) => setComposerText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message"
            rows={1}
            className="flex-1 resize-none rounded-md px-3 py-2 text-sm outline-none"
            style={{
              backgroundColor: 'var(--bg-tertiary)',
              color: 'var(--text-primary)',
              maxHeight: '120px',
              minHeight: '36px',
            }}
          />

          {/* Send button */}
          <button
            type="submit"
            disabled={!composerText.trim()}
            className="touch-target shrink-0 rounded-md transition-colors disabled:opacity-30"
            style={{ color: 'var(--accent)' }}
            aria-label="Send message"
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}
