import { Link, Outlet } from 'react-router';
import { Wordmark } from '../components/Wordmark';

export function Layout() {
  return (
    <div className="shell">
      <header className="shell__header">
        <Link to="/" className="shell__home" aria-label="Tally home">
          <Wordmark />
        </Link>
      </header>
      <main className="shell__main">
        <Outlet />
      </main>
      <footer className="shell__footer">
        <p>
          No sign-up. Anyone with a group’s link can see and edit it, so share it only with the
          people in the group.
        </p>
      </footer>
    </div>
  );
}
