/**
 * LoginForm — Username/password login with loading state.
 * 2FA (TOTP) is handled by Matrix UIA flow when required.
 */
import { useState, type FormEvent } from 'react';
import { Lock, Eye, EyeOff, Shield, Sparkles, UserPlus, ShieldCheck } from 'lucide-react';
import { loginWithPassword } from '@/lib/matrix';
import { useAppStore } from '@/lib/store';
import { checkUserStatus } from '@/lib/supabase';
import { APP_NAME } from '@/utils/constants';

export function LoginForm() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const setClient = useAppStore((s) => s.setClient);
  const setView = useAppStore((s) => s.setView);
  const setPendingShortId = useAppStore((s) => s.setPendingShortId);

  const handleDemoLogin = async () => {
    // Lazy-load mock client to keep it out of the production bundle
    const { createMockMatrixClient } = await import('@/lib/mockClient');
    const mock = createMockMatrixClient(username.trim() || 'alice');
    setClient(mock);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) return;

    setIsLoading(true);
    setError('');

    try {
      // Check approval status in directory
      const userStatus = await checkUserStatus(username.trim());
      if (userStatus && userStatus.status === 'pending') {
        setPendingShortId(userStatus.short_id);
        setError('Your account is awaiting administrator approval.');
        setIsLoading(false);
        return;
      }
      if (userStatus && userStatus.status === 'rejected') {
        setError('This account access was declined by the administrator.');
        setIsLoading(false);
        return;
      }

      const client = await loginWithPassword(username.trim(), password);
      setClient(client);
    } catch (err) {
      if (err instanceof Error) {
        if (err.message.includes('403') || err.message.includes('Invalid')) {
          setError('Invalid username or password');
        } else if (err.message.includes('429')) {
          setError('Too many attempts. Please wait and try again.');
        } else if (err.message.includes('500') || err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
          setError('Homeserver not reachable (local Docker stack is not running). Try Demo Mode below to preview all features!');
        } else {
          setError(err.message);
        }
      } else {
        setError('Login failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-dvh w-full items-center justify-center p-4" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <div
        className="w-full max-w-sm rounded-xl p-8 shadow-sm flex flex-col"
        style={{
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-primary)',
        }}
      >
        {/* Logo / Title */}
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-xl"
            style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }}
          >
            <Shield size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
              {APP_NAME}
            </h1>
            <p className="mt-1 text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
              End-to-end encrypted communication
            </p>
          </div>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Username */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="username" className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
              Username
            </label>
            <input
              id="username"
              name="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. alice"
              autoComplete="username"
              autoFocus
              required
              disabled={isLoading}
              className="w-full rounded-lg px-3.5 py-2.5 text-sm outline-none transition-colors"
              style={{
                backgroundColor: 'var(--bg-tertiary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-primary)',
              }}
            />
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
              Password
            </label>
            <div className="relative flex items-center">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
                disabled={isLoading}
                className="w-full rounded-lg px-3.5 pr-10 py-2.5 text-sm outline-none transition-colors"
                style={{
                  backgroundColor: 'var(--bg-tertiary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-primary)',
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center justify-center p-1 rounded transition-colors"
                style={{ color: 'var(--text-tertiary)' }}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <p className="text-xs font-medium" style={{ color: 'var(--color-danger)' }} role="alert">
              {error}
            </p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading || !username.trim() || !password}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-opacity disabled:opacity-50 cursor-pointer"
            style={{
              backgroundColor: 'var(--accent)',
              color: 'var(--accent-text)',
            }}
          >
            {isLoading ? (
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <>
                <Lock size={15} />
                <span>Sign in</span>
              </>
            )}
          </button>

          {/* Or Divider */}
          <div className="relative my-2 flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t" style={{ borderColor: 'var(--border-primary)' }} />
            </div>
            <div
              className="relative px-2 text-[11px] font-medium uppercase tracking-wider"
              style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-tertiary)' }}
            >
              Or
            </div>
          </div>

          {/* Demo Mode Button */}
          <button
            type="button"
            onClick={handleDemoLogin}
            className="flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-colors cursor-pointer border"
            style={{
              backgroundColor: 'var(--bg-tertiary)',
              color: 'var(--text-primary)',
              borderColor: 'var(--border-primary)',
            }}
          >
            <Sparkles size={15} style={{ color: 'var(--color-verified)' }} />
            <span>Explore Demo Mode</span>
          </button>

          {/* Request Access Button */}
          <button
            type="button"
            onClick={() => setView('register')}
            className="flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-colors cursor-pointer border"
            style={{
              backgroundColor: 'var(--bg-secondary)',
              color: 'var(--accent)',
              borderColor: 'var(--border-primary)',
            }}
          >
            <UserPlus size={15} />
            <span>Request Access (New User)</span>
          </button>
        </form>

        {/* Footer */}
        <div className="mt-6 flex flex-col items-center gap-2 text-center">
          <div className="flex items-center justify-center gap-1.5" style={{ color: 'var(--text-tertiary)' }}>
            <Shield size={12} style={{ color: 'var(--color-verified)' }} />
            <p className="text-xs">End-to-end encrypted by default</p>
          </div>

          <button
            type="button"
            onClick={() => setView('admin')}
            className="flex items-center justify-center gap-1.5 text-xs opacity-60 hover:opacity-100 transition-opacity cursor-pointer mt-1"
            style={{ color: 'var(--text-secondary)' }}
          >
            <ShieldCheck size={12} />
            <span>Admin Portal</span>
          </button>
        </div>
      </div>
    </div>
  );
}
