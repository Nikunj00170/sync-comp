import rawCatalogue from '../../../shared/data/catalogue.json';
import { z } from 'zod';

export type Product = {
  id: string;
  category: string;
  name: string;
  description: string;
  unit: string;
  price: number;
  priceMax: number;
  setup: number;
  contract: number;
  tiers: number[];
  minEmployees: number;
  minSites: number;
  requiresGstin: boolean;
  dependencies: string[];
  installDays: number;
  segments: string[];
};
export const catalogue = rawCatalogue as Product[];
export const CATALOGUE_VERSION = 'case-2026-07-v1';
export const DEMO_TAX_BPS = 1800;
export const profileSchema = z.object({
  name: z.string().trim().min(2, 'Enter your name').max(70),
  business: z.string().trim().min(2, 'Enter your business name').max(100),
  email: z.email('Enter a valid email address'),
  industry: z.enum(['professional', 'retail', 'manufacturing', 'hospitality']),
  city: z.string().trim().min(2, 'Enter a city').max(70),
  tier: z.coerce.number().int().min(1).max(2),
  employees: z.coerce.number().int().min(1).max(1000),
  sites: z.coerce.number().int().min(1).max(100),
  budget: z.coerce.number().int().min(500).max(1000000),
  hasGstin: z.boolean(),
  priorities: z.array(z.string()).min(1, 'Choose at least one priority'),
  address: z.string().max(250),
  phone: z.string().max(20),
});
export type Profile = z.infer<typeof profileSchema>;
export type CartLine = { productId: string; quantity: number };
export type Quote = {
  version: string;
  lines: CartLine[];
  monthly: number;
  setup: number;
  tax: number;
  total: number;
  errors: string[];
};
export type OrderStatus =
  'received' | 'verification' | 'confirmed' | 'scheduled' | 'installing' | 'active' | 'cancelled';
export const orderSteps: OrderStatus[] = [
  'received',
  'verification',
  'confirmed',
  'scheduled',
  'installing',
  'active',
];
export const statusLabels: Record<OrderStatus, string> = {
  received: 'Order received',
  verification: 'Verification',
  confirmed: 'Confirmed',
  scheduled: 'Installation scheduled',
  installing: 'Getting you connected',
  active: 'Active',
  cancelled: 'Cancelled',
};
export type TimelineEvent = { label: string; detail: string; at: string };
export type Order = {
  id: string;
  name: string;
  createdAt: string;
  status: OrderStatus;
  lines: CartLine[];
  quote: Quote;
  address: string;
  slot: string;
  events: TimelineEvent[];
};
export type InvoiceLine = CartLine & {
  name?: string;
  unitPrice?: number;
  category?: string;
  unit?: string;
};
export type Invoice = {
  id: string;
  period: string;
  issuedAt: string;
  dueAt: string;
  status: 'paid' | 'unpaid';
  lines: InvoiceLine[];
  subtotal: number;
  tax: number;
  total: number;
  paymentReference?: string;
};
export type DocumentMeta = {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadedAt: string;
};
export type Kyc = {
  status: 'pending' | 'demo_verified';
  provider: 'digio' | 'digilocker' | null;
  consent: boolean;
  documents: DocumentMeta[];
  verifiedAt?: string;
};
export type Ticket = {
  id: string;
  subject: string;
  category: string;
  description: string;
  status: 'open' | 'resolved';
  createdAt: string;
};
export type Notification = {
  id: string;
  title: string;
  text: string;
  route: string;
  read: boolean;
  createdAt: string;
};
export type Workspace = {
  version: 1;
  profile: Profile;
  cart: CartLine[];
  saved: string[];
  orders: Order[];
  invoices: Invoice[];
  kyc: Kyc;
  tickets: Ticket[];
  notifications: Notification[];
  preferences: { emailUpdates: boolean; reminders: boolean; compactMotion: boolean };
  draftStep: number;
};

