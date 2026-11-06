export function Brand() {
  return (
    <div className="brand" aria-label="Accel Telecom">
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <path
          d="M7 37L24 9L41 37M14 27H34"
          fill="none"
          stroke="currentColor"
          strokeWidth="4.5"
          strokeLinecap="round"
        />
      </svg>
      <span>
        Accel<span className="brand-sync">Telecom</span>
        <small>BUSINESS, CONNECTED.</small>
      </span>
    </div>
  );
}
