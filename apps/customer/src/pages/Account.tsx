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
import { customerApi } from '../lib/api';
export default function Account() {
  const { data, setData, reset } = useWorkspace(),
    notify = useNotify();
  const [profile, setProfile] = useState<Profile>({ ...data.profile }),
    [confirm, setConfirm] = useState(false),
    [error, setError] = useState(''),
    [connection, setConnection] = useState(''),
    [busy, setBusy] = useState(false);
  useEffect(() => setProfile({ ...data.profile }), [data.profile]);
  function save(e: React.FormEvent) {
    e.preventDefault();
    const parsed = profileSchema.safeParse(profile);
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    setError('');
    setData((d) => ({ ...d, profile: parsed.data }));
    notify('Your demo business profile is saved.');
  }
  async function checkConnection() {
    try {
      setBusy(true);
      const user = await authManager().getUser();
      if (!user || user.expired)
        throw new Error(
          'Sign in to your Cognito account first. The demo workspace remains available without sign-in.',
        );
      await customerApi.profile(user.access_token);
      setConnection('Customer API responded successfully.');
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
          <span className="eyebrow">A WORKSPACE THAT FEELS LIKE YOU.</span>
          <h1>
            Your business, your way<span className="heading-dot">.</span>
          </h1>
          <p>Keep your details up to date and your experience just right.</p>
        </div>
        <span className="badge neutral">LOCAL DEMO PROFILE</span>
      </div>
      <div className="account-layout">
        <div>
          <form className="panel" onSubmit={save}>
            <div className="section-heading">
              <div>
                <h2>Business details</h2>
                <p>The little details behind your big ambitions.</p>
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
                  {f.label}
                  <input
                    type={f.key === 'email' ? 'email' : f.key === 'phone' ? 'tel' : 'text'}
                    value={profile[f.key]}
                    onChange={(e) => setProfile((p) => ({ ...p, [f.key]: e.target.value }))}
                  />
                </label>
              ))}
              <label className="form-field">
                Team size
                <input
                  type="number"
                  min={1}
                  max={1000}
                  value={profile.employees}
                  onChange={(e) => setProfile((p) => ({ ...p, employees: Number(e.target.value) }))}
                />
              </label>
              <label className="form-field span-two">
                Business address
                <textarea
                  value={profile.address}
                  onChange={(e) => setProfile((p) => ({ ...p, address: e.target.value }))}
                />
              </label>
            </div>
            {error && (
              <p className="field-error" role="alert">
                {error}
              </p>
            )}
            <button className="button primary" type="submit">
              <Save size={16} /> Save profile
            </button>
          </form>
          <section className="panel">
            <div className="section-heading">
              <div>
                <h2>A few personal touches</h2>
                <p>Preferences are saved in your local demo.</p>
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
                  <strong>{item.label}</strong>
                  <small>{item.text}</small>
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
            <p className="muted small">Email delivery is not connected in this demo.</p>
          </section>
        </div>
        <aside>
          <section className="panel">
            <span className="stat-icon green">
              <LockKeyhole size={25} />
            </span>
            <h2>Your data, in your hands.</h2>
            <p className="muted">
              This demo uses sample data saved in your browser. Document file contents are never
              saved. You can take a copy or start fresh.
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
              <Download size={16} /> Export demo workspace
            </button>
            <button className="text-button danger full center" onClick={() => setConfirm(true)}>
              <RotateCcw size={15} /> Reset demo workspace
            </button>
          </section>
          <section className="panel account-connection">
            <span className="stat-icon blue">
              <UserRound size={24} />
            </span>
            <h2>Your live account</h2>
            <p className="muted">
              Cognito sign-in is separate from your demo workspace. Your live customer data appears
              after the customer API is connected.
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
              <LogIn size={16} /> Sign in with Cognito
            </button>
            <button className="text-button full center" disabled={busy} onClick={checkConnection}>
              {busy ? 'Checking…' : 'Check account connection'} <ArrowRight size={15} />
            </button>
            <button
              className="text-button full center"
              onClick={() => signOut().catch((e) => notify(e.message))}
            >
              Sign out of live account
            </button>
            {connection && (
              <p className="connection-message" role="status">
                {connection}
              </p>
            )}
          </section>
        </aside>
      </div>
      {confirm && (
        <Modal title="A fresh start for your demo?" onClose={() => setConfirm(false)}>
          <p>
            This resets the sample profile, saved plans, demo orders, payments, and support requests
            on this device.
          </p>
          <p className="muted">Your AWS resources and live account are unaffected.</p>
          <div className="button-row">
            <button className="button secondary" onClick={() => setConfirm(false)}>
              Keep my workspace
            </button>
            <button
              className="button primary"
              onClick={() => {
                reset();
                localStorage.removeItem('airtel-sync:discovery');
                setConfirm(false);
                notify('Your demo workspace has a fresh start.');
              }}
            >
              Reset demo
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