export function money(paise: number, decimals = true) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals ? 2 : 0,
  }).format(paise / 100);
}
export const productById = (id: string) => catalogue.find((p) => p.id === id);
export function eligibility(p: Product, profile: Profile): string[] {
  const reasons: string[] = [];
  if (!p.tiers.includes(profile.tier))
    reasons.push('Available in Tier ' + p.tiers.join(' / ') + ' cities');
  if (profile.employees < p.minEmployees)
    reasons.push('Needs at least ' + p.minEmployees + ' employees');
  if (profile.sites < p.minSites) reasons.push('Needs at least ' + p.minSites + ' locations');
  if (p.requiresGstin && !profile.hasGstin) reasons.push('GST registration required');
  return reasons;
}
export function defaultQuantity(p: Product, profile: Profile) {
  if (p.unit === 'per site') return profile.sites;
  if (p.unit === 'per user' || p.unit === 'per device' || p.unit === 'per line')
    return profile.employees;
  return 1;
}
export function addToCart(lines: CartLine[], id: string, profile: Profile): CartLine[] {
  const p = productById(id);
  if (!p) throw new Error('Plan not found');
  const reasons = eligibility(p, profile);
  if (reasons.length) throw new Error(reasons.join('. '));
  let result = lines.map((x) => ({ ...x }));
  if (!result.some((x) => x.productId === id))
    result.push({ productId: id, quantity: defaultQuantity(p, profile) });
  if (p.dependencies.length && !result.some((x) => p.dependencies.includes(x.productId))) {
    const dependency = catalogue
      .filter((x) => p.dependencies.includes(x.id) && !eligibility(x, profile).length)
      .sort((a, b) => a.price - b.price)[0];
    if (!dependency) throw new Error('No eligible connection is available for this add-on');
    result = addToCart(result, dependency.id, profile);
  }
  return result;
}
export function removeFromCart(lines: CartLine[], id: string): CartLine[] {
  let result = lines.filter((x) => x.productId !== id);
  let changed = true;
  while (changed) {
    const next = result.filter((x) => {
      const p = productById(x.productId);
      return (
        p && (!p.dependencies.length || result.some((d) => p.dependencies.includes(d.productId)))
      );
    });
    changed = next.length !== result.length;
    result = next;
  }
  return result;
}
export function quote(lines: CartLine[], profile: Profile): Quote {
  const errors: string[] = [];
  let monthly = 0,
    setup = 0;
  const seen = new Set<string>();
  for (const line of lines) {
    const p = productById(line.productId);
    if (!p) {
      errors.push('Unknown product: ' + line.productId);
      continue;
    }
    if (seen.has(p.id)) {
      errors.push('Duplicate plan: ' + p.name);
      continue;
    }
    seen.add(p.id);
    if (!Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > 1000) {
      errors.push('Quantity must be between 1 and 1,000 for ' + p.name);
      continue;
    }
    errors.push(...eligibility(p, profile).map((r) => p.name + ': ' + r));
    if (p.dependencies.length && !lines.some((x) => p.dependencies.includes(x.productId)))
      errors.push(p.name + ' needs a compatible connection');
    monthly += p.price * line.quantity;
    setup += p.setup * line.quantity;
  }
  const tax = Math.round((monthly * DEMO_TAX_BPS) / 10000);
  return {
    version: CATALOGUE_VERSION,
    lines: lines.map((x) => ({ ...x })),
    monthly,
    setup,
    tax,
    total: monthly + tax,
    errors,
  };
}
export function recommendations(profile: Profile) {
  const base =
    profile.industry === 'manufacturing' &&
    profile.employees >= 25 &&
    profile.budget >= 30000 &&
    profile.hasGstin
      ? 'P06'
      : profile.employees > 5
        ? 'P02'
        : 'P01';
  const groups = [
    {
      id: 'essential',
      name: 'The essentials',
      eyebrow: 'LEAN & CONNECTED',
      description: 'The connection your business needs. Nothing you don’t.',
      ids: [base],
    },
    {
      id: 'recommended',
      name: 'Your everyday advantage',
      eyebrow: 'YOUR BEST MATCH',
      description: 'A thoughtful mix for a connected, productive team.',
      ids: [
        base,
        ...(profile.priorities.includes('productivity') ? ['P16'] : []),
        ...(profile.priorities.includes('security') ? ['P20'] : []),
        ...(profile.priorities.includes('reliability') ? ['P09'] : []),
        ...(profile.industry === 'retail' ? ['P19'] : []),
      ],
    },
    {
      id: 'growth',
      name: 'Room to grow',
      eyebrow: 'BUILT FOR WHAT’S NEXT',
      description: 'More protection and a stronger foundation for your next chapter.',
      ids: [base, 'P16', 'P17', 'P20', ...(profile.sites >= 3 ? ['P10'] : ['P22'])],
    },
  ];
  return groups.map((g) => {
    let lines: CartLine[] = [];
    for (const id of [...new Set(g.ids)])
      if (productById(id) && !eligibility(productById(id)!, profile).length)
        lines = addToCart(lines, id, profile);
    return { ...g, lines, quote: quote(lines, profile) };
  });
}
export function nextOrder(order: Order): Order {
  if (order.status === 'active' || order.status === 'cancelled')
    throw new Error('This order cannot advance');
  const next = orderSteps[orderSteps.indexOf(order.status) + 1];
  return {
    ...order,
    status: next,
    events: [
      ...order.events,
      {
        label: statusLabels[next],
        detail: 'Simulated milestone in your demo workspace.',
        at: new Date().toISOString(),
      },
    ],
  };
}
export function cancelOrder(order: Order): Order {
  if (['active', 'installing', 'cancelled'].includes(order.status))
    throw new Error('This order can no longer be cancelled');
  return {
    ...order,
    status: 'cancelled',
    events: [
      ...order.events,
      {
        label: 'Order cancelled',
        detail: 'Cancelled in the demo workspace.',
        at: new Date().toISOString(),
      },
    ],
  };
}
export const makeId = (prefix: string) =>
  prefix + '-' + crypto.randomUUID().slice(0, 8).toUpperCase();
