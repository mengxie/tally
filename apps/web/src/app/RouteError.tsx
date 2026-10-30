import { Link } from 'react-router';

export function RouteError() {
  return (
    <main className="shell__main page-message">
      <h1>Something went wrong</h1>
      <p>Reload the page to try again. Your groups are safe on the server.</p>
      <Link to="/">Go to the start page</Link>
    </main>
  );
}

export function NotFound() {
  return (
    <div className="page-message">
      <h1>Page not found</h1>
      <p>Check the address, or start from the beginning.</p>
      <Link to="/">Go to the start page</Link>
    </div>
  );
}
