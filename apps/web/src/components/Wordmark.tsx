/** Four strokes and a gate: a tally mark, drawn in ink. */
export function Wordmark() {
  return (
    <span className="wordmark">
      <svg className="wordmark__mark" viewBox="0 0 32 24" aria-hidden="true" focusable="false">
        <g fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
          <path d="M6 3v18M12 3v18M18 3v18M24 3v18" />
          <path d="M2 17 29 7" />
        </g>
      </svg>
      Tally
    </span>
  );
}
