import { useState } from 'react';

export function ShareLink() {
  const [status, setStatus] = useState('');

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setStatus('Link copied. Send it to the people in this group.');
    } catch {
      setStatus(`Copy this link: ${window.location.href}`);
    }
  };

  return (
    <div className="share">
      <button type="button" className="button button--quiet" onClick={() => void copy()}>
        Copy link to group
      </button>
      <p className="share__status muted" aria-live="polite">
        {status}
      </p>
    </div>
  );
}
