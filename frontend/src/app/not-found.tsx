import Link from 'next/link';
import Mascot from '../components/brand/Mascot';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-ink-50 p-6 text-center">
      <Mascot pose="curious" size="md" decorative />
      <p className="text-5xl font-extrabold text-ink-300" aria-hidden="true">404</p>
      <h1 className="text-xl font-bold text-ink-800">Page not found</h1>
      <p className="text-sm text-ink-400">The page you're looking for doesn't exist or has been moved.</p>
      {/* "/" is the landing page of whichever KadeHub site this is */}
      <Link href="/"
        className="mt-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white"
        style={{ background: '#00796B' }}>
        Go to home page
      </Link>
    </div>
  );
}
