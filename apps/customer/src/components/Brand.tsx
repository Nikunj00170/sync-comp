export function Brand() {
  return (
    <div className="brand" aria-label="Airtel Sync">
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <path
          d="M9 29C9 16 34 7 38 17c4 10-13 25-22 18-6-5 4-16 17-15"
          fill="none"
          stroke="currentColor"
          strokeWidth="4.5"
          strokeLinecap="round"
        />
      </svg>
      <span>
        airtel<span className="brand-sync">sync</span>
        <small>BUSINESS, CONNECTED.</small>
      </span>
    </div>
  );
}
