import { money, useI18n } from '../lib/i18n';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  Cloud,
  HeartHandshake,
  ShieldCheck,
  Sparkles,
  Users,
  Wifi,
  Zap,
} from 'lucide-react';
import { productById, profileSchema, recommendations, type Profile } from '@sync/domain';
import { useWorkspace } from '../lib/store';
import { useAction } from '../lib/actions';
import type { Recommendation } from '../lib/api';
import { useNotify } from '../lib/feedback';
const priorities = [
  {
    id: 'productivity',
    name: 'A productive team',
    description: 'Email, collaboration and everyday tools',
    icon: Users,
  },
  {
    id: 'security',
    name: 'A safer business',
    description: 'Protect your devices and data',
    icon: ShieldCheck,
  },
  {
    id: 'reliability',
    name: 'Always-on connections',
    description: 'Keep moving, even when a link goes down',
    icon: Wifi,
  },
  {
    id: 'growth',
    name: 'Room to grow',
    description: 'A foundation for your next big thing',
    icon: Zap,
  },
];
export default function Discover() {
  const { t, locale } = useI18n();
  const { data, setData, cloud, saveProfile, matches } = useWorkspace(),
    notify = useNotify(),
    navigate = useNavigate();
  const { run, busy } = useAction();
  const [remoteMatches, setMatches] = useState<Recommendation[]>([]);
  const [step, setStep] = useState(Math.min(data.draftStep, 3));
  const [profile, setProfile] = useState<Profile>(() => {
    try {
      if (cloud) return { ...data.profile };
      const saved = JSON.parse(localStorage.getItem('airtel-sync:discovery') || 'null');
      if (saved && typeof saved === 'object' && Array.isArray(saved.priorities))
        return { ...data.profile, ...saved };
    } catch {}
    return { ...data.profile };
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState(false);
  useEffect(() => {
    try {
      if (cloud) return;
      localStorage.setItem('airtel-sync:discovery', JSON.stringify(profile));
    } catch {}
  }, [profile]);
  const update = (key: keyof Profile, value: unknown) =>
    setProfile((p) => ({ ...p, [key]: value }));
  async function next() {
    const stepSchema =
      step === 0
        ? profileSchema.pick({
            name: true,
            business: true,
            email: true,
            industry: true,
            city: true,
            tier: true,
            hasGstin: true,
          })
        : step === 1
          ? profileSchema.pick({ employees: true, sites: true, budget: true })
          : profileSchema;
    const parsed = stepSchema.safeParse(profile);
    if (!parsed.success) {
      const e: Record<string, string> = {};
      for (const i of parsed.error.issues) e[String(i.path[0])] = i.message;
      setErrors(e);
      notify(t("A few details need your attention."));
      return;
    }
    setErrors({});
    if (step === 2) {
      await run(async () => {
        await saveProfile(profileSchema.parse(profile));
        if (cloud) setMatches(await matches());
        setResult(true);
      });
    } else {
      setStep((s) => s + 1);
      setData((d) => ({ ...d, draftStep: step + 1 }));
    }
  }
  const input = (key: 'name' | 'business' | 'email' | 'city', label: string) => (
    <label className="form-field">
      {t(label)}
      <input
        value={profile[key]}
        onChange={(e) => update(key, e.target.value)}
        aria-invalid={Boolean(errors[key])}
      />
      {errors[key] && <span className="field-error">{t(errors[key])}</span>}
    </label>
  );
  if (result) {
    const bundles = cloud ? remoteMatches : recommendations(data.profile);
    return (
      <>
        <div className="page-heading">
          <div>
            <span className="eyebrow">{t("BUILT AROUND YOU")}</span>
            <h1>{t("Your business. Your best fit")}<span className="heading-dot">.</span>
            </h1>
            <p>{t("A thoughtful match for ")}{data.profile.employees}{t(" people at ")}{data.profile.business}.
            </p>
          </div>
          <button
            className="button secondary"
            onClick={() => {
              setResult(false);
              setStep(0);
            }}
          >
            <ArrowLeft size={16} />{t(" Refine my answers")}</button>
        </div>
        <div className="notice positive">
          <Sparkles size={19} />
          <span>{t("Matched using your business profile, plan eligibility and required service connections.")}</span>
        </div>
        <div className="recommendation-grid">
          {bundles.map((b, i) => (
            <article key={b.id} className={'recommendation-card ' + (i === 1 ? 'featured' : '')}>
              {i === 1 && (
                <span className="recommendation-ribbon">
                  <Sparkles size={14} />{t(" OUR PICK FOR YOU")}</span>
              )}
              <span className="eyebrow">{t(b.eyebrow)}</span>
              <h2>{t(b.name)}</h2>
              <p>{t(b.description)}</p>
              <div className="recommendation-price">
                {money(b.quote.monthly, false)}
                <span>{t("/month")}</span>
              </div>
              <small className="muted">{t("Before illustrative demo tax")}</small>
              <ul className="recommendation-lines">
                {b.lines.map((l) => (
                  <li key={l.productId}>
                    <Check size={16} />
                    <span>
                      {productById(l.productId)?.name}
                      <small>
                        {l.quantity} {productById(l.productId)?.unit.replace('per ', '')}
                        {l.quantity > 1 ? t("s") : ''}
                      </small>
                    </span>
                  </li>
                ))}
              </ul>
              <div className="fit-reason">
                {b.quote.monthly <= profile.budget * 100 ? (
                  <>
                    <Check size={15} />{t(" Within your monthly budget")}</>
                ) : (
                  <>{t("Above your budget by ")}{money(b.quote.monthly - profile.budget * 100, false)}{t("/mo")}</>
                )}
              </div>
              <button
                className={'button full ' + (i === 1 ? 'primary' : 'secondary')}
                onClick={() => {
                  setData((d) => ({ ...d, cart: b.lines }));
                  notify('Your recommended bundle is ready to review.');
                  navigate('/checkout');
                }}
              >{t("Make this my bundle ")}<ArrowRight size={16} />
              </button>
            </article>
          ))}
        </div>
        <p className="footnote">{t("These are demo recommendations from fictional case products, not a live serviceability or availability check.")}</p>
      </>
    );
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">{t("A BETTER FIT STARTS HERE.")}</span>
          <h1>{t("Tell us a little. Get a lot more")}<span className="heading-dot">.</span>
          </h1>
          <p>{t("Three quick steps to a bundle that makes sense for your business.")}</p>
        </div>
        <button
          className="text-button"
          onClick={() => {
            notify('Your answers are saved on this device.');
            navigate('/');
          }}
        >{t("Save & finish later")}</button>
      </div>
      <div className="discovery-layout">
        <div className="discovery-form panel">
          <div className="form-stepper">
            {['Your business', 'Your team', 'Your priorities'].map((s, i) => (
              <div key={s} className={i <= step ? 'active' : ''}>
                <span>{i < step ? <Check size={15} /> : i + 1}</span>
                <strong>{s}</strong>
              </div>
            ))}
          </div>
          <span className="eyebrow">{t("STEP ")}{step + 1}{t(" OF 3")}</span>
          <h2>
            {
              [
                t('Let’s start with your business.'),
                t('Small team. Big possibilities.'),
                t('What matters most to you?'),
              ][step]
            }
          </h2>
          <p className="muted">
            {
              [
                t('A few details help us understand your everyday.'),
                t('We’ll scale your recommendations to the people and places you connect.'),
                t('Choose the things that will make your workday better.'),
              ][step]
            }
          </p>
          {step === 0 && (
            <div className="form-grid">
              {input('business', 'Business name')}
              {input('name', 'Your name')}
              {input('email', 'Email address')}
              {input('city', 'City')}
              <label className="form-field">{t("Industry")}<select
                  value={profile.industry}
                  onChange={(e) => update('industry', e.target.value)}
                >
                  <option value="professional">{t("Professional services")}</option>
                  <option value="retail">{t("Retail & small business")}</option>
                  <option value="manufacturing">{t("Manufacturing")}</option>
                  <option value="hospitality">{t("Hospitality")}</option>
                </select>
              </label>
              <label className="form-field">{t("City tier")}<select
                  value={profile.tier}
                  onChange={(e) => update('tier', Number(e.target.value))}
                >
                  <option value={1}>{t("Tier 1")}</option>
                  <option value={2}>{t("Tier 2")}</option>
                </select>
              </label>
              <label className="check-label span-two">
                <input
                  type="checkbox"
                  checked={profile.hasGstin}
                  onChange={(e) => update('hasGstin', e.target.checked)}
                />{' '}{t("My business has GST registration")}</label>
            </div>
          )}
          {step === 1 && (
            <div className="form-grid">
              <label className="form-field">{t("People in your team")}<input
                  type="number"
                  min={1}
                  max={1000}
                  value={profile.employees}
                  onChange={(e) => update('employees', Number(e.target.value))}
                />
                {errors.employees && <span className="field-error">{t(errors.employees)}</span>}
              </label>
              <label className="form-field">{t("Business locations")}<input
                  type="number"
                  min={1}
                  max={100}
                  value={profile.sites}
                  onChange={(e) => update('sites', Number(e.target.value))}
                />
                {errors.sites && <span className="field-error">{t(errors.sites)}</span>}
              </label>
              <label className="form-field span-two">{t("Monthly services budget (₹)")}<input
                  type="number"
                  min={500}
                  max={1000000}
                  value={profile.budget}
                  onChange={(e) => update('budget', Number(e.target.value))}
                />
                <input
                  aria-label={t("Monthly budget slider")}
                  type="range"
                  min={500}
                  max={30000}
                  step={500}
                  value={Math.min(profile.budget, 30000)}
                  onChange={(e) => update('budget', Number(e.target.value))}
                />
                <small className="muted">{t("An estimate is fine. We’ll show you what fits.")}</small>
                {errors.budget && <span className="field-error">{t(errors.budget)}</span>}
              </label>
            </div>
          )}
          {step === 2 && (
            <div className="priority-grid">
              {priorities.map(({ id, name, description, icon: Icon }) => (
                <button
                  key={id}
                  aria-pressed={profile.priorities.includes(id)}
                  className={
                    'priority-option ' + (profile.priorities.includes(id) ? 'selected' : '')
                  }
                  onClick={() =>
                    update(
                      'priorities',
                      profile.priorities.includes(id)
                        ? profile.priorities.filter((x) => x !== id)
                        : [...profile.priorities, id],
                    )
                  }
                >
                  <Icon size={24} />
                  <strong>{name}</strong>
                  <span>{description}</span>
                  <i>{profile.priorities.includes(id) && <Check size={14} />}</i>
                </button>
              ))}
              {errors.priorities && <span className="field-error">{errors.priorities}</span>}
            </div>
          )}
          <div className="form-navigation">
            <button
              className="button secondary"
              disabled={step === 0}
              onClick={() => setStep((s) => s - 1)}
            >
              <ArrowLeft size={16} />{t(" Back")}</button>
            <button className="button primary" disabled={busy} onClick={() => void next()}>
              {step === 2 ? t("See my matches") : t("Continue")} <ArrowRight size={16} />
            </button>
          </div>
        </div>
        <aside className="discovery-aside">
          <div className="discovery-illustration">
            <Building2 size={66} />
            <span className="orbit-icon one">
              <Wifi size={23} />
            </span>
            <span className="orbit-icon two">
              <Cloud size={23} />
            </span>
            <span className="orbit-icon three">
              <ShieldCheck size={23} />
            </span>
          </div>
          <h3>{t("Made for your business.")}<br />{t("Ready for your next chapter.")}</h3>
          <p>{t("Your answers help us match the right services, work out the details, and keep everything clear.")}</p>
          <div className="benefit-list">
            <span>
              <Check size={17} />{t(" No one-size-fits-all bundles")}</span>
            <span>
              <Check size={17} />{t(" Transparent demo pricing")}</span>
            <span>
              <Check size={17} />{t(" Your progress, saved as you go")}</span>
          </div>
          <span className="discovery-note">
            <HeartHandshake size={20} />{t(" Your goals lead the way.")}</span>
        </aside>
      </div>
    </>
  );
}
