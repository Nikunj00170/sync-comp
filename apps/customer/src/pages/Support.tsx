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
    a: 'The voice advisor is coming soon. The questionnaire provides the complete plan-finding experience now. Voice controls remain disabled until the live integration is ready.',
  },
];
export default function Support() {
  const { data, setData } = useWorkspace(),
    notify = useNotify();
  const [search, setSearch] = useState(''),
    [open, setOpen] = useState<number | null>(0),
    [create, setCreate] = useState(false),
    [subject, setSubject] = useState(''),
    [category, setCategory] = useState('Connectivity'),
    [description, setDescription] = useState('');
  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (subject.trim().length < 5 || description.trim().length < 12) {
      notify('Add a subject of at least 5 characters and a description of at least 12.');
      return;
    }
    const ticket = {
      id: makeId('HELP'),
      subject: subject.trim(),
      category,
      description: description.trim(),
      status: 'open' as const,
      createdAt: new Date().toISOString(),
    };
    setData((d) => ({ ...d, tickets: [ticket, ...d.tickets] }));
    setCreate(false);
    setSubject('');
    setDescription('');
    notify('Your demo support request is saved. No message was sent externally.');
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">A HELPING HAND, WHEN YOU NEED IT.</span>
          <h1>
            Let’s keep your business moving<span className="heading-dot">.</span>
          </h1>
          <p>A little guidance can make a big difference.</p>
        </div>
        <button className="button primary" onClick={() => setCreate(true)}>
          <Plus size={17} /> Create demo request
        </button>
      </div>
      <section className="support-hero">
        <span className="support-orb">
          <Headphones size={40} />
        </span>
        <div>
          <h2>What can we help you with?</h2>
          <p>Find a quick answer or keep a support request in your workspace.</p>
          <div className="search-field">
            <Search size={19} />
            <input
              aria-label="Search help"
              placeholder="Try billing, verification, or installation…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </section>
      <div className="support-layout">
        <section className="panel">
          <div className="section-heading">
            <h2>A few helpful answers</h2>
            <LifeBuoy size={21} />
          </div>
          <div className="faq-list">
            {faqs
              .map((f, i) => ({ f, i }))
              .filter(({ f }) => (f.q + ' ' + f.a).toLowerCase().includes(search.toLowerCase()))
              .map(({ f, i }) => (
                <div className={'faq ' + (open === i ? 'expanded' : '')} key={f.q}>
                  <button
                    aria-expanded={open === i}
                    aria-controls={'faq-' + i}
                    onClick={() => setOpen(open === i ? null : i)}
                  >
                    {f.q}
                    <ChevronDown size={19} />
                  </button>
                  {open === i && <p id={'faq-' + i}>{f.a}</p>}
                </div>
              ))}
          </div>
          {search &&
            !faqs.some((f) => (f.q + ' ' + f.a).toLowerCase().includes(search.toLowerCase())) && (
              <div className="empty-state compact">
                <Search size={30} />
                <h3>No answer found just yet.</h3>
                <p>Try another word, or create a demo request.</p>
              </div>
            )}
        </section>
        <aside>
          <section className="panel">
            <span className="stat-icon red">
              <MessageCircle size={23} />
            </span>
            <h2>Your support requests</h2>
            <p className="muted small">
              Saved locally in this demo. No email or message is sent to a support team.
            </p>
            {data.tickets.length ? (
              <div className="ticket-list">
                {data.tickets.map((t) => (
                  <article key={t.id}>
                    <span className={'badge ' + (t.status === 'open' ? 'amber' : 'success')}>
                      {t.status}
                    </span>
                    <strong>{t.subject}</strong>
                    <p>{t.description}</p>
                    <small>
                      {t.id} · {t.category}
                    </small>
                    {t.status === 'open' && (
                      <button
                        className="text-button"
                        onClick={() => {
                          setData((d) => ({
                            ...d,
                            tickets: d.tickets.map((x) =>
                              x.id === t.id ? { ...x, status: 'resolved' } : x,
                            ),
                          }));
                          notify('Demo request marked resolved.');
                        }}
                      >
                        Mark resolved
                      </button>
                    )}
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state compact">
                <ShieldCheck size={31} />
                <h3>All quiet here.</h3>
                <p>Your demo requests will appear here.</p>
              </div>
            )}
          </section>
        </aside>
      </div>
      {create && (
        <Modal title="Tell us what’s on your mind." onClose={() => setCreate(false)}>
          <form onSubmit={submit}>
            <label className="form-field">
              What’s this about?
              <select value={category} onChange={(e) => setCategory(e.target.value)}>
                {[
                  'Connectivity',
                  'Installation',
                  'Billing',
                  'Verification',
                  'Account',
                  'Other',
                ].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label className="form-field">
              Subject
              <input
                required
                minLength={5}
                maxLength={100}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="A short summary"
              />
            </label>
            <label className="form-field">
              A little more detail
              <textarea
                required
                minLength={12}
                maxLength={2000}
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Let us know what you need help with."
              />
            </label>
            <p className="muted small">
              This saves a local demo request. It does not contact a real support team.
            </p>
            <button type="submit" className="button primary full">
              Save demo request <ArrowRight size={17} />
            </button>
          </form>
        </Modal>
      )}
    </>
  );
}
