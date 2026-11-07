import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  catalogue,
  initialWorkspace,
  profileSchema,
  makeOrder,
  makeInvoice,
  cancelOrder,
  makeId,
  type Workspace,
  type Profile,
  type Kyc,
  type Ticket,
  type CartLine,
  type Order,
} from '@sync/domain';
import {
  customerApi,
  cloudConfigured,
  uploadBytes,
  ApiError,
  type Recommendation,
  type DocumentReservation,
} from './api';
import { authManager, accessToken } from './auth';
import {
  demoPaymentMethods,
  readDemoPayments,
  writeDemoPayments,
  type DemoPayment,
  type DemoPaymentMethod,
} from './demoPayments';
const KEY = 'airtel-sync:customer:v1';
export type Connection = 'demo' | 'signed-out' | 'loading' | 'ready' | 'error';
type Store = {
  data: Workspace;
  setData: (fn: (prev: Workspace) => Workspace) => void;
  reset: () => void;
  storageError: boolean;
  cloud: boolean;
  authenticated: boolean;
  connection: Connection;
  connectionError: string;
  refresh: (options?: { reportErrors?: boolean }) => Promise<void>;
  saveProfile: (profile: Profile) => Promise<void>;
  matches: () => Promise<Recommendation[]>;
  placeOrder: (method: DemoPaymentMethod) => Promise<Order>;
  demoPayments: DemoPayment[];
  payInvoice: (id: string, method: DemoPaymentMethod) => void;
  cancel: (id: string) => Promise<void>;
  saveKyc: (provider: Kyc['provider'], consent: boolean) => Promise<void>;
  verify: () => Promise<void>;
  upload: (file: File) => Promise<void>;
  completeDocument: (id: string) => Promise<void>;
  removeDocument: (id: string) => Promise<void>;
  reservations: DocumentReservation[];
  createTicket: (ticket: Pick<Ticket, 'subject' | 'category' | 'description'>) => Promise<void>;
  resolveTicket: (id: string) => Promise<void>;
  markRead: (ids: string[]) => Promise<void>;
};
const Context = createContext<Store | null>(null);
function emptyWorkspace(): Workspace {
  return {
    version: 1,
    profile: {
      name: '',
      business: '',
      email: '',
      industry: 'professional',
      city: '',
      tier: 1,
      employees: 1,
      sites: 1,
      budget: 5000,
      hasGstin: false,
      priorities: ['productivity'],
      address: '',
      phone: '',
    },
    cart: [],
    saved: [],
    orders: [],
    invoices: [],
    kyc: { status: 'pending', provider: null, consent: false, documents: [] },
    tickets: [],
    notifications: [],
    preferences: { emailUpdates: false, reminders: false, compactMotion: false },
    draftStep: 0,
  };
}
function loadDemo() {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (
      value?.version === 1 &&
      profileSchema.safeParse(value.profile).success &&
      ['orders', 'invoices', 'cart', 'saved', 'tickets', 'notifications'].every((key) =>
        Array.isArray(value[key]),
      ) &&
      Array.isArray(value.kyc?.documents) &&
      value.preferences
    )
      return value as Workspace;
  } catch {
    /* Storage may be unavailable. */
  }
  return initialWorkspace();
}
function assertCatalogue(products: typeof catalogue) {
  if (
    products.length !== catalogue.length ||
    catalogue.some((p) => {
      const found = products.find((x) => x.id === p.id);
      return (
        !found ||
        Object.keys(p).some(
          (key) =>
            JSON.stringify(found[key as keyof typeof p]) !==
            JSON.stringify(p[key as keyof typeof p]),
        )
      );
    })
  )
    throw new ApiError(
      409,
      'The product catalogue changed. Reload the latest application before continuing.',
    );
}
export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const cloud = cloudConfigured;
  const [data, update] = useState<Workspace>(() => (cloud ? emptyWorkspace() : loadDemo()));
  const current = useRef(data);
  current.current = data;
  const epoch = useRef(0);
  const owner = useRef('');
  const loadId = useRef(0);
  const [paymentState, setPaymentState] = useState<{ owner: string; items: DemoPayment[] }>(() =>
    cloud
      ? { owner: '', items: [] }
      : { owner: 'local-demo', items: readDemoPayments('local-demo') },
  );
  const addPayment = (payment: DemoPayment) => {
    const scope = cloud ? owner.current : 'local-demo';
    if (!scope) throw new Error('Please sign in to your customer account.');
    setPaymentState((previous) => {
      const items = previous.owner === scope ? previous.items : readDemoPayments(scope);
      const next = [
        ...items.filter(
          (item) =>
            !(payment.orderId && item.orderId === payment.orderId) &&
            !(payment.invoiceId && item.invoiceId === payment.invoiceId),
        ),
        payment,
      ];
      try {
        writeDemoPayments(scope, next);
      } catch {
        storageFailed(true);
      }
      return { owner: scope, items: next };
    });
  };
  const [authenticated, setAuthenticated] = useState(false);
  const [storageError, storageFailed] = useState(false);
  const [connection, connect] = useState<Connection>(cloud ? 'loading' : 'demo');
  const [connectionError, fail] = useState('');
  const [reservations, setReservations] = useState<DocumentReservation[]>([]);
  const connectionRef = useRef(connection);
  connectionRef.current = connection;
  const renewalTimerAttempted = useRef({ expiring: false, expired: false });
  const refreshFlight = useRef<{ epoch: number; promise: Promise<string | undefined> } | null>(null);
  const call = useCallback(async <T,>(operation: (token: string) => Promise<T>) => {
    const session = epoch.current;
    let token = await accessToken();
    if (epoch.current !== session) throw new Error('Your account changed. Please try again.');
    let result: T;
    try {
      result = await operation(token);
    } catch (error) {
      // An API failure is not proof that the Cognito session was revoked. Refresh at most once.
      if (!(error instanceof ApiError) || error.status !== 401 || epoch.current !== session)
        throw error;
      const renewed = await accessToken(true);
      if (epoch.current !== session || renewed === token) throw error;
      token = renewed;
      result = await operation(token);
    }
    if (epoch.current !== session) throw new Error('Your account changed. Please try again.');
    return result;
  }, []);
  const loadWorkspace = useCallback(async () => {
    if (!cloud) return;
    const session = epoch.current;
    const request = ++loadId.current;
    try {
      const token = await accessToken();
      const [profile, orders, invoices, kyc, tickets, notifications, products, docs] =
        await (async () => {
          // Limit fan-out instead of sending eight simultaneous requests to the hosted API.
          const [profile, kyc] = await Promise.all([
            customerApi.profile(token),
            customerApi.kyc(token),
          ]);
          const [orders, invoices] = await Promise.all([
            customerApi.orders(token),
            customerApi.invoices(token),
          ]);
          const [tickets, notifications] = await Promise.all([
            customerApi.tickets(token),
            customerApi.notifications(token),
          ]);
          const [products, docs] = await Promise.all([
            customerApi.catalogue(),
            customerApi.documents(token),
          ]);
          return [profile, orders, invoices, kyc, tickets, notifications, products, docs] as const;
        })();
      assertCatalogue(products);
      if (epoch.current !== session || request !== loadId.current)
        return 'Your account changed. Please try again.';
      update((previous) => ({
        ...previous,
        profile,
        orders,
        invoices,
        kyc,
        tickets,
        notifications,
      }));
      setReservations(docs);
      connect('ready');
      fail('');
    } catch (error) {
      if (epoch.current !== session || request !== loadId.current)
        return 'Your account changed. Please try again.';
      fail((error as Error).message);
      // Background errors must not hide an acknowledged order or completed upload.
      if (connectionRef.current !== 'ready') connect('error');
      return (error as Error).message;
    }
  }, [cloud]);
  const refresh = useCallback(async (options?: { reportErrors?: boolean }) => {
    const session = epoch.current;
    let flight = refreshFlight.current;
    if (!flight || flight.epoch !== session) {
      const promise = loadWorkspace();
      flight = { epoch: session, promise };
      refreshFlight.current = flight;
      void promise.finally(() => {
        if (refreshFlight.current?.promise === promise) refreshFlight.current = null;
      });
    }
    const error = await flight.promise;
    if (options?.reportErrors && error) throw new Error(error);
  }, [loadWorkspace]);
  useEffect(() => {
    if (!cloud) return;
    let active = true;
    try {
      const manager = authManager();
      const loaded = (user: { profile: { sub: string }; expired?: boolean }) => {
        if (!active) return;
        setAuthenticated(true);
        renewalTimerAttempted.current = { expiring: false, expired: Boolean(user.expired) };
        const changedOwner = owner.current !== user.profile.sub;
        if (changedOwner) {
          epoch.current++;
          owner.current = user.profile.sub;
          setPaymentState({ owner: user.profile.sub, items: readDemoPayments(user.profile.sub) });
          update(emptyWorkspace());
          setReservations([]);
        }
        if (changedOwner || connectionRef.current !== 'ready') connect('loading');
        void refresh();
      };
      const unloaded = () => {
        if (!active) return;
        epoch.current++;
        owner.current = '';
        setPaymentState({ owner: '', items: [] });
        setAuthenticated(false);
        update(emptyWorkspace());
        setReservations([]);
        fail('');
        connect('signed-out');
      };
      manager.events.addUserLoaded(loaded);
      manager.events.addUserUnloaded(unloaded);
      const expiring = () => {
        if (renewalTimerAttempted.current.expiring) return;
        renewalTimerAttempted.current.expiring = true;
        void accessToken(true).catch(() => {
          /* Retry on the next user action. */
        });
      };
      const expired = () => {
        if (renewalTimerAttempted.current.expired) return;
        renewalTimerAttempted.current.expired = true;
        void refresh();
      };
      manager.events.addAccessTokenExpiring(expiring);
      manager.events.addAccessTokenExpired(expired);
      void manager
        .getUser()
        .then((user) => {
          if (!active) return;
          if (user) loaded(user);
          else unloaded();
        })
        .catch((error) => {
          if (active) {
            connect('error');
            fail(error.message);
          }
        });
      return () => {
        active = false;
        manager.events.removeUserLoaded(loaded);
        manager.events.removeUserUnloaded(unloaded);
        manager.events.removeAccessTokenExpiring(expiring);
        manager.events.removeAccessTokenExpired(expired);
      };
    } catch (error) {
      connect('error');
      fail((error as Error).message);
    }
    return () => {
      active = false;
    };
  }, [cloud, refresh]);
  useEffect(() => {
    if (cloud) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
      storageFailed(false);
    } catch {
      storageFailed(true);
    }
  }, [data, cloud]);
  const setData = (fn: (prev: Workspace) => Workspace) =>
    update((prev) => {
      const next = fn(prev);
      // API-owned records may only change after an acknowledged server operation.
      return cloud
        ? {
            ...prev,
            cart: next.cart,
            saved: next.saved,
            preferences: next.preferences,
            draftStep: next.draftStep,
          }
        : next;
    });
  const saveProfile = async (profile: Profile) => {
    const parsed = profileSchema.parse(profile);
    const [saved, kyc] = cloud
      ? await call(async (token) => {
          const saved = await customerApi.saveProfile(token, parsed);
          return [saved, await customerApi.kyc(token)] as const;
        })
      : [parsed, current.current.kyc];
    update((prev) => ({ ...prev, profile: saved, kyc, draftStep: 0 }));
  };
  const saveKyc = async (provider: Kyc['provider'], consent: boolean) => {
    if (cloud && !provider) throw new Error('Choose a verification provider first.');
    const kyc = cloud
      ? await call((token) => customerApi.saveKyc(token, provider!, consent))
      : {
          ...current.current.kyc,
          provider,
          consent,
          status: 'pending' as const,
          verifiedAt: undefined,
        };
    update((prev) => ({ ...prev, kyc }));
  };
  const verify = async () => {
    const old = current.current.kyc;
    if (!old.provider || !old.consent || old.documents.length < 2)
      throw new Error('Consent, a provider and two documents are required.');
    const kyc = cloud
      ? await call(customerApi.verifyDemo)
      : { ...old, status: 'demo_verified' as const, verifiedAt: new Date().toISOString() };
    update((prev) => ({ ...prev, kyc }));
  };
  const completeDocument = async (id: string) => {
    const document = await call((token) => customerApi.completeUpload(token, id));
    update((previous) => ({
      ...previous,
      kyc: {
        ...previous.kyc,
        status: 'pending',
        consent: false,
        verifiedAt: undefined,
        documents: [...previous.kyc.documents.filter((item) => item.id !== id), document],
      },
    }));
    setReservations((previous) =>
      previous.map((item) => (item.id === id ? { ...item, status: 'uploaded' } : item)),
    );
  };
  const upload = async (file: File) => {
    if (
      !['application/pdf', 'image/jpeg', 'image/png'].includes(file.type) ||
      file.size < 1 ||
      file.size > 10 * 1024 * 1024
    )
      throw new Error('Choose a PDF, PNG or JPEG between 1 byte and 10 MB.');
    if (!cloud) {
      if (current.current.kyc.documents.length >= 8)
        throw new Error('A maximum of eight documents is allowed.');
      const doc = {
        id: makeId('DOC'),
        name: file.name,
        size: file.size,
        type: file.type,
        uploadedAt: new Date().toISOString(),
      };
      update((prev) => ({
        ...prev,
        kyc: {
          ...prev.kyc,
          documents: [...prev.kyc.documents, doc],
          status: 'pending',
          consent: false,
        },
      }));
      return;
    }
    const uploadSession = epoch.current;
    const authorization = await call((token) =>
      customerApi.upload(token, { name: file.name, type: file.type, size: file.size }),
    );
    setReservations((previous) => [
      ...previous,
      {
        id: authorization.documentId,
        name: file.name,
        type: file.type,
        size: file.size,
        expiresAt: authorization.expiresAt,
        status: 'pending',
      },
    ]);
    if (epoch.current !== uploadSession) throw new Error('Your account changed. Please try again.');
    await call((token) => uploadBytes(authorization, file, token));
    if (epoch.current !== uploadSession) throw new Error('Your account changed. Please try again.');
    await completeDocument(authorization.documentId);
  };
  const removeDocument = async (id: string) => {
    if (cloud) {
      await call((token) => customerApi.deleteDocument(token, id));
      await refresh();
    } else
      update((prev) => ({
        ...prev,
        kyc: {
          ...prev.kyc,
          documents: prev.kyc.documents.filter((doc) => doc.id !== id),
          status: 'pending',
          consent: false,
        },
      }));
  };
  const payInvoice = (id: string, method: DemoPaymentMethod) => {
    if (!demoPaymentMethods.includes(method)) throw new Error('Choose a demo payment method.');
    const invoice = current.current.invoices.find((item) => item.id === id);
    if (!invoice) throw new Error('Invoice not found.');
    addPayment({
      reference: makeId('DEMO-PAY'),
      invoiceId: id,
      method,
      amount: invoice.total,
      business: invoice.billedTo?.business || current.current.profile.business,
      address: invoice.billedTo?.address || current.current.profile.address,
      createdAt: new Date().toISOString(),
    });
  };
  const placeOrder = async (method: DemoPaymentMethod) => {
    if (!demoPaymentMethods.includes(method)) throw new Error('Choose a demo payment method.');
    const workspace = current.current;
    let order: Order;
    if (cloud) {
      const keyName = 'sync:checkout:' + owner.current;
      const fingerprint = JSON.stringify(workspace.cart);
      let saved: { fingerprint: string; key: string } | null = null;
      try {
        saved = JSON.parse(sessionStorage.getItem(keyName) || 'null');
      } catch {
        /* New checkout. */
      }
      const key = saved?.fingerprint === fingerprint ? saved.key : crypto.randomUUID();
      sessionStorage.setItem(keyName, JSON.stringify({ fingerprint, key }));
      order = await call((token) => customerApi.createOrder(token, workspace.cart, key));
      sessionStorage.removeItem(keyName);
    } else order = makeOrder(workspace.cart, workspace.profile, workspace.kyc);
    const receipt: DemoPayment = {
      reference: makeId('DEMO-PAY'),
      orderId: order.id,
      method,
      amount: order.quote.total + order.quote.setup,
      business: workspace.profile.business,
      address: order.address,
      createdAt: new Date().toISOString(),
    };
    const invoice = cloud
      ? undefined
      : {
          ...makeInvoice(
            order.lines,
            workspace.profile,
            new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
          ),
          status: 'paid' as const,
          paymentReference: receipt.reference,
        };
    if (invoice) receipt.invoiceId = invoice.id;
    addPayment(receipt);
    update((prev) => ({
      ...prev,
      cart: [],
      orders: [order, ...prev.orders.filter((x) => x.id !== order.id)],
      invoices: invoice ? [invoice, ...prev.invoices] : prev.invoices,
      notifications: cloud
        ? prev.notifications
        : [
            {
              id: makeId('NOTICE'),
              title: 'Demo order placed',
              text: order.name + ' is ready to track. No money was collected.',
              route: '/orders/' + order.id,
              read: false,
              createdAt: order.createdAt,
            },
            ...prev.notifications,
          ],
    }));
    if (cloud) await refresh();
    return order;
  };
  const cancel = async (id: string) => {
    const old = current.current.orders.find((x) => x.id === id);
    if (!old) throw new Error('Order not found.');
    const order = cloud
      ? await call((token) => customerApi.cancelOrder(token, id))
      : cancelOrder(old);
    update((prev) => ({ ...prev, orders: prev.orders.map((x) => (x.id === id ? order : x)) }));
  };
  const createTicket = async (request: Pick<Ticket, 'subject' | 'category' | 'description'>) => {
    const ticket = cloud
      ? await call((token) => customerApi.createTicket(token, request))
      : {
          ...request,
          id: makeId('HELP'),
          status: 'open' as const,
          createdAt: new Date().toISOString(),
        };
    update((prev) => ({ ...prev, tickets: [ticket, ...prev.tickets] }));
    if (cloud) await refresh();
  };
  const resolveTicket = async (id: string) => {
    const old = current.current.tickets.find((x) => x.id === id);
    if (!old) throw new Error('Ticket not found.');
    const ticket = cloud
      ? await call((token) => customerApi.resolveTicket(token, id))
      : { ...old, status: 'resolved' as const };
    update((prev) => ({ ...prev, tickets: prev.tickets.map((x) => (x.id === id ? ticket : x)) }));
  };
  const markRead = async (ids: string[]) => {
    if (cloud)
      await call((token) => Promise.all(ids.map((id) => customerApi.readNotification(token, id))));
    update((prev) => ({
      ...prev,
      notifications: prev.notifications.map((x) => (ids.includes(x.id) ? { ...x, read: true } : x)),
    }));
  };
  return (
    <Context.Provider
      value={{
        data,
        setData,
        reset: () => {
          if (!cloud) {
            update(initialWorkspace());
            setPaymentState({ owner: 'local-demo', items: [] });
            writeDemoPayments('local-demo', []);
          }
        },
        storageError,
        cloud,
        authenticated,
        connection,
        connectionError,
        refresh,
        saveProfile,
        matches: () => call(customerApi.recommendations),
        placeOrder,
        demoPayments: paymentState.items,
        payInvoice,
        cancel,
        saveKyc,
        verify,
        upload,
        completeDocument,
        removeDocument,
        reservations,
        createTicket,
        resolveTicket,
        markRead,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useWorkspace() {
  const value = useContext(Context);
  if (!value) throw new Error('Workspace provider missing');
  return value;
}
