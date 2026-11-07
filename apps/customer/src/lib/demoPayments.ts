/** Browser-only simulation receipts. These never represent a bank transaction or update a payment API. */
export const demoPaymentMethods = ['UPI', 'Card', 'Net banking'] as const;
export type DemoPaymentMethod = typeof demoPaymentMethods[number];
export type DemoPayment = {
  reference: string;
  orderId?: string;
  invoiceId?: string;
  method: DemoPaymentMethod;
  amount: number;
  business: string;
  address: string;
  createdAt: string;
};
const prefix = 'sync:demo-payments:v1:';
export function readDemoPayments(owner: string): DemoPayment[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(prefix + owner) || '[]');
    return Array.isArray(value) ? value.filter((item): item is DemoPayment =>
      item && typeof item.reference === 'string' && item.reference.startsWith('DEMO-PAY-') &&
      (typeof item.orderId === 'string' || typeof item.invoiceId === 'string') &&
      demoPaymentMethods.includes(item.method) && Number.isSafeInteger(item.amount) && item.amount >= 0 &&
      typeof item.business === 'string' && typeof item.address === 'string' && typeof item.createdAt === 'string' && Number.isFinite(Date.parse(item.createdAt))).slice(-100) : [];
  } catch {return [];}
}
export function writeDemoPayments(owner: string, items: DemoPayment[]) {
  localStorage.setItem(prefix + owner, JSON.stringify(items.slice(-100)));
}
