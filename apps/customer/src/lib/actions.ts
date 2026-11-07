import { useRef, useState } from 'react';
import { useNotify } from './feedback';
/** Prevent duplicate submissions and surface API failures without fabricating local success. */
export function useAction() {
  const notify = useNotify();
  const running = useRef(false);
  const [busy, setBusy] = useState(false);
  async function run(action: () => Promise<void>) {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    try {
      await action();
    } catch (error) {
      notify((error as Error).message);
    } finally {
      running.current = false;
      setBusy(false);
    }
  }
  return { run, busy };
}
