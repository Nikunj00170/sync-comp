import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ArrowUpRight,
  Cloud,
  Headphones,
  Mail,
  Settings2,
  ShieldCheck,
  Wifi,
} from 'lucide-react';
import { money, productById, quote, type Order } from '@sync/domain';
import { useWorkspace } from '../lib/store';
import { useNotify } from '../lib/feedback';
import { Modal } from '../components/Modal';
export default function Services() {
  const { data, setData } = useWorkspace(),
    notify = useNotify();
  const [manage, setManage] = useState<{ order: Order; productId: string } | null>(null),
    [quantity, setQuantity] = useState(1);
  const services = data.orders
    .filter((o) => o.status === 'active')
    .flatMap((order) =>
      order.lines.map((line) => ({ order, line, p: productById(line.productId)! })),
    );
  const monthly = data.orders
    .filter((o) => o.status === 'active')
    .reduce((a, o) => a + o.quote.monthly, 0);
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">YOUR EVERYDAY, CONNECTED.</span>
          <h1>
            Everything working together<span className="heading-dot">.</span>
          </h1>
          <p>A single home for the services that power your business.</p>
        </div>
        <Link className="button primary" to="/plans">
          Add a little more <ArrowRight size={17} />
        </Link>
      </div>
      <div className="services-summary">
        <div>
          <span className="stat-icon red">
            <Wifi size={26} />
          </span>
          <span>
            <strong>{services.length} active demo services</strong>
            <small>
              {data.profile.business} · {data.profile.city}
            </small>
          </span>
        </div>
        <span>
          <small>MONTHLY SERVICES, BEFORE DEMO TAX</small>
          <strong>{money(monthly)}</strong>
        </span>
      </div>
      <div className="managed-services">
        {services.map(({ order, line, p }, i) => {
          const Icon = [Wifi, Mail, ShieldCheck, Cloud][i % 4];
          return (
            <section className="panel managed-service" key={order.id + p.id}>
              <div className="section-inline">
                <span className={'service-icon ' + ['red', 'blue', 'green', 'violet'][i % 4]}>
                  <Icon size={25} />
                </span>
                <span className="badge success">
                  <span /> Active in demo
                </span>
              </div>
              <span className="eyebrow">{p.category}</span>
              <h2>{p.name}</h2>
              <p>{p.description}</p>
              <div className="detail-grid">
                <span>
                  Subscription
                  <strong>
                    {line.quantity} {p.unit.replace('per ', '')}
                    {line.quantity > 1 ? 's' : ''}
                  </strong>
                </span>
                <span>
                  Monthly charges<strong>{money(p.price * line.quantity)}</strong>
                </span>
                <span>
                  Location<strong>{data.profile.city}</strong>
                </span>
                <span>
                  Reference<strong>{order.id}</strong>
                </span>
              </div>
              <div className="managed-service-actions">
                <button
                  className="button secondary"
                  onClick={() => {
                    setManage({ order, productId: p.id });
                    setQuantity(line.quantity);
                  }}
                >
                  <Settings2 size={16} /> Manage service
                </button>
                <Link className="text-button" to="/support">
                  Get help <ArrowUpRight size={16} />
                </Link>
              </div>
            </section>
          );
        })}
      </div>
      {!services.length && (
        <div className="empty-state">
          <Wifi size={42} />
          <h2>Your next connection starts here.</h2>
          <Link className="button primary" to="/plans">
            Find a plan
          </Link>
        </div>
      )}
      <div className="notice">
        <Headphones size={19} />
        <span>
          Need to change more than a quantity? <Link to="/support">Create a support request</Link>{' '}
          and keep everything in one place.
        </span>
      </div>
      {manage && (
        <Modal
          title={'Make ' + productById(manage.productId)?.name + ' work for you'}
          onClose={() => setManage(null)}
        >
          <p className="muted">
            Adjust the subscription quantity in this demo. Existing invoice snapshots stay
            unchanged.
          </p>
          <label className="form-field">
            Subscription quantity
            <input
              type="number"
              min={1}
              max={1000}
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
            />
          </label>
          <div className="summary-lines">
            <span>
              Next-period service charge
              <strong>
                {money((productById(manage.productId)?.price || 0) * Math.max(0, quantity))}/mo
              </strong>
            </span>
          </div>
          <button
            className="button primary full"
            disabled={!Number.isInteger(quantity) || quantity < 1 || quantity > 1000}
            onClick={() => {
              const lines = manage.order.lines.map((l) =>
                l.productId === manage.productId ? { ...l, quantity } : l,
              );
              const q = quote(lines, data.profile);
              if (q.errors.length) {
                notify(q.errors[0]);
                return;
              }
              setData((d) => ({
                ...d,
                orders: d.orders.map((o) =>
                  o.id === manage.order.id
                    ? {
                        ...o,
                        lines,
                        quote: q,
                        events: [
                          ...o.events,
                          {
                            label: 'Demo subscription updated',
                            detail: 'Quantity changed for the next demonstration billing period.',
                            at: new Date().toISOString(),
                          },
                        ],
                      }
                    : o,
                ),
              }));
              setManage(null);
              notify('Demo subscription updated. Existing invoices are unchanged.');
            }}
          >
            Save demo subscription <ArrowRight size={17} />
          </button>
        </Modal>
      )}
    </>
  );
}
