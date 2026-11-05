import { useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Check,
  CheckCircle2,
  FileCheck2,
  FileText,
  FolderLock,
  Landmark,
  LockKeyhole,
  ShieldCheck,
  Trash2,
  UploadCloud,
} from 'lucide-react';
import { makeId, type DocumentMeta } from '@sync/domain';
import { useWorkspace } from '../lib/store';
import { useNotify } from '../lib/feedback';
export default function Verification() {
  const { data, setData } = useWorkspace(),
    notify = useNotify();
  const input = useRef<HTMLInputElement>(null);
  const k = data.kyc;
  function files(list: FileList | null) {
    if (!list) return;
    const valid: DocumentMeta[] = [];
    for (const file of [...list]) {
      if (!['application/pdf', 'image/png', 'image/jpeg'].includes(file.type)) {
        notify(file.name + ': choose a PDF, PNG or JPEG.');
        continue;
      }
      if (file.size > 10 * 1024 * 1024) {
        notify(file.name + ': maximum file size is 10 MB.');
        continue;
      }
      valid.push({
        id: makeId('DOC'),
        name: file.name,
        size: file.size,
        type: file.type,
        uploadedAt: new Date().toISOString(),
      });
    }
    setData((d) => ({
      ...d,
      kyc: { ...d.kyc, documents: [...d.kyc.documents, ...valid].slice(0, 8) },
    }));
    if (valid.length)
      notify('Document details saved in your demo workspace. File contents were not uploaded.');
    if (input.current) input.current.value = '';
  }
  function verify() {
    if (!k.provider || !k.consent || k.documents.length < 2) return;
    setData((d) => ({
      ...d,
      kyc: { ...d.kyc, status: 'demo_verified', verifiedAt: new Date().toISOString() },
      notifications: [
        {
          id: makeId('N'),
          title: 'Demo verification complete',
          text: 'Your mock business verification is complete. You can now try demo checkout.',
          route: '/verification',
          read: false,
          createdAt: new Date().toISOString(),
        },
        ...d.notifications,
      ],
    }));
    notify('Demo verification complete. Your next step is ready.');
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">A SIMPLER START.</span>
          <h1>
            A little verification. A lot of confidence<span className="heading-dot">.</span>
          </h1>
          <p>Your business, verified your way. Choose the path that suits you.</p>
        </div>
        <span className="badge neutral">MOCK / SANDBOX EXPERIENCE</span>
      </div>
      {k.status === 'demo_verified' ? (
        <section className="verification-success panel">
          <span className="success-circle">
            <CheckCircle2 size={48} />
          </span>
          <span className="eyebrow">ONE MORE THING, TAKEN CARE OF.</span>
          <h2>You’re ready for your next step.</h2>
          <p>
            Demo verification for {data.profile.business} is complete through the{' '}
            {k.provider === 'digio' ? 'Digio' : 'DigiLocker'} mock path.
          </p>
          <p className="muted small">
            This is a simulation. No provider or government identity check was performed.
          </p>
          <div className="button-row">
            <Link className="button primary" to={data.cart.length ? '/checkout' : '/plans'}>
              {data.cart.length ? 'Back to your bundle' : 'Explore plans'} <ArrowRight size={17} />
            </Link>
            <button
              className="button secondary"
              onClick={() =>
                setData((d) => ({ ...d, kyc: { ...d.kyc, status: 'pending', consent: false } }))
              }
            >
              Review demo documents
            </button>
          </div>
        </section>
      ) : (
        <div className="verification-layout">
          <div>
            <section className="panel">
              <div className="section-heading">
                <div>
                  <span className="step-label">01</span>
                  <h2>Choose your verification path</h2>
                  <p>Both options are simulated in this prototype.</p>
                </div>
              </div>
              <div className="provider-grid">
                {[
                  {
                    id: 'digio' as const,
                    name: 'Digio',
                    label: 'Guided digital verification',
                    copy: 'A guided journey to submit your business documents and track verification.',
                    icon: ShieldCheck,
                  },
                  {
                    id: 'digilocker' as const,
                    name: 'DigiLocker',
                    label: 'Consent-led document retrieval',
                    copy: 'A familiar way to share issued documents, with your permission.',
                    icon: Landmark,
                  },
                ].map((p) => (
                  <button
                    className={'provider-card ' + (k.provider === p.id ? 'selected' : '')}
                    key={p.id}
                    onClick={() => setData((d) => ({ ...d, kyc: { ...d.kyc, provider: p.id } }))}
                    aria-pressed={k.provider === p.id}
                  >
                    <span className={'provider-logo ' + p.id}>
                      <p.icon size={30} />
                    </span>
                    <span className="provider-radio">
                      {k.provider === p.id && <Check size={13} />}
                    </span>
                    <h3>{p.name}</h3>
                    <strong>{p.label}</strong>
                    <p>{p.copy}</p>
                    <span className="badge neutral">Demo adapter</span>
                  </button>
                ))}
              </div>
            </section>
            <section className="panel">
              <div className="section-heading">
                <div>
                  <span className="step-label">02</span>
                  <h2>Your document checklist</h2>
                  <p>Add business registration and address/signatory document details.</p>
                </div>
                <button
                  className="text-button"
                  onClick={() => {
                    setData((d) => ({
                      ...d,
                      kyc: {
                        ...d.kyc,
                        documents: [
                          {
                            id: makeId('DOC'),
                            name: 'Sample_business_registration.pdf',
                            size: 84200,
                            type: 'application/pdf',
                            uploadedAt: new Date().toISOString(),
                          },
                          {
                            id: makeId('DOC'),
                            name: 'Sample_business_address.pdf',
                            size: 62300,
                            type: 'application/pdf',
                            uploadedAt: new Date().toISOString(),
                          },
                        ],
                      },
                    }));
                    notify('Two fictional sample document details added.');
                  }}
                >
                  Use sample documents
                </button>
              </div>
              <input
                className="visually-hidden"
                ref={input}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                multiple
                aria-label="Add verification documents"
                onChange={(e) => files(e.target.files)}
              />
              <button
                className="upload-zone"
                onClick={() => input.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  files(e.dataTransfer.files);
                }}
              >
                <UploadCloud size={30} />
                <strong>Drop your files here, or browse</strong>
                <span>PDF, JPG or PNG · Up to 10 MB each</span>
              </button>
              <p className="muted small">
                Demo mode saves file names and sizes on this device. File contents are not stored or
                sent to a provider.
              </p>
              <div className="document-list">
                {k.documents.map((d) => (
                  <div key={d.id}>
                    <span className="stat-icon blue">
                      <FileText size={19} />
                    </span>
                    <span>
                      <strong>{d.name}</strong>
                      <small>
                        {Math.max(1, Math.round(d.size / 1024))} KB · Demo details saved
                      </small>
                    </span>
                    <button
                      className="icon-button"
                      aria-label={'Remove ' + d.name}
                      onClick={() =>
                        setData((s) => ({
                          ...s,
                          kyc: {
                            ...s.kyc,
                            documents: s.kyc.documents.filter((x) => x.id !== d.id),
                          },
                        }))
                      }
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                ))}
              </div>
            </section>
            <section className="panel">
              <span className="step-label">03</span>
              <h2>Your consent. Your control.</h2>
              <label className="check-label consent-block">
                <input
                  type="checkbox"
                  checked={k.consent}
                  onChange={(e) =>
                    setData((d) => ({ ...d, kyc: { ...d.kyc, consent: e.target.checked } }))
                  }
                />
                <span>
                  I consent to this simulated verification of the document details in my demo
                  workspace. I understand this does not verify my identity with a live provider.
                </span>
              </label>
              <button
                className="button primary"
                disabled={!k.provider || !k.consent || k.documents.length < 2}
                onClick={verify}
              >
                Complete demo verification <ArrowRight size={17} />
              </button>
            </section>
          </div>
          <aside>
            <section className="panel verification-note">
              <span className="stat-icon green">
                <FolderLock size={28} />
              </span>
              <h3>A little care, at every step.</h3>
              <p>Your business details deserve a thoughtful approach.</p>
              <div className="benefit-list">
                <span>
                  <LockKeyhole size={18} /> Private by design
                </span>
                <span>
                  <ShieldCheck size={18} /> Your consent comes first
                </span>
                <span>
                  <FileCheck2 size={18} /> Clear document status
                </span>
              </div>
              <div className="notice small">
                Live Digio and DigiLocker verification will be enabled after provider integration.
                All outcomes here are labelled demo.
              </div>
            </section>
          </aside>
        </div>
      )}
    </>
  );
}
