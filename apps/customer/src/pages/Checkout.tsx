import { money, useI18n } from '../lib/i18n';
import { useRef, useState } from 'react';
import { Modal } from '../components/Modal';
import {demoPaymentMethods, type DemoPaymentMethod} from '../lib/demoPayments';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Minus,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Trash2,
} from 'lucide-react';
import { makeOrder, productById, quote, removeFromCart } from '@sync/domain';
import { useQuote } from '../lib/useQuote';
import { useWorkspace } from '../lib/store';
import { useNotify } from '../lib/feedback';
export default function Checkout() {
  const { t, locale } = useI18n();
  const { data, setData, cloud, placeOrder } = useWorkspace(),
    notify = useNotify(),
    navigate = useNavigate();
  const [accepted, setAccepted] = useState(false),
    [busy, setBusy] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [method, setMethod] = useState<DemoPaymentMethod>('UPI');
  const [paymentError, setPaymentError] = useState('');
  const placing = useRef(false);
  const { quote: q, error: quoteError, retry } = useQuote();
  async function place() {
    if (placing.current) return;
    try {
      if (!accepted) throw new Error('Please confirm this is a demo order.');
      placing.current = true;
      setBusy(true);
      setPaymentError('');
      const order = await placeOrder(method);
      notify(t("Your demo order is saved. Let’s get you connected."));
      navigate('/orders/' + order.id);
    } catch (e) {
      const message = (e as Error).message;
      notify(message);
      setPaymentError(message);
    } finally {
      placing.current = false;
      setBusy(false);
    }
  }
  if (!q)
    return (
      <section className="panel" role={quoteError ? 'alert' : 'status'}>
        <h1>{t("Your bundle quotation")}</h1>
        <p>{t(quoteError) || t("Calculating your quotation with the customer API…")}</p>
        {quoteError && (
          <button className="button secondary" onClick={retry}>{t("Try again")}</button>
        )}
      </section>
    );
  if (!data.cart.length)
    return (
      <div className="empty-state">
        <ShoppingBag size={48} />
        <span className="eyebrow">{t("A LITTLE POSSIBILITY GOES A LONG WAY.")}</span>
        <h1>{t("Your bundle is a blank canvas.")}</h1>
        <p>{t("Let’s find the connections and tools that fit your business.")}</p>
        <Link to="/plans" className="button primary">{t("Explore plans ")}<ArrowRight size={17} />
        </Link>
      </div>
    );
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">{t("GOOD CHOICES. ALL TOGETHER.")}</span>
          <h1>{t("Make it your bundle")}<span className="heading-dot">.</span>
          </h1>
          <p>{t("One last look before your business takes its next step.")}</p>
        </div>
        <Link to="/plans" className="text-button">
          <ArrowLeft size={16} />{t(" Keep exploring")}</Link>
      </div>
      <div className="checkout-layout">
        <div>
          <section className="panel">
            <div className="section-heading">
              <h2>{t("Your selected services ")}<span className="count-badge">{data.cart.length}</span>
              </h2>
            </div>
            <div className="cart-lines">
              {data.cart.map((line) => {
                const p = productById(line.productId)!;
                return (
                  <div className="cart-line" key={p.id}>
                    <span className="stat-icon red">
                      <ShoppingBag size={21} />
                    </span>
                    <div className="cart-line-copy">
                      <span className="eyebrow">{t(p.category)}</span>
                      <h3>{p.name}</h3>
                      <p>
                        {money(p.price)}{t(" / month ")}{p.unit}
                      </p>
                    </div>
                    <div className="quantity-control">
                      <button
                        aria-label={t("Decrease ") + p.name + t(" quantity")}
                        disabled={line.quantity <= 1}
                        onClick={() =>
                          setData((d) => ({
                            ...d,
                            cart: d.cart.map((l) =>
                              l.productId === p.id ? { ...l, quantity: l.quantity - 1 } : l,
                            ),
                          }))
                        }
                      >
                        <Minus size={14} />
                      </button>
                      <span aria-label={p.name + t(" quantity")}>{line.quantity}</span>
                      <button
                        aria-label={t("Increase ") + p.name + t(" quantity")}
                        disabled={line.quantity >= 1000}
                        onClick={() =>
                          setData((d) => ({
                            ...d,
                            cart: d.cart.map((l) =>
                              l.productId === p.id ? { ...l, quantity: l.quantity + 1 } : l,
                            ),
                          }))
                        }
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                    <strong>{money(p.price * line.quantity)}</strong>
                    <button
                      className="icon-button"
                      aria-label={t("Remove ") + p.name}
                      onClick={() => {
                        setData((d) => ({ ...d, cart: removeFromCart(d.cart, p.id) }));
                        notify('Service removed. Any dependent add-ons were removed too.');
                      }}
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
          <section className="panel delivery-card">
            <span className="stat-icon blue">
              <ShieldCheck size={22} />
            </span>
            <div>
              <h2>
                {data.kyc.status === 'demo_verified'
                  ? t("You’re verified for the demo.")
                  : t("A quick check before your next step.")}
              </h2>
              <p>
                {data.kyc.status === 'demo_verified'
                  ? t("Your mock verification is complete. No live identity check has taken place.")
                  : t("Complete your business verification to try placing a demo order.")}
              </p>
              {data.kyc.status !== 'demo_verified' && (
                <Link className="text-button" to="/verification">{t("Complete verification ")}<ArrowRight size={16} />
                </Link>
              )}
            </div>
          </section>
          <section className="panel">
            <h2>{t("Your business details")}</h2>
            <div className="detail-grid">
              <span>{t("Business")}<strong>{data.profile.business}</strong>
              </span>
              <span>{t("Contact")}<strong>{data.profile.name}</strong>
              </span>
            </div>
            <label className="form-field">{t("Installation address")}<textarea
                readOnly={cloud}
                value={data.profile.address}
                onChange={(e) =>
                  setData((d) => ({ ...d, profile: { ...d.profile, address: e.target.value } }))
                }
                placeholder={t("Add your complete business address")}
              />
            </label>
            {cloud && (
              <Link className="text-button" to="/account">{t("Update your address in Account & settings")}</Link>
            )}
          </section>
        </div>
        <aside className="panel checkout-summary">
          <span className="eyebrow">{t("YOUR NEXT CHAPTER, SUMMED UP.")}</span>
          <h2>{t("Your bundle summary")}</h2>
          <div className="summary-lines">
            <span>{t("Monthly service charges")}<strong>{money(q.monthly)}</strong>
            </span>
            <span>{t("Illustrative demo tax (18%)")}<strong>{money(q.tax)}</strong>
            </span>
            <span className="summary-total">{t("Monthly total")}<strong>{money(q.total)}</strong>
            </span>
            <span>{t("One-time setup, before demo tax")}<strong>{money(q.setup)}</strong>
            </span>
          </div>
          <p className="muted small">{t("Demo prices from a fictional case catalogue. This is not a live tariff or tax quotation.")}</p>
          {q.errors.map((x) => (
            <p key={x} className="field-error">
              {x}
            </p>
          ))}
          <label className="check-label checkout-consent">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
            />
            <span>{t("I understand this is a demo order. No payment is collected and no real service is purchased.")}</span>
          </label>
          <button
            className="button primary full"
            disabled={
              !accepted ||
              data.kyc.status !== 'demo_verified' ||
              Boolean(q.errors.length) ||
              !data.profile.address.trim() ||
              busy
            }
            onClick={() => {setPaymentError('');setPaymentOpen(true);}}
          >
            {busy ? t("Saving your order…") : t("Pay now (demo)")} <ArrowRight size={17} />
          </button>
          <span className="secure-note">
            <ShieldCheck size={15} />{t(" Your next step, with everything clear.")}</span>
        </aside>
      </div>
      {paymentOpen && <Modal title={t('Demo payment')} onClose={() => {if (!busy) setPaymentOpen(false);}}>
        <p className="notice">{t('This is a payment simulation. No card, bank, or UPI details are needed. No money will be collected.')}</p>
        <p className="muted small">{t('This demo receipt is saved only on this device and does not settle a real bill.')}</p>
        <div className="payment-amount"><span>{data.profile.business}</span><strong>{money(q.total + q.setup)}</strong></div>
        <div className="summary-lines"><span>{t('Monthly total')}<strong>{money(q.total)}</strong></span><span>{t('One-time setup, before demo tax')}<strong>{money(q.setup)}</strong></span></div>
        <div className="payment-methods">{demoPaymentMethods.map(item => <button key={item} disabled={busy} aria-pressed={method === item} className={method === item ? 'selected' : ''} onClick={() => setMethod(item)}>{t(item)}</button>)}</div>
        {paymentError && <p className="field-error" role="alert">{t(paymentError)}</p>}
        <div className="button-row"><button className="button primary" disabled={busy} onClick={() => void place()}>{t(busy ? 'Saving your order…' : 'Simulate successful payment')}</button>
        <button className="button secondary" disabled={busy} onClick={() => setPaymentError('Demo payment declined. Your cart is saved; choose another method or try again.')}>{t('Simulate declined payment')}</button></div>
      </Modal>}
    </>
  );
}
