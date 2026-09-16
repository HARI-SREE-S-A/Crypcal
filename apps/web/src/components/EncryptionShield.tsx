/**
 * EncryptionShield — Visual indicator for room encryption/verification status.
 *
 * Green: all devices verified
 * Amber: unverified devices present
 */
import { Shield, ShieldCheck, ShieldAlert } from 'lucide-react';
import { useState, useEffect } from 'react';
import type { MatrixClient } from 'matrix-js-sdk';
import { getRoomVerificationStatus, type RoomVerificationStatus } from '@/lib/encryption';

interface EncryptionShieldProps {
  client: MatrixClient;
  roomId: string;
  size?: number;
}

export function EncryptionShield({ client, roomId, size = 16 }: EncryptionShieldProps) {
  const [status, setStatus] = useState<RoomVerificationStatus>('unknown');

  useEffect(() => {
    let cancelled = false;

    getRoomVerificationStatus(client, roomId).then((s) => {
      if (!cancelled) setStatus(s);
    });

    return () => {
      cancelled = true;
    };
  }, [client, roomId]);

  if (status === 'verified') {
    return (
      <ShieldCheck
        size={size}
        style={{ color: 'var(--color-verified)' }}
        aria-label="All devices verified"
      />
    );
  }

  if (status === 'unverified') {
    return (
      <ShieldAlert
        size={size}
        style={{ color: 'var(--color-unverified)' }}
        aria-label="Unverified devices present"
      />
    );
  }

  return (
    <Shield
      size={size}
      style={{ color: 'var(--text-tertiary)' }}
      aria-label="Encryption status unknown"
    />
  );
}
