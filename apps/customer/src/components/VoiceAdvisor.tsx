import { useEffect, useRef, useState } from 'react';

type Turn = { transcript: string; answer: string; audios: string[]; warning?: string };
export function VoiceAdvisor() {
  const [state, setState] = useState('Ready');
  const [turns, setTurns] = useState<Turn[]>([]);
  const [error, setError] = useState('');
  const [consent, setConsent] = useState(false);
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const player = useRef<HTMLAudioElement | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const controller = useRef<AbortController | null>(null);
  const generation = useRef(0);
  const mounted = useRef(true);
  function stopResources() {
    clearTimeout(timer.current);
    if (recorder.current?.state === 'recording') {
      recorder.current.onstop = null;
      recorder.current.stop();
    }
    stream.current?.getTracks().forEach((t) => t.stop());
    player.current?.pause();
    controller.current?.abort();
  }
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      generation.current++;
      stopResources();
    };
  }, []);
  function end() {
    generation.current++;
    stopResources();
    setState('Ready');
  }
  async function play(audios: string[], token: number) {
    if (token !== generation.current || !mounted.current) return;
    const [first, ...rest] = audios;
    if (!first) {
      setState('Ready');
      return;
    }
    setState('Speaking');
    const audio = new Audio(`data:audio/wav;base64,${first}`);
    player.current = audio;
    audio.onended = () => {
      void play(rest, token);
    };
    audio.onerror = () => {
      if (token === generation.current) {
        setError('Audio playback failed. Read the reply below.');
        setState('Ready');
      }
    };
    try {
      await audio.play();
    } catch {
      if (token === generation.current) {
        setError('Playback was blocked. Use Replay reply below.');
        setState('Ready');
      }
    }
  }
  async function start() {
    setError('');
    setState('Opening microphone');
    const token = ++generation.current;
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined')
        throw new Error('Microphone recording requires a supported browser on localhost or HTTPS.');
      const media = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (token !== generation.current || !mounted.current) {
        media.getTracks().forEach((t) => t.stop());
        return;
      }
      stream.current = media;
      const mimeType = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/ogg;codecs=opus'].find((t) =>
        MediaRecorder.isTypeSupported(t),
      );
      if (!mimeType)
        throw new Error('This browser does not support a compatible recording format.');
      const recording = new MediaRecorder(media, { mimeType });
      recorder.current = recording;
      const chunks: Blob[] = [];
      recording.ondataavailable = (e) => {
        if (e.data.size) chunks.push(e.data);
      };
      recording.onerror = () => {
        end();
        setError('Microphone recording failed. Please try again.');
      };
      recording.onstop = async () => {
        clearTimeout(timer.current);
        media.getTracks().forEach((t) => t.stop());
        if (token !== generation.current || !mounted.current) return;
        setState('Thinking');
        controller.current = new AbortController();
        const timeout = setTimeout(() => controller.current?.abort(), 180_000);
        try {
          const history = turns
            .slice(-2)
            .map((t) => `Customer: ${t.transcript}\nAdvisor: ${t.answer}`)
            .join('\n')
            .slice(-2200);
          const response = await fetch('/api/voice/turn', {
            method: 'POST',
            headers: { 'Content-Type': mimeType, 'X-Voice-History': encodeURIComponent(history) },
            body: new Blob(chunks, { type: mimeType }),
            signal: controller.current.signal,
          });
          const result = await response.json();
          if (!response.ok) throw new Error(result.error || 'Voice request failed');
          if (token !== generation.current || !mounted.current) return;
          setTurns((previous) => [...previous, result]);
          if (result.warning) setError(result.warning);
          await play(result.audios, token);
        } catch (e) {
          if (token === generation.current && mounted.current) {
            setError(e instanceof Error ? e.message : 'Voice request failed');
            setState('Ready');
          }
        } finally {
          clearTimeout(timeout);
        }
      };
      recording.start();
      setState('Listening');
      timer.current = setTimeout(() => {
        if (recording.state === 'recording') recording.stop();
      }, 25_000);
    } catch (e) {
      if (token === generation.current && mounted.current) {
        stopResources();
        setError(e instanceof Error ? e.message : 'Microphone access failed');
        setState('Ready');
      }
    }
  }
  return (
    <div className="voice-advisor">
      <p>
        Ask about business plans from our product catalogue. Speak for up to 25 seconds, then send
        your question. Replies are spoken in English.
      </p>
      <label className="check-label">
        <input
          type="checkbox"
          checked={consent}
          disabled={state !== 'Ready'}
          onChange={(e) => setConsent(e.target.checked)}
        />{' '}
        I agree to send my recording and conversation context to Sarvam AI for speech and Google
        Gemini for a catalogue-based reply.
      </label>
      <p role="status" aria-live="polite">
        {state}
      </p>
      <div className="form-navigation">
        {state === 'Ready' && (
          <button className="button primary" disabled={!consent} onClick={() => void start()}>
            Speak to advisor
          </button>
        )}
        {state === 'Listening' && (
          <button className="button primary" onClick={() => recorder.current?.stop()}>
            Send question
          </button>
        )}
        {state !== 'Ready' && (
          <button className="button secondary" onClick={end}>
            Stop
          </button>
        )}
        <button
          className="text-button"
          onClick={() => {
            end();
            setTurns([]);
            setError('');
          }}
        >
          End call & clear
        </button>
      </div>
      {error && <p role="alert">{error}</p>}
      {turns.map((turn, i) => (
        <article key={i} className="panel" style={{ marginTop: 16, overflowWrap: 'anywhere' }}>
          <h3>You said</h3>
          <p>{turn.transcript}</p>
          <h3>Catalogue advisor</h3>
          <p style={{ whiteSpace: 'pre-wrap' }}>{turn.answer}</p>
          {!!turn.audios.length && (
            <button
              className="button secondary"
              disabled={state !== 'Ready'}
              onClick={() => void play(turn.audios, generation.current)}
            >
              Replay reply
            </button>
          )}
        </article>
      ))}
    </div>
  );
}
