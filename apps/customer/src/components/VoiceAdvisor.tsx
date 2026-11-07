import { useI18n } from '../lib/i18n';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { addToCart, quote } from '@sync/domain';
import { useWorkspace } from '../lib/store';
import { useAction } from '../lib/actions';
import { customerApi } from '../lib/api';
import { accessToken } from '../lib/auth';
import { VoiceOrb } from './VoiceOrb';
import { createVoiceActivity } from '../lib/voiceActivity';

type Bundle = {
  items: {
    product_id: string;
    name: string;
    quantity: number;
    monthlyMin: number;
    monthlyMax: number;
    reference: string;
  }[];
  monthlyMin: number;
  monthlyMax: number;
  setup: number;
  note: string;
};
type Turn = {
  transcript: string;
  answer: string;
  audios: string[];
  warning?: string;
  language?: string;
  sessionId?: string;
  bundle?: Bundle | null;
};
export function VoiceAdvisor({ onApplied }: { onApplied?: () => void } = {}) {
  const { t, locale } = useI18n();
  const { data, setData, cloud } = useWorkspace();
  const navigate = useNavigate();
  const { run, busy } = useAction();
  const voiceBase = (import.meta.env.VITE_VOICE_API_BASE_URL || '').replace(/\/$/, '');
  async function reviewBundle(bundle: Bundle) {
    let lines = data.cart;
    for (const item of bundle.items) {
      if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 1000)
        throw new Error('The advisor suggested an invalid quantity. Choose a plan manually.');
      lines = addToCart(lines, item.product_id, data.profile).map((line) =>
        line.productId === item.product_id ? { ...line, quantity: item.quantity } : line,
      );
    }
    const checked = cloud
      ? await customerApi.quote(await accessToken(), lines)
      : quote(lines, data.profile);
    if (checked.errors.length) throw new Error(checked.errors.join('. '));
    end();
    setData((previous) => ({ ...previous, cart: checked.lines }));
    navigate('/checkout');
    onApplied?.();
  }
  const surface = useRef<HTMLDivElement | null>(null);
  const speechHeard = useRef(false);
  const [autoSendAvailable, setAutoSendAvailable] = useState(true);
  const [pauseMs, setPauseMs] = useState(1400);
  const [state, setState] = useState('Ready');
  const [turns, setTurns] = useState<Turn[]>([]);
  const [error, setError] = useState('');
  const [consent, setConsent] = useState(false);
  const sessionId = useRef('');
  const continuous = useRef(false);
  const [autoContinue, setAutoContinue] = useState(true);
  const startNext = useRef<() => void>(() => {});
  const detector = useRef<{
    context: AudioContext;
    interval: ReturnType<typeof setInterval>;
  } | null>(null);
  function stopDetector() {
    surface.current?.style.setProperty('--voice-level', '0');
    if (detector.current) {
      clearInterval(detector.current.interval);
      void detector.current.context.close();
      detector.current = null;
    }
  }
  function clearSession() {
    if (sessionId.current) {
      void fetch(voiceBase + '/api/voice/session', {
        method: 'DELETE',
        headers: { 'X-Voice-Session': sessionId.current },
        keepalive: true,
      }).catch(() => {});
      sessionId.current = '';
    }
  }
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const player = useRef<HTMLAudioElement | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const controller = useRef<AbortController | null>(null);
  const generation = useRef(0);
  const mounted = useRef(true);
  function stopResources() {
    stopDetector();
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
      continuous.current = false;
      clearSession();
      generation.current++;
      stopResources();
    };
  }, []);
  function end() {
    continuous.current = false;
    generation.current++;
    stopResources();
    setState('Ready');
  }
  async function play(audios: string[], token: number, resume = false) {
    if (token !== generation.current || !mounted.current) return;
    const [first, ...rest] = audios;
    if (!first) {
      setState('Ready');
      if (resume && continuous.current) startNext.current();
      return;
    }
    setState('Speaking');
    const audio = new Audio(`data:audio/wav;base64,${first}`);
    player.current = audio;
    audio.onended = () => {
      void play(rest, token, resume);
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
      const media = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
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
        stopDetector();
        clearTimeout(timer.current);
        media.getTracks().forEach((t) => t.stop());
        if (token !== generation.current || !mounted.current) return;
        setState('Thinking');
        controller.current = new AbortController();
        const timeout = setTimeout(() => controller.current?.abort(), 240_000);
        try {
          const response = await fetch(voiceBase + '/api/voice/turn', {
            method: 'POST',
            headers: {
              'Content-Type': mimeType,
              ...(sessionId.current ? { 'X-Voice-Session': sessionId.current } : {}),
            },
            body: new Blob(chunks, { type: mimeType }),
            signal: controller.current.signal,
          });
          const result = await response.json();
          if (!response.ok) throw new Error(result.error || 'Voice request failed');
          if (token !== generation.current || !mounted.current) return;
          if (result.sessionId) sessionId.current = result.sessionId;
          setTurns((previous) => [...previous, result]);
          if (result.warning) setError(result.warning);
          await play(result.audios, token, !result.warning);
        } catch (e) {
          if (token === generation.current && mounted.current) {
            setError(e instanceof Error ? e.message : 'Voice request failed');
            setState('Ready');
          }
        } finally {
          clearTimeout(timeout);
        }
      };
      speechHeard.current = false;
      recording.start();
      setState('Listening');
      // Stop after speech followed by 1.4 seconds of quiet; manual Send remains available.
      let analysisContext: AudioContext | undefined;
      let detectedAutomatically = false;
      try {
        const context = new AudioContext();
        analysisContext = context;
        await context.resume();
        if (token !== generation.current || recording.state !== 'recording') {
          void context.close();
          return;
        }
        const analyser = context.createAnalyser();
        analyser.fftSize = 1024;
        context.createMediaStreamSource(media).connect(analyser);
        const samples = new Float32Array(analyser.fftSize);
        const activity = createVoiceActivity(pauseMs);
        detectedAutomatically = true;
        setAutoSendAvailable(true);
        const interval = setInterval(() => {
          analyser.getFloatTimeDomainData(samples);
          const rms = Math.sqrt(samples.reduce((n, x) => n + x * x, 0) / samples.length);
          const result = activity(rms, performance.now());
          speechHeard.current = result.heard;
          surface.current?.style.setProperty('--voice-level', String(result.level));
          if (result.finished && recording.state === 'recording') recording.stop();
        }, 100);
        detector.current = { context, interval };
      } catch {
        setAutoSendAvailable(false);
        void analysisContext?.close();
        /* Browser may lack audio analysis. Use Send question or the time limit. */
      }

      if (token !== generation.current || recording.state !== 'recording') return;
      timer.current = setTimeout(() => {
        if (recording.state !== 'recording') return;
        if (detectedAutomatically && !speechHeard.current) {
          end();
          setError('No speech detected. Start again when you’re ready.');
        } else recording.stop();
      }, 25_000);
    } catch (e) {
      if (token === generation.current && mounted.current) {
        stopResources();
        setError(e instanceof Error ? e.message : 'Microphone access failed');
        setState('Ready');
      }
    }
  }
  startNext.current = () => {
    void start();
  };
  if (import.meta.env.VITE_VOICE_ENABLED !== 'true') return <section className="panel" role="note"><h3>{t('Voice advisor is disabled in this build.')}</h3><p>{t('Use Find my fit, or enable a configured voice service to start a conversation.')}</p><button className="button primary" onClick={() => { navigate('/discover'); onApplied?.(); }}>{t('Find my fit')}</button></section>;
  return (
    <div className="voice-advisor">
      <VoiceOrb state={state} surface={surface} />
      <div className="voice-intro">
        <h3>
          {state === 'Listening'
            ? t("Go ahead. I’m listening.")
            : state === 'Thinking'
              ? t("Finding your best fit…")
              : state === 'Speaking'
                ? t("A little clarity, out loud.")
                : t("Let’s find your business a better connection.")}
        </h3>
        <p>
          {state === 'Listening'
            ? t("Speak naturally, then pause. Your reply sends automatically.")
            : state === 'Speaking'
              ? t("I’ll listen again when this reply finishes.")
              : t("One conversation. Your language. A bundle built around you.")}
        </p>
      </div>
      <label className="check-label">
        <input
          type="checkbox"
          checked={consent}
          disabled={state !== 'Ready'}
          onChange={(e) => setConsent(e.target.checked)}
        />{' '}{t("I agree to send my recording and conversation context to Sarvam AI for speech and Google Gemini for a catalogue-based reply.")}</label>
      <label className="check-label">
        <input
          type="checkbox"
          checked={autoContinue}
          onChange={(e) => {
            setAutoContinue(e.target.checked);
            continuous.current = e.target.checked && state !== 'Ready';
          }}
        />{' '}{t("Continue listening after each reply")}</label>
      <label className="voice-pause-control">{t("Pause before sending")}<select
          aria-label={t("Pause before sending")}
          value={pauseMs}
          disabled={state !== 'Ready'}
          onChange={(e) => setPauseMs(Number(e.target.value))}
        >
          <option value={1000}>{t("Quick · 1 second")}</option>
          <option value={1400}>{t("Natural · 1.4 seconds")}</option>
          <option value={2200}>{t("Relaxed · 2.2 seconds")}</option>
        </select>
      </label>
      {!autoSendAvailable && (
        <p className="notice" role="note">{t("Automatic pause detection is unavailable in this browser. Use Send question to finish your turn.")}</p>
      )}
      <p className="voice-status" role="status" aria-live="polite">
        {t(state)}
      </p>
      <div className="form-navigation">
        {state === 'Ready' && (
          <button
            className="button primary"
            disabled={!consent}
            onClick={() => {
              continuous.current = autoContinue;
              void start();
            }}
          >{t("Speak to advisor")}</button>
        )}
        {state === 'Listening' && (
          <button
            className="text-button voice-send-fallback"
            onClick={() => recorder.current?.stop()}
          >{t("Send question")}</button>
        )}
        {state !== 'Ready' && (
          <button className="button secondary" onClick={end}>{t("Stop")}</button>
        )}
        <button
          className="text-button"
          onClick={() => {
            end();
            clearSession();
            setTurns([]);
            setError('');
          }}
        >{t("End call & clear")}</button>
      </div>
      {error && <p role="alert">{t(error)}</p>}
      <div className="voice-transcript">
        {turns.map((turn, i) => (
          <article key={i} className="panel" style={{ marginTop: 16, overflowWrap: 'anywhere' }}>
            <h3>{t("You said")}</h3>
            <p>{turn.transcript}</p>
            <h3>{t("Catalogue advisor ")}{turn.language && <small>({turn.language})</small>}</h3>
            <p style={{ whiteSpace: 'pre-wrap' }}>{turn.answer}</p>
            {turn.bundle && (
              <div>
                <h4>{t("Suggested bundle")}</h4>
                {turn.bundle.items.map((item) => (
                  <p key={item.product_id}>
                    {item.quantity} × {item.name}{t(": INR ")}{item.monthlyMin}–{item.monthlyMax}{t("/month")}<br />
                    <small>{t("Source: ")}{item.reference}</small>
                  </p>
                ))}
                <p>{t("Total: INR ")}{turn.bundle.monthlyMin}–{turn.bundle.monthlyMax}{t("/month · Setup: INR")}{' '}
                  {turn.bundle.setup}
                </p>
                <small>{turn.bundle.note}</small>
                <p className="muted small">{t("Review current catalogue prices and eligibility before checkout.")}</p>
                <button
                  className="button primary"
                  disabled={busy}
                  onClick={() => void run(() => reviewBundle(turn.bundle!))}
                >{t("Review this bundle")}</button>
              </div>
            )}
            {!!turn.audios.length && (
              <button
                className="button secondary"
                disabled={state !== 'Ready'}
                onClick={() => void play(turn.audios, generation.current)}
              >{t("Replay reply")}</button>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
