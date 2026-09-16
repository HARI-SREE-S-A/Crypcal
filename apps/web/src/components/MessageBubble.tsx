/**
 * MessageBubble — Single message display.
 * Grouped by sender, timestamps shown on hover.
 */
import type { TimelineMessage } from '@/hooks/useTimeline';
import { formatTime, formatFullTime } from '@/utils/formatTime';
import { Lock, FileText, Image, Music, Video } from 'lucide-react';

interface MessageBubbleProps {
  message: TimelineMessage;
  showSender: boolean;
}

export function MessageBubble({ message, showSender }: MessageBubbleProps) {
  const getIcon = () => {
    switch (message.type) {
      case 'image':
        return <Image size={14} />;
      case 'file':
        return <FileText size={14} />;
      case 'audio':
        return <Music size={14} />;
      case 'video':
        return <Video size={14} />;
      case 'encrypted':
        return <Lock size={14} />;
      default:
        return null;
    }
  };

  return (
    <div
      className={`group flex flex-col ${message.isMe ? 'items-end' : 'items-start'}`}
    >
      {/* Sender name (first message in group only) */}
      {showSender && !message.isMe && (
        <span
          className="mb-0.5 px-3 text-xs font-medium"
          style={{ color: 'var(--accent)' }}
        >
          {message.senderName}
        </span>
      )}

      <div className="flex max-w-[80%] items-end gap-2">
        {/* Timestamp (visible on hover) */}
        {message.isMe && (
          <span
            className="mb-1 text-xs opacity-0 transition-opacity group-hover:opacity-100"
            style={{ color: 'var(--text-tertiary)' }}
            title={formatFullTime(message.timestamp)}
          >
            {formatTime(message.timestamp)}
          </span>
        )}

        {/* Message bubble */}
        <div
          className="rounded-lg px-3 py-2 text-sm break-words"
          style={{
            backgroundColor: message.isMe ? 'var(--accent)' : 'var(--bg-tertiary)',
            color: message.isMe ? 'var(--accent-text)' : 'var(--text-primary)',
            borderRadius: 'var(--radius-md)',
          }}
        >
          {/* Media preview */}
          {message.type === 'image' && message.mediaUrl && (
            <img
              src={message.mediaUrl}
              alt={message.content}
              className="mb-1 max-h-64 rounded"
              loading="lazy"
            />
          )}

          {/* Content */}
          <div className="flex items-center gap-1.5">
            {getIcon()}
            <span>{message.content}</span>
          </div>
        </div>

        {/* Timestamp (visible on hover) */}
        {!message.isMe && (
          <span
            className="mb-1 text-xs opacity-0 transition-opacity group-hover:opacity-100"
            style={{ color: 'var(--text-tertiary)' }}
            title={formatFullTime(message.timestamp)}
          >
            {formatTime(message.timestamp)}
          </span>
        )}
      </div>
    </div>
  );
}
