/**
 * CallView — Full-screen call UI
 *
 * Video tiles or avatar circle for audio-only.
 * Bottom bar: mute, camera toggle, hang up.
 * Discreet "End-to-end encrypted" badge + latency display.
 */
import { useEffect, useState } from 'react';
import { Mic, MicOff, Camera, CameraOff, PhoneOff, Shield } from 'lucide-react';
import type { MatrixClient } from 'matrix-js-sdk';
import { useCall } from '@/hooks/useCall';
import { useAppStore } from '@/lib/store';
import { formatLatency, formatDuration } from '@/utils/formatTime';
import { VideoTile } from '@/components/VideoTile';

interface CallViewProps {
  /** Matrix client */
  client: MatrixClient;
  /** Active room ID */
  roomId: string;
}

export function CallView({ client, roomId }: CallViewProps) {
  const { endCall, toggleMute, toggleCamera, isMuted, isCameraOff, latencyMs, livekitRoom } =
    useCall(client);
  const activeCall = useAppStore((s) => s.activeCall);
  const [elapsed, setElapsed] = useState(0);

  const room = client.getRoom(roomId);
  const roomName = room?.name || 'Unknown';

  // Call duration timer
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed((e) => e + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const isAudioOnly = activeCall?.isAudioOnly ?? true;
  const remoteParticipants = livekitRoom
    ? Array.from(livekitRoom.remoteParticipants.values())
    : [];
  const localParticipant = livekitRoom?.localParticipant;

  return (
    <div
      className="flex h-dvh flex-col"
      style={{ backgroundColor: 'var(--color-neutral-950)' }}
    >
      {/* Main area */}
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-4">
        {isAudioOnly ? (
          /* Audio-only: avatar circle */
          <>
            <div
              className="flex h-24 w-24 items-center justify-center rounded-full text-3xl font-semibold"
              style={{
                backgroundColor: 'var(--color-neutral-800)',
                color: 'var(--color-neutral-300)',
              }}
            >
              {roomName.charAt(0).toUpperCase()}
            </div>
            <h2
              className="text-lg font-semibold"
              style={{ color: 'var(--color-neutral-100)' }}
            >
              {roomName}
            </h2>
            <p className="text-sm" style={{ color: 'var(--color-neutral-400)' }}>
              {formatDuration(elapsed)}
            </p>
          </>
        ) : (
          /* Video: participant grid */
          <div className="grid h-full w-full max-w-5xl flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
            {localParticipant && (
              <VideoTile
                participant={localParticipant}
                isLocal
                className="h-full min-h-[200px]"
              />
            )}
            {remoteParticipants.map((p) => (
              <VideoTile
                key={p.identity}
                participant={p}
                isLocal={false}
                className="h-full min-h-[200px]"
              />
            ))}
            {!localParticipant && remoteParticipants.length === 0 && (
              <div
                className="col-span-full flex h-full w-full items-center justify-center rounded-lg"
                style={{ backgroundColor: 'var(--color-neutral-900)' }}
              >
                <p className="text-sm" style={{ color: 'var(--color-neutral-400)' }}>
                  Connecting to video call...
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* E2EE badge + latency */}
      <div className="flex items-center justify-center gap-4 py-2">
        <div className="flex items-center gap-1" style={{ color: 'var(--color-neutral-400)' }}>
          <Shield size={12} />
          <span className="text-xs">Transport encrypted (DTLS-SRTP)</span>
        </div>
        <span className="text-xs" style={{ color: 'var(--color-neutral-500)' }}>
          {formatLatency(latencyMs)}
        </span>
      </div>

      {/* Bottom bar: call controls */}
      <div
        className="flex items-center justify-center gap-6 py-4 px-4"
        style={{ backgroundColor: 'var(--color-neutral-900)' }}
      >
        {/* Mute toggle */}
        <button
          onClick={toggleMute}
          className="flex h-12 w-12 items-center justify-center rounded-full transition-colors"
          style={{
            backgroundColor: isMuted ? 'var(--color-danger)' : 'var(--color-neutral-700)',
            color: 'var(--color-neutral-100)',
          }}
          aria-label={isMuted ? 'Unmute microphone' : 'Mute microphone'}
        >
          {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
        </button>

        {/* Camera toggle (video calls only) */}
        {!isAudioOnly && (
          <button
            onClick={toggleCamera}
            className="flex h-12 w-12 items-center justify-center rounded-full transition-colors"
            style={{
              backgroundColor: isCameraOff ? 'var(--color-danger)' : 'var(--color-neutral-700)',
              color: 'var(--color-neutral-100)',
            }}
            aria-label={isCameraOff ? 'Turn on camera' : 'Turn off camera'}
          >
            {isCameraOff ? <CameraOff size={20} /> : <Camera size={20} />}
          </button>
        )}

        {/* Hang up */}
        <button
          onClick={endCall}
          className="flex h-12 w-12 items-center justify-center rounded-full"
          style={{
            backgroundColor: 'var(--color-danger)',
            color: '#ffffff',
          }}
          aria-label="End call"
        >
          <PhoneOff size={20} />
        </button>
      </div>
    </div>
  );
}
