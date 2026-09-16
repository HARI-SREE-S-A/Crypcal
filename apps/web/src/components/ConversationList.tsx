/**
 * ConversationList — Screen 1
 *
 * Sorted room list with unread dots, search, and "New conversation" button.
 * Nothing else. That's the spec.
 */
import { useState, useMemo } from 'react';
import { Search, Plus, Shield, Settings, ShieldCheck, AlertCircle } from 'lucide-react';
import type { MatrixClient } from 'matrix-js-sdk';
import { useRooms } from '@/hooks/useRooms';
import { useAppStore } from '@/lib/store';
import { createEncryptedRoom } from '@/lib/encryption';
import { lookupByShortId } from '@/lib/supabase';
import { formatTime } from '@/utils/formatTime';
import { APP_NAME } from '@/utils/constants';

interface ConversationListProps {
  client: MatrixClient;
}

export function ConversationList({ client }: ConversationListProps) {
  const [search, setSearch] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newUserId, setNewUserId] = useState('');
  const [lookupError, setLookupError] = useState('');
  const [isSearchingUser, setIsSearchingUser] = useState(false);

  const rooms = useRooms(client);
  const navigateToChat = useAppStore((s) => s.navigateToChat);
  const toggleSettings = useAppStore((s) => s.toggleSettings);
  const setView = useAppStore((s) => s.setView);

  // Filter rooms by search query
  const filteredRooms = useMemo(() => {
    if (!search.trim()) return rooms;
    const q = search.toLowerCase();
    return rooms.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.lastMessage.toLowerCase().includes(q),
    );
  }, [rooms, search]);

  const handleNewConversation = async () => {
    const rawInput = newUserId.trim();
    if (!rawInput) return;

    setLookupError('');
    setIsSearchingUser(true);

    try {
      let targetUserId = rawInput;

      // Check if input is a 6-character short ID (e.g. "KPR472" or "KPR-472")
      const cleanShortId = rawInput.toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (/^[A-Z]{3}[0-9]{3}$/.test(cleanShortId)) {
        const friend = await lookupByShortId(cleanShortId);
        if (!friend) {
          setLookupError(`No approved user found with ID "${cleanShortId}"`);
          setIsSearchingUser(false);
          return;
        }
        targetUserId = friend.matrix_user_id;
      } else if (!targetUserId.startsWith('@')) {
        // Auto-prefix @ and domain if standard username
        let domain = 'matrix.org';
        try {
          domain = new URL(client.baseUrl).hostname;
        } catch {
          // Keep default
        }
        targetUserId = `@${targetUserId}:${domain}`;
      }

      const roomId = await createEncryptedRoom(client, {
        inviteUserIds: [targetUserId],
        isDirect: true,
      });

      setIsCreating(false);
      setNewUserId('');
      navigateToChat(roomId);
    } catch (err) {
      console.error('Failed to create room:', err);
      setLookupError(err instanceof Error ? err.message : 'Could not create encrypted conversation');
    } finally {
      setIsSearchingUser(false);
    }
  };

  return (
    <div className="flex h-dvh flex-col" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Header */}
      <header
        className="flex items-center justify-between px-4"
        style={{
          minHeight: 'var(--size-touch)',
          borderBottom: '1px solid var(--border-primary)',
          backgroundColor: 'var(--bg-secondary)',
        }}
      >
        <div className="flex items-center gap-2">
          <Shield size={18} style={{ color: 'var(--accent)' }} />
          <h1 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
            {APP_NAME}
          </h1>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setView('admin')}
            className="touch-target rounded-md"
            style={{ color: 'var(--text-secondary)' }}
            aria-label="Admin Portal"
            title="Admin Portal"
          >
            <ShieldCheck size={20} />
          </button>
          <button
            onClick={() => {
              setIsCreating(true);
              setLookupError('');
            }}
            className="touch-target rounded-md"
            style={{ color: 'var(--accent)' }}
            aria-label="New conversation"
          >
            <Plus size={20} />
          </button>
          <button
            onClick={toggleSettings}
            className="touch-target rounded-md"
            style={{ color: 'var(--text-secondary)' }}
            aria-label="Settings"
          >
            <Settings size={20} />
          </button>
        </div>
      </header>

      {/* Search */}
      <div className="px-4 py-2" style={{ backgroundColor: 'var(--bg-secondary)' }}>
        <div
          className="flex items-center gap-2 rounded-md px-3"
          style={{
            backgroundColor: 'var(--bg-tertiary)',
            minHeight: '36px',
          }}
        >
          <Search size={14} style={{ color: 'var(--text-tertiary)' }} />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search conversations"
            className="w-full bg-transparent text-sm outline-none"
            style={{ color: 'var(--text-primary)' }}
            aria-label="Search conversations"
          />
        </div>
      </div>

      {/* New conversation dialog */}
      {isCreating && (
        <div
          className="flex flex-col gap-2 px-4 py-3"
          style={{
            backgroundColor: 'var(--bg-tertiary)',
            borderBottom: '1px solid var(--border-primary)',
          }}
        >
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newUserId}
              onChange={(e) => {
                setNewUserId(e.target.value);
                if (lookupError) setLookupError('');
              }}
              placeholder="6-character ID (e.g. KPR472) or @user:matrix.org"
              autoComplete="off"
              autoFocus
              disabled={isSearchingUser}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleNewConversation();
                if (e.key === 'Escape') setIsCreating(false);
              }}
              className="flex-1 rounded-md bg-transparent px-3 text-sm outline-none"
              style={{
                minHeight: '36px',
                backgroundColor: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-primary)',
              }}
            />
            <button
              onClick={handleNewConversation}
              disabled={isSearchingUser || !newUserId.trim()}
              className="touch-target rounded-md px-4 text-sm font-medium disabled:opacity-50 cursor-pointer"
              style={{
                backgroundColor: 'var(--accent)',
                color: 'var(--accent-text)',
              }}
            >
              {isSearchingUser ? 'Finding...' : 'Start'}
            </button>
            <button
              onClick={() => {
                setIsCreating(false);
                setLookupError('');
              }}
              className="touch-target text-sm cursor-pointer"
              style={{ color: 'var(--text-tertiary)' }}
            >
              Cancel
            </button>
          </div>
          {lookupError && (
            <div className="flex items-center gap-1.5 text-xs font-medium" style={{ color: 'var(--color-danger)' }}>
              <AlertCircle size={13} />
              <span>{lookupError}</span>
            </div>
          )}
        </div>
      )}

      {/* Room List */}
      <div className="flex-1 overflow-y-auto">
        {filteredRooms.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
              {search ? 'No matching conversations' : 'No conversations yet'}
            </p>
            {!search && (
              <button
                onClick={() => setIsCreating(true)}
                className="mt-3 flex items-center gap-1 text-sm font-medium"
                style={{ color: 'var(--accent)' }}
              >
                <Plus size={14} />
                Start a conversation
              </button>
            )}
          </div>
        )}

        {filteredRooms.map((room) => (
          <button
            key={room.roomId}
            onClick={() => navigateToChat(room.roomId)}
            className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors"
            style={{ borderBottom: '1px solid var(--border-secondary)' }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            {/* Avatar */}
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-medium"
              style={{
                backgroundColor: 'var(--bg-tertiary)',
                color: 'var(--text-secondary)',
              }}
            >
              {room.avatarUrl ? (
                <img
                  src={room.avatarUrl}
                  alt=""
                  className="h-10 w-10 rounded-full object-cover"
                />
              ) : (
                room.name.charAt(0).toUpperCase()
              )}
            </div>

            {/* Content */}
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="flex items-center justify-between">
                <span
                  className="truncate text-sm font-medium"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {room.name}
                </span>
                {room.lastMessageTs > 0 && (
                  <span
                    className="ml-2 shrink-0 text-xs"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    {formatTime(room.lastMessageTs)}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span
                  className="truncate text-xs"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {room.lastMessage}
                </span>
                {/* Unread dot */}
                {room.unreadCount > 0 && (
                  <span
                    className="ml-2 flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1 text-xs font-medium"
                    style={{
                      backgroundColor: 'var(--accent)',
                      color: 'var(--accent-text)',
                    }}
                  >
                    {room.unreadCount > 99 ? '99+' : room.unreadCount}
                  </span>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
