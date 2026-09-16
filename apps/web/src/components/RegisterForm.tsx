/**
 * RegisterForm — Request access to 192.168.6.
 *
 * Users provide their display name and Matrix username.
 * Generates their unique 6-character ID and submits for admin approval.
 */
import { useState, type FormEvent } from 'react';
import { Shield, Sparkles, UserPlus, ArrowLeft, ExternalLink, KeyRound } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { requestAccess } from '@/lib/supabase';
import { APP_NAME } from '@/utils/constants';

export function RegisterForm() {
  const [displayName, setDisplayName] = useState('');
  const [matrixHandle, setMatrixHandle] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const setView = useAppStore((s) => s.setView);
  const setPendingShortId = useAppStore((s) => s.setPendingShortId);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!displayName.trim() || !matrixHandle.trim()) return;

    setIsLoading(true);
    setError('');

    try {
      // Normalize Matrix User ID (@username:matrix.org)
      let fullMatrixId = matrixHandle.trim();
      if (!fullMatrixId.startsWith('@')) {
        fullMatrixId = `@${fullMatrixId}`;
      }
      if (!fullMatrixId.includes(':')) {
        fullMatrixId = `${fullMatrixId}:matrix.org`;
      }

      const userRecord = await requestAccess(displayName.trim(), fullMatrixId);
      setPendingShortId(userRecord.short_id);
      setView('pending');
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to submit access request. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="flex min-h-dvh w-full items-center justify-center p-4"
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >
      <div
        className="w-full max-w-md rounded-xl p-8 shadow-sm flex flex-col"
        style={{
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-primary)',
        }}
      >
        {/* Header */}
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-xl"
            style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }}
          >
            <UserPlus size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
              Join {APP_NAME}
            </h1>
            <p className="mt-1 text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
              Request access and receive your unique 6-character ID
            </p>
          </div>
        </div>

        {/* Info Box */}
        <div
          className="mb-5 rounded-lg p-3 text-xs leading-relaxed"
          style={{
            backgroundColor: 'var(--bg-tertiary)',
            border: '1px solid var(--border-primary)',
            color: 'var(--text-secondary)',
          }}
        >
          <div className="flex items-center gap-1.5 font-semibold" style={{ color: 'var(--text-primary)' }}>
            <Sparkles size={14} style={{ color: 'var(--color-verified)' }} />
            <span>How it works</span>
          </div>
          <p className="mt-1.5">
            1. Enter your name and Matrix handle.
            <br />
            2. Get your unique 6-character ID (like a private phone number).
            <br />
            3. The admin approves your request, and you can begin chatting.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Display Name */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="displayName" className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
              Your Display Name
            </label>
            <input
              id="displayName"
              name="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Sarah Connor"
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

          {/* Matrix User ID */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="matrixHandle" className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                Matrix Username
              </label>
              <a
                href="https://app.element.io/#/register"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-[11px] underline opacity-80 hover:opacity-100 transition-opacity"
                style={{ color: 'var(--accent)' }}
              >
                <span>Free account on matrix.org</span>
                <ExternalLink size={10} />
              </a>
            </div>
            <input
              id="matrixHandle"
              name="matrixHandle"
              type="text"
              value={matrixHandle}
              onChange={(e) => setMatrixHandle(e.target.value)}
              placeholder="e.g. sarah or @sarah:matrix.org"
              required
              disabled={isLoading}
              className="w-full rounded-lg px-3.5 py-2.5 text-sm outline-none transition-colors font-mono"
              style={{
                backgroundColor: 'var(--bg-tertiary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-primary)',
              }}
            />
            <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
              Used to route your encrypted messages globally via matrix.org.
            </p>
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
            disabled={isLoading || !displayName.trim() || !matrixHandle.trim()}
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
                <KeyRound size={15} />
                <span>Request Access & Generate ID</span>
              </>
            )}
          </button>
        </form>

        {/* Navigation Actions */}
        <div className="mt-6 flex flex-col items-center gap-2 text-center text-xs">
          <button
            type="button"
            onClick={() => setView('login')}
            className="flex items-center gap-1.5 cursor-pointer hover:underline"
            style={{ color: 'var(--text-secondary)' }}
          >
            <ArrowLeft size={13} />
            <span>Already have access? Back to Sign in</span>
          </button>
        </div>

        {/* Security Footer */}
        <div className="mt-6 flex items-center justify-center gap-1.5" style={{ color: 'var(--text-tertiary)' }}>
          <Shield size={12} style={{ color: 'var(--color-verified)' }} />
          <p className="text-xs">End-to-end encrypted by default</p>
        </div>
      </div>
    </div>
  );
}
