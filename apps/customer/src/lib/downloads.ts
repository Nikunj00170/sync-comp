import { Capacitor } from '@capacitor/core';
import { productById, type Invoice, type Profile } from '@sync/domain';
/** Web downloads use a Blob. Android uses its own share sheet and app cache. */
export async function download(blob: Blob, name: string) {
  if (Capacitor.isNativePlatform()) {
    const [{ Filesystem, Directory }, { Share }] = await Promise.all([
      import('@capacitor/filesystem'),
      import('@capacitor/share'),
    ]);
    const data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Unable to read export'));
      reader.onload = () => resolve(String(reader.result).split(',')[1]);
      reader.readAsDataURL(blob);
    });
    const file = await Filesystem.writeFile({
      path: 'exports/' + name,
      data,
      directory: Directory.Cache,
      recursive: true,
    });
    await Share.share({
      title: name,
      files: [file.uri],
      dialogTitle: 'Save or share your Accel Telecom file',
    });
    return;
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
export async function invoicePdf(invoice: Invoice, profile: Profile, suppliedFont?: Uint8Array) {
  await import('regenerator-runtime/runtime.js');
  const { PDFDocument, rgb } = await import('pdf-lib');
  const fontkit = (await import('@pdf-lib/fontkit')).default;
  const fontUrl = new URL('../assets/fonts/NotoSansDevanagari.ttf', import.meta.url).href;
  const fontBytes = suppliedFont || await (async () => {
    const response = await fetch(fontUrl);
    if (!response.ok) throw new Error('The invoice font could not be loaded. Please try again.');
    return response.arrayBuffer();
  })();
  const pdf = await PDFDocument.create();
  let page = pdf.addPage([595, 842]);
  pdf.registerFontkit(fontkit);
  const font = await pdf.embedFont(fontBytes, { subset: true });
  const bold = font;
  // Preserve Hindi/Marathi names and addresses. Strip only control characters.
  const clean = (s: string) => s.normalize('NFC').replace(/[\u0000-\u001f\u007f]/g, ' ');
  const text = (
    s: string,
    x: number,
    y: number,
    size = 11,
    strong = false,
    color = rgb(0.2, 0.22, 0.26),
  ) => page.drawText(clean(s), { x, y, size, font: strong ? bold : font, color });
  const wrap = (s: string, max: number) => {
    const words = clean(s).split(/\s+/);
    const lines: string[] = [];
    let line = '';
    for (const w of words) {
      if ((line + ' ' + w).trim().length > max && line) {
        lines.push(line);
        line = w;
      } else line = (line + ' ' + w).trim();
    }
    if (line) lines.push(line);
    return lines;
  };
  const header = () => {
    page.drawRectangle({ x: 0, y: 0, width: 595, height: 842, color: rgb(1, 1, 1) });
    page.drawRectangle({ x: 0, y: 740, width: 595, height: 102, color: rgb(0.89, 0, 0) });
    text('Accel Telecom', 40, 791, 28, true, rgb(1, 1, 1));
    text('CONSOLIDATED DEMO INVOICE', 40, 765, 10, false, rgb(1, 1, 1));
    text(invoice.id, 40, 704, 16, true);
    text(invoice.period, 40, 683, 11);
    text(invoice.status.toUpperCase(), 450, 704, 11, true);
  };
  const footer = () => {
    text('DEMONSTRATION ONLY. NOT A TAX INVOICE.', 40, 72, 10, true, rgb(0.8, 0, 0));
    text('Fictional case catalogue. No real service or payment.', 40, 54, 9);
  };
  header();
  const billedTo = invoice.billedTo || profile;
  text(billedTo.business.slice(0, 65), 40, 640, 14, true);
  wrap(billedTo.name + ' | ' + billedTo.email, 85)
    .slice(0, 2)
    .forEach((s, i) => text(s, 40, 618 - i * 14, 10));
  wrap(billedTo.address, 90)
    .slice(0, 3)
    .forEach((s, i) => text(s, 40, 585 - i * 14, 10));
  let y = 510;
  const tableHeader = () => {
    text('Service', 40, y, 11, true);
    text('Qty', 340, y, 11, true);
    text('Amount (INR)', 430, y, 11, true);
    y -= 29;
  };
  const nextPage = () => {
    footer();
    page = pdf.addPage([595, 842]);
    header();
    y = 640;
    tableHeader();
  };
  tableHeader();
  for (const line of invoice.lines) {
    const p = productById(line.productId);
    const name = line.name || p?.name || line.productId;
    const unitPrice = line.unitPrice ?? p?.price ?? 0;
    const rows = wrap(name, 47);
    if (y - rows.length * 14 < 190) nextPage();
    rows.forEach((row, i) => text(row, 40, y - i * 14, 10));
    text(String(line.quantity), 345, y, 10);
    text(((unitPrice * line.quantity) / 100).toFixed(2), 442, y, 10);
    y -= Math.max(30, rows.length * 14 + 12);
  }
  if (y < 270) nextPage();
  page.drawLine({
    start: { x: 40, y: y + 12 },
    end: { x: 555, y: y + 12 },
    color: rgb(0.85, 0.86, 0.88),
  });
  text('Subtotal', 345, y - 15);
  text((invoice.subtotal / 100).toFixed(2), 442, y - 15);
  text('Illustrative tax (18%)', 310, y - 40);
  text((invoice.tax / 100).toFixed(2), 442, y - 40);
  text('Total INR', 345, y - 78, 13, true);
  text((invoice.total / 100).toFixed(2), 442, y - 78, 13, true);
  text('Due: ' + new Date(invoice.dueAt).toLocaleDateString('en-IN'), 40, y - 40, 10);
  if (invoice.paymentReference) text('Demo payment: ' + invoice.paymentReference, 40, 110, 10);
  footer();
  return pdf.save();
}

