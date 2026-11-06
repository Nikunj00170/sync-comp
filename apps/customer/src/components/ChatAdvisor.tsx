import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { addToCart, quote } from '@sync/domain';
import { useWorkspace } from '../lib/store';
import { useI18n } from '../lib/i18n';
import { customerApi } from '../lib/api';
import { accessToken } from '../lib/auth';
type Reply = { answer: string; sessionId: string; bundle?: { items: {product_id: string; quantity: number}[] } | null };
export function ChatAdvisor({ onApplied }: { onApplied: () => void }) {
  const { t, locale } = useI18n();
  const { data, setData, cloud } = useWorkspace();
  const navigate = useNavigate();
  const [consent, setConsent] = useState(false);
  const [message, setMessage] = useState('');
  const [turns, setTurns] = useState<{question: string; reply: Reply}[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const session = useRef('');
  const controller = useRef<AbortController | null>(null);
  const base = (import.meta.env.VITE_VOICE_API_BASE_URL || '').replace(/\/$/, '');
  function clear() {
    controller.current?.abort();
    if (session.current) void fetch(base + '/api/voice/session', {method: 'DELETE', headers: {'X-Voice-Session': session.current}, keepalive: true}).catch(() => {});
    session.current = '';
    setTurns([]); setError(''); setMessage('');
  }
  useEffect(() => () => { controller.current?.abort(); if (session.current) void fetch(base + '/api/voice/session', {method: 'DELETE', headers: {'X-Voice-Session': session.current}, keepalive: true}).catch(() => {}); }, []);
  if (import.meta.env.VITE_CHAT_ENABLED !== 'true') return null;
  async function send() {
    setBusy(true); setError('');
    const active = new AbortController(); controller.current = active;
    try {
      const response = await fetch(base + '/api/voice/chat', {method: 'POST', signal: active.signal,
        headers: {'Content-Type': 'application/json', ...(session.current ? {'X-Voice-Session': session.current} : {})},
        body: JSON.stringify({message, language: locale, consent})});
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Advisor unavailable. Try the questionnaire.');
      if (active.signal.aborted) return;
      session.current = result.sessionId;
      setTurns(previous => [...previous, {question: message, reply: result}].slice(-12)); setMessage('');
    } catch (e) { if (!active.signal.aborted) setError(e instanceof Error ? e.message : 'Advisor unavailable. Try the questionnaire.'); }
    finally { if (controller.current === active) setBusy(false); }
  }
  async function apply(reply: Reply) {
    setBusy(true);setError('');
    try {
      let lines = data.cart;
      for (const item of reply.bundle?.items || []) {
        if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 1000) throw new Error('Invalid suggested quantity.');
        lines = addToCart(lines, item.product_id, data.profile).map(line => line.productId === item.product_id ? {...line, quantity: item.quantity} : line);
      }
      const checked = cloud ? await customerApi.quote(await accessToken(), lines) : quote(lines, data.profile);
      if (checked.errors.length) throw new Error(checked.errors.join('. '));
      setData(previous => ({...previous, cart: checked.lines})); clear(); navigate('/checkout'); onApplied();
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to review bundle.'); }
    finally {setBusy(false);}
  }
  return <section className="panel">
    <h3>{t('Chat with your business advisor')}</h3>
    <p>{t('Tell us about your business, team, locations, current tools and budget. Do not share identity documents or account secrets here.')}</p>
    <label className="check-label"><input type="checkbox" checked={consent} disabled={busy} onChange={e => {setConsent(e.target.checked); if (!e.target.checked) clear();}} />{t('I agree to share this conversation with Google Gemini for catalogue advice.')}</label>
    <div role="log" aria-live="polite">{turns.map((turn, i) => <div key={i} className="notice"><p>{turn.question}</p><p>{turn.reply.answer}</p>{turn.reply.bundle && <button className="button secondary" disabled={busy} onClick={() => void apply(turn.reply)}>{t('Review suggested bundle')}</button>}</div>)}</div>
    <form onSubmit={e => {e.preventDefault(); void send();}}>
      <label>{t('Your message')}<textarea value={message} maxLength={2000} disabled={busy || !consent} onChange={e => setMessage(e.target.value)} /></label>
      <div className="button-row"><button className="button primary" disabled={busy || !consent || !message.trim()}>{t(busy ? 'Thinking' : 'Send message')}</button><button className="button secondary" type="button" disabled={busy} onClick={clear}>{t('Clear conversation')}</button></div>
    </form>
    {error && <p role="alert">{t(error)}</p>}
  </section>;
}
