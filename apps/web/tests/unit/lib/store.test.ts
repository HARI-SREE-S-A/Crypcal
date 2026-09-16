import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore, getSortedRooms } from '@/lib/store';
import type { MatrixClient, Room } from 'matrix-js-sdk';

describe('useAppStore', () => {
  beforeEach(() => {
    // Reset store state between tests
    useAppStore.setState({
      client: null,
      isLoading: true,
      view: 'login',
      activeRoomId: null,
      activeCall: null,
      theme: 'system',
      settingsOpen: false,
    });
  });

  it('initializes with default login state', () => {
    const state = useAppStore.getState();
    expect(state.view).toBe('login');
    expect(state.client).toBeNull();
    expect(state.activeRoomId).toBeNull();
    expect(state.activeCall).toBeNull();
    expect(state.settingsOpen).toBe(false);
  });

  it('updates view when client logs in or logs out', () => {
    const mockClient = { getUserId: () => '@alice:localhost' } as unknown as MatrixClient;

    useAppStore.getState().setClient(mockClient);
    expect(useAppStore.getState().view).toBe('conversations');
    expect(useAppStore.getState().client).toBe(mockClient);

    useAppStore.getState().setClient(null);
    expect(useAppStore.getState().view).toBe('login');
    expect(useAppStore.getState().client).toBeNull();
  });

  it('navigates to chat and back', () => {
    const roomId = '!crypto123:localhost';
    useAppStore.getState().navigateToChat(roomId);

    expect(useAppStore.getState().view).toBe('chat');
    expect(useAppStore.getState().activeRoomId).toBe(roomId);

    useAppStore.getState().navigateBack();
    expect(useAppStore.getState().view).toBe('conversations');
    expect(useAppStore.getState().activeRoomId).toBeNull();
  });

  it('manages call state and transitions view', () => {
    const callState = {
      roomId: '!room:example.com',
      isAudioOnly: false,
      isMuted: false,
      isCameraOff: false,
      latencyMs: 35,
      participants: ['@alice:example.com', '@bob:example.com'],
    };

    useAppStore.getState().setActiveCall(callState);
    expect(useAppStore.getState().view).toBe('call');
    expect(useAppStore.getState().activeCall).toEqual(callState);

    useAppStore.getState().setActiveCall(null);
    expect(useAppStore.getState().view).toBe('chat');
    expect(useAppStore.getState().activeCall).toBeNull();
  });

  it('toggles settings modal', () => {
    expect(useAppStore.getState().settingsOpen).toBe(false);
    useAppStore.getState().toggleSettings();
    expect(useAppStore.getState().settingsOpen).toBe(true);
    useAppStore.getState().toggleSettings();
    expect(useAppStore.getState().settingsOpen).toBe(false);
  });

  it('updates theme', () => {
    useAppStore.getState().setTheme('dark');
    expect(useAppStore.getState().theme).toBe('dark');

    useAppStore.getState().setTheme('light');
    expect(useAppStore.getState().theme).toBe('light');
  });

  it('sorts rooms by last active timestamp descending', () => {
    const roomA = {
      roomId: '!a:example.com',
      getLastActiveTimestamp: () => 1000,
    } as unknown as Room;

    const roomB = {
      roomId: '!b:example.com',
      getLastActiveTimestamp: () => 5000,
    } as unknown as Room;

    const roomC = {
      roomId: '!c:example.com',
      getLastActiveTimestamp: () => 3000,
    } as unknown as Room;

    const mockClient = {
      getRooms: () => [roomA, roomB, roomC],
    } as unknown as MatrixClient;

    const sorted = getSortedRooms(mockClient);
    expect(sorted[0]).toBe(roomB); // 5000
    expect(sorted[1]).toBe(roomC); // 3000
    expect(sorted[2]).toBe(roomA); // 1000
  });
});
