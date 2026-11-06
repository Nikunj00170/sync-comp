import { useEffect, useState } from 'react';
import { quote, type Quote } from '@sync/domain';
import { useWorkspace } from './store';
import { customerApi } from './api';
import { accessToken } from './auth';
export function useQuote() {
  const { data, cloud } = useWorkspace();
  const [attempt, retry] = useState(0);
  const fingerprint = JSON.stringify([data.cart, data.profile]);
  const [remote, setRemote] = useState<{ fingerprint: string; quote?: Quote; error?: string }>({
    fingerprint: '',
  });
  useEffect(() => {
    if (!cloud) return;
    let active = true;
    if (!data.cart.length) {
      setRemote({ fingerprint, quote: quote([], data.profile) });
      return;
    }
    const timer = setTimeout(() => {
      void accessToken()
        .then((token) => customerApi.quote(token, data.cart))
        .then((result) => {
          if (active) setRemote({ fingerprint, quote: result });
        })
        .catch((error) => {
          if (active) setRemote({ fingerprint, error: error.message });
        });
    }, 150);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [cloud, fingerprint, attempt]);
  if (!cloud)
    return {
      quote: quote(data.cart, data.profile),
      loading: false,
      error: '',
      retry: () => retry((x) => x + 1),
    };
  return {
    quote: remote.fingerprint === fingerprint ? remote.quote : undefined,
    loading: remote.fingerprint !== fingerprint,
    error: remote.fingerprint === fingerprint ? remote.error || '' : '',
    retry: () => retry((x) => x + 1),
  };
}
