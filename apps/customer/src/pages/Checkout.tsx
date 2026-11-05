import { useState } from 'react';
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
import { makeOrder, money, productById, quote, removeFromCart } from '@sync/domain';
import { useWorkspace } from '../lib/store';
import { useNotify } from '../lib/feedback';
export default function Checkout() {
  const { data, setData } = useWorkspace(),
    notify = useNotify(),
    navigate = useNavigate();
  const [accepted, setAccepted] = useState(false),
    [busy, setBusy] = useState(false);
  const q = quote(data.cart, data.profile);
  function place() {
    if (busy) return;
    try {
      if (!accepted) throw new Error('Please confirm this is a demo order.');
      setBusy(true);
      const order = makeOrder(data.cart, data.profile, data.kyc);
      setData((d) => ({
        ...d,
        cart: [],
        orders: [order, ...d.orders],
        notifications: [
          {
            id: order.id,
            title: 'Your demo order is in',
            text: order.name + ' is ready to track.',
            route: '/orders/' + order.id,
            read: false,
            createdAt: new Date().toISOString(),
          },
          ...d.notifications,
        ],
      }));
      notify('Your demo order is saved. Let’s get you connected.');
      navigate('/orders/' + order.id);
    } catch (e) {
      notify((e as Error).message);
      setBusy(false);
    }
  }
  if (!data.cart.length)
    return (
      <div className="empty-state">
        <ShoppingBag size={48} />
        <span className="eyebrow">A LITTLE POSSIBILITY GOES A LONG WAY.</span>
        <h1>Your bundle is a blank canvas.</h1>
        <p>Let’s find the connections and tools that fit your business.</p>
        <Link to="/plans" className="button primary">
          Explore plans <ArrowRight size={17} />
        </Link>
      </div>
    );
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">GOOD CHOICES. ALL TOGETHER.</span>
          <h1>
            Make it your bundle<span className="heading-dot">.</span>
          </h1>
          <p>One last look before your business takes its next step.</p>
        </div>
        <Link to="/plans" className="text-button">
          <ArrowLeft size={16} /> Keep exploring
        </Link>
      </div>
      <div className="checkout-layout">
        <div>
          <section className="panel">
            <div className="section-heading">
              <h2>
                Your selected services <span className="count-badge">{data.cart.length}</span>
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
                      <span className="eyebrow">{p.category}</span>
                      <h3>{p.name}</h3>
                      <p>
                        {money(p.price)} / month {p.unit}
                      </p>
                    </div>
                    <div className="quantity-control">
                      <button
                        aria-label={'Decrease ' + p.name + ' quantity'}
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
                      <span aria-label={p.name + ' quantity'}>{line.quantity}</span>
                      <button
                        aria-label={'Increase ' + p.name + ' quantity'}
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
                      aria-label={'Remove ' + p.name}
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
                  ? 'You’re verified for the demo.'
                  : 'A quick check before your next step.'}
              </h2>
              <p>
                {data.kyc.status === 'demo_verified'
                  ? 'Your mock verification is complete. No live identity check has taken place.'
                  : 'Complete your business verification to try placing a demo order.'}
              </p>
              {data.kyc.status !== 'demo_verified' && (
                <Link className="text-button" to="/verification">
                  Complete verification <ArrowRight size={16} />
                </Link>
              )}
            </div>
          </section>
          <section className="panel">
            <h2>Your business details</h2>
            <div className="detail-grid">
              <span>
                Business<strong>{data.profile.business}</strong>
              </span>
              <span>
                Contact<strong>{data.profile.name}</strong>
              </span>
            </div>
            <label className="form-field">
              Installation address
              <textarea
                value={data.profile.address}
                onChange={(e) =>
                  setData((d) => ({ ...d, profile: { ...d.profile, address: e.target.value } }))
                }
                placeholder="Add your complete business address"
              />
            </label>
          </section>
        </div>
        <aside className="panel checkout-summary">
          <span className="eyebrow">YOUR NEXT CHAPTER, SUMMED UP.</span>
          <h2>Your bundle summary</h2>
          <div className="summary-lines">
            <span>
              Monthly service charges<strong>{money(q.monthly)}</strong>
            </span>
            <span>
              Illustrative demo tax (18%)<strong>{money(q.tax)}</strong>
            </span>
            <span className="summary-total">
              Monthly total<strong>{money(q.total)}</strong>
            </span>
            <span>
              One-time setup, before demo tax<strong>{money(q.setup)}</strong>
            </span>
          </div>
          <p className="muted small">
            Demo prices from a fictional case catalogue. This is not a live tariff or tax quotation.
          </p>
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
            <span>
              I understand this is a demo order. No payment is collected and no real service is
              purchased.
            </span>
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
            onClick={place}
          >
            {busy ? 'Saving your order…' : 'Place demo order'} <ArrowRight size={17} />
          </button>
          <span className="secure-note">
            <ShieldCheck size={15} /> Your next step, with everything clear.
          </span>
        </aside>
      </div>
    </>
  );
}
