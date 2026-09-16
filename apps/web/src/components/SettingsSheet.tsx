/**
 * SettingsSheet — Slide-over settings panel.
 *
 * Display name, device list + verification, key backup status,
 * theme toggle, log out. That is the whole app.
 */
import { useState, useEffect } from 'react';
import { X, Sun, Moon, Monitor, LogOut, Smartphone, CheckCircle, AlertCircle } from 'lucide-react';
import type { MatrixClient } from 'matrix-js-sdk';
import { useAppStore, type Theme } from '@/lib/store';
import { logout } from '@/lib/matrix';

interface SettingsSheetProps {
  client: MatrixClient;
}

export function SettingsSheet({ client }: SettingsSheetProps) {
  const [displayName, setDisplayName] = useState('');
  const [devices, setDevices] = useState<Array<{ deviceId: string; displayName: string; isVerified: boolean }>>([]);
  const [hasKeyBackup, setHasKeyBackup] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);
  const toggleSettings = useAppStore((s) => s.toggleSettings);
  const setClient = useAppStore((s) => s.setClient);

  const userId = client.getUserId() || '';

  // Load user data
  useEffect(() => {
    // Display name
    const user = client.getUser(userId);
    setDisplayName(user?.displayName || userId);

    // Devices
    const loadDevices = async () => {
      try {
        const crypto = client.getCrypto();
        if (!crypto) return;

        const deviceMap = await crypto.getUserDeviceInfo([userId]);
        const userDevices = deviceMap.get(userId);
        if (!userDevices) return;

        const deviceList: typeof devices = [];
        for (const [deviceId, device] of userDevices) {
          const verified = await crypto.getDeviceVerificationStatus(userId, deviceId);
          deviceList.push({
            deviceId,
            displayName: device.displayName || deviceId,
            isVerified: verified?.isVerified() || false,
          });
        }
        setDevices(deviceList);
      } catch {
        // Ignore device loading errors
      }
    };
    loadDevices();

    // Key backup status
    const checkBackup = async () => {
      try {
        const crypto = client.getCrypto();
        if (!crypto) return;
        const backupInfo = await crypto.checkKeyBackupAndEnable();
        setHasKeyBackup(!!backupInfo);
      } catch {
        setHasKeyBackup(false);
      }
    };
    checkBackup();
  }, [client, userId]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await logout();
    setClient(null);
  };

  const themeOptions: Array<{ value: Theme; label: string; icon: typeof Sun }> = [
    { value: 'system', label: 'System', icon: Monitor },
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
  ];

  const myDeviceId = client.getDeviceId();

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
        onClick={toggleSettings}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        className="fixed right-0 top-0 z-50 flex h-dvh w-full max-w-sm flex-col overflow-y-auto"
        style={{
          backgroundColor: 'var(--bg-secondary)',
          borderLeft: '1px solid var(--border-primary)',
        }}
        role="dialog"
        aria-label="Settings"
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4"
          style={{
            minHeight: 'var(--size-touch)',
            borderBottom: '1px solid var(--border-primary)',
          }}
        >
          <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
            Settings
          </h2>
          <button
            onClick={toggleSettings}
            className="touch-target rounded-md"
            style={{ color: 'var(--text-tertiary)' }}
            aria-label="Close settings"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-col gap-6 p-4">
          {/* Display Name */}
          <section>
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
              Profile
            </h3>
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              {displayName}
            </p>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              {userId}
            </p>
          </section>

          {/* Theme */}
          <section>
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
              Theme
            </h3>
            <div className="flex gap-1">
              {themeOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setTheme(opt.value)}
                  className="touch-target flex flex-1 items-center justify-center gap-1.5 rounded-md text-xs font-medium transition-colors"
                  style={{
                    backgroundColor: theme === opt.value ? 'var(--accent)' : 'var(--bg-tertiary)',
                    color: theme === opt.value ? 'var(--accent-text)' : 'var(--text-secondary)',
                  }}
                >
                  <opt.icon size={14} />
                  {opt.label}
                </button>
              ))}
            </div>
          </section>

          {/* Key Backup */}
          <section>
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
              Key Backup
            </h3>
            <div className="flex items-center gap-2">
              {hasKeyBackup ? (
                <>
                  <CheckCircle size={16} style={{ color: 'var(--color-verified)' }} />
                  <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
                    Backup enabled
                  </span>
                </>
              ) : (
                <>
                  <AlertCircle size={16} style={{ color: 'var(--color-unverified)' }} />
                  <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
                    No backup configured
                  </span>
                </>
              )}
            </div>
          </section>

          {/* Devices */}
          <section>
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
              Devices
            </h3>
            <div className="flex flex-col gap-2">
              {devices.map((device) => (
                <div
                  key={device.deviceId}
                  className="flex items-center gap-3 rounded-md px-3 py-2"
                  style={{ backgroundColor: 'var(--bg-tertiary)' }}
                >
                  <Smartphone size={16} style={{ color: 'var(--text-secondary)' }} />
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm" style={{ color: 'var(--text-primary)' }}>
                      {device.displayName}
                      {device.deviceId === myDeviceId && (
                        <span className="ml-1 text-xs" style={{ color: 'var(--accent)' }}>
                          (this device)
                        </span>
                      )}
                    </p>
                    <p className="text-xs font-mono" style={{ color: 'var(--text-tertiary)' }}>
                      {device.deviceId}
                    </p>
                  </div>
                  {device.isVerified ? (
                    <CheckCircle size={14} style={{ color: 'var(--color-verified)' }} />
                  ) : (
                    <AlertCircle size={14} style={{ color: 'var(--color-unverified)' }} />
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Logout */}
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="touch-target flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors"
            style={{
              backgroundColor: 'var(--color-danger)',
              color: '#ffffff',
            }}
          >
            <LogOut size={16} />
            {isLoggingOut ? 'Signing out...' : 'Sign out'}
          </button>
        </div>
      </div>
    </>
  );
}
