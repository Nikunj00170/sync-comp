import { money, useI18n } from '../lib/i18n';
import { useState } from 'react';
import {
  ArrowDownToLine,
  ArrowRight,
  CheckCircle2,
  CreditCard,
  Download,
  FileText,
  IndianRupee,
  LockKeyhole,
  Wallet,
} from 'lucide-react';
import { makeId, productById, type Invoice } from '@sync/domain';
import { useWorkspace } from '../lib/store';
import { useNotify } from '../lib/feedback';
import { type DemoPaymentMethod } from '../lib/demoPayments';
import { Modal } from '../components/Modal';
import { downloadInvoice, downloadStatement } from '../lib/downloads';
export default function Billing() {
  const { t, locale } = useI18n();
  const { data, setData, cloud, demoPayments, payInvoice } = useWorkspace(),
    notify = useNotify();
  const [filter, setFilter] = useState('all'),
    [pay, setPay] = useState<Invoice | null>(null),
    [detail, setDetail] = useState<Invoice | null>(null),
    [method, setMethod] = useState<DemoPaymentMethod>('UPI'),
    [busy, setBusy] = useState(false);
  const displayInvoices = data.invoices.map(invoice => {
    const simulated = demoPayments.find(item => item.invoiceId === invoice.id);
    return simulated ? {...invoice,status:'paid' as const,paymentReference:simulated.reference} : invoice;
  });
  const due = displayInvoices.filter((i) => i.status === 'unpaid').reduce((s, i) => s + i.total, 0);
  const latest = displayInvoices[0];
  const shown = displayInvoices.filter((i) => filter === 'all' || i.status === filter);
  async function pdf(i: Invoice) {
    try {
      setBusy(true);
      await downloadInvoice(i, data.profile);
      notify(t("Your demo invoice PDF is ready."));
    } catch {
      notify(t("The PDF could not be generated. Please try again."));
    } finally {
      setBusy(false);
    }
  }
  const categoryTotals = (latest?.lines || []).reduce<Record<string, number>>((a, l) => {
    const p = productById(l.productId)!;
    const category = l.category || p.category;
    a[category] = (a[category] || 0) + (l.unitPrice ?? p.price) * l.quantity;
    return a;
  }, {});
  const colors = ['#e40000', '#fb9b9f', '#4763d9', '#e5b45a'];
  let offset = 0;
  const gradient = Object.entries(categoryTotals)
    .map(([_, value], i) => {
      const start = offset;
      offset += (value / (latest?.subtotal || 1)) * 100;
      return colors[i % colors.length] + ' ' + start + '% ' + offset + '%';
    })
    .join(',');
  function payDemo() {
    if (!pay) return;
    if (cloud) {payInvoice(pay.id,method);setPay(null);notify(t("Demo payment recorded. No real payment was collected."));return;}
    const reference = makeId('DEMO-PAY');
    setData((d) => ({
      ...d,
      invoices: d.invoices.map((i) =>
        i.id === pay.id ? { ...i, status: 'paid', paymentReference: reference } : i,
      ),
      notifications: [
        {
          id: reference,
          title: 'Demo payment recorded',
          text: 'Your sample invoice ' + pay.id + ' is marked paid. No money was collected.',
          route: '/billing',
          read: false,
          createdAt: new Date().toISOString(),
        },
        ...d.notifications,
      ],
    }));
    setPay(null);
    notify(t("Demo payment recorded. No real payment was collected."));
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">{t("ONE BILL. EVERY CONNECTION.")}</span>
          <h1>{t("Less juggling. More clarity")}<span className="heading-dot">.</span>
          </h1>
          <p>{t("Every service, one consolidated view. Just the way it should be.")}</p>
        </div>
        <button
          className="button secondary"
          onClick={() => {
            downloadStatement(data.invoices)
              .then(() => notify('Your demo billing statement is ready.'))
              .catch(() => notify('The statement could not be exported. Please try again.'));
          }}
        >
          <Download size={17} />{t(" Export statement")}</button>
      </div>
      <div className="billing-overview">
        <section className="billing-hero">
          <span className="eyebrow">{t("YOUR OUTSTANDING DEMO BALANCE")}</span>
          <strong>{money(due)}</strong>
          <span>
            {due
              ? t("Everything you need to take care of, in one place.")
              : t("All caught up. That’s one less thing on your list.")}
          </span>
          <div className="button-row">
            {due > 0 && (
              <button
                className="button white"
                onClick={() => setPay(displayInvoices.find((i) => i.status === 'unpaid')!)}
              >{t("Try demo payment ")}<ArrowRight size={17} />
              </button>
            )}
            <span className="billing-secure">
              <LockKeyhole size={15} />{t(" No real payments")}</span>
          </div>
          <div className="billing-hero-rings" aria-hidden="true" />
        </section>
        <section className="panel spend-panel">
          <div>
            <h2>{t("Where it all goes")}</h2>
            <p>{latest ? latest.period + t(" · Before demo tax") : t("No invoices yet")}</p>
            <div className="spend-legend">
              {Object.entries(categoryTotals).map(([name, value], i) => (
                <span key={name}>
                  <i style={{ background: colors[i] }} />
                  <span>{name}</span>
                  <strong>{money(value, false)}</strong>
                </span>
              ))}
            </div>
          </div>
          <div className="donut" style={{ background: 'conic-gradient(' + gradient + ')' }}>
            <div>
              <small>{t("MONTHLY")}</small>
              <strong>{money(latest?.subtotal || 0, false)}</strong>
            </div>
          </div>
        </section>
      </div>
      <section className="panel invoices-panel">
        <div className="section-heading">
          <div>
            <h2>{t("Your invoice library")}</h2>
            <p>{t("All services together. Every detail accounted for.")}</p>
          </div>
          <span className="badge neutral">{t("DEMO INVOICES")}</span>
        </div>
        <div className="category-tabs">
          {[
            ['all', 'All invoices'],
            ['unpaid', 'Unpaid'],
            ['paid', 'Paid'],
          ].map(([v, l]) => (
            <button key={v} className={filter === v ? 'active' : ''} onClick={() => setFilter(v)}>
              {l}
            </button>
          ))}
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t("Invoice")}</th>
                <th>{t("Period")}</th>
                <th>{t("Amount")}</th>
                <th>{t("Status")}</th>
                <th>{t("Actions")}</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((i) => (
                <tr key={i.id}>
                  <td>
                    <button className="invoice-id" onClick={() => setDetail(i)}>
                      <span className="stat-icon red">
                        <FileText size={19} />
                      </span>
                      <span>
                        <strong>{i.id}</strong>
                        <small>{i.lines.length}{t(" services, one bill")}</small>
                      </span>
                    </button>
                  </td>
                  <td>{i.period}</td>
                  <td>
                    <strong>{money(i.total)}</strong>
                  </td>
                  <td>
                    <span className={'badge ' + (i.status === 'paid' ? 'success' : 'amber')}>
                      {i.status === 'paid' ? t("Paid in demo") : t("Unpaid")}
                    </span>
                  </td>
                  <td>
                    <div className="table-actions">
                      <button
                        className="icon-button"
                        aria-label={t("Download ") + i.id}
                        disabled={busy}
                        onClick={() => pdf(i)}
                      >
                        <ArrowDownToLine size={19} />
                      </button>
                      {i.status === 'unpaid' && (
                        <button className="text-button" onClick={() => setPay(i)}>{t("Demo pay ")}<ArrowRight size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!shown.length && (
            <div className="empty-state compact">
              <CheckCircle2 size={35} />
              <h3>{t("Nothing in this view.")}</h3>
              <p>{t("Your invoice library is up to date.")}</p>
            </div>
          )}
        </div>
      </section>
      <div className="billing-note">
        <ShieldIcon />
        <p>
          <strong>{t("Every charge, with a little context.")}</strong>
          <br />{t("These fictional invoice snapshots include an illustrative 18% demo tax. They are not statutory tax invoices, and no money is collected.")}</p>
      </div>
      {detail && (
        <Modal title={t("A clearer look at your bill")} onClose={() => setDetail(null)} wide>
          <div className="invoice-preview">
            <div className="invoice-preview-heading">
              <div className="brand-text">{t("Accel ")}<span>{t("Telecom")}</span>
              </div>
              <span className="badge neutral">{t("DEMO INVOICE")}</span>
            </div>
            <div className="section-heading">
              <div>
                <h3>{detail.id}</h3>
                <p>{detail.period}</p>
              </div>
              <span>{detail.billedTo?.business || data.profile.business}</span>
            </div>
            {detail.lines.map((l) => {
              const p = productById(l.productId)!;
              return (
                <div className="invoice-line" key={p.id}>
                  <span>
                    {l.name || p.name}
                    <small>
                      {l.quantity} × {money(l.unitPrice ?? p.price)}
                    </small>
                  </span>
                  <strong>{money((l.unitPrice ?? p.price) * l.quantity)}</strong>
                </div>
              );
            })}
            <div className="summary-lines">
              <span>{t("Service charges")}<strong>{money(detail.subtotal)}</strong>
              </span>
              <span>{t("Illustrative demo tax (18%)")}<strong>{money(detail.tax)}</strong>
              </span>
              <span className="summary-total">{t("Total")}<strong>{money(detail.total)}</strong>
              </span>
            </div>
            <p className="footnote">{t("Demonstration only. Not a tax invoice.")}</p>
            <button className="button primary full" disabled={busy} onClick={() => pdf(detail)}>
              <Download size={17} />{t(" Download PDF")}</button>
          </div>
        </Modal>
      )}
      {pay && (
        <Modal title={t("A simpler way to stay on top.")} onClose={() => setPay(null)}>
          <div className="payment-amount">
            <span className="muted">{t("DEMO PAYMENT FOR ")}{pay.id}</span>
            <strong>{money(pay.total)}</strong>
          </div>
          <div className="payment-methods">
            {(['UPI', 'Card', 'Net banking'] as const).map((m) => (
              <button
                className={method === m ? 'selected' : ''}
                aria-pressed={method === m}
                key={m}
                onClick={() => setMethod(m)}
              >
                {m === 'Card' ? (
                  <CreditCard size={21} />
                ) : m === 'UPI' ? (
                  <IndianRupee size={21} />
                ) : (
                  <Wallet size={21} />
                )}
                <strong>{m}</strong>
                {method === m && <CheckCircle2 size={17} />}
              </button>
            ))}
          </div>
          <div className="notice">
            <LockKeyhole size={19} />
            <span>{t("This is a payment simulation. No card, bank, or UPI details are needed. No money will be collected.")}</span>
          </div>
          <p className="muted small">{t('This demo receipt is saved only on this device and does not settle a real bill.')}</p>
          <button className="button primary full" onClick={payDemo}>{t("Simulate successful payment ")}<ArrowRight size={17} />
          </button>
        </Modal>
      )}
    </>
  );
}
function ShieldIcon() {
  return (
    <span className="stat-icon green">
      <LockKeyhole size={22} />
    </span>
  );
}
