import { money, useI18n } from '../lib/i18n';
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
import { orderSteps, productById, statusLabels } from '@sync/domain';
import { useWorkspace } from '../lib/store';
import { useNotify } from '../lib/feedback';
import { NetworkArt } from '../components/NetworkArt';
import { downloadInvoice } from '../lib/downloads';
export default function Dashboard({ onAdvisor }: { onAdvisor: () => void }) {
  const { t, locale } = useI18n();
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
          <div className="eyebrow">{t("YOUR BUSINESS, CONNECTED.")}</div>
          <h1>{t("Good to see you, ")}{data.profile.name.split(' ')[0] || t("there")}
            <span className="heading-dot">.</span>
          </h1>
          <p>{t("A little less managing. A lot more moving forward.")}</p>
        </div>
        <span className="date-chip">
          {new Date().toLocaleDateString(locale, {
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
            <span />{t(" ONE WORKSPACE. EVERY POSSIBILITY.")}</span>
          <h2>{t("Big ambitions.")}<br />
            <span>{t("Beautifully connected.")}</span>
          </h2>
          <p>{t("Your connections, your team, your next chapter.")}<br className="desktop-break" />{t(" Bring it all together with a plan that fits.")}</p>
          <div className="hero-actions">
            <Link className="button primary" to="/discover">{t("Find my perfect fit ")}<ArrowRight size={17} />
            </Link>
            <Link className="button ghost" to="/plans">{t("Explore plans ")}<ArrowUpRight size={17} />
            </Link>
          </div>
          <div className="hero-proof">
            <span>
              <Check size={14} />{t(" Built around your business")}</span>
            <span>
              <Check size={14} />{t(" One view of everything")}</span>
          </div>
        </div>
        <NetworkArt />
      </section>
      <section className="stats-grid" aria-label={t("Workspace at a glance")}>
        <div className="stat-card">
          <span className="stat-icon red">
            <Layers3 size={20} />
          </span>
          <div>
            <span>{t("Active services")}</span>
            <strong>{lines.length.toString().padStart(2, '0')}</strong>
            <small className="positive">
              <span className="status-dot" />{t(" Across your workspace")}</small>
          </div>
          <Link to="/services" aria-label={t("View active services")}>
            <ArrowUpRight size={18} />
          </Link>
        </div>
        <div className="stat-card">
          <span className="stat-icon blue">
            <Package size={20} />
          </span>
          <div>
            <span>{t("Orders in progress")}</span>
            <strong>{pending.length.toString().padStart(2, '0')}</strong>
            <small>{t("We’ll keep you in the loop")}</small>
          </div>
          <Link to="/orders" aria-label={t("Track orders")}>
            <ArrowUpRight size={18} />
          </Link>
        </div>
        <div className="stat-card">
          <span className="stat-icon amber">
            <FileText size={20} />
          </span>
          <div>
            <span>{t("Monthly services")}</span>
            <strong>{money(monthly, false)}</strong>
            <small>{t("Before illustrative demo tax")}</small>
          </div>
          <Link to="/billing" aria-label={t("View billing")}>
            <ArrowUpRight size={18} />
          </Link>
        </div>
        <div className="stat-card">
          <span className="stat-icon green">
            <ShieldCheck size={20} />
          </span>
          <div>
            <span>{t("Business verification")}</span>
            <strong className="stat-word">
              {data.kyc.status === 'demo_verified' ? t("Complete") : t("One more step")}
            </strong>
            <small className={data.kyc.status === 'demo_verified' ? 'positive' : 'attention'}>
              {data.kyc.status === 'demo_verified'
                ? t("Demo verification complete")
                : t("Let’s make it official")}
            </small>
          </div>
          <Link to="/verification" aria-label={t("Complete verification")}>
            <ArrowUpRight size={18} />
          </Link>
        </div>
      </section>
      <div className="dashboard-columns">
        <div className="dashboard-main">
          <section className="panel services-panel">
            <div className="section-heading">
              <div>
                <h2>{t("Your business essentials ")}<span className="count-badge">{lines.length}</span>
                </h2>
                <p>{t("The services keeping your everyday moving.")}</p>
              </div>
              <Link className="text-button" to="/services">{t("View all ")}<ArrowRight size={16} />
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
                        <span />{t(" Active")}</span>
                    </div>
                    <h3>{product.name}</h3>
                    <p>
                      {line.quantity} {product.unit.replace('per ', '')}
                      {line.quantity > 1 ? t("s") : ''} ·{' '}
                      {i === 0 ? t("Unlimited possibilities") : t("Ready for your everyday")}
                    </p>
                    <div className="service-price">
                      <strong>
                        {money(product.price * line.quantity, false)}
                        <small>{t("/mo")}</small>
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
                  <span className="eyebrow">{t("YOUR NEXT CONNECTION")}</span>
                  <h2>{pending[0].name}</h2>
                  <p>
                    {pending[0].id} · {t(statusLabels[pending[0].status])}
                  </p>
                </div>
                <Link className="text-button" to={'/orders/' + pending[0].id}>{t("Track order ")}<ArrowRight size={16} />
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
                      <small>{t(s.label)}</small>
                    </div>
                  );
                })}
              </div>
              <div className="order-foot">
                <span className="stat-icon blue">
                  <Package size={18} />
                </span>
                <p>
                  <strong>{t("Something good is on its way.")}</strong>
                  <br />
                  {pending[0].status === 'scheduled'
                    ? t("Your sample installation is scheduled. View or change your preferred slot.")
                    : t("Follow each sample milestone as your order moves forward.")}
                </p>
                <ChevronRight size={19} />
              </div>
            </section>
          )}
          <section className="quick-actions">
            <div className="section-heading">
              <h2>{t("A shortcut to your next step")}</h2>
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
                  <strong>{t(x.label)}</strong>
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
                <h2>{t("One bill. Zero juggling.")}</h2>
                <span className="round-icon">
                  <FileText size={18} />
                </span>
              </div>
              <p>{t("Every service, neatly in one place.")}</p>
              <div className="bill-amount">
                <small>{invoice.period.toUpperCase()}</small>
                <strong>{money(invoice.total)}</strong>
                <span className={'badge ' + (invoice.status === 'paid' ? 'success' : 'amber')}>
                  {invoice.status === 'paid'
                    ? t("Paid in demo")
                    : t("Due ") +
                      new Date(invoice.dueAt).toLocaleDateString(locale, {
                        day: 'numeric',
                        month: 'short',
                      })}
                </span>
              </div>
              <div className="bill-breakdown">
                <span>{t("Service charges ")}<strong>{money(invoice.subtotal)}</strong>
                </span>
                <span>{t("Illustrative tax ")}<strong>{money(invoice.tax)}</strong>
                </span>
              </div>
              <Link className="button primary full" to="/billing">{t("View your bill ")}<ArrowRight size={16} />
              </Link>
              <button
                className="text-button full center"
                onClick={() =>
                  downloadInvoice(invoice, data.profile).catch(() =>
                    notify('Could not generate the PDF. Please try again.'),
                  )
                }
              >
                <Download size={15} />{t(" Download demo invoice")}</button>
            </section>
          ) : (
            <section className="panel">
              <h2>{t("No invoices yet")}</h2>
              <p>{t("Your account invoices will appear here after an order.")}</p>
              <Link to="/plans" className="button secondary">{t("Explore plans")}</Link>
            </section>
          )}
          <section className="insight-card">
            <span className="insight-icon">
              <Zap size={20} />
            </span>
            <span className="eyebrow">{t("A LITTLE INSIGHT")}</span>
            <h3>{t("Your team is growing.")}<br />{t("Your plan can too.")}</h3>
            <p>{t("Explore the right mix of connectivity, productivity and protection for")}{' '}
              {data.profile.business}.
            </p>
            <Link to="/discover">{t("Explore my possibilities ")}<ArrowRight size={16} />
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
              <span className="coming-tag">{t("VOICE PREVIEW")}</span>
              <h3>{t("Say hello to a smarter start.")}</h3>
              <p>{t("Your business. Your words. Your voice advisor.")}</p>
            </div>
            <ArrowUpRight size={18} />
          </button>
        </aside>
      </div>
    </>
  );
}
