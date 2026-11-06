import { languages, validLanguage, useI18n } from './lib/i18n';
import { Capacitor } from '@capacitor/core';
import { lazy, Suspense, useEffect, useState } from 'react';
import { Link, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Bell,
  BookOpen,
  ChevronDown,
  Command,
  CreditCard,
  Headphones,
  LayoutDashboard,
  Menu,
  Package,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Wifi,
  X,
  CheckCheck,
  Mic,
  ArrowUpRight,
} from 'lucide-react';
import { catalogue } from '@sync/domain';
import { useWorkspace } from './lib/store';
import { useNotify } from './lib/feedback';
import { VoiceAdvisor } from './components/VoiceAdvisor';
import { Brand } from './components/Brand';
import { Modal } from './components/Modal';
import Dashboard from './pages/Dashboard';
const Plans = lazy(() => import('./pages/Plans'));
const Discover = lazy(() => import('./pages/Discover'));
const Checkout = lazy(() => import('./pages/Checkout'));
const Orders = lazy(() => import('./pages/Orders'));
const Services = lazy(() => import('./pages/Services'));
const Verification = lazy(() => import('./pages/Verification'));
const Billing = lazy(() => import('./pages/Billing'));
const Support = lazy(() => import('./pages/Support'));
const Account = lazy(() => import('./pages/Account'));
import { finishSignIn, signIn } from './lib/auth';
import { useAction } from './lib/actions';
const navigation = [
  { to: '/', label: 'Overview', icon: LayoutDashboard },
  { to: '/discover', label: 'Find my fit', icon: Sparkles },
  { to: '/plans', label: 'Explore plans', icon: BookOpen },
  { to: '/services', label: 'My services', icon: Wifi },
  { to: '/orders', label: 'My orders', icon: Package },
  { to: '/verification', label: 'Verification', icon: ShieldCheck },
  { to: '/billing', label: 'Billing & payments', icon: CreditCard },
  { to: '/support', label: 'Help & support', icon: Headphones },
];
export default function App() {
  const { t, locale, language, setLanguage } = useI18n();
  const { data, storageError, cloud, connection, connectionError, refresh, markRead } =
    useWorkspace();
  const { run, busy } = useAction();
  const notify = useNotify();
  const location = useLocation();
  const navigate = useNavigate();
  const [menu, setMenu] = useState(false),
    [search, setSearch] = useState(false),
    [term, setTerm] = useState(''),
    [bell, setBell] = useState(false),
    [advisor, setAdvisor] = useState(false);
  useEffect(() => {
    setMenu(false);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [location.pathname]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearch((x) => !x);
      }
    };
    document.addEventListener('keydown', key);
    return () => document.removeEventListener('keydown', key);
  }, []);
  useEffect(() => {
    document.documentElement.dataset.reduceMotion = String(data.preferences.compactMotion);
  }, [data.preferences.compactMotion]);
  useEffect(() => {
    if (['code', 'error'].some((key) => new URLSearchParams(window.location.search).has(key)))
      finishSignIn()
        .then(() => {
          notify(t("Account sign-in complete. Loading your customer workspace."));
          navigate('/account');
        })
        .catch((e) => notify(e.message));
  }, []);
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const listener = import('@capacitor/app').then(({ App }) =>
      App.addListener('backButton', ({ canGoBack }) => {
        if (document.querySelector('[role=dialog]')) {
          document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
        } else if (location.pathname !== '/') {
          if (canGoBack) navigate(-1);
          else navigate('/');
        } else {
          App.minimizeApp();
        }
      }),
    );
    return () => {
      listener.then((handle) => handle.remove());
    };
  }, [location.pathname, navigate]);
  const unread = data.notifications.filter((x) => !x.read).length;
  const current =
    navigation.find((x) =>
      x.to === '/' ? location.pathname === '/' : location.pathname.startsWith(x.to),
    )?.label || 'Your workspace';
  return (
    <div className="app-shell">
      <a
        href="#main"
        className="skip-link"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById('main')?.focus();
        }}
      >{t("Skip to content")}</a>
      {menu && (
        <button
          className="sidebar-scrim"
          aria-label={t("Close navigation")}
          onClick={() => setMenu(false)}
        />
      )}
      <aside className={'sidebar ' + (menu ? 'open' : '')}>
        <Link to="/" className="brand-link">
          <Brand />
        </Link>
        <div className="workspace-switch">
          <div className="business-avatar">{data.profile.business.slice(0, 1) || t("N")}</div>
          <span>
            <strong>{data.profile.business || t("My business")}</strong>
            <small>{t("Business workspace")}</small>
          </span>
          <ChevronDown size={16} />
        </div>
        <span className="nav-caption">{t("YOUR WORKSPACE")}</span>
        <nav aria-label={t("Main navigation")}>
          {navigation.map(({ to, label, icon: Icon }) => (
            <NavLink
              end={to === '/'}
              key={to}
              to={to}
              className={({ isActive }) => 'nav-item ' + (isActive ? 'active' : '')}
            >
              <Icon size={19} />
              <span>{t(label)}</span>
              {to === '/verification' && data.kyc.status === 'pending' && (
                <span className="nav-count">1</span>
              )}
              {to === '/orders' && (
                <span className="nav-muted">
                  {data.orders.filter((x) => !['active', 'cancelled'].includes(x.status)).length}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="advisor-card">
            <div className="advisor-symbol">
              <Sparkles size={21} />
            </div>
            <strong>{t("A little guidance.")}<br />{t("A better fit.")}</strong>
            <p>{t("Let’s find what works")}<br />{t("for your business.")}</p>
            <Link to="/discover">{t("Find my plan ")}<ArrowUpRight size={16} />
            </Link>
          </div>
          <NavLink to="/account" className="nav-item">
            <Settings size={19} />
            <span>{t("Account & settings")}</span>
          </NavLink>
          <div className="sidebar-foot">
            <span className="status-dot" />{t(" Your business, in sync.")}</div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="icon-button mobile-menu"
              aria-label={t("Open navigation")}
              onClick={() => setMenu(true)}
            >
              <Menu size={22} />
            </button>
            <span className="breadcrumb">{t("Workspace ")}<span>/</span> <strong>{t(current)}</strong>
            </span>
          </div>
          <div className="topbar-right">
            <label className="language-control"><span className="sr-only">{t('Language')}</span><select aria-label={t('Language')} value={language} onChange={event => { if (validLanguage(event.target.value)) setLanguage(event.target.value); }}>{languages.map(item => <option key={item.code} value={item.code} lang={item.code}>{item.name}</option>)}</select></label>
            <button
              aria-label={t("Search anything ⌘ K")}
              className="search-trigger"
              onClick={() => {
                setSearch(true);
                setTerm('');
              }}
            >
              <Search size={17} />
              <span>{t("Search anything")}</span>
              <kbd aria-hidden="true">{t("⌘ K")}</kbd>
            </button>
            <span className="demo-pill">
              <span /> {cloud ? t("Cloud workspace") : t("Demo workspace")}
            </span>
            <button
              className="icon-button bell-button"
              aria-label={t("Notifications") + (unread ? ', ' + unread + t(" unread") : '')}
              onClick={() => setBell(true)}
            >
              <Bell size={20} />
              {unread > 0 && <i />}
            </button>
            <Link
              to="/account"
              aria-label={
                data.profile.name
                  .split(' ')
                  .map((x) => x[0])
                  .slice(0, 2)
                  .join('') + t(" · Account and settings")
              }
              className="avatar"
            >
              {data.profile.name
                .split(' ')
                .map((x) => x[0])
                .slice(0, 2)
                .join('') || t("AS")}
            </Link>
          </div>
        </header>
        <main id="main" tabIndex={-1} className="page-content">
          {storageError && (
            <div role="alert" className="notice warning">{t("Your browser storage is full or unavailable. Changes will last only until you close this page.")}</div>
          )}
          <Suspense
            fallback={
              <div className="route-loading" role="status">
                Getting your workspace ready…
              </div>
            }
          >
            {cloud && connection !== 'ready' && location.pathname !== '/account' ? (
              <section
                className="panel connection-gate"
                role={connection === 'error' ? 'alert' : 'status'}
              >
                <h1>
                  {connection === 'loading'
                    ? t("Loading your customer workspace…")
                    : connection === 'error'
                      ? t("Your workspace could not be loaded")
                      : t("Sign in to your customer workspace")}
                </h1>
                <p>
                  {t(connectionError) ||
                    t("Your business records are loaded securely from the customer API.")}
                </p>
                {connection !== 'loading' && (
                  <div className="button-row">
                    <button
                      className="button primary"
                      disabled={busy}
                      onClick={() => void run(signIn)}
                    >{t("Sign in with Cognito")}</button>
                    {connection === 'error' && (
                      <button
                        className="button secondary"
                        disabled={busy}
                        onClick={() => void run(refresh)}
                      >{t("Try again")}</button>
                    )}
                    <Link className="text-button" to="/account">{t("Account & settings")}</Link>
                  </div>
                )}
              </section>
            ) : (
              <Routes>
                <Route path="/" element={<Dashboard onAdvisor={() => setAdvisor(true)} />} />
                <Route path="/plans" element={<Plans />} />
                <Route path="/discover" element={<Discover />} />
                <Route path="/checkout" element={<Checkout />} />
                <Route path="/services" element={<Services />} />
                <Route path="/orders" element={<Orders />} />
                <Route path="/orders/:id" element={<Orders />} />
                <Route path="/verification" element={<Verification />} />
                <Route path="/billing" element={<Billing />} />
                <Route path="/support" element={<Support />} />
                <Route path="/account" element={<Account />} />
                <Route
                  path="*"
                  element={
                    <div className="empty-state">
                      <Package size={40} />
                      <h1>Let’s get you back on track.</h1>
                      <p>We couldn’t find this page.</p>
                      <Link className="button primary" to="/">
                        Back to overview
                      </Link>
                    </div>
                  }
                />
              </Routes>
            )}
          </Suspense>
          <footer className="page-footer">
            <span>
              <span className="red-dot" /> Accel Telecom <span className="footer-divider">/</span>{' '}{t("Made for what’s next.")}</span>
            <span>
              {cloud
                ? t("Cloud workspace · Fictional case products · No real purchases")
                : t("Demo workspace · Fictional case products · No real purchases")}
            </span>
          </footer>
        </main>
      </div>
      <nav className="mobile-bottom" aria-label={t("Mobile quick navigation")}>
        {[
          { to: '/', label: 'Home', icon: LayoutDashboard },
          { to: '/plans', label: 'Plans', icon: BookOpen },
          { to: '/orders', label: 'Orders', icon: Package },
          { to: '/billing', label: 'Bills', icon: CreditCard },
        ].map(({ to, label, icon: Icon }) => (
          <NavLink end={to === '/'} to={to} key={to}>
            <Icon size={21} />
            <span>{t(label)}</span>
          </NavLink>
        ))}
      </nav>
      {search && (
        <Modal title={t("What are you looking for?")} onClose={() => setSearch(false)}>
          <div className="search-field large">
            <Search size={20} />
            <input
              aria-label={t("Search plans and pages")}
              autoFocus
              placeholder={t("Try broadband, invoices, or verification…")}
              value={term}
              onChange={(e) => setTerm(e.target.value)}
            />
          </div>
          <div className="search-results">
            {navigation
              .filter((x) => (t(x.label) + ' ' + x.label).toLocaleLowerCase(locale).includes(term.toLocaleLowerCase(locale)))
              .slice(0, 4)
              .map((x) => (
                <button
                  key={x.to}
                  onClick={() => {
                    navigate(x.to);
                    setSearch(false);
                  }}
                >
                  <x.icon size={19} />
                  <span>{t(x.label)}</span>
                  <ArrowUpRight size={17} />
                </button>
              ))}
            {term &&
              catalogue
                .filter((x) =>
                  (x.name + ' ' + x.category).toLowerCase().includes(term.toLowerCase()),
                )
                .slice(0, 5)
                .map((x) => (
                  <button
                    key={x.id}
                    onClick={() => {
                      navigate('/plans?search=' + encodeURIComponent(x.name));
                      setSearch(false);
                    }}
                  >
                    <Wifi size={19} />
                    <span>
                      {x.name}
                      <small>{x.category}</small>
                    </span>
                    <ArrowUpRight size={17} />
                  </button>
                ))}
          </div>
          <p className="muted small">{t("Quick tip: press ⌘ K or Ctrl K from anywhere.")}</p>
        </Modal>
      )}
      {bell && (
        <Modal title={t("Your updates")} onClose={() => setBell(false)}>
          <div className="section-inline">
            <span className="muted">{unread}{t(" unread updates")}</span>
            <button
              className="text-button"
              disabled={busy}
              onClick={() =>
                void run(() => markRead(data.notifications.filter((x) => !x.read).map((x) => x.id)))
              }
            >
              <CheckCheck size={16} />{t(" Mark all read")}</button>
          </div>
          <div className="notification-list">
            {data.notifications.map((x) => (
              <button
                className={x.read ? '' : 'unread'}
                key={x.id}
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    await markRead([x.id]);
                    setBell(false);
                    navigate(x.route);
                  })
                }
              >
                <span className="notification-icon">
                  <Bell size={18} />
                </span>
                <span>
                  <strong>{x.title}</strong>
                  <p>{t(x.text)}</p>
                  <small>
                    {new Date(x.createdAt).toLocaleDateString(locale, {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </small>
                </span>
                {!x.read && <i />}
              </button>
            ))}
          </div>
        </Modal>
      )}
      {advisor && (
        <Modal title={t("Meet your next advantage")} onClose={() => setAdvisor(false)}>
          <VoiceAdvisor onApplied={() => setAdvisor(false)} />
        </Modal>
      )}
    </div>
  );
}
