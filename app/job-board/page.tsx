import { permanentRedirect } from 'next/navigation';

/**
 * Compatibility route for the original MP-1 job board URL.
 * The canonical public job marketplace lives at `/`.
 */
export default function LegacyJobBoardPage(): never {
  permanentRedirect('/');
}
