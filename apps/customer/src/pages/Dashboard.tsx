import { Link } from 'react-router-dom';
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronRight,
  Cloud,
  Download,
  FileText,
  Headphones,
  Layers3,
  Mail,
  Mic,
  Package,
  ShieldCheck,
  Sparkles,
  Wifi,
  Zap,
} from 'lucide-react';
import { money, orderSteps, productById, statusLabels } from '@sync/domain';
import { useWorkspace } from '../lib/store';
import { useNotify } from '../lib/feedback';
import { NetworkArt } from '../components/NetworkArt';
import { downloadInvoice } from '../lib/downloads';
export default function Dashboard({ onAdvisor }: { onAdvisor: () => void }) {
  const { data } = useWorkspace();
  const notify = useNotify();
  const active = data.orders.filter((x) => x.status === 'active');
  const lines = active.flatMap((x) => x.lines);
  const monthly = active.reduce((s, x) => s + x.quote.monthly, 0);
  const pending = data.orders.filter((x) => !['active', 'cancelled'].includes(x.status));
  const invoice = data.invoices.find((x) => x.status === 'unpaid') || data.invoices[0];
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">YOUR BUSINESS, CONNECTED.</div>
          <h1>
            Good to see you, {data.profile.name.split(' ')[0] || 'there'}
            <span className="heading-dot">.</span>
          </h1>
          <p>A little less managing. A lot more moving forward.</p>
        </div>
        <span className="date-chip">
          {new Date().toLocaleDateString('en-IN', {
            weekday: 'short',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </span>
      </div>
      <section className="welcome-hero">
        <div className="hero-copy">
          <span className="hero-tag">
            <span /> ONE WORKSPACE. EVERY POSSIBILITY.
          </span>
          <h2>
            Big ambitions.
            <br />
            <span>Beautifully connected.</span>
          </h2>
          <p>
            Your connections, your team, your next chapter.
            <br className="desktop-break" /> Bring it all together with a plan that fits.
          </p>
          <div className="hero-actions">
            <Link className="button primary" to="/discover">
              Find my perfect fit <ArrowRight size={17} />
            </Link>
            <Link className="button ghost" to="/plans">
              Explore plans <ArrowUpRight size={17} />
            </Link>
          </div>
          <div className="hero-proof">
            <span>
              <Check size={14} /> Built around your business
            </span>
            <span>
              <Check size={14} /> One view of everything
            </span>
          </div>
        </div>
        <NetworkArt />
      </section>
      <section className="stats-grid" aria-label="Workspace at a glance">
        <div className="stat-card">
          <span className="stat-icon red">
            <Layers3 size={20} />
          </span>
          <div>
            <span>Active services</span>
            <strong>{lines.length.toString().padStart(2, '0')}</strong>
            <small className="positive">
              <span className="status-dot" /> Across your workspace
            </small>
          </div>
          <Link to="/services" aria-label="View active services">
            <ArrowUpRight size={18} />
          </Link>
        </div>
        <div className="stat-card">
          <span className="stat-icon blue">
            <Package size={20} />
          </span>
          <div>
            <span>Orders in progress</span>
            <strong>{pending.length.toString().padStart(2, '0')}</strong>
            <small>We’ll keep you in the loop</small>
          </div>
          <Link to="/orders" aria-label="Track orders">
            <ArrowUpRight size={18} />
          </Link>
        </div>
        <div className="stat-card">
          <span className="stat-icon amber">
            <FileText size={20} />
          </span>
          <div>
            <span>Monthly services</span>
            <strong>{money(monthly, false)}</strong>
            <small>Before illustrative demo tax</small>
          </div>
          <Link to="/billing" aria-label="View billing">
            <ArrowUpRight size={18} />
          </Link>
        </div>
        <div className="stat-card">
          <span className="stat-icon green">
            <ShieldCheck size={20} />
          </span>
          <div>
            <span>Business verification</span>
            <strong className="stat-word">
              {data.kyc.status === 'demo_verified' ? 'Complete' : 'One more step'}
            </strong>
            <small className={data.kyc.status === 'demo_verified' ? 'positive' : 'attention'}>
              {data.kyc.status === 'demo_verified'
                ? 'Demo verification complete'
                : 'Let’s make it official'}
            </small>
          </div>
          <Link to="/verification" aria-label="Complete verification">
            <ArrowUpRight size={18} />
          </Link>
        </div>
      </section>
      <div className="dashboard-columns">
        <div className="dashboard-main">
          <section className="panel services-panel">
            <div className="section-heading">
              <div>
                <h2>
                  Your business essentials <span className="count-badge">{lines.length}</span>
                </h2>
                <p>The services keeping your everyday moving.</p>
              </div>
              <Link className="text-button" to="/services">
                View all <ArrowRight size={16} />
              </Link>
            </div>
            <div className="service-grid">
              {lines.slice(0, 4).map((line, i) => {
                const product = productById(line.productId)!;
                const Icon = [Wifi, Mail, ShieldCheck, Cloud][i % 4];
                return (
                  <Link className="service-tile" to="/services" key={line.productId + i}>
                    <div className="service-top">
                      <span className={'service-icon ' + ['red', 'blue', 'green', 'violet'][i % 4]}>
                        <Icon size={21} />
                      </span>
                      <span className="badge success">
                        <span /> Active
                      </span>
                    </div>
                    <h3>{product.name}</h3>
                    <p>
                      {line.quantity} {product.unit.replace('per ', '')}
                      {line.quantity > 1 ? 's' : ''} ·{' '}
                      {i === 0 ? 'Unlimited possibilities' : 'Ready for your everyday'}
                    </p>
                    <div className="service-price">
                      <strong>
                        {money(product.price * line.quantity, false)}
                        <small>/mo</small>
                      </strong>
                      <ArrowUpRight size={17} />
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
          {pending[0] && (
            <section className="panel order-peek">
              <div className="section-heading">
                <div>
                  <span className="eyebrow">YOUR NEXT CONNECTION</span>
                  <h2>{pending[0].name}</h2>
                  <p>
                    {pending[0].id} · {statusLabels[pending[0].status]}
                  </p>
                </div>
                <Link className="text-button" to={'/orders/' + pending[0].id}>
                  Track order <ArrowRight size={16} />
                </Link>
              </div>
              <div className="mini-progress">
                {[
                  { label: 'Order placed', at: 0 },
                  { label: 'Verified', at: 2 },
                  { label: 'Scheduled', at: 3 },
                  { label: 'Connected', at: 5 },
                ].map((s) => {
                  const current = orderSteps.indexOf(pending[0].status);
                  return (
                    <div className={s.at <= current ? 'done' : ''} key={s.label}>
                      <span>
                        {s.at < current ? (
                          <Check size={13} />
                        ) : s.at === current ? (
                          <span className="inner-dot" />
                        ) : (
                          <span />
                        )}
                      </span>
                      <small>{s.label}</small>
                    </div>
                  );
                })}
              </div>
              <div className="order-foot">
                <span className="stat-icon blue">
                  <Package size={18} />
                </span>
                <p>
                  <strong>Something good is on its way.</strong>
                  <br />
                  {pending[0].status === 'scheduled'
                    ? 'Your sample installation is scheduled. View or change your preferred slot.'
                    : 'Follow each sample milestone as your order moves forward.'}
                </p>
                <ChevronRight size={19} />
              </div>
            </section>
          )}
          <section className="quick-actions">
            <div className="section-heading">
              <h2>A shortcut to your next step</h2>
            </div>
            <div className="quick-grid">
              {[
                {
                  label: 'Discover a better fit',
                  sub: 'Plans that grow with you',
                  to: '/discover',
                  icon: Sparkles,
                },
                {
                  label: 'Complete verification',
                  sub: 'A simpler start',
                  to: '/verification',
                  icon: ShieldCheck,
                },
                {
                  label: 'Get a helping hand',
                  sub: 'We’re here for your business',
                  to: '/support',
                  icon: Headphones,
                },
              ].map((x) => (
                <Link to={x.to} key={x.to}>
                  <x.icon size={22} />
                  <strong>{x.label}</strong>
                  <span>{x.sub}</span>
                  <ArrowUpRight size={17} />
                </Link>
              ))}
            </div>
          </section>
        </div>
        <aside className="dashboard-aside">
          {invoice ? (
            <section className="panel bill-peek">
              <div className="section-heading">
                <h2>One bill. Zero juggling.</h2>
                <span className="round-icon">
                  <FileText size={18} />
                </span>
              </div>
              <p>Every service, neatly in one place.</p>
              <div className="bill-amount">
                <small>{invoice.period.toUpperCase()}</small>
                <strong>{money(invoice.total)}</strong>
                <span className={'badge ' + (invoice.status === 'paid' ? 'success' : 'amber')}>
                  {invoice.status === 'paid'
                    ? 'Paid in demo'
                    : 'Due ' +
                      new Date(invoice.dueAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                      })}
                </span>
              </div>
              <div className="bill-breakdown">
                <span>
                  Service charges <strong>{money(invoice.subtotal)}</strong>
                </span>
                <span>
                  Illustrative tax <strong>{money(invoice.tax)}</strong>
                </span>
              </div>
              <Link className="button primary full" to="/billing">
                View your bill <ArrowRight size={16} />
              </Link>
              <button
                className="text-button full center"
                onClick={() =>
                  downloadInvoice(invoice, data.profile).catch(() =>
                    notify('Could not generate the PDF. Please try again.'),
                  )
                }
              >
                <Download size={15} /> Download demo invoice
              </button>
            </section>
          ) : (
            <section className="panel">
              <h2>No invoices yet</h2>
              <p>Your account invoices will appear here after an order.</p>
              <Link to="/plans" className="button secondary">
                Explore plans
              </Link>
            </section>
          )}
          <section className="insight-card">
            <span className="insight-icon">
              <Zap size={20} />
            </span>
            <span className="eyebrow">A LITTLE INSIGHT</span>
            <h3>
              Your team is growing.
              <br />
              Your plan can too.
            </h3>
            <p>
              Explore the right mix of connectivity, productivity and protection for{' '}
              {data.profile.business}.
            </p>
            <Link to="/discover">
              Explore my possibilities <ArrowRight size={16} />
            </Link>
            <div className="insight-rings" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
          </section>
          <button className="voice-card" onClick={onAdvisor}>
            <span className="voice-icon">
              <Mic size={23} />
            </span>
            <div>
              <span className="coming-tag">VOICE PREVIEW</span>
              <h3>Say hello to a smarter start.</h3>
              <p>Your business. Your words. Your voice advisor.</p>
            </div>
            <ArrowUpRight size={18} />
          </button>
        </aside>
      </div>
    </>
  );
}
