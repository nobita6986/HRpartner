/**
 * public-settings.service.ts — AV1 HomepageSettings service layer.
 *
 * Single source of truth for reading + bootstrapping the singleton settings row.
 * Two contracts:
 *
 *   1. `getHomepageSettings(prisma)` — idempotent read. If the row is missing
 *      (e.g. migration not applied on a fresh DB, or row accidentally deleted),
 *      this function bootstraps it with defaults (9, 12) and returns the DTO.
 *      The bootstrap uses `upsert` so concurrent calls don't create duplicates.
 *
 *   2. `updateHomepageSettings(prisma, input, actorId)` — ADMIN-only write path.
 *      Validates the input, clamps values, and writes via `update` (NOT upsert —
 *      the row must already exist; if missing, an error is raised, because admin
 *      write should never implicitly create).
 *
 * Both functions read/write ONLY through Prisma — they are wrapped by route
 * handlers that handle auth, cache tags, and rate limits.
 */

import type { Prisma, PrismaClient } from '@prisma/client';
import {
  BEST_JOBS_PAGE_SIZE_DEFAULT,
  LISTING_PAGE_SIZE_DEFAULT,
  clampListingPageSize,
  normalizeBestJobsPageSize,
  type HomepageSettingsDto,
} from './public-types';

export const HOMEPAGE_SETTINGS_SINGLETON_ID = 'default' as const;

/** Subset of Prisma client surface used by this service — accepts both PrismaClient and TransactionClient. */
type SettingsDelegate = Prisma.HomepageSettingsDelegate;
type SettingsClient =
  | { homepageSettings: SettingsDelegate }
  | (Prisma.TransactionClient & { homepageSettings: SettingsDelegate });

/** Internal row shape from Prisma (matches schema.prisma `HomepageSettings`). */
type SettingsRow = {
  id: string;
  bestJobsPageSize: number;
  listingPageSize: number;
  updatedAt: Date;
};

/** Map a Prisma row to the public DTO. Pure function — safe for tests. */
export function toHomepageSettingsDto(row: SettingsRow): HomepageSettingsDto {
  return {
    id: 'default',
    bestJobsPageSize: normalizeBestJobsPageSize(row.bestJobsPageSize),
    listingPageSize: clampListingPageSize(row.listingPageSize),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/**
 * Read the singleton settings row. If missing, bootstrap it with defaults.
 *
 * Idempotent — concurrent callers will all read the same row. The `upsert`
 * pattern is safe because the table has a singleton CHECK constraint.
 */
export async function getHomepageSettings(prisma: SettingsClient): Promise<HomepageSettingsDto> {
  // Step 1: try to read the existing row.
  const existing = await prisma.homepageSettings.findUnique({
    where: { id: HOMEPAGE_SETTINGS_SINGLETON_ID },
  });

  if (existing) {
    return toHomepageSettingsDto(existing);
  }

  // Step 2: bootstrap with defaults. Upsert handles concurrent calls safely.
  const bootstrapped = await prisma.homepageSettings.upsert({
    where: { id: HOMEPAGE_SETTINGS_SINGLETON_ID },
    create: {
      id: HOMEPAGE_SETTINGS_SINGLETON_ID,
      bestJobsPageSize: BEST_JOBS_PAGE_SIZE_DEFAULT,
      listingPageSize: LISTING_PAGE_SIZE_DEFAULT,
    },
    update: {}, // no-op when row already exists
  });

  return toHomepageSettingsDto(bootstrapped);
}

/** Input shape for admin write. All fields optional; omitted fields are unchanged. */
export interface UpdateHomepageSettingsInput {
  bestJobsPageSize?: number;
  listingPageSize?: number;
}

/** Result type for admin write — returns the post-write DTO. */
export interface UpdateHomepageSettingsResult {
  settings: HomepageSettingsDto;
  actorId: string | null;
}

/**
 * Admin write path. Validates + clamps input, then writes via `update`.
 *
 * Errors:
 *   - `SettingsRowMissingError`: row does not exist. Caller should bootstrap first.
 *   - `SettingsSingletonViolationError`: DB-level CHECK constraint rejected the update
 *     (e.g. somehow tried to set id != 'default'). Should never happen in normal flow.
 */
export class SettingsRowMissingError extends Error {
  constructor() {
    super('SETTINGS_ROW_MISSING');
    this.name = 'SettingsRowMissingError';
  }
}

export async function updateHomepageSettings(
  prisma: PrismaClient,
  input: UpdateHomepageSettingsInput,
  actorId: string | null,
): Promise<UpdateHomepageSettingsResult> {
  // Pre-check the row exists — admin write should not implicitly create.
  // The bootstrap path is `getHomepageSettings`, not this function.
  const existing = await prisma.homepageSettings.findUnique({
    where: { id: HOMEPAGE_SETTINGS_SINGLETON_ID },
    select: { id: true },
  });

  if (!existing) {
    throw new SettingsRowMissingError();
  }

  const data: {
    bestJobsPageSize?: number;
    listingPageSize?: number;
    updatedById: string | null;
  } = { updatedById: actorId };

  if (input.bestJobsPageSize !== undefined) {
    data.bestJobsPageSize = normalizeBestJobsPageSize(input.bestJobsPageSize);
  }
  if (input.listingPageSize !== undefined) {
    data.listingPageSize = clampListingPageSize(input.listingPageSize);
  }

  const updated = await prisma.homepageSettings.update({
    where: { id: HOMEPAGE_SETTINGS_SINGLETON_ID },
    data,
  });

  return {
    settings: toHomepageSettingsDto(updated),
    actorId,
  };
}
