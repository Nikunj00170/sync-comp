import { useI18n } from '../lib/i18n';
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { CheckCircle2, X } from 'lucide-react';
const C = createContext<(text: string) => void>(() => {});
export function FeedbackProvider({ children }: { children: ReactNode }) {
  const { t, locale } = useI18n();
  const [items, set] = useState<{ id: number; text: string }[]>([]);
  const notify = useCallback((text: string) => {
    const id = Date.now() + Math.random();
    set((a) => [...a, { id, text }]);
    setTimeout(() => set((a) => a.filter((x) => x.id !== id)), 5000);
  }, []);
  return (
    <C.Provider value={notify}>
      {children}
      <div className="toasts" aria-live="polite">
        {items.map((x) => (
          <div className="toast" key={x.id}>
            <CheckCircle2 size={19} />
            <span>{t(x.text)}</span>
            <button
              aria-label={t("Dismiss notification")}
              onClick={() => set((a) => a.filter((y) => y.id !== x.id))}
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </C.Provider>
  );
}
export const useNotify = () => useContext(C);