export async function downloadInvoice(invoice: Invoice, profile: Profile) {
  const bytes = await invoicePdf(invoice, profile);
  await download(
    new Blob([new Uint8Array(bytes).buffer], { type: 'application/pdf' }),
    invoice.id + '.pdf',
  );
}
export async function downloadStatement(invoices: Invoice[]) {
  const escape = (value: string) => '"' + value.replaceAll('"', '""') + '"';
  const lines = [
    ['Invoice', 'Period', 'Status', 'Subtotal INR', 'Demo tax INR', 'Total INR'],
    ...invoices.map((i) => [
      i.id,
      i.period,
      i.status,
      (i.subtotal / 100).toFixed(2),
      (i.tax / 100).toFixed(2),
      (i.total / 100).toFixed(2),
    ]),
  ];
  await download(
    new Blob([lines.map((l) => l.map(escape).join('\r\n')).join('\r\n')], {
      type: 'text/csv;charset=utf-8',
    }),
    'accel-telecom-statement.csv',
  );
}
export async function downloadCalendar(id: string, slot: string) {
  const start = new Date(slot);
  if (Number.isNaN(start.getTime())) throw new Error('Choose an installation slot first');
  const stamp = (d: Date) =>
    d
      .toISOString()
      .replace(/[-:]/g, '')
      .replace(/\.\d{3}Z/, 'Z');
  const body = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Accel Telecom//Demo//EN',
    'BEGIN:VEVENT',
    'UID:' + id + '@demo.airtelsync',
    'DTSTAMP:' + stamp(new Date()),
    'DTSTART:' + stamp(start),
    'DTEND:' + stamp(new Date(start.getTime() + 2 * 3600000)),
    'SUMMARY:Demo installation - ' + id,
    'DESCRIPTION:Sample Accel Telecom installation. This is not a real booking.',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
  await download(new Blob([body], { type: 'text/calendar' }), id + '-installation.ics');
}
