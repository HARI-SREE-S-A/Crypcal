/**
 * VideoTile — Renders a single participant's video/audio track from LiveKit.
 *
 * Used inside CallView to display remote and local video feeds.
 * Falls back to an avatar circle when camera is off.
 */
import { useEffect, useRef } from 'react';
import type { Participant, TrackPublication } from 'livekit-client';
import { Track } from 'livekit-client';
import { MicOff } from 'lucide-react';

interface VideoTileProps {
  /** The LiveKit participant to render */
  participant: Participant;
  /** Whether this is the local participant */
  isLocal?: boolean;
  /** CSS class for sizing */
  className?: string;
}

export function VideoTile({ participant, isLocal = false, className = '' }: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Attach video track
  useEffect(() => {
    const videoPublication = participant.getTrackPublication(Track.Source.Camera) as TrackPublication | undefined;
    const videoTrack = videoPublication?.track;

    if (videoTrack && videoRef.current) {
      videoTrack.attach(videoRef.current);
    }

    return () => {
      if (videoTrack && videoRef.current) {
        videoTrack.detach(videoRef.current);
      }
    };
  }, [participant]);

  // Attach audio track (skip for local — we don't play our own audio)
  useEffect(() => {
    if (isLocal) return;

    const audioPublication = participant.getTrackPublication(Track.Source.Microphone) as TrackPublication | undefined;
    const audioTrack = audioPublication?.track;

    if (audioTrack && audioRef.current) {
      audioTrack.attach(audioRef.current);
    }

    return () => {
      if (audioTrack && audioRef.current) {
        audioTrack.detach(audioRef.current);
      }
    };
  }, [participant, isLocal]);

  const isCameraOn = participant.isCameraEnabled;
  const isMicOn = participant.isMicrophoneEnabled;
  const displayName = participant.name || participant.identity || 'Unknown';

  return (
    <div
      className={`relative overflow-hidden rounded-lg ${className}`}
      style={{ backgroundColor: 'var(--color-neutral-800)' }}
    >
      {isCameraOn ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className="h-full w-full object-cover"
          style={{ transform: isLocal ? 'scaleX(-1)' : undefined }}
        />
      ) : (
        /* Camera off: show avatar */
        <div className="flex h-full w-full items-center justify-center">
          <div
            className="flex h-16 w-16 items-center justify-center rounded-full text-2xl font-semibold"
            style={{
              backgroundColor: 'var(--color-neutral-700)',
              color: 'var(--color-neutral-300)',
            }}
          >
            {displayName.charAt(0).toUpperCase()}
          </div>
        </div>
      )}

      {/* Hidden audio element for remote participants */}
      {!isLocal && <audio ref={audioRef} autoPlay />}

      {/* Overlay: name + mute indicator */}
      <div
        className="absolute bottom-0 left-0 right-0 flex items-center gap-1.5 px-2 py-1"
        style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.6))' }}
      >
        <span className="truncate text-xs font-medium text-white">
          {isLocal ? 'You' : displayName}
        </span>
        {!isMicOn && (
          <MicOff size={12} style={{ color: 'var(--color-danger)' }} />
        )}
      </div>
    </div>
  );
}
