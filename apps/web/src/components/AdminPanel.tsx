/**
 * AdminPanel — Management interface for 192.168.6 administrator.
 *
 * Allows:
 * - Reviewing pending registration requests
 * - Approving / rejecting users
 * - Viewing directory of all users and their unique 6-character short IDs
 */
import { useState, useEffect, type FormEvent } from 'react';
import {
  ShieldCheck,
  Check,
  X,
  Lock,
  ArrowLeft,
  Users,
  Clock,
  Search,
  RefreshCw,
  Copy,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import {
  verifyAdminPassword,
  getPendingUsers,
  getAllUsers,
  approveUser,
  rejectUser,
  type UserRecord,
} from '@/lib/supabase';
import { formatShortId } from '@/lib/shortId';
import { APP_NAME } from '@/utils/constants';

export function AdminPanel() {
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState('');

  const [activeTab, setActiveTab] = useState<'pending' | 'all'>('pending');
  const [pendingUsers, setPendingUsers] = useState<UserRecord[]>([]);
  const [allUsers, setAllUsers] = useState<UserRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const setView = useAppStore((s) => s.setView);
  const client = useAppStore((s) => s.client);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [pending, all] = await Promise.all([getPendingUsers(), getAllUsers()]);
      setPendingUsers(pending);
      setAllUsers(all);
    } catch (err) {
      console.error('[AdminPanel] Error loading data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated]);

  const handlePasswordSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (verifyAdminPassword(password)) {
      setIsAuthenticated(true);
      setAuthError('');
    } else {
      setAuthError('Incorrect admin password. Please try again.');
    }
  };

  const handleApprove = async (id: string) => {
    const success = await approveUser(id);
    if (success) {
      await loadData();
    }
  };

  const handleReject = async (id: string) => {
    const success = await rejectUser(id);
    if (success) {
      await loadData();
    }
  };

  const handleCopyId = (shortId: string) => {
    navigator.clipboard.writeText(shortId);
    setCopiedId(shortId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredAllUsers = allUsers.filter(
    (u) =>
      u.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.short_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.matrix_user_id.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // If not authenticated, show admin login prompt
  if (!isAuthenticated) {
    return (
      <div
        className="flex min-h-dvh w-full items-center justify-center p-4"
        style={{ backgroundColor: 'var(--bg-primary)' }}
      >
        <div
          className="w-full max-w-sm rounded-xl p-8 shadow-sm flex flex-col"
          style={{
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-primary)',
          }}
        >
          <div className="mb-6 flex flex-col items-center gap-3 text-center">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-xl"
              style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }}
            >
              <ShieldCheck size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                {APP_NAME} Admin Portal
              </h1>
              <p className="mt-1 text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                Authenticate to manage users and approval requests
              </p>
            </div>
          </div>

          <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="adminPassword" className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                Admin Password
              </label>
              <input
                id="adminPassword"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoFocus
                className="w-full rounded-lg px-3.5 py-2.5 text-sm outline-none transition-colors"
                style={{
                  backgroundColor: 'var(--bg-tertiary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-primary)',
                }}
              />
            </div>

            {authError && (
              <p className="text-xs font-medium" style={{ color: 'var(--color-danger)' }} role="alert">
                {authError}
              </p>
            )}

            <button
              type="submit"
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-colors cursor-pointer"
              style={{
                backgroundColor: 'var(--accent)',
                color: 'var(--accent-text)',
              }}
            >
              <Lock size={15} />
              <span>Unlock Admin Panel</span>
            </button>
          </form>

          <button
            type="button"
            onClick={() => setView(client ? 'conversations' : 'login')}
            className="mt-6 flex items-center justify-center gap-1.5 text-xs hover:underline cursor-pointer"
            style={{ color: 'var(--text-secondary)' }}
          >
            <ArrowLeft size={13} />
            <span>Return to App</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex min-h-dvh w-full flex-col p-4 md:p-8"
      style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
    >
      <div className="mx-auto w-full max-w-4xl">
        {/* Top bar */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b pb-4" style={{ borderColor: 'var(--border-primary)' }}>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setView(client ? 'conversations' : 'login')}
              className="p-2 rounded-lg border transition-colors cursor-pointer"
              style={{ borderColor: 'var(--border-primary)', backgroundColor: 'var(--bg-secondary)' }}
              title="Return"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <h1 className="text-xl font-bold tracking-tight">{APP_NAME} Administration</h1>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                Approve requests and manage the 6-character user directory
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={loadData}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border cursor-pointer"
            style={{ borderColor: 'var(--border-primary)', backgroundColor: 'var(--bg-secondary)' }}
          >
            <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-2 border-b" style={{ borderColor: 'var(--border-primary)' }}>
          <button
            type="button"
            onClick={() => setActiveTab('pending')}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors cursor-pointer"
            style={{
              borderColor: activeTab === 'pending' ? 'var(--accent)' : 'transparent',
              color: activeTab === 'pending' ? 'var(--accent)' : 'var(--text-secondary)',
            }}
          >
            <Clock size={16} />
            <span>Pending Requests</span>
            {pendingUsers.length > 0 && (
              <span
                className="px-1.5 py-0.5 text-[10px] font-bold rounded-full"
                style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }}
              >
                {pendingUsers.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors cursor-pointer"
            style={{
              borderColor: activeTab === 'all' ? 'var(--accent)' : 'transparent',
              color: activeTab === 'all' ? 'var(--accent)' : 'var(--text-secondary)',
            }}
          >
            <Users size={16} />
            <span>User Directory ({allUsers.length})</span>
          </button>
        </div>

        {/* Tab 1: Pending Requests */}
        {activeTab === 'pending' && (
          <div>
            {pendingUsers.length === 0 ? (
              <div
                className="rounded-xl p-12 text-center border flex flex-col items-center gap-3"
                style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-primary)' }}
              >
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-xl"
                  style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)', color: 'var(--color-verified)' }}
                >
                  <Check size={24} />
                </div>
                <h2 className="text-base font-semibold">No Pending Requests</h2>
                <p className="text-xs max-w-sm" style={{ color: 'var(--text-secondary)' }}>
                  All access requests have been reviewed. When friends register, their approval prompts will appear here.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {pendingUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex flex-wrap items-center justify-between gap-4 rounded-xl p-4 border"
                    style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-primary)' }}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className="flex h-12 w-12 items-center justify-center rounded-xl font-mono font-bold text-lg"
                        style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--accent)' }}
                      >
                        {formatShortId(user.short_id)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-semibold">{user.display_name}</h3>
                          <span
                            className="px-2 py-0.5 text-[10px] font-mono rounded"
                            style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
                          >
                            ID: {user.short_id}
                          </span>
                        </div>
                        <p className="text-xs font-mono mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                          {user.matrix_user_id}
                        </p>
                        <span className="text-[11px] opacity-70" style={{ color: 'var(--text-tertiary)' }}>
                          Requested: {new Date(user.created_at).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleApprove(user.id)}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium cursor-pointer text-white transition-opacity hover:opacity-90"
                        style={{ backgroundColor: 'var(--color-verified)' }}
                      >
                        <Check size={14} />
                        <span>Approve</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReject(user.id)}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium cursor-pointer text-white transition-opacity hover:opacity-90"
                        style={{ backgroundColor: 'var(--color-danger)' }}
                      >
                        <X size={14} />
                        <span>Reject</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: User Directory */}
        {activeTab === 'all' && (
          <div className="flex flex-col gap-4">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-tertiary)' }} />
              <input
                type="text"
                placeholder="Search by name, 6-character ID, or Matrix handle..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg pl-9 pr-4 py-2 text-sm outline-none border"
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  borderColor: 'var(--border-primary)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>

            <div className="flex flex-col gap-2">
              {filteredAllUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg p-3 border text-sm"
                  style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-primary)' }}
                >
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleCopyId(user.short_id)}
                      className="flex items-center gap-1 font-mono font-bold px-2 py-1 rounded border text-xs cursor-pointer"
                      style={{
                        backgroundColor: 'var(--bg-tertiary)',
                        borderColor: 'var(--border-primary)',
                        color: 'var(--accent)',
                      }}
                      title="Copy Short ID"
                    >
                      <span>{formatShortId(user.short_id)}</span>
                      {copiedId === user.short_id ? <Check size={11} /> : <Copy size={11} />}
                    </button>
                    <div>
                      <span className="font-medium">{user.display_name}</span>
                      <span className="ml-2 font-mono text-xs opacity-70" style={{ color: 'var(--text-secondary)' }}>
                        {user.matrix_user_id}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className="px-2 py-0.5 text-[11px] font-semibold rounded-full capitalize"
                      style={{
                        backgroundColor:
                          user.status === 'approved'
                            ? 'rgba(34, 197, 94, 0.15)'
                            : user.status === 'rejected'
                            ? 'rgba(239, 68, 68, 0.15)'
                            : 'rgba(234, 179, 8, 0.15)',
                        color:
                          user.status === 'approved'
                            ? 'var(--color-verified)'
                            : user.status === 'rejected'
                            ? 'var(--color-danger)'
                            : 'var(--color-unverified)',
                      }}
                    >
                      {user.status}
                    </span>

                    {user.status === 'pending' && (
                      <button
                        type="button"
                        onClick={() => handleApprove(user.id)}
                        className="px-2.5 py-1 rounded text-xs font-medium cursor-pointer text-white"
                        style={{ backgroundColor: 'var(--color-verified)' }}
                      >
                        Approve
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
