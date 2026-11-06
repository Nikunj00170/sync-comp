import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  Clock,
  Download,
  MapPin,
  Package,
  Search,
  ShieldCheck,
  Truck,
  X,
} from 'lucide-react';
import {
  cancelOrder,
  localDateTime,
  money,
  nextOrder,
  orderSteps,
  productById,
  statusLabels,
  type OrderStatus,
} from '@sync/domain';
import { useWorkspace } from '../lib/store';
import { useNotify } from '../lib/feedback';
import { Modal } from '../components/Modal';
import { downloadCalendar } from '../lib/downloads';
export default function Orders() {
  const { data, setData, cloud, cancel: cancelRemote } = useWorkspace(),
    notify = useNotify();
  const { id } = useParams();
  const navigate = useNavigate();
  const [filter, setFilter] = useState('all'),
    [search, setSearch] = useState(''),
    [reschedule, setReschedule] = useState(false),
    [slot, setSlot] = useState(''),
    [cancel, setCancel] = useState(false);
  const order = data.orders.find((x) => x.id === id);
  if (id && !order)
    return (
      <div className="empty-state">
        <Package size={42} />
        <h1>We couldn’t find that order.</h1>
        <Link className="button primary" to="/orders">
          View your orders
        </Link>
      </div>
    );
  if (order) {
    const current = orderSteps.indexOf(order.status);
    return (
      <>
        <Link to="/orders" className="back-link">
          <ArrowLeft size={15} /> All orders
        </Link>
        <div className="page-heading">
          <div>
            <span className="eyebrow">{order.id}</span>
            <h1>
              {order.name}
              <span className="heading-dot">.</span>
            </h1>
            <p>Every little step, all in one place.</p>
          </div>
          <span
            className={
              'badge ' +
              (order.status === 'active'
                ? 'success'
                : order.status === 'cancelled'
                  ? 'neutral'
                  : 'amber')
            }
          >
            {statusLabels[order.status]}
          </span>
        </div>
        <div className="order-detail-layout">
          <div>
            <section className="panel">
              <div className="section-heading">
                <h2>Your connection journey</h2>
                <span className="muted small">Sample milestones</span>
              </div>
              <div className="order-timeline">
                {orderSteps.map((s, i) => (
                  <div
                    key={s}
                    className={
                      'timeline-step ' +
                      (i <= current ? 'completed' : '') +
                      (i === current ? ' current' : '')
                    }
                  >
                    <span className="timeline-marker">
                      {i < current ? <Check size={15} /> : i === current ? <span /> : i + 1}
                    </span>
                    <div>
                      <h3>{statusLabels[s]}</h3>
                      <p>
                        {
                          [
                            'Your demo order has been received.',
                            'Business details and documents reviewed in the demo.',
                            'Your services are ready for the next step.',
                            'A sample installation slot is on your calendar.',
                            'Your sample connection is being set up.',
                            'Your demo services are ready to go.',
                          ][i]
                        }
                      </p>
                      {i === current && order.status !== 'active' && (
                        <span className="badge amber">You’re here</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {order.status === 'cancelled' && (
                <div className="notice warning">This demo order was cancelled.</div>
              )}
            </section>
            <section className="panel">
              <h2>Everything in your order</h2>
              <div className="order-products">
                {order.lines.map((l) => (
                  <div key={l.productId}>
                    <span className="stat-icon red">
                      <Package size={19} />
                    </span>
                    <span>
                      <strong>{productById(l.productId)?.name}</strong>
                      <small>
                        {l.quantity} {productById(l.productId)?.unit.replace('per ', '')}
                        {l.quantity > 1 ? 's' : ''}
                      </small>
                    </span>
                    <strong>
                      {money((productById(l.productId)?.price || 0) * l.quantity)}
                      <small>/mo</small>
                    </strong>
                  </div>
                ))}
              </div>
              <div className="summary-lines">
                <span>
                  Monthly total, including demo tax<strong>{money(order.quote.total)}</strong>
                </span>
              </div>
            </section>
            <section className="panel">
              <h2>A little history</h2>
              <div className="activity-list">
                {[...order.events].reverse().map((e, i) => (
                  <div key={e.at + i}>
                    <span className="activity-dot" />
                    <span>
                      <strong>{e.label}</strong>
                      <p>{e.detail}</p>
                      <small>
                        {new Date(e.at).toLocaleString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </small>
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </div>
          <aside>
            <section className="panel appointment-card">
              <span className="stat-icon blue">
                <CalendarDays size={25} />
              </span>
              <h2>A time that works for you.</h2>
              <p>
                {order.slot
                  ? new Date(order.slot).toLocaleString('en-IN', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      hour: 'numeric',
                      minute: '2-digit',
                    })
                  : 'Choose a preferred sample installation slot.'}
              </p>
              <div className="address-line">
                <MapPin size={18} />
                <span>{order.address}</span>
              </div>
              {!cloud && !['active', 'cancelled'].includes(order.status) && (
                <button
                  className="button secondary full"
                  onClick={() => {
                    setSlot(localDateTime(order.slot));
                    setReschedule(true);
                  }}
                >
                  Change demo slot
                </button>
              )}
              {order.slot && (
                <button
                  className="text-button full center"
                  onClick={() =>
                    downloadCalendar(order.id, order.slot)
                      .then(() => notify('Your sample calendar file is ready.'))
                      .catch((e) => notify(e.message))
                  }
                >
                  <Download size={15} /> Add to calendar
                </button>
              )}
              <small className="muted">
                This is a demo appointment, not a real installation booking.
              </small>
            </section>
            <section className="panel">
              <h3>Need a helping hand?</h3>
              <p className="muted">Tell us what you need. Keep the order reference handy.</p>
              <Link to="/support" className="button secondary full">
                Get support <ArrowRight size={16} />
              </Link>
            </section>
            <section className="demo-control">
              <span className="eyebrow">DEMO CONTROLS</span>
              <p>Explore how the timeline changes. No real order is affected.</p>
              <button
                hidden={cloud}
                className="button secondary full"
                disabled={['active', 'cancelled'].includes(order.status)}
                onClick={() => {
                  try {
                    const updated = nextOrder(order);
                    setData((d) => ({
                      ...d,
                      orders: d.orders.map((x) => (x.id === id ? updated : x)),
                    }));
                    notify('Sample milestone updated.');
                  } catch (e) {
                    notify((e as Error).message);
                  }
                }}
              >
                Simulate next milestone
              </button>
              {!['active', 'cancelled', 'installing'].includes(order.status) && (
                <button className="text-button danger full center" onClick={() => setCancel(true)}>
                  Cancel demo order
                </button>
              )}
            </section>
          </aside>
        </div>
        {reschedule && (
          <Modal title="Make a little room in your calendar." onClose={() => setReschedule(false)}>
            <p className="muted">
              Choose a preferred demo installation time. This does not book a real technician.
            </p>
            <label className="form-field">
              Installation date and time
              <input
                type="datetime-local"
                value={slot}
                min={localDateTime()}
                onChange={(e) => setSlot(e.target.value)}
              />
            </label>
            <button
              className="button primary full"
              disabled={!slot || new Date(slot).getTime() < Date.now()}
              onClick={() => {
                setData((d) => ({
                  ...d,
                  orders: d.orders.map((x) =>
                    x.id === id
                      ? {
                          ...x,
                          slot: new Date(slot).toISOString(),
                          events: [
                            ...x.events,
                            {
                              label: 'Demo slot changed',
                              detail: 'Your preferred sample installation time was updated.',
                              at: new Date().toISOString(),
                            },
                          ],
                        }
                      : x,
                  ),
                }));
                setReschedule(false);
                notify('Your preferred demo slot is saved.');
              }}
            >
              Save demo slot
            </button>
          </Modal>
        )}
        {cancel && (
          <Modal title="Cancel this demo order?" onClose={() => setCancel(false)}>
            <p>
              This removes the order from your upcoming demo connections. Existing active services
              stay as they are.
            </p>
            <div className="button-row">
              <button className="button secondary" onClick={() => setCancel(false)}>
                Keep my order
              </button>
              <button
                className="button primary"
                onClick={async () => {
                  try {
                    await cancelRemote(order.id);
                    setCancel(false);
                    notify('Demo order cancelled.');
                  } catch (e) {
                    notify((e as Error).message);
                  }
                }}
              >
                Cancel demo order
              </button>
            </div>
          </Modal>
        )}
      </>
    );
  }
  const shown = data.orders.filter(
    (o) =>
      (filter === 'all' ||
        (filter === 'active'
          ? o.status === 'active'
          : filter === 'progress'
            ? !['active', 'cancelled'].includes(o.status)
            : o.status === 'cancelled')) &&
      (o.id + ' ' + o.name).toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">EVERY STEP, IN SYNC.</span>
          <h1>
            Good things are on their way<span className="heading-dot">.</span>
          </h1>
          <p>Your orders, your milestones, and what happens next.</p>
        </div>
        <Link className="button primary" to="/plans">
          Explore more plans <ArrowRight size={17} />
        </Link>
      </div>
      <div className="filter-bar">
        <div className="category-tabs">
          {[
            ['all', 'All orders'],
            ['progress', 'In progress'],
            ['active', 'Active'],
            ['cancelled', 'Cancelled'],
          ].map(([v, l]) => (
            <button key={v} className={filter === v ? 'active' : ''} onClick={() => setFilter(v)}>
              {l}
            </button>
          ))}
        </div>
        <div className="search-field">
          <Search size={17} />
          <input
            aria-label="Search orders"
            placeholder="Search order or reference…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>
      <div className="orders-grid">
        {shown.map((o) => (
          <Link className="panel order-card" key={o.id} to={'/orders/' + o.id}>
            <div className="section-inline">
              <span className="stat-icon blue">
                <Package size={25} />
              </span>
              <span
                className={
                  'badge ' +
                  (o.status === 'active'
                    ? 'success'
                    : o.status === 'cancelled'
                      ? 'neutral'
                      : 'amber')
                }
              >
                {statusLabels[o.status]}
              </span>
            </div>
            <span className="order-reference">{o.id}</span>
            <h2>{o.name}</h2>
            <p>
              {o.lines.length} services · {money(o.quote.total)} / month with demo tax
            </p>
            <div className="order-card-progress">
              <span
                style={{
                  width:
                    (o.status === 'cancelled'
                      ? 0
                      : ((orderSteps.indexOf(o.status) + 1) / 6) * 100) + '%',
                }}
              />
            </div>
            <div className="section-inline">
              <span className="muted small">
                Placed{' '}
                {new Date(o.createdAt).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                })}
              </span>
              <span className="text-button">
                View journey <ArrowRight size={16} />
              </span>
            </div>
          </Link>
        ))}
      </div>
      {!shown.length && (
        <div className="empty-state">
          <Package size={42} />
          <h2>A little quiet here.</h2>
          <p>No orders match this view.</p>
          <button
            className="button secondary"
            onClick={() => {
              setFilter('all');
              setSearch('');
            }}
          >
            View all orders
          </button>
        </div>
      )}
    </>
  );
}
