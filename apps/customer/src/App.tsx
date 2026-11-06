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
import { finishSignIn } from './lib/auth';
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
  const { data, setData, storageError } = useWorkspace();
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
    if (new URLSearchParams(window.location.search).has('code'))
      finishSignIn()
        .then(() => {
          notify('Account sign-in complete. Your customer workspace is still in demo mode.');
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
      >
        Skip to content
      </a>
      {menu && (
        <button
          className="sidebar-scrim"
          aria-label="Close navigation"
          onClick={() => setMenu(false)}
        />
      )}
      <aside className={'sidebar ' + (menu ? 'open' : '')}>
        <Link to="/" className="brand-link">
          <Brand />
        </Link>
        <div className="workspace-switch">
          <div className="business-avatar">{data.profile.business.slice(0, 1) || 'N'}</div>
          <span>
            <strong>{data.profile.business || 'My business'}</strong>
            <small>Business workspace</small>
          </span>
          <ChevronDown size={16} />
        </div>
        <span className="nav-caption">YOUR WORKSPACE</span>
        <nav aria-label="Main navigation">
          {navigation.map(({ to, label, icon: Icon }) => (
            <NavLink
              end={to === '/'}
              key={to}
              to={to}
              className={({ isActive }) => 'nav-item ' + (isActive ? 'active' : '')}
            >
              <Icon size={19} />
              <span>{label}</span>
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
            <strong>
              A little guidance.
              <br />A better fit.
            </strong>
            <p>
              Let’s find what works
              <br />
              for your business.
            </p>
            <Link to="/discover">
              Find my plan <ArrowUpRight size={16} />
            </Link>
          </div>
          <NavLink to="/account" className="nav-item">
            <Settings size={19} />
            <span>Account & settings</span>
          </NavLink>
          <div className="sidebar-foot">
            <span className="status-dot" /> Your business, in sync.
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="icon-button mobile-menu"
              aria-label="Open navigation"
              onClick={() => setMenu(true)}
            >
              <Menu size={22} />
            </button>
            <span className="breadcrumb">
              Workspace <span>/</span> <strong>{current}</strong>
            </span>
          </div>
          <div className="topbar-right">
            <button
              aria-label="Search anything ⌘ K"
              className="search-trigger"
              onClick={() => {
                setSearch(true);
                setTerm('');
              }}
            >
              <Search size={17} />
              <span>Search anything</span>
              <kbd aria-hidden="true">⌘ K</kbd>
            </button>
            <span className="demo-pill">
              <span /> Demo workspace
            </span>
            <button
              className="icon-button bell-button"
              aria-label={'Notifications' + (unread ? ', ' + unread + ' unread' : '')}
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
                  .join('') + ' · Account and settings'
              }
              className="avatar"
            >
              {data.profile.name
                .split(' ')
                .map((x) => x[0])
                .slice(0, 2)
                .join('') || 'AS'}
            </Link>
          </div>
        </header>
        <main id="main" tabIndex={-1} className="page-content">
          {storageError && (
            <div role="alert" className="notice warning">
              Your browser storage is full or unavailable. Changes will last only until you close
              this page.
            </div>
          )}
          <Suspense
            fallback={
              <div className="route-loading" role="status">
                Getting your workspace ready…
              </div>
            }
          >
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
          </Suspense>
          <footer className="page-footer">
            <span>
              <span className="red-dot" /> Accel Telecom <span className="footer-divider">/</span>{' '}
              Made for what’s next.
            </span>
            <span>Demo workspace · Fictional case products · No real purchases</span>
          </footer>
        </main>
      </div>
      <nav className="mobile-bottom" aria-label="Mobile quick navigation">
        {[
          { to: '/', label: 'Home', icon: LayoutDashboard },
          { to: '/plans', label: 'Plans', icon: BookOpen },
          { to: '/orders', label: 'Orders', icon: Package },
          { to: '/billing', label: 'Bills', icon: CreditCard },
        ].map(({ to, label, icon: Icon }) => (
          <NavLink end={to === '/'} to={to} key={to}>
            <Icon size={21} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
      {search && (
        <Modal title="What are you looking for?" onClose={() => setSearch(false)}>
          <div className="search-field large">
            <Search size={20} />
            <input
              aria-label="Search plans and pages"
              autoFocus
              placeholder="Try broadband, invoices, or verification…"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
            />
          </div>
          <div className="search-results">
            {navigation
              .filter((x) => x.label.toLowerCase().includes(term.toLowerCase()))
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
                  <span>{x.label}</span>
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
          <p className="muted small">Quick tip: press ⌘ K or Ctrl K from anywhere.</p>
        </Modal>
      )}
      {bell && (
        <Modal title="Your updates" onClose={() => setBell(false)}>
          <div className="section-inline">
            <span className="muted">{unread} unread updates</span>
            <button
              className="text-button"
              onClick={() =>
                setData((d) => ({
                  ...d,
                  notifications: d.notifications.map((x) => ({ ...x, read: true })),
                }))
              }
            >
              <CheckCheck size={16} /> Mark all read
            </button>
          </div>
          <div className="notification-list">
            {data.notifications.map((x) => (
              <button
                className={x.read ? '' : 'unread'}
                key={x.id}
                onClick={() => {
                  setData((d) => ({
                    ...d,
                    notifications: d.notifications.map((n) =>
                      n.id === x.id ? { ...n, read: true } : n,
                    ),
                  }));
                  setBell(false);
                  navigate(x.route);
                }}
              >
                <span className="notification-icon">
                  <Bell size={18} />
                </span>
                <span>
                  <strong>{x.title}</strong>
                  <p>{x.text}</p>
                  <small>
                    {new Date(x.createdAt).toLocaleDateString('en-IN', {
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
        <Modal title="Meet your next advantage" onClose={() => setAdvisor(false)}>
          <VoiceAdvisor />
        </Modal>
      )}
    </div>
  );
}
