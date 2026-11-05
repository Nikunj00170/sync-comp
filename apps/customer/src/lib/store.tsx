import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { initialWorkspace, profileSchema, type Workspace } from '@sync/domain';
const KEY = 'airtel-sync:customer:v1';
type Store = {
  data: Workspace;
  setData: (fn: (prev: Workspace) => Workspace) => void;
  reset: () => void;
  storageError: boolean;
};
const Context = createContext<Store | null>(null);
function load() {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (
      value?.version === 1 &&
      profileSchema.safeParse(value.profile).success &&
      ['orders', 'invoices', 'cart', 'saved', 'tickets', 'notifications'].every((key) =>
        Array.isArray(value[key]),
      ) &&
      value.invoices.length > 0 &&
      value.kyc &&
      Array.isArray(value.kyc.documents) &&
      value.preferences
    )
      return value as Workspace;
  } catch {}
  return initialWorkspace();
}
export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [data, update] = useState<Workspace>(load);
  const [storageError, error] = useState(false);
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
      error(false);
    } catch {
      error(true);
    }
  }, [data]);
  return (
    <Context.Provider
      value={{ data, setData: update, reset: () => update(initialWorkspace()), storageError }}
    >
      {children}
    </Context.Provider>
  );
}
export function useWorkspace() {
  const c = useContext(Context);
  if (!c) throw new Error('Workspace provider missing');
  return c;
}
