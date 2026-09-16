/**
 * PendingApproval — Screen displayed after user requests access.
 *
 * Displays their unique 6-character short ID (e.g. ABC123) and
 * provides live checking for admin approval.
 */
import { useState } from 'react';
import { Shield, Clock, CheckCircle2, Copy, Check, ArrowRight, RefreshCw, XCircle } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { checkUserStatus } from '@/lib/supabase';
import { formatShortId } from '@/lib/shortId';
import { APP_NAME } from '@/utils/constants';

export function PendingApproval() {
  const pendingShortId = useAppStore((s) => s.pendingShortId);
  const setView = useAppStore((s) => s.setView);

  const [copied, setCopied] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isApproved, setIsApproved] = useState(false);
  const [isRejected, setIsRejected] = useState(false);

  const displayId = pendingShortId || 'Pending';
  const formattedDisplayId = formatShortId(displayId);

  const handleCopy = async () => {
    if (!pendingShortId) return;
    try {
      await navigator.clipboard.writeText(pendingShortId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore clipboard write failure
    }
  };

  const handleCheckStatus = async () => {
    if (!pendingShortId) return;
    setIsChecking(true);
    setStatusMessage(null);

    try {
      const user = await checkUserStatus(pendingShortId);
      if (user?.status === 'approved') {
        setIsApproved(true);
        setIsRejected(false);
        setStatusMessage('Your access has been approved! You can now sign in.');
      } else if (user?.status === 'rejected') {
        setIsRejected(true);
        setIsApproved(false);
        setStatusMessage('Your access request was not approved by the administrator.');
      } else {
        setStatusMessage('Your request is still pending review by the administrator.');
      }
    } catch {
      setStatusMessage('Could not check status right now. Please try again.');
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div
      className="flex min-h-dvh w-full items-center justify-center p-4"
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >
      <div
        className="w-full max-w-md rounded-xl p-8 shadow-sm flex flex-col text-center"
        style={{
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-primary)',
        }}
      >
        {/* Status Icon */}
        <div className="mb-4 flex justify-center">
          {isApproved ? (
            <div
              className="flex h-14 w-14 items-center justify-center rounded-2xl"
              style={{ backgroundColor: 'rgba(34, 197, 94, 0.15)', color: 'var(--color-verified)' }}
            >
              <CheckCircle2 size={32} />
            </div>
          ) : isRejected ? (
            <div
              className="flex h-14 w-14 items-center justify-center rounded-2xl"
              style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: 'var(--color-danger)' }}
            >
              <XCircle size={32} />
            </div>
          ) : (
            <div
              className="flex h-14 w-14 items-center justify-center rounded-2xl"
              style={{ backgroundColor: 'rgba(234, 179, 8, 0.15)', color: 'var(--color-unverified)' }}
            >
              <Clock size={32} className="animate-pulse" />
            </div>
          )}
        </div>

        {/* Title */}
        <h1 className="text-xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
          {isApproved ? 'Access Approved!' : isRejected ? 'Request Declined' : 'Request Submitted'}
        </h1>
        <p className="mt-1 text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
          {isApproved
            ? `Welcome to ${APP_NAME}. You can now start communicating.`
            : isRejected
            ? 'Contact your administrator if you believe this is a mistake.'
            : 'Waiting for administrator approval before account activation.'}
        </p>

        {/* Unique Short ID Badge */}
        <div
          className="my-6 rounded-xl p-5 flex flex-col items-center gap-2"
          style={{
            backgroundColor: 'var(--bg-tertiary)',
            border: '1px dashed var(--border-primary)',
          }}
        >
          <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
            Your Unique 192.168.6 ID
          </span>
          <div className="flex items-center gap-3">
            <span className="text-3xl font-mono font-bold tracking-widest" style={{ color: 'var(--accent)' }}>
              {formattedDisplayId}
            </span>
            {pendingShortId && (
              <button
                type="button"
                onClick={handleCopy}
                className="p-1.5 rounded-lg border transition-colors cursor-pointer"
                style={{
                  borderColor: 'var(--border-primary)',
                  backgroundColor: 'var(--bg-secondary)',
                  color: copied ? 'var(--color-verified)' : 'var(--text-secondary)',
                }}
                title="Copy ID"
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
              </button>
            )}
          </div>
          <p className="text-[11px] mt-1" style={{ color: 'var(--text-secondary)' }}>
            Friends will use this ID to find and chat with you, like a phone number!
          </p>
        </div>

        {/* Status Message */}
        {statusMessage && (
          <div
            className="mb-4 rounded-lg p-3 text-xs"
            style={{
              backgroundColor: isApproved
                ? 'rgba(34, 197, 94, 0.1)'
                : isRejected
                ? 'rgba(239, 68, 68, 0.1)'
                : 'var(--bg-tertiary)',
              color: isApproved
                ? 'var(--color-verified)'
                : isRejected
                ? 'var(--color-danger)'
                : 'var(--text-secondary)',
            }}
          >
            {statusMessage}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-2.5">
          {isApproved ? (
            <button
              type="button"
              onClick={() => setView('login')}
              className="flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-colors cursor-pointer"
              style={{
                backgroundColor: 'var(--accent)',
                color: 'var(--accent-text)',
              }}
            >
              <span>Continue to Sign In</span>
              <ArrowRight size={15} />
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={handleCheckStatus}
                disabled={isChecking}
                className="flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-opacity disabled:opacity-50 cursor-pointer border"
                style={{
                  backgroundColor: 'var(--bg-tertiary)',
                  color: 'var(--text-primary)',
                  borderColor: 'var(--border-primary)',
                }}
              >
                <RefreshCw size={14} className={isChecking ? 'animate-spin' : ''} />
                <span>{isChecking ? 'Checking...' : 'Check Approval Status'}</span>
              </button>

              <button
                type="button"
                onClick={() => setView('login')}
                className="mt-1 text-xs hover:underline cursor-pointer"
                style={{ color: 'var(--text-secondary)' }}
              >
                Back to Sign in
              </button>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 flex items-center justify-center gap-1.5" style={{ color: 'var(--text-tertiary)' }}>
          <Shield size={12} style={{ color: 'var(--color-verified)' }} />
          <p className="text-xs">End-to-end encrypted by default</p>
        </div>
      </div>
    </div>
  );
}
