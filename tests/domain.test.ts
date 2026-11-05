import { describe, it, expect } from 'vitest';
import {
  addToCart,
  cancelOrder,
  catalogue,
  eligibility,
  initialWorkspace,
  makeInvoice,
  makeOrder,
  money,
  nextOrder,
  orderSteps,
  productById,
  profileSchema,
  quote,
  recommendations,
  removeFromCart,
} from '../packages/domain/src';
const profile = initialWorkspace().profile;
describe('case catalogue and monetary contract', () => {
  it('uses paise consistently and avoids 100x pricing errors', () => {
    expect(money(99900)).toBe('₹999');
    const q = quote([{ productId: 'P01', quantity: 2 }], profile);
    expect(q).toMatchObject({ monthly: 199800, tax: 35964, total: 235764, errors: [] });
  });
  it('rejects invalid quantities, duplicate and unknown products', () => {
    for (const quantity of [0, -1, 1.5, 1001, NaN])
      expect(quote([{ productId: 'P01', quantity }], profile).errors).not.toHaveLength(0);
    expect(
      quote(
        [
          { productId: 'P01', quantity: 1 },
          { productId: 'P01', quantity: 1 },
        ],
        profile,
      ).errors.join(),
    ).toContain('Duplicate');
    expect(quote([{ productId: 'UNKNOWN', quantity: 1 }], profile).errors.join()).toContain(
      'Unknown',
    );
  });
  it('keeps each product eligible only when its constraints hold', () => {
    for (const p of catalogue) {
      if (p.requiresGstin)
        expect(eligibility(p, { ...profile, hasGstin: false })).toContain(
          'GST registration required',
        );
      if (p.minEmployees > 1)
        expect(eligibility(p, { ...profile, employees: 1 }).join()).toContain('employees');
      if (p.minSites > 1)
        expect(eligibility(p, { ...profile, sites: 1 }).join()).toContain('locations');
      if (!p.tiers.includes(2))
        expect(eligibility(p, { ...profile, tier: 2 }).join()).toContain('Tier');
    }
  });
});
describe('dependency-aware bundle selection', () => {
  it('adds one eligible OR dependency, reuses an existing one, and cascades removals', () => {
    const addon = productById('P22')!;
    expect(addon.dependencies.length).toBeGreaterThan(1);
    const cart = addToCart([], addon.id, profile);
    expect(cart.filter((l) => addon.dependencies.includes(l.productId))).toHaveLength(1);
    expect(quote(cart, profile).errors).toEqual([]);
    expect(addToCart(cart, addon.id, profile)).toEqual(cart);
    const dependency = cart.find((l) => addon.dependencies.includes(l.productId))!;
    expect(removeFromCart(cart, dependency.productId)).toEqual([]);
  });
  it('preserves an add-on when an alternate dependency still exists', () => {
    const cart = [
      { productId: 'P22', quantity: 1 },
      { productId: 'P01', quantity: 1 },
      { productId: 'P02', quantity: 1 },
    ];
    expect(removeFromCart(cart, 'P01').map((l) => l.productId)).toEqual(['P22', 'P02']);
  });
  it('produces valid recommendations for diverse eligible profiles', () => {
    for (const industry of ['professional', 'retail', 'manufacturing', 'hospitality'] as const)
      for (const tier of [1, 2])
        for (const hasGstin of [false, true]) {
          const p = {
            ...profile,
            industry,
            tier,
            hasGstin,
            employees: 50,
            sites: 3,
            budget: 40000,
          };
          for (const r of recommendations(p)) {
            expect(r.lines.length).toBeGreaterThan(0);
            expect(r.quote.errors).toEqual([]);
            expect(new Set(r.lines.map((l) => l.productId)).size).toBe(r.lines.length);
          }
        }
  });
});
describe('order and invoice lifecycle', () => {
  it('gates checkout on demo verification, valid cart and profile eligibility', () => {
    const w = initialWorkspace(),
      lines = [{ productId: 'P01', quantity: 1 }];
    expect(() => makeOrder(lines, profile, w.kyc)).toThrow('verification');
    expect(() => makeOrder([], profile, { ...w.kyc, status: 'demo_verified' })).toThrow(
      'Add a plan',
    );
    expect(() =>
      makeOrder([{ productId: 'P01', quantity: 0 }], profile, {
        ...w.kyc,
        status: 'demo_verified',
      }),
    ).toThrow('Quantity');
  });
  it('advances sequentially, records events and forbids invalid terminal transitions', () => {
    const w = initialWorkspace();
    let o = makeOrder([{ productId: 'P01', quantity: 1 }], profile, {
      ...w.kyc,
      status: 'demo_verified',
    });
    for (const status of orderSteps.slice(1)) {
      o = nextOrder(o);
      expect(o.status).toBe(status);
    }
    expect(o.events).toHaveLength(6);
    expect(() => nextOrder(o)).toThrow();
    expect(() => cancelOrder(o)).toThrow();
    const cancelled = cancelOrder(w.orders[0]);
    expect(cancelled.status).toBe('cancelled');
    expect(() => nextOrder(cancelled)).toThrow();
  });
  it('snapshots cart and invoice amounts independently of subsequent edits', () => {
    const w = initialWorkspace(),
      cart = [{ productId: 'P01', quantity: 1 }];
    const order = makeOrder(cart, profile, { ...w.kyc, status: 'demo_verified' }),
      invoice = makeInvoice(cart, profile, 'November 2026');
    cart[0].quantity = 100;
    expect(order.quote.total).toBe(117882);
    expect(invoice.total).toBe(117882);
    expect(invoice.lines[0].quantity).toBe(1);
    expect(invoice.lines[0]).toMatchObject({ unitPrice: 99900, name: 'Biz Fibre 100' });
  });
  it('validates profile inputs and seeded demo invoices reconcile', () => {
    expect(
      profileSchema.safeParse({ ...profile, email: 'bad', employees: 0, priorities: [] }).success,
    ).toBe(false);
    const w = initialWorkspace();
    for (const i of w.invoices) expect(i.total).toBe(i.subtotal + i.tax);
    expect(quote(w.orders[1].lines, w.profile).errors).toEqual([]);
  });
});
