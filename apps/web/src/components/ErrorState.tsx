import { ApiError } from '../api/client';

export function describeError(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  return 'Tally could not reach the server. Check your connection and try again.';
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  return (
    <div className="notice" role="alert">
      <p>{describeError(error)}</p>
      <button type="button" className="button button--quiet" onClick={onRetry}>
        Try again
      </button>
    </div>
  );
}
