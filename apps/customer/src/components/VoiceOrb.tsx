import { type CSSProperties, type RefObject } from 'react';
export function VoiceOrb({
  state,
  surface,
}: {
  state: string;
  surface: RefObject<HTMLDivElement | null>;
}) {
  const id = state.toLowerCase().replaceAll(' ', '-');
  return (
    <div
      className={`voice-stage is-${id}`}
      ref={surface}
      style={{ '--voice-level': 0 } as CSSProperties}
    >
      <div className="voice-stage-grid" aria-hidden="true" />
      <div className="voice-cosmos" aria-hidden="true">
        <div className="voice-halo" />
        <div className="voice-orbit orbit-one" />
        <div className="voice-orbit orbit-two" />
        <div className="voice-orbit orbit-three" />
        <div className="voice-sphere">
          <div className="voice-sphere-shimmer" />
          <div className="voice-sphere-core" />
        </div>
        <div className="voice-shadow" />
      </div>
      <div className="voice-stage-caption">
        <span className="voice-live-dot" /> ACCEL TELECOM <span>VOICE CONCIERGE</span>
      </div>
    </div>
  );
}
