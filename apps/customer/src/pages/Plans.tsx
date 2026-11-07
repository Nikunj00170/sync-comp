import { money, useI18n } from '../lib/i18n';
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
  const { t, locale } = useI18n();
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
            (p.name + ' ' + p.description + ' ' + t(p.category))
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
    [category, savedOnly, eligibleOnly, search, sort, data.profile, data.saved, locale],
  );
  const total = quote(data.cart, data.profile);
  const add = (p: Product) => {
    try {
      const next = addToCart(data.cart, p.id, data.profile);
      setData((d) => ({ ...d, cart: next }));
      notify(
        p.name +
          t(" added to your bundle") +
          (next.length > data.cart.length + 1 ? t(" with its required connection.") : '.'),
      );
    } catch (e) {
      notify((e as Error).message);
    }
  };
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">{t("POSSIBILITIES, MEET YOUR BUSINESS.")}</span>
          <h1>{t("Find your next advantage")}<span className="heading-dot">.</span>
          </h1>
          <p>{t("Connectivity, productivity, protection. A little more of what you need.")}</p>
        </div>
        <Link to="/discover" className="button primary">
          <Sparkles size={17} />{t(" Find my fit")}</Link>
      </div>
      <div className="plan-guidance">
        <span className="stat-icon red">
          <Sparkles size={21} />
        </span>
        <p>
          <strong>{t("A plan should fit your business. Not the other way around.")}</strong>
          <br />{t("Showing plans for ")}{data.profile.employees}{t(" people in ")}{data.profile.city}.{' '}
          <Link to="/discover">{t("Personalise your recommendations ")}<ArrowUpRight size={13} />
          </Link>
        </p>
        <span className="muted small">{t("25 demo products")}</span>
      </div>
      <div className="filter-bar">
        <div className="search-field">
          <Search size={18} />
          <input
            aria-label={t("Search plans")}
            placeholder={t("Search plans, features, or possibilities…")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button aria-label={t("Clear search")} onClick={() => setSearch('')}>
              <X size={16} />
            </button>
          )}
        </div>
        <button
          className={'button secondary ' + (savedOnly ? 'selected' : '')}
          onClick={() => setSavedOnly((x) => !x)}
          aria-pressed={savedOnly}
        >
          <Heart size={17} fill={savedOnly ? 'currentColor' : 'none'} />{t(" Saved (")}{data.saved.length})
        </button>
        <select aria-label={t("Sort plans")} value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="recommended">{t("Recommended first")}</option>
          <option value="low">{t("Price: low to high")}</option>
          <option value="high">{t("Price: high to low")}</option>
        </select>
      </div>
      <div className="category-tabs" aria-label={t("Plan categories")}>
        {categories.map((c) => (
          <button key={c} className={category === c ? 'active' : ''} onClick={() => setCategory(c)}>
            {t(c)}
          </button>
        ))}
      </div>
      <div className="results-line">
        <span>{plans.length}{t(" possibilities for your business")}</span>
        <label className="check-label">
          <input
            type="checkbox"
            checked={eligibleOnly}
            onChange={(e) => setEligibleOnly(e.target.checked)}
          />{' '}{t("Only show plans I’m eligible for")}</label>
      </div>
      <div className="plans-grid">
        {plans.map((p) => {
          const reasons = eligibility(p, data.profile),
            selected = data.cart.some((x) => x.productId === p.id);
          return (
            <article className={'plan-card ' + (selected ? 'in-bundle' : '')} key={p.id}>
              <div className="plan-top">
                <span className="plan-category">{t(p.category)}</span>
                <button
                  className={'icon-button heart ' + (data.saved.includes(p.id) ? 'saved' : '')}
                  aria-label={(data.saved.includes(p.id) ? t("Unsave ") : t("Save ")) + p.name}
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
              <p className="plan-description">{t(p.description)}</p>
              <div className="plan-price">
                <strong>{money(p.price, false)}</strong>
                <span>{t("/ month ")}<small>{p.unit}</small>
                </span>
              </div>
              <ul className="plan-features">
                <li>
                  <Check size={15} />
                  {p.contract}{t("-month contract")}</li>
                <li>
                  <Check size={15} />
                  {p.setup ? money(p.setup, false) + t(" one-time setup") : t("No setup charge")}
                </li>
                <li>
                  <Check size={15} />
                  {p.installDays}{t("-day indicative activation")}</li>
              </ul>
              {reasons.length ? (
                <div className="eligibility-note">{reasons[0]}</div>
              ) : (
                <span className="eligibility-ok">
                  <ShieldCheck size={14} />{t(" Fits your business profile")}</span>
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
                      <Check size={16} />{t(" In your bundle")}</>
                  ) : (
                    <>{t("Add to bundle ")}<ArrowRight size={16} />
                    </>
                  )}
                </button>
                <button className="text-button" onClick={() => setDetail(p)}>{t("Details")}</button>
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
                />{' '}{t("Compare plan")}</label>
            </article>
          );
        })}
      </div>
      {!plans.length && (
        <div className="empty-state">
          <Search size={38} />
          <h2>{t("No plans found just yet.")}</h2>
          <p>{t("Try another search or clear your filters.")}</p>
          <button
            className="button secondary"
            onClick={() => {
              setSearch('');
              setCategory('All plans');
              setSavedOnly(false);
              setEligibleOnly(false);
            }}
          >{t("Clear filters")}</button>
        </div>
      )}
      <p className="footnote">{t("Fictional case catalogue. Prices exclude illustrative demo tax. Availability and activation times are indicative for this prototype.")}</p>
      {(data.cart.length > 0 || compare.length > 0) && (
        <div className="bundle-dock">
          <div>
            <span className="stat-icon red">
              <Layers3 size={21} />
            </span>
            <span>
              <strong>
                {data.cart.length}{t(" service")}{data.cart.length !== 1 ? t("s") : ''}{t(" in your bundle")}</strong>
              <small>{money(total.monthly)}{t(" / month before demo tax")}</small>
            </span>
          </div>
          <div className="dock-actions">
            {compare.length > 0 && (
              <button className="button secondary" onClick={() => setShowCompare(true)}>{t("Compare (")}{compare.length})
              </button>
            )}
            {data.cart.length > 0 && (
              <Link className="button primary" to="/checkout">{t("Review bundle ")}<ArrowRight size={17} />
              </Link>
            )}
          </div>
        </div>
      )}
      {detail && (
        <Modal title={detail.name} onClose={() => setDetail(null)}>
          <span className="eyebrow">{t(detail.category)}</span>
          <p className="lead">{t(detail.description)}</p>
          <div className="detail-grid">
            <span>{t("Monthly price")}<strong>
                {money(detail.price)} {detail.unit}
              </strong>
            </span>
            <span>{t("Setup fee")}<strong>{money(detail.setup)}</strong>
            </span>
            <span>{t("Contract")}<strong>{detail.contract}{t(" months")}</strong>
            </span>
            <span>{t("Indicative activation")}<strong>{detail.installDays}{t(" days")}</strong>
            </span>
          </div>
          <h3>{t("What you’ll need")}</h3>
          <ul className="bullet-list">
            <li>{t("At least ")}{detail.minEmployees}{t(" employee")}{detail.minEmployees > 1 ? t("s") : ''}{t(" and")}{' '}
              {detail.minSites}{t(" location")}{detail.minSites > 1 ? t("s") : ''}
            </li>
            <li>{t("Tier ")}{detail.tiers.join(' or ')}{t(" city")}</li>
            {detail.requiresGstin && <li>{t("GST registration")}</li>}
            {detail.dependencies.length > 0 && (
              <li>{t("One compatible connection:")}{' '}
                {detail.dependencies.map((id) => productById(id)?.name).join(', ')}{t(". We’ll add a suitable one if needed.")}</li>
            )}
          </ul>
          <button
            className="button primary full"
            disabled={Boolean(eligibility(detail, data.profile).length)}
            onClick={() => {
              add(detail);
              setDetail(null);
            }}
          >{t("Add to my bundle ")}<ArrowRight size={16} />
          </button>
        </Modal>
      )}
      {showCompare && (
        <Modal title={t("Side by side. A clearer choice.")} onClose={() => setShowCompare(false)} wide>
          <div className="compare-grid">
            {compare.map((id) => {
              const p = productById(id)!;
              return (
                <div className="compare-card" key={id}>
                  <span className="eyebrow">{t(p.category)}</span>
                  <h3>{p.name}</h3>
                  <strong className="compare-price">
                    {money(p.price, false)}
                    <small>{t("/mo")}</small>
                  </strong>
                  <p>{t(p.description)}</p>
                  <dl>
                    <dt>{t("Unit")}</dt>
                    <dd>{p.unit}</dd>
                    <dt>{t("Setup")}</dt>
                    <dd>{money(p.setup)}</dd>
                    <dt>{t("Contract")}</dt>
                    <dd>{p.contract}{t(" months")}</dd>
                    <dt>{t("Activation")}</dt>
                    <dd>{t("About ")}{p.installDays}{t(" days")}</dd>
                    <dt>{t("GST required")}</dt>
                    <dd>{p.requiresGstin ? t("Yes") : t("No")}</dd>
                  </dl>
                  <button
                    className="button primary full"
                    disabled={Boolean(eligibility(p, data.profile).length)}
                    onClick={() => add(p)}
                  >{t("Add to bundle")}</button>
                </div>
              );
            })}
          </div>
        </Modal>
      )}
    </>
  );
}
