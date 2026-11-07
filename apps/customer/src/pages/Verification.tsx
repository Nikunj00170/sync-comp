import { useI18n } from '../lib/i18n';
import { useEffect, useRef, useState } from 'react';
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
import { useAction } from '../lib/actions';
import { useNotify } from '../lib/feedback';
import { ApiError, customerApi } from '../lib/api';
import { accessToken } from '../lib/auth';
import { kycMessages } from '../lib/kycMessages';
export default function Verification() {
  const { t, locale } = useI18n();
  const {
      data,
      setData,
      cloud,
      saveKyc,
      verify: verifyKyc,
      upload,
      completeDocument,
      removeDocument,
      reservations,
    } = useWorkspace(),
    notify = useNotify();
  const [assessment, setAssessment] = useState<Awaited<
    ReturnType<typeof customerApi.assessKyc>
  > | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const k = data.kyc;
  const [consentDraft, setConsentDraft] = useState<boolean | undefined>();
  const { run, busy } = useAction();
  const [actionError, setActionError] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const blocked = busy || cooldown > 0;
  const needsReview = assessment !== null && assessment.status !== 'ready';
  const documentRevision = JSON.stringify(k.documents.map(doc => [doc.id, doc.uploadedAt]));
  useEffect(() => {
    if (!cooldown) return;
    const timer = setTimeout(() => setCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);
  useEffect(() => {
    setAssessment(null);
  }, [documentRevision]);
  function report(error: unknown) {
    setActionError((error as Error).message);
    if (error instanceof ApiError && error.status === 429)
      setCooldown(Math.max(1, Math.ceil(error.retryAfterSeconds ?? 3)));
  }
  function files(list: FileList | null) {
    if (!list) return;
    const selected = [...list];
    if (blocked) return;
    void run(async () => {
      setActionError('');
      try {
        for (const file of selected) await upload(file);
        notify(
          cloud
            ? t('Documents uploaded securely to your account.')
            : t('Document details saved in your demo workspace. File contents were not uploaded.'),
        );
      } catch (error) {
        report(error);
        throw error;
      } finally {
        if (input.current) input.current.value = '';
      }
    });
  }
  function verify() {
    void run(async () => {
      setActionError('');
      try {
        // The verification endpoint already performs OCR/registry assessment. Avoid doing it twice on success.
        await verifyKyc();
        notify(t('Demo verification complete. Your next step is ready.'));
      } catch (error) {
        try {
          if (cloud && error instanceof ApiError && error.status === 409) {
            const result = await customerApi.assessKyc(await accessToken());
            setAssessment(result);
            if (result.status !== 'ready') return;
          }
        } catch (assessmentError) {
          report(assessmentError);
          throw assessmentError;
        }
        report(error);
        throw error;
      }
    });
  }
  return (
    <>
      {actionError && (
        <p className="notice warning" role="alert">
          {t(actionError)}
        </p>
      )}
      {cooldown > 0 && (
        <p role="status">
          {t('Please wait {seconds} seconds before retrying.', { seconds: cooldown })}
        </p>
      )}
      {cloud && (
        <p className="notice">
          {t(
            'Smart KYC extracts uploaded documents and checks synthetic registries as of 15 July 2026. This is not live government verification.',
          )}
        </p>
      )}
      {cloud && reservations.some((doc) => doc.status !== 'uploaded') && (
        <section className="panel">
          <h2>{t('Pending uploads')}</h2>
          <p>
            {t(
              'Remove an abandoned reservation to free a document slot, then select the file again.',
            )}
          </p>
          {reservations
            .filter((doc) => doc.status !== 'uploaded')
            .map((doc) => (
              <div className="section-inline" key={doc.id}>
                <span>
                  {doc.name} · {t(doc.status)}
                </span>
                {doc.status === 'pending' && (
                  <button
                    className="text-button"
                    disabled={blocked}
                    onClick={() =>
                      void run(async () => {
                        setActionError('');
                        try {
                          await completeDocument(doc.id);
                          notify(t('Upload completed. Review consent to continue.'));
                        } catch (error) {
                          report(error);
                          throw error;
                        }
                      })
                    }
                  >
                    {t('Retry upload completion')}
                  </button>
                )}
                <button
                  className="text-button"
                  disabled={blocked}
                  onClick={() => void run(() => removeDocument(doc.id))}
                >
                  {t('Remove pending upload')}
                </button>
              </div>
            ))}
        </section>
      )}
      <div className="page-heading">
        <div>
          <span className="eyebrow">{t('A SIMPLER START.')}</span>
          <h1>
            {t('A little verification. A lot of confidence')}
            <span className="heading-dot">.</span>
          </h1>
          <p>{t('Your business, verified your way. Choose the path that suits you.')}</p>
        </div>
        <span className="badge neutral">{t('MOCK / SANDBOX EXPERIENCE')}</span>
      </div>
      {k.status === 'demo_verified' ? (
        <section className="verification-success panel">
          <span className="success-circle">
            <CheckCircle2 size={48} />
          </span>
          <span className="eyebrow">{t('ONE MORE THING, TAKEN CARE OF.')}</span>
          <h2>{t('You’re ready for your next step.')}</h2>
          <p>
            {t('Demo verification for ')}
            {data.profile.business}
            {t(' is complete through the')} {k.provider === 'digio' ? t('Digio') : t('DigiLocker')}
            {t(' mock path.')}
          </p>
          <p className="muted small">
            {t('This is a simulation. No provider or government identity check was performed.')}
          </p>
          <div className="button-row">
            <Link className="button primary" to={data.cart.length ? '/checkout' : '/plans'}>
              {data.cart.length ? t('Back to your bundle') : t('Explore plans')}{' '}
              <ArrowRight size={17} />
            </Link>
            <button
              className="button secondary"
              disabled={blocked}
              onClick={() => void run(() => saveKyc(k.provider, false))}
            >
              {t('Review demo documents')}
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
                  <h2>{t('Choose your verification path')}</h2>
                  <p>{t('Both options are simulated in this prototype.')}</p>
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
                    disabled={blocked}
                    onClick={() => void run(() => saveKyc(p.id, false))}
                    aria-pressed={k.provider === p.id}
                  >
                    <span className={'provider-logo ' + p.id}>
                      <p.icon size={30} />
                    </span>
                    <span className="provider-radio">
                      {k.provider === p.id && <Check size={13} />}
                    </span>
                    <h3>{t(p.name)}</h3>
                    <strong>{t(p.label)}</strong>
                    <p>{t(p.copy)}</p>
                    <span className="badge neutral">{t('Demo adapter')}</span>
                  </button>
                ))}
              </div>
            </section>
            <section className="panel">
              <div className="section-heading">
                <div>
                  <span className="step-label">02</span>
                  <h2>{t('Your document checklist')}</h2>
                  <p>{t('Add business registration and address/signatory document details.')}</p>
                </div>
                <button
                  className="text-button"
                  hidden={cloud}
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
                  {t('Use sample documents')}
                </button>
              </div>
              <input
                className="visually-hidden"
                ref={input}
                disabled={blocked}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                multiple
                aria-label={t('Add verification documents')}
                onChange={(e) => files(e.target.files)}
              />
              <button
                className="upload-zone"
                disabled={blocked}
                onClick={() => input.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  files(e.dataTransfer.files);
                }}
              >
                <UploadCloud size={30} />
                <strong>{t('Drop your files here, or browse')}</strong>
                <span>{t('PDF, JPG or PNG · Up to 10 MB each')}</span>
              </button>
              <p className="muted small">
                {t(
                  cloud
                    ? 'Cloud mode uploads private file contents. Delete them here when no longer needed.'
                    : 'Demo mode saves file names and sizes on this device. File contents are not stored or sent to a provider.',
                )}
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
                        {Math.max(1, Math.round(d.size / 1024))}
                        {t(cloud ? ' KB · Uploaded privately' : ' KB · Demo details saved')}
                      </small>
                    </span>
                    <button
                      className="icon-button"
                      aria-label={t('Remove ') + d.name}
                      disabled={blocked}
                      onClick={() => void run(() => removeDocument(d.id))}
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                ))}
              </div>
            </section>
            <section className="panel">
              <span className="step-label">03</span>
              <h2>{t('Your consent. Your control.')}</h2>
              <label className="check-label consent-block">
                <input
                  type="checkbox"
                  checked={consentDraft ?? k.consent}
                  disabled={blocked || !k.provider}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setConsentDraft(checked);
                    void run(async () => {
                      try {
                        await saveKyc(k.provider, checked);
                      } finally {
                        setConsentDraft(undefined);
                      }
                    });
                  }}
                />
                <span>
                  {t(
                    cloud
                      ? 'I consent to OCR extraction and synthetic registry checks of these documents to assess business onboarding. Delete documents here to withdraw them. This does not verify identity with a live provider.'
                      : 'I consent to this simulated verification of the document details in my demo workspace. I understand this does not verify my identity with a live provider.',
                  )}
                </span>
              </label>
              {cloud && assessment && (
                <div className="notice" role="status">
                  <strong>
                    {t(
                      assessment.status === 'ready'
                        ? 'Document checks passed'
                        : 'Documents need review',
                    )}
                  </strong>
                  <ul>
                    {assessment.issues.map((issue) => (
                      <li key={issue}>{t(kycMessages[issue] || issue)}</li>
                    ))}
                    {assessment.documents.map((doc) => (
                      <li key={doc.documentId}>
                        {k.documents.find((item) => item.id === doc.documentId)?.name}:{' '}
                        {doc.maskedIdentifier}{' '}
                        {doc.issues.length
                          ? doc.issues.map((issue) => t(kycMessages[issue] || issue)).join(' · ')
                          : t('Document checks passed')}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {needsReview && <p className="muted small">{t('Replace or remove the documents that need review before trying again.')}</p>}
              <button
                className="button primary"
                disabled={blocked || needsReview || !k.provider || !k.consent || k.documents.length < 2}
                onClick={verify}
              >
                {t('Complete demo verification ')}
                <ArrowRight size={17} />
              </button>
            </section>
          </div>
          <aside>
            <section className="panel verification-note">
              <span className="stat-icon green">
                <FolderLock size={28} />
              </span>
              <h3>{t('A little care, at every step.')}</h3>
              <p>{t('Your business details deserve a thoughtful approach.')}</p>
              <div className="benefit-list">
                <span>
                  <LockKeyhole size={18} />
                  {t(' Private by design')}
                </span>
                <span>
                  <ShieldCheck size={18} />
                  {t(' Your consent comes first')}
                </span>
                <span>
                  <FileCheck2 size={18} />
                  {t(' Clear document status')}
                </span>
              </div>
              <div className="notice small">
                {t(
                  'Live Digio and DigiLocker verification will be enabled after provider integration. All outcomes here are labelled demo.',
                )}
              </div>
            </section>
          </aside>
        </div>
      )}
    </>
  );
}
