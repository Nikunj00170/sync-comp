import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronRight,
  Heart,
  Layers3,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Wifi,
  X,
} from 'lucide-react';
import {
  addToCart,
  catalogue,
  eligibility,
  money,
  productById,
  quote,
  removeFromCart,
  type Product,
} from '@sync/domain';
import { useWorkspace } from '../lib/store';
import { useNotify } from '../lib/feedback';
import { Modal } from '../components/Modal';
const categories = ['All plans', ...new Set(catalogue.map((x) => x.category))];
export default function Plans() {
  const { data, setData } = useWorkspace(),
    notify = useNotify();
  const [params] = useSearchParams();
  const [search, setSearch] = useState(params.get('search') || ''),
    [category, setCategory] = useState('All plans'),
    [sort, setSort] = useState('recommended'),
    [savedOnly, setSavedOnly] = useState(false),
    [eligibleOnly, setEligibleOnly] = useState(false),
    [compare, setCompare] = useState<string[]>([]),
    [showCompare, setShowCompare] = useState(false),
    [detail, setDetail] = useState<Product | null>(null);
  useEffect(() => {
    setSearch(params.get('search') || '');
  }, [params]);
  const plans = useMemo(
    () =>
      catalogue
        .filter(
          (p) =>
            (category === 'All plans' || p.category === category) &&
            (!savedOnly || data.saved.includes(p.id)) &&
            (!eligibleOnly || !eligibility(p, data.profile).length) &&
            (p.name + ' ' + p.description + ' ' + p.category)
              .toLowerCase()
              .includes(search.toLowerCase()),
        )
        .sort((a, b) =>
          sort === 'low'
            ? a.price - b.price
            : sort === 'high'
              ? b.price - a.price
              : eligibility(a, data.profile).length - eligibility(b, data.profile).length,
        ),
    [category, savedOnly, eligibleOnly, search, sort, data.profile, data.saved],
  );
  const total = quote(data.cart, data.profile);
  const add = (p: Product) => {
    try {
      const next = addToCart(data.cart, p.id, data.profile);
      setData((d) => ({ ...d, cart: next }));
      notify(
        p.name +
          ' added to your bundle' +
          (next.length > data.cart.length + 1 ? ' with its required connection.' : '.'),
      );
    } catch (e) {
      notify((e as Error).message);
    }
  };
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">POSSIBILITIES, MEET YOUR BUSINESS.</span>
          <h1>
            Find your next advantage<span className="heading-dot">.</span>
          </h1>
          <p>Connectivity, productivity, protection. A little more of what you need.</p>
        </div>
        <Link to="/discover" className="button primary">
          <Sparkles size={17} /> Find my fit
        </Link>
      </div>
      <div className="plan-guidance">
        <span className="stat-icon red">
          <Sparkles size={21} />
        </span>
        <p>
          <strong>A plan should fit your business. Not the other way around.</strong>
          <br />
          Showing plans for {data.profile.employees} people in {data.profile.city}.{' '}
          <Link to="/discover">
            Personalise your recommendations <ArrowUpRight size={13} />
          </Link>
        </p>
        <span className="muted small">25 demo products</span>
      </div>
      <div className="filter-bar">
        <div className="search-field">
          <Search size={18} />
          <input
            aria-label="Search plans"
            placeholder="Search plans, features, or possibilities…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button aria-label="Clear search" onClick={() => setSearch('')}>
              <X size={16} />
            </button>
          )}
        </div>
        <button
          className={'button secondary ' + (savedOnly ? 'selected' : '')}
          onClick={() => setSavedOnly((x) => !x)}
          aria-pressed={savedOnly}
        >
          <Heart size={17} fill={savedOnly ? 'currentColor' : 'none'} /> Saved ({data.saved.length})
        </button>
        <select aria-label="Sort plans" value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="recommended">Recommended first</option>
          <option value="low">Price: low to high</option>
          <option value="high">Price: high to low</option>
        </select>
      </div>
      <div className="category-tabs" aria-label="Plan categories">
        {categories.map((c) => (
          <button key={c} className={category === c ? 'active' : ''} onClick={() => setCategory(c)}>
            {c}
          </button>
        ))}
      </div>
      <div className="results-line">
        <span>{plans.length} possibilities for your business</span>
        <label className="check-label">
          <input
            type="checkbox"
            checked={eligibleOnly}
            onChange={(e) => setEligibleOnly(e.target.checked)}
          />{' '}
          Only show plans I’m eligible for
        </label>
      </div>
      <div className="plans-grid">
        {plans.map((p) => {
          const reasons = eligibility(p, data.profile),
            selected = data.cart.some((x) => x.productId === p.id);
          return (
            <article className={'plan-card ' + (selected ? 'in-bundle' : '')} key={p.id}>
              <div className="plan-top">
                <span className="plan-category">{p.category}</span>
                <button
                  className={'icon-button heart ' + (data.saved.includes(p.id) ? 'saved' : '')}
                  aria-label={(data.saved.includes(p.id) ? 'Unsave ' : 'Save ') + p.name}
                  aria-pressed={data.saved.includes(p.id)}
                  onClick={() =>
                    setData((d) => ({
                      ...d,
                      saved: d.saved.includes(p.id)
                        ? d.saved.filter((x) => x !== p.id)
                        : [...d.saved, p.id],
                    }))
                  }
                >
                  <Heart size={19} fill={data.saved.includes(p.id) ? 'currentColor' : 'none'} />
                </button>
              </div>
              <span className="plan-main-icon">
                <Wifi size={25} />
              </span>
              <h2>{p.name}</h2>
              <p className="plan-description">{p.description}</p>
              <div className="plan-price">
                <strong>{money(p.price, false)}</strong>
                <span>
                  / month <small>{p.unit}</small>
                </span>
              </div>
              <ul className="plan-features">
                <li>
                  <Check size={15} />
                  {p.contract}-month contract
                </li>
                <li>
                  <Check size={15} />
                  {p.setup ? money(p.setup, false) + ' one-time setup' : 'No setup charge'}
                </li>
                <li>
                  <Check size={15} />
                  {p.installDays}-day indicative activation
                </li>
              </ul>
              {reasons.length ? (
                <div className="eligibility-note">{reasons[0]}</div>
              ) : (
                <span className="eligibility-ok">
                  <ShieldCheck size={14} /> Fits your business profile
                </span>
              )}
              <div className="plan-card-actions">
                <button
                  className={'button ' + (selected ? 'secondary' : 'primary')}
                  disabled={Boolean(reasons.length)}
                  onClick={() =>
                    selected
                      ? setData((d) => ({ ...d, cart: removeFromCart(d.cart, p.id) }))
                      : add(p)
                  }
                >
                  {selected ? (
                    <>
                      <Check size={16} /> In your bundle
                    </>
                  ) : (
                    <>
                      Add to bundle <ArrowRight size={16} />
                    </>
                  )}
                </button>
                <button className="text-button" onClick={() => setDetail(p)}>
                  Details
                </button>
              </div>
              <label className="compare-check">
                <input
                  type="checkbox"
                  checked={compare.includes(p.id)}
                  onChange={(e) => {
                    if (e.target.checked && compare.length >= 3) {
                      notify('Compare up to three plans at a time.');
                      return;
                    }
                    setCompare((x) =>
                      e.target.checked ? [...x, p.id] : x.filter((y) => y !== p.id),
                    );
                  }}
                />{' '}
                Compare plan
              </label>
            </article>
          );
        })}
      </div>
      {!plans.length && (
        <div className="empty-state">
          <Search size={38} />
          <h2>No plans found just yet.</h2>
          <p>Try another search or clear your filters.</p>
          <button
            className="button secondary"
            onClick={() => {
              setSearch('');
              setCategory('All plans');
              setSavedOnly(false);
              setEligibleOnly(false);
            }}
          >
            Clear filters
          </button>
        </div>
      )}
      <p className="footnote">
        Fictional case catalogue. Prices exclude illustrative demo tax. Availability and activation
        times are indicative for this prototype.
      </p>
      {(data.cart.length > 0 || compare.length > 0) && (
        <div className="bundle-dock">
          <div>
            <span className="stat-icon red">
              <Layers3 size={21} />
            </span>
            <span>
              <strong>
                {data.cart.length} service{data.cart.length !== 1 ? 's' : ''} in your bundle
              </strong>
              <small>{money(total.monthly)} / month before demo tax</small>
            </span>
          </div>
          <div className="dock-actions">
            {compare.length > 0 && (
              <button className="button secondary" onClick={() => setShowCompare(true)}>
                Compare ({compare.length})
              </button>
            )}
            {data.cart.length > 0 && (
              <Link className="button primary" to="/checkout">
                Review bundle <ArrowRight size={17} />
              </Link>
            )}
          </div>
        </div>
      )}
      {detail && (
        <Modal title={detail.name} onClose={() => setDetail(null)}>
          <span className="eyebrow">{detail.category}</span>
          <p className="lead">{detail.description}</p>
          <div className="detail-grid">
            <span>
              Monthly price
              <strong>
                {money(detail.price)} {detail.unit}
              </strong>
            </span>
            <span>
              Setup fee<strong>{money(detail.setup)}</strong>
            </span>
            <span>
              Contract<strong>{detail.contract} months</strong>
            </span>
            <span>
              Indicative activation<strong>{detail.installDays} days</strong>
            </span>
          </div>
          <h3>What you’ll need</h3>
          <ul className="bullet-list">
            <li>
              At least {detail.minEmployees} employee{detail.minEmployees > 1 ? 's' : ''} and{' '}
              {detail.minSites} location{detail.minSites > 1 ? 's' : ''}
            </li>
            <li>Tier {detail.tiers.join(' or ')} city</li>
            {detail.requiresGstin && <li>GST registration</li>}
            {detail.dependencies.length > 0 && (
              <li>
                One compatible connection:{' '}
                {detail.dependencies.map((id) => productById(id)?.name).join(', ')}. We’ll add a
                suitable one if needed.
              </li>
            )}
          </ul>
          <button
            className="button primary full"
            disabled={Boolean(eligibility(detail, data.profile).length)}
            onClick={() => {
              add(detail);
              setDetail(null);
            }}
          >
            Add to my bundle <ArrowRight size={16} />
          </button>
        </Modal>
      )}
      {showCompare && (
        <Modal title="Side by side. A clearer choice." onClose={() => setShowCompare(false)} wide>
          <div className="compare-grid">
            {compare.map((id) => {
              const p = productById(id)!;
              return (
                <div className="compare-card" key={id}>
                  <span className="eyebrow">{p.category}</span>
                  <h3>{p.name}</h3>
                  <strong className="compare-price">
                    {money(p.price, false)}
                    <small>/mo</small>
                  </strong>
                  <p>{p.description}</p>
                  <dl>
                    <dt>Unit</dt>
                    <dd>{p.unit}</dd>
                    <dt>Setup</dt>
                    <dd>{money(p.setup)}</dd>
                    <dt>Contract</dt>
                    <dd>{p.contract} months</dd>
                    <dt>Activation</dt>
                    <dd>About {p.installDays} days</dd>
                    <dt>GST required</dt>
                    <dd>{p.requiresGstin ? 'Yes' : 'No'}</dd>
                  </dl>
                  <button
                    className="button primary full"
                    disabled={Boolean(eligibility(p, data.profile).length)}
                    onClick={() => add(p)}
                  >
                    Add to bundle
                  </button>
                </div>
              );
            })}
          </div>
        </Modal>
      )}
    </>
  );
}
