import { useI18n } from '../lib/i18n';
import { useState } from 'react';
import {
  ArrowRight,
  ChevronDown,
  Headphones,
  LifeBuoy,
  MessageCircle,
  Plus,
  Search,
  ShieldCheck,
} from 'lucide-react';
import { makeId } from '@sync/domain';
import { useWorkspace } from '../lib/store';
import { useAction } from '../lib/actions';
import { useNotify } from '../lib/feedback';
import { Modal } from '../components/Modal';
const faqs = [
  {
    q: 'How do I find the right plan for my business?',
    a: 'Use Find my fit to tell us about your team, locations, budget and priorities. Your recommendations follow the demo catalogue’s eligibility and service-dependency rules. You can compare plans and adjust quantities before checkout.',
  },
  {
    q: 'Why was another connection added to my bundle?',
    a: 'Some services need a compatible connection. For example, managed guest Wi-Fi needs an eligible internet plan. If your bundle does not already include one, the app adds an eligible connection and includes it in the total.',
  },
  {
    q: 'How do Digio and DigiLocker verification differ?',
    a: 'The demo offers two provider paths. Digio represents a guided verification flow; DigiLocker represents consent-led retrieval of issued documents. Both paths here are mock demonstrations, not live identity verification.',
  },
  {
    q: 'How do I change my installation time?',
    a: 'Open My orders, select the order and choose Change demo slot. You can save a preferred sample time and download a calendar event. This does not book a real technician.',
  },
  {
    q: 'Why do I have one bill for several services?',
    a: 'Billing brings the recurring charges for your business services into one consolidated invoice view. Open an invoice to see each service, quantity and charge, and download the demonstration PDF.',
  },
  {
    q: 'Will the demo payment charge my bank account?',
    a: 'No. Demo payment only changes the invoice status in your local sample workspace. It collects no card, UPI or bank information and moves no money.',
  },
  {
    q: 'Where is my demo data saved?',
    a: 'Your demo profile, selections, orders, document details and preferences are saved in this browser on this device. Uploaded document contents are not saved or sent to a provider. You can export or reset your demo workspace in Account & settings.',
  },
  {
    q: 'Can I speak to the voice advisor?',
    a: 'When the voice service is enabled and configured, open the advisor from Overview. Microphone recording and sharing with providers require your consent. The questionnaire is always available.',
  },
];
export default function Support() {
  const { t, locale } = useI18n();
  const { data, cloud, createTicket, resolveTicket } = useWorkspace(),
    notify = useNotify();
  const [search, setSearch] = useState(''),
    [open, setOpen] = useState<number | null>(0),
    [create, setCreate] = useState(false),
    [subject, setSubject] = useState(''),
    [category, setCategory] = useState('Connectivity'),
    [description, setDescription] = useState('');
  const { run, busy } = useAction();
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (subject.trim().length < 5 || description.trim().length < 12) {
      notify(t("Add a subject of at least 5 characters and a description of at least 12."));
      return;
    }
    await run(async () => {
      await createTicket({ subject: subject.trim(), category, description: description.trim() });
      setCreate(false);
      setSubject('');
      setDescription('');
      notify(
        cloud
          ? t("Your support request is saved to your account.")
          : t("Your demo support request is saved. No message was sent externally."),
      );
    });
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">{t("A HELPING HAND, WHEN YOU NEED IT.")}</span>
          <h1>{t("Let’s keep your business moving")}<span className="heading-dot">.</span>
          </h1>
          <p>{t("A little guidance can make a big difference.")}</p>
        </div>
        <button className="button primary" onClick={() => setCreate(true)}>
          <Plus size={17} />{t(" Create demo request")}</button>
      </div>
      <section className="support-hero">
        <span className="support-orb">
          <Headphones size={40} />
        </span>
        <div>
          <h2>{t("What can we help you with?")}</h2>
          <p>{t("Find a quick answer or keep a support request in your workspace.")}</p>
          <div className="search-field">
            <Search size={19} />
            <input
              aria-label={t("Search help")}
              placeholder={t("Try billing, verification, or installation…")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </section>
      <div className="support-layout">
        <section className="panel">
          <div className="section-heading">
            <h2>{t("A few helpful answers")}</h2>
            <LifeBuoy size={21} />
          </div>
          <div className="faq-list">
            {faqs
              .map((f, i) => ({ f, i }))
              .filter(({ f }) => (t(f.q) + ' ' + t(f.a)).toLocaleLowerCase(locale).includes(search.toLowerCase()))
              .map(({ f, i }) => (
                <div className={'faq ' + (open === i ? 'expanded' : '')} key={f.q}>
                  <button
                    aria-expanded={open === i}
                    aria-controls={'faq-' + i}
                    onClick={() => setOpen(open === i ? null : i)}
                  >
                    {t(f.q)}
                    <ChevronDown size={19} />
                  </button>
                  {open === i && <p id={'faq-' + i}>{t(f.a)}</p>}
                </div>
              ))}
          </div>
          {search &&
            !faqs.some((f) => (t(f.q) + ' ' + t(f.a)).toLocaleLowerCase(locale).includes(search.toLowerCase())) && (
              <div className="empty-state compact">
                <Search size={30} />
                <h3>{t("No answer found just yet.")}</h3>
                <p>{t("Try another word, or create a demo request.")}</p>
              </div>
            )}
        </section>
        <aside>
          <section className="panel">
            <span className="stat-icon red">
              <MessageCircle size={23} />
            </span>
            <h2>{t("Your support requests")}</h2>
            <p className="muted small">
              {cloud
                ? t("Support requests are saved securely to your customer account.")
                : t("Saved locally in this demo. No email or message is sent to a support team.")}
            </p>
            {data.tickets.length ? (
              <div className="ticket-list">
                {data.tickets.map((ticket) => (
                  <article key={ticket.id}>
                    <span className={'badge ' + (ticket.status === 'open' ? 'amber' : 'success')}>
                      {t(ticket.status)}
                    </span>
                    <strong>{ticket.subject}</strong>
                    <p>{ticket.description}</p>
                    <small>
                      {ticket.id} · {t(ticket.category)}
                    </small>
                    {ticket.status === 'open' && (
                      <button
                        className="text-button"
                        disabled={busy}
                        onClick={() =>
                          void run(async () => {
                            await resolveTicket(ticket.id);
                            notify('Request marked resolved.');
                          })
                        }
                      >{t("Mark resolved")}</button>
                    )}
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state compact">
                <ShieldCheck size={31} />
                <h3>{t("All quiet here.")}</h3>
                <p>{t("Your demo requests will appear here.")}</p>
              </div>
            )}
          </section>
        </aside>
      </div>
      {create && (
        <Modal title={t("Tell us what’s on your mind.")} onClose={() => setCreate(false)}>
          <form onSubmit={submit}>
            <label className="form-field">{t("What’s this about?")}<select value={category} onChange={(e) => setCategory(e.target.value)}>
                {[
                  'Connectivity',
                  'Installation',
                  'Billing',
                  'Verification',
                  'Account',
                  'Other',
                ].map((c) => (
                  <option key={c} value={c}>{t(c)}</option>
                ))}
              </select>
            </label>
            <label className="form-field">{t("Subject")}<input
                required
                minLength={5}
                maxLength={100}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder={t("A short summary")}
              />
            </label>
            <label className="form-field">{t("A little more detail")}<textarea
                required
                minLength={12}
                maxLength={2000}
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t("Let us know what you need help with.")}
              />
            </label>
            <p className="muted small">{t("This saves a local demo request. It does not contact a real support team.")}</p>
            <button type="submit" disabled={busy} className="button primary full">{t("Save demo request ")}<ArrowRight size={17} />
            </button>
          </form>
        </Modal>
      )}
    </>
  );
}
