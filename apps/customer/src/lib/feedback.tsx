import { useI18n } from './i18n';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { CheckCircle2, X } from 'lucide-react';
const C = createContext<(text: string) => void>(() => {});
const DISPLAY_MS = 3000;
const EXIT_MS = 240;
type Notification = { id: number; text: string };
function Toast({ item, remove }: { item: Notification; remove: (id: number) => void }) {
  const { t } = useI18n();
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setLeaving(true), DISPLAY_MS);
    return () => clearTimeout(timer);
  }, []);
  useEffect(() => {
    if (!leaving) return;
    const timer = setTimeout(() => remove(item.id), EXIT_MS);
    return () => clearTimeout(timer);
  }, [leaving, item.id, remove]);
  return (
    <div className={'toast' + (leaving ? ' leaving' : '')}>
      <CheckCircle2 size={19} />
      <span>{t(item.text)}</span>
      <button aria-label={t('Dismiss notification')} onClick={() => setLeaving(true)}>
        <X size={16} />
      </button>
      <span className="toast-progress" aria-hidden="true">
        <i />
      </span>
    </div>
  );
}
export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [items, set] = useState<Notification[]>([]);
  const notify = useCallback((text: string) => {
    set((items) => [...items, { id: Date.now() + Math.random(), text }]);
  }, []);
  const remove = useCallback(
    (id: number) => set((items) => items.filter((item) => item.id !== id)),
    [],
  );
  return (
    <C.Provider value={notify}>
      {children}
      <div className="toasts" aria-live="polite">
        {items.map((item) => (
          <Toast key={item.id} item={item} remove={remove} />
        ))}
      </div>
    </C.Provider>
  );
}
export const useNotify = () => useContext(C);