export function makeOrder(lines: CartLine[], profile: Profile, kyc: Kyc): Order {
  if (kyc.status !== 'demo_verified')
    throw new Error('Complete demo verification before placing an order');
  const q = quote(lines, profile);
  if (!lines.length || q.errors.length) throw new Error(q.errors[0] || 'Add a plan first');
  const now = new Date().toISOString();
  return {
    id: makeId('SYNC'),
    name: lines.length === 1 ? productById(lines[0].productId)!.name : 'Your business bundle',
    createdAt: now,
    status: 'received',
    lines: q.lines,
    quote: q,
    address: profile.address || profile.city,
    slot: '',
    events: [
      {
        label: 'Order received',
        detail: 'Your demo order is saved. No real service has been purchased.',
        at: now,
      },
    ],
  };
}
export function makeInvoice(lines: CartLine[], profile: Profile, period: string): Invoice {
  const q = quote(lines, profile);
  if (q.errors.length) throw new Error(q.errors.join('. '));
  return {
    id: makeId('INV'),
    period,
    issuedAt: new Date().toISOString(),
    dueAt: new Date(Date.now() + 7 * 86400000).toISOString(),
    status: 'unpaid',
    lines: q.lines.map((line) => {
      const p = productById(line.productId)!;
      return { ...line, name: p.name, unitPrice: p.price, category: p.category, unit: p.unit };
    }),
    subtotal: q.monthly,
    tax: q.tax,
    total: q.total,
  };
}
export function initialWorkspace(): Workspace {
  const profile: Profile = {
    name: 'Aanya Sharma',
    business: 'Northstar Studio',
    email: 'aanya@example.com',
    industry: 'professional',
    city: 'Bengaluru',
    tier: 1,
    employees: 12,
    sites: 1,
    budget: 6000,
    hasGstin: true,
    priorities: ['productivity', 'security'],
    address: '24, Indiranagar, Bengaluru, Karnataka 560038',
    phone: '',
  };
  const activeLines = [
    { productId: 'P02', quantity: 1 },
    { productId: 'P16', quantity: 12 },
    { productId: 'P20', quantity: 8 },
    { productId: 'P17', quantity: 1 },
  ];
  const before = (days: number) => new Date(Date.now() - days * 86400000).toISOString();
  const current = new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  const previous = new Date(
    new Date().getFullYear(),
    new Date().getMonth() - 1,
    1,
  ).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  const q = quote(activeLines, profile);
  const active: Order = {
    id: 'SYNC-20481',
    name: 'Your connected workspace',
    createdAt: before(36),
    status: 'active',
    lines: activeLines,
    quote: q,
    address: profile.address,
    slot: '',
    events: orderSteps.map((s, i) => ({
      label: statusLabels[s],
      detail: 'Sample service milestone.',
      at: before(36 - i),
    })),
  };
  const pendingLines = [
    { productId: 'P22', quantity: 1 },
    { productId: 'P01', quantity: 1 },
  ];
  const pending: Order = {
    id: 'SYNC-20846',
    name: 'Studio guest Wi-Fi',
    createdAt: before(3),
    status: 'scheduled',
    lines: pendingLines,
    quote: quote(pendingLines, profile),
    address: profile.address,
    slot: new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 16),
    events: orderSteps.slice(0, 4).map((s, i) => ({
      label: statusLabels[s],
      detail: 'Sample installation progress.',
      at: before(3 - i * 0.6),
    })),
  };
  const invoice = makeInvoice(activeLines, profile, current);
  return {
    version: 1,
    profile,
    cart: [],
    saved: [],
    orders: [pending, active],
    invoices: [
      { ...invoice, id: 'INV-2026-0042' },
      {
        ...invoice,
        id: 'INV-2026-0031',
        period: previous,
        status: 'paid',
        issuedAt: before(32),
        dueAt: before(25),
        paymentReference: 'DEMO-PAY-0031',
      },
    ],
    kyc: { status: 'pending', provider: null, consent: false, documents: [] },
    tickets: [],
    notifications: [
      {
        id: 'n1',
        title: 'Your installation is on the calendar',
        text: 'Review your sample guest Wi-Fi installation and choose a convenient slot.',
        route: '/orders/SYNC-20846',
        read: false,
        createdAt: before(0.2),
      },
      {
        id: 'n2',
        title: 'One bill. Every service.',
        text: 'Your consolidated demo invoice is ready to review.',
        route: '/billing',
        read: false,
        createdAt: before(1),
      },
      {
        id: 'n3',
        title: 'Let’s finish your business profile',
        text: 'Complete verification to try the full demo checkout.',
        route: '/verification',
        read: false,
        createdAt: before(2),
      },
    ],
    preferences: { emailUpdates: true, reminders: true, compactMotion: false },
    draftStep: 0,
  };
}
