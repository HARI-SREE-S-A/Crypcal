/**
 * 192.168.6 Zustand Store
 *
 * Minimal global state. Most data comes from the Matrix SDK's own stores;
 * this only holds UI state and derived values.
 */
import { create } from 'zustand';
import type { MatrixClient, Room } from 'matrix-js-sdk';

export type AppView = 'login' | 'pending' | 'admin' | 'conversations' | 'chat' | 'call' | 'settings';
export type Theme = 'system' | 'light' | 'dark';

export interface CallState {
  roomId: string;
  isAudioOnly: boolean;
  isMuted: boolean;
  isCameraOff: boolean;
  latencyMs: number;
  participants: string[];
}

interface AppState {
  // Auth
  client: MatrixClient | null;
  isLoading: boolean;
  isAdmin: boolean;
  pendingShortId: string | null;

  // Navigation
  view: AppView;
  activeRoomId: string | null;

  // Call
  activeCall: CallState | null;

  // UI
  theme: Theme;
  settingsOpen: boolean;

  // Actions
  setClient: (client: MatrixClient | null) => void;
  setLoading: (loading: boolean) => void;
  setIsAdmin: (isAdmin: boolean) => void;
  setPendingShortId: (pendingShortId: string | null) => void;
  setView: (view: AppView) => void;
  setActiveRoom: (roomId: string | null) => void;
  setActiveCall: (call: CallState | null) => void;
  setTheme: (theme: Theme) => void;
  toggleSettings: () => void;
  navigateToChat: (roomId: string) => void;
  navigateBack: () => void;
}

function getStoredTheme(): Theme {
  if (typeof localStorage !== 'undefined') {
    return (localStorage.getItem('one92168_theme') as Theme) || 'system';
  }
  return 'system';
}

export const useAppStore = create<AppState>((set) => ({
  // Initial state
  client: null,
  isLoading: true,
  isAdmin: false,
  pendingShortId: null,
  view: 'login',
  activeRoomId: null,
  activeCall: null,
  theme: getStoredTheme(),
  settingsOpen: false,

  // Actions
  setClient: (client) => set({ client, view: client ? 'conversations' : 'login' }),
  setLoading: (isLoading) => set({ isLoading }),
  setIsAdmin: (isAdmin) => set({ isAdmin }),
  setPendingShortId: (pendingShortId) => set({ pendingShortId }),
  setView: (view) => set({ view }),
  setActiveRoom: (activeRoomId) => set({ activeRoomId }),
  setActiveCall: (activeCall) => set({
    activeCall,
    view: activeCall ? 'call' : 'chat',
  }),
  setTheme: (theme) => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('one92168_theme', theme);
    }
    applyTheme(theme);
    set({ theme });
  },
  toggleSettings: () => set((s) => ({ settingsOpen: !s.settingsOpen })),
  navigateToChat: (roomId) => set({ view: 'chat', activeRoomId: roomId }),
  navigateBack: () => set((s) => ({
    view: s.activeCall ? 'call' : 'conversations',
    activeRoomId: s.activeCall ? s.activeRoomId : null,
  })),
}));

/**
 * Apply theme to the document root element.
 */
function applyTheme(theme: Theme): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.classList.remove('light', 'dark');
  if (theme !== 'system') {
    root.classList.add(theme);
  }
}

// Apply theme on load
applyTheme(getStoredTheme());

/**
 * Helper: get sorted rooms from the Matrix client.
 * Sorted by most recent activity.
 */
export function getSortedRooms(client: MatrixClient): Room[] {
  const rooms = client.getRooms();
  return rooms.sort((a, b) => {
    const tsA = a.getLastActiveTimestamp();
    const tsB = b.getLastActiveTimestamp();
    return tsB - tsA;
  });
}
