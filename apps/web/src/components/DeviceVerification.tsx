/**
 * DeviceVerification — Emoji verification flow component.
 *
 * Handles the Matrix emoji/QR device cross-signing verification.
 * Shown when user clicks "Verify" on an unverified device.
 */
import { useState } from 'react';
import { ShieldCheck, X, Loader } from 'lucide-react';
import type { MatrixClient } from 'matrix-js-sdk';

interface DeviceVerificationProps {
  client: MatrixClient;
  userId: string;
  deviceId: string;
  onClose: () => void;
}

export function DeviceVerification({ client, userId, deviceId, onClose }: DeviceVerificationProps) {
  const [stage, setStage] = useState<'waiting' | 'emojis' | 'done' | 'error'>('waiting');
  const [emojis, _setEmojis] = useState<Array<{ emoji: string; description: string }>>([]);
  const [errorMsg, setErrorMsg] = useState('');

  const startVerification = async () => {
    try {
      setStage('waiting');
      const crypto = client.getCrypto();
      if (!crypto) {
        setErrorMsg('Crypto not available');
        setStage('error');
        return;
      }

      // Request verification from the other device
      const verificationRequest = await crypto.requestDeviceVerification(userId, deviceId);

      // Listen for phase changes
      (verificationRequest as any).on('change', () => {
        const phase = (verificationRequest as any).phase;
        if (phase === 5 /* VerificationPhase.Done */) {
          setStage('done');
        } else if (phase === 6 /* VerificationPhase.Cancelled */) {
          setErrorMsg('Verification cancelled');
          setStage('error');
        }
      });

      // Note: Full SAS emoji verification requires the matrix-js-sdk's
      // VerificationRequest and SasVerifier flow. This is a simplified
      // placeholder. The actual implementation would listen for the
      // `m.key.verification.key` event and display emojis.

      // For now, show that verification was requested
      setStage('waiting');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Verification failed');
      setStage('error');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
    >
      <div
        className="mx-4 w-full max-w-sm rounded-lg p-6"
        style={{
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-primary)',
        }}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
            Verify Device
          </h3>
          <button
            onClick={onClose}
            className="touch-target rounded-md"
            style={{ color: 'var(--text-tertiary)' }}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {stage === 'waiting' && (
          <div className="flex flex-col items-center gap-4 py-4">
            <Loader size={32} className="animate-spin" style={{ color: 'var(--accent)' }} />
            <p className="text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
              Waiting for the other device to accept verification...
            </p>
            <button
              onClick={startVerification}
              className="touch-target rounded-md px-4 text-sm font-medium"
              style={{
                backgroundColor: 'var(--accent)',
                color: 'var(--accent-text)',
              }}
            >
              Start Verification
            </button>
          </div>
        )}

        {stage === 'emojis' && (
          <div className="flex flex-col gap-4 py-4">
            <p className="text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
              Verify that the following emojis match on both devices:
            </p>
            <div className="grid grid-cols-7 gap-2">
              {emojis.map((e, i) => (
                <div key={i} className="flex flex-col items-center gap-1">
                  <span className="text-2xl">{e.emoji}</span>
                  <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                    {e.description}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                className="touch-target flex-1 rounded-md text-sm font-medium"
                style={{ backgroundColor: 'var(--color-danger)', color: '#ffffff' }}
              >
                They don't match
              </button>
              <button
                className="touch-target flex-1 rounded-md text-sm font-medium"
                style={{ backgroundColor: 'var(--color-verified)', color: '#ffffff' }}
              >
                They match
              </button>
            </div>
          </div>
        )}

        {stage === 'done' && (
          <div className="flex flex-col items-center gap-4 py-4">
            <ShieldCheck size={48} style={{ color: 'var(--color-verified)' }} />
            <p className="text-center text-sm" style={{ color: 'var(--text-primary)' }}>
              Device verified successfully!
            </p>
            <button
              onClick={onClose}
              className="touch-target rounded-md px-4 text-sm font-medium"
              style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }}
            >
              Done
            </button>
          </div>
        )}

        {stage === 'error' && (
          <div className="flex flex-col items-center gap-4 py-4">
            <p className="text-center text-sm" style={{ color: 'var(--color-danger)' }}>
              {errorMsg}
            </p>
            <button
              onClick={onClose}
              className="touch-target rounded-md px-4 text-sm font-medium"
              style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
