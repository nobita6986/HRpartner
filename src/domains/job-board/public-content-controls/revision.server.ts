/**
 * public-content-controls/revision.server.ts — server-only content revision
 * hashing. The client never imports this file.
 *
 * Lives outside the client bundle by convention: imports from a `.server.ts`
 * file are tree-shaken from any client component, so the `node:crypto`
 * dependency never reaches the browser. The unit tests in this directory
 * are Node-only and can import both files.
 */

import { createHash } from 'node:crypto';
import type { StickyAnnouncementDto } from './types';
import {
  CONTENT_REVISION_LENGTH,
  buildRevisionInput,
  fnv1a32Hex,
} from './revision';

/**
 * Compute the content revision. The server-side path uses Node's
 * `node:crypto.createHash` (synchronous) and shortens the hex to the
 * canonical length. If the runtime does not expose `node:crypto`, we
 * fall back to the FNV-1a helper so this function is total.
 */
export function computeContentRevision(dto: StickyAnnouncementDto): string {
  const input = buildRevisionInput(dto);
  try {
    if (typeof createHash === 'function') {
      const hex = createHash('sha256').update(input, 'utf8').digest('hex');
      return hex.slice(0, CONTENT_REVISION_LENGTH);
    }
  } catch {
    // Fall through to the JS fallback below.
  }
  return fnv1a32Hex(input);
}