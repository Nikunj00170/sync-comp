import { useI18n } from '../lib/i18n';
import { useEffect, useState } from 'react';
import {
  ArrowRight,
  Building2,
  Download,
  ExternalLink,
  LockKeyhole,
  LogIn,
  RotateCcw,
  Save,
  Settings2,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import { profileSchema, type Profile } from '@sync/domain';
import { useWorkspace } from '../lib/store';
import { useNotify } from '../lib/feedback';
import { Modal } from '../components/Modal';
import { download } from '../lib/downloads';
import { authManager, signIn, signOut } from '../lib/auth';
import { useAction } from '../lib/actions';
export default function Account() {
  const { t, locale } = useI18n();
  const {
      data,
      setData,
      reset,
      cloud,
      connection: accountStatus,
      connectionError,
      refresh,
      saveProfile,
    } = useWorkspace(),
    notify = useNotify();
  const [profile, setProfile] = useState<Profile>({ ...data.profile }),
    [confirm, setConfirm] = useState(false),
    [error, setError] = useState(''),
    [connection, setConnection] = useState(''),
    [busy, setBusy] = useState(false);
  useEffect(() => setProfile({ ...data.profile }), [data.profile]);
  const action = useAction();
  async function save(e: React.FormEvent) {
    e.preventDefault();
    const parsed = profileSchema.safeParse(profile);
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    setError('');
    await action.run(async () => {
      await saveProfile(parsed.data);
      notify(
        cloud
          ? t("Your business profile is saved to your account.")
          : t("Your demo business profile is saved."),
      );
    });
  }
  async function checkConnection() {
    try {
      setBusy(true);
      const user = await authManager().getUser();
      if (!user || user.expired)
        throw new Error(
          'Sign in to your Cognito account first. The demo workspace remains available without sign-in.',
        );
      setConnection('');
      await refresh();
    } catch (e) {
      setConnection((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">{t("A WORKSPACE THAT FEELS LIKE YOU.")}</span>
          <h1>{t("Your business, your way")}<span className="heading-dot">.</span>
          </h1>
          <p>{t("Keep your details up to date and your experience just right.")}</p>
        </div>
        <span className="badge neutral">{cloud ? t("CUSTOMER PROFILE") : t("LOCAL DEMO PROFILE")}</span>
      </div>
      <div className="account-layout">
        <div>
          <form className="panel" onSubmit={save} hidden={cloud && accountStatus !== 'ready'}>
            <div className="section-heading">
              <div>
                <h2>{t("Business details")}</h2>
                <p>{t("The little details behind your big ambitions.")}</p>
              </div>
              <span className="stat-icon red">
                <Building2 size={22} />
              </span>
            </div>
            <div className="form-grid">
              {(
                [
                  { key: 'business', label: 'Business name' },
                  { key: 'name', label: 'Your name' },
                  { key: 'email', label: 'Email address' },
                  { key: 'city', label: 'City' },
                  { key: 'phone', label: 'Phone (optional)' },
                ] as const
              ).map((f) => (
                <label className="form-field" key={f.key}>
                  {t(f.label)}
                  <input
                    type={f.key === 'email' ? 'email' : f.key === 'phone' ? 'tel' : 'text'}
                    value={profile[f.key]}
                    onChange={(e) => setProfile((p) => ({ ...p, [f.key]: e.target.value }))}
                  />
                </label>
              ))}
              <label className="form-field">{t("Team size")}<input
                  type="number"
                  min={1}
                  max={1000}
                  value={profile.employees}
                  onChange={(e) => setProfile((p) => ({ ...p, employees: Number(e.target.value) }))}
                />
              </label>
              <label className="form-field">{t("Industry")}<select
                  value={profile.industry}
                  onChange={(e) =>
                    setProfile((p) => ({ ...p, industry: e.target.value as Profile['industry'] }))
                  }
                >
                  {['professional', 'retail', 'manufacturing', 'hospitality'].map((value) => (
                    <option key={value} value={value}>
                      {t(value)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="form-field">{t("City tier")}<select
                  value={profile.tier}
                  onChange={(e) => setProfile((p) => ({ ...p, tier: Number(e.target.value) }))}
                >
                  <option value={1}>{t("Tier 1")}</option>
                  <option value={2}>{t("Tier 2")}</option>
                </select>
              </label>
              <label className="form-field">{t("Locations")}<input
                  type="number"
                  min={1}
                  max={100}
                  value={profile.sites}
                  onChange={(e) => setProfile((p) => ({ ...p, sites: Number(e.target.value) }))}
                />
              </label>
              <label className="form-field">{t("Monthly budget (INR)")}<input
                  type="number"
                  min={500}
                  max={1000000}
                  value={profile.budget}
                  onChange={(e) => setProfile((p) => ({ ...p, budget: Number(e.target.value) }))}
                />
              </label>
              <label className="check-label">
                <input
                  type="checkbox"
                  checked={profile.hasGstin}
                  onChange={(e) => setProfile((p) => ({ ...p, hasGstin: e.target.checked }))}
                />{t("GST registered")}</label>
              <fieldset className="form-field">
                <legend>{t("Business priorities")}</legend>
                {['productivity', 'security', 'reliability', 'growth'].map((priority) => (
                  <label className="check-label" key={priority}>
                    <input
                      type="checkbox"
                      checked={profile.priorities.includes(priority)}
                      onChange={(e) =>
                        setProfile((p) => ({
                          ...p,
                          priorities: e.target.checked
                            ? [...p.priorities, priority]
                            : p.priorities.filter((x) => x !== priority),
                        }))
                      }
                    />
                    {t(priority)}
                  </label>
                ))}
              </fieldset>
              <label className="form-field span-two">{t("Business address")}<textarea
                  value={profile.address}
                  onChange={(e) => setProfile((p) => ({ ...p, address: e.target.value }))}
                />
              </label>
            </div>
            {error && (
              <p className="field-error" role="alert">
                {t(error)}
              </p>
            )}
            <button
              className="button primary"
              type="submit"
              disabled={action.busy || (cloud && accountStatus !== 'ready')}
            >
              <Save size={16} />{t(" Save profile")}</button>
          </form>
          <section className="panel">
            <div className="section-heading">
              <div>
                <h2>{t("A few personal touches")}</h2>
                <p>{t("Preferences are saved in your local demo.")}</p>
              </div>
              <Settings2 size={22} />
            </div>
            {[
              {
                key: 'emailUpdates' as const,
                label: 'Service updates',
                text: 'Remember my preference for future service-update emails.',
              },
              {
                key: 'reminders' as const,
                label: 'Bill reminders',
                text: 'Remember my preference for future billing reminders.',
              },
              {
                key: 'compactMotion' as const,
                label: 'Reduce motion',
                text: 'Keep transitions and decorative animation to a minimum.',
              },
            ].map((item) => (
              <label className="preference-row" key={item.key}>
                <span>
                  <strong>{t(item.label)}</strong>
                  <small>{t(item.text)}</small>
                </span>
                <input
                  role="switch"
                  type="checkbox"
                  checked={data.preferences[item.key]}
                  onChange={(e) =>
                    setData((d) => ({
                      ...d,
                      preferences: { ...d.preferences, [item.key]: e.target.checked },
                    }))
                  }
                />
              </label>
            ))}
            <p className="muted small">{t("Email delivery is not connected in this demo.")}</p>
          </section>
        </div>
        <aside>
          <section className="panel">
            <span className="stat-icon green">
              <LockKeyhole size={25} />
            </span>
            <h2>{t("Your data, in your hands.")}</h2>
            <p className="muted">
              {cloud
                ? t("Your account records are stored by the customer API. Uploaded documents use private storage. You may export the records currently shown.")
                : t("This demo uses sample data saved in your browser. Document file contents are never saved. You can take a copy or start fresh.")}
            </p>
            <button
              className="button secondary full"
              onClick={() => {
                download(
                  new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }),
                  'accel-telecom-demo-workspace.json',
                )
                  .then(() => notify('Your demo workspace export is ready.'))
                  .catch(() => notify('The workspace could not be exported. Please try again.'));
              }}
            >
              <Download size={16} />{t(" Export demo workspace")}</button>
            <button
              className="text-button danger full center"
              hidden={cloud}
              onClick={() => setConfirm(true)}
            >
              <RotateCcw size={15} />{t(" Reset demo workspace")}</button>
          </section>
          <section className="panel account-connection">
            <span className="stat-icon blue">
              <UserRound size={24} />
            </span>
            <h2>{t("Your live account")}</h2>
            <p className="muted">
              {cloud
                ? t("Sign in to load your customer records. Failed requests never fall back to demo data.")
                : t("This build is using the local demo. Configure VITE_API_BASE_URL and Cognito to use your customer account.")}
            </p>
            <button
              className="button secondary full"
              onClick={() =>
                signIn().catch((e) => {
                  setConnection(e.message);
                  notify(e.message);
                })
              }
            >
              <LogIn size={16} />{t(" Sign in with Cognito")}</button>
            <button className="text-button full center" disabled={busy} onClick={checkConnection}>
              {busy ? t("Checking…") : t("Check account connection")} <ArrowRight size={15} />
            </button>
            <button
              className="text-button full center"
              onClick={() => signOut().catch((e) => notify(e.message))}
            >{t("Sign out of live account")}</button>
            {cloud && (
              <p className="connection-message" role="status">
                {accountStatus === 'ready'
                  ? t("Customer API connected.")
                  : accountStatus === 'loading'
                    ? t("Loading account…")
                    : accountStatus === 'error'
                      ? t(connectionError || 'Your workspace could not be loaded')
                      : t("Sign in to load your account.")}
              </p>
            )}
            {connection && (
              <p className="connection-message" role="status">
                {t(connection)}
              </p>
            )}
          </section>
        </aside>
      </div>
      {confirm && (
        <Modal title={t("A fresh start for your demo?")} onClose={() => setConfirm(false)}>
          <p>{t("This resets the sample profile, saved plans, demo orders, payments, and support requests on this device.")}</p>
          <p className="muted">{t("Your AWS resources and live account are unaffected.")}</p>
          <div className="button-row">
            <button className="button secondary" onClick={() => setConfirm(false)}>{t("Keep my workspace")}</button>
            <button
              className="button primary"
              onClick={() => {
                reset();
                localStorage.removeItem('airtel-sync:discovery');
                setConfirm(false);
                notify('Your demo workspace has a fresh start.');
              }}
            >{t("Reset demo")}</button>
          </div>
        </Modal>
      )}
    </>
  );
}
