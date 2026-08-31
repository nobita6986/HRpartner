import { permanentRedirect } from 'next/navigation';

/**
 * Compatibility route for links published before the marketplace was consolidated.
 * The canonical public job marketplace lives at `/`.
 */
export default function LegacyJobsPage(): never {
  permanentRedirect('/');
}
