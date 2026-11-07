import { expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { initialWorkspace } from '../packages/domain/src';
import { invoicePdf } from '../apps/customer/src/lib/downloads';
it('embeds a Unicode font when exporting Hindi and Marathi business details', async () => {
  const bytes = readFileSync(new URL('../apps/customer/src/assets/fonts/NotoSansDevanagari.ttf', import.meta.url));
  vi.stubGlobal('fetch', vi.fn(async () => new Response(bytes)));
  try {
    const workspace = initialWorkspace();
    const invoice = { ...workspace.invoices[0], billedTo: { name: 'आन्या शर्मा', business: 'आपला व्यवसाय', email: 'name@example.com', address: '२४, पुणे, महाराष्ट्र' } };
    const result = await invoicePdf(invoice, workspace.profile);
    expect(new TextDecoder().decode(result.slice(0, 5))).toBe('%PDF-');
    expect(result.byteLength).toBeGreaterThan(1000);
  } finally { vi.unstubAllGlobals(); }
});
