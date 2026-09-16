/**
 * App — Root component.
 *
 * Routes between login, conversations, chat, call, and settings.
 * Attempts session restore on mount.
 */
import { useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { restoreSession } from '@/lib/matrix';
import { LoginForm } from '@/components/LoginForm';
import { RegisterForm } from '@/components/RegisterForm';
import { PendingApproval } from '@/components/PendingApproval';
import { AdminPanel } from '@/components/AdminPanel';
import { ConversationList } from '@/components/ConversationList';
import { ConversationView } from '@/components/ConversationView';
import { CallView } from '@/components/CallView';
import { SettingsSheet } from '@/components/SettingsSheet';

export function App() {
  const client = useAppStore((s) => s.client);
  const isLoading = useAppStore((s) => s.isLoading);
  const view = useAppStore((s) => s.view);
  const activeRoomId = useAppStore((s) => s.activeRoomId);
  const settingsOpen = useAppStore((s) => s.settingsOpen);
  const setClient = useAppStore((s) => s.setClient);
  const setLoading = useAppStore((s) => s.setLoading);

  // Restore session on mount
  useEffect(() => {
    const restore = async () => {
      try {
        const restored = await restoreSession();
        if (restored) {
          setClient(restored);
        }
      } catch {
        // Failed to restore — show login
      } finally {
        setLoading(false);
      }
    };
    restore();
  }, [setClient, setLoading]);

  // Loading state
  if (isLoading) {
    return (
      <div
        className="flex h-dvh items-center justify-center"
        style={{ backgroundColor: 'var(--bg-primary)' }}
      >
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-t-transparent"
          style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }}
        />
      </div>
    );
  }

  // Authentication & Registration Views
  if (view === 'register') {
    return <RegisterForm />;
  }
  if (view === 'pending') {
    return <PendingApproval />;
  }
  if (view === 'admin') {
    return <AdminPanel />;
  }

  // Not logged in
  if (!client) {
    return <LoginForm />;
  }

  return (
    <>
      {/* Main view */}
      {view === 'conversations' && <ConversationList client={client} />}
      {view === 'chat' && activeRoomId && (
        <ConversationView client={client} roomId={activeRoomId} />
      )}
      {view === 'call' && activeRoomId && (
        <CallView client={client} roomId={activeRoomId} />
      )}

      {/* Settings overlay */}
      {settingsOpen && <SettingsSheet client={client} />}
    </>
  );
}
