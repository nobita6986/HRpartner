import { randomUUID } from 'node:crypto';

export const DEFAULT_BI_SYNC_BASE_URL = 'https://bi.hrpartner.vn/api/integrations/hrp/v1';

export interface BiSyncConnectionConfig {
  baseUrl: string;
  apiKey: string;
  timeoutMs?: number;
  maxRetries?: number;
}

export interface BiCatalogProjectLocation {
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  radiusMeters: number | null;
  confirmedAt: string | null;
}

export interface BiCatalogProject {
  projectId: string;
  displayName: string;
  active: boolean;
  version: number;
  updatedAt: string | null;
  location: BiCatalogProjectLocation | null;
}

export interface BiCatalogRecruiterTeam {
  teamId: string;
  code: string | null;
  displayName: string;
  active: boolean;
}

export interface BiCatalogRecruiter {
  recruiterId: string;
  displayName: string;
  personnelCode: string | null;
  personnelPosition: string | null;
  active: boolean;
  providerTypes: string[];
  teams: BiCatalogRecruiterTeam[];
}

export interface BiCatalogLaborType {
  key: string;
  displayName: string;
  active: boolean;
  sortOrder: number;
  version: number;
}

export interface BiCatalogPayload {
  ok: true;
  serverTime: string;
  projects: BiCatalogProject[];
  recruiters: BiCatalogRecruiter[];
  laborTypes: BiCatalogLaborType[];
}

export interface BiEpisodePerson {
  fullName: string | null;
  dateOfBirth: string | null;
  dateOfBirthRaw?: string | null;
  gender: 'MALE' | 'FEMALE' | 'OTHER' | string | null;
  phone: string | null;
  address: string | null;
  nationalIdIssuedAt: string | null;
  nationalIdIssuedPlace: string | null;
}

export interface BiEpisodeRecruiter {
  recruiterId: string;
  personnelCode: string | null;
  displayName: string;
}

export interface BiEpisodeStatus {
  value: 'UNCONFIRMED' | 'ON' | 'OFF';
  effectiveDate: string | null;
  leaveDate: string | null;
  appliedAt: string | null;
}

export interface NormalizedBiWorkerEpisodeItem {
  episodeId: string;
  syncVersion: bigint;
  isTombstone: boolean;
  tombstoneReason: string | null;
  deletedAt: string | null;
  employeeCode: string | null;
  nationalId: string | null;
  nationalIdState: 'VALID' | 'MISSING' | 'INVALID';
  person: BiEpisodePerson | null;
  projectId: string | null;
  firstWorkDate: string | null;
  laborType: string | null;
  providerType: string | null;
  recruiter: BiEpisodeRecruiter | null;
  status: BiEpisodeStatus | null;
}

export interface NormalizedBiWorkerEpisodesPage {
  serverTime: string;
  items: NormalizedBiWorkerEpisodeItem[];
  hasMore: boolean;
  nextPageCursor: string | null;
  checkpoint: string | null;
}

export class BiSyncHttpError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly errorCode: string,
    message: string,
  ) {
    super(message);
    this.name = 'BiSyncHttpError';
  }
}

export function normalizeBiApiBaseUrl(rawUrl?: string | null): string {
  const trimmed = (rawUrl ?? '').trim().replace(/\/+$/, '');
  if (!trimmed) return DEFAULT_BI_SYNC_BASE_URL;
  if (trimmed.endsWith('/api/integrations/hrp/v1')) return trimmed;
  if (/^https?:\/\/[^/]+$/i.test(trimmed)) {
    return `${trimmed}/api/integrations/hrp/v1`;
  }
  return trimmed;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asNullableString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function asNullableNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function parseSyncVersion(raw: Record<string, unknown>): bigint {
  const candidate = raw.sync_version ?? raw.syncVersion;
  if (typeof candidate === 'bigint') return candidate;
  if (typeof candidate === 'number' && Number.isInteger(candidate) && candidate >= 0) {
    return BigInt(candidate);
  }
  if (typeof candidate === 'string' && /^\d+$/.test(candidate.trim())) {
    return BigInt(candidate.trim());
  }
  throw new BiSyncHttpError(
    502,
    'INVALID_SYNC_VERSION',
    `Invalid or missing sync_version on episode ${String(raw.episodeId ?? raw.episode_id ?? 'unknown')}`,
  );
}

export function normalizeBiEpisodeItem(rawUnknown: unknown): NormalizedBiWorkerEpisodeItem {
  const raw = asRecord(rawUnknown);
  const episodeId = asNullableString(raw.episodeId ?? raw.episode_id);
  if (!episodeId) {
    throw new BiSyncHttpError(502, 'MISSING_EPISODE_ID', 'Episode item is missing episodeId');
  }

  const syncVersion = parseSyncVersion(raw);
  const tombstoneObj = raw.tombstone && typeof raw.tombstone === 'object' ? asRecord(raw.tombstone) : null;
  const isTombstone = Boolean(
    raw.isTombstone === true ||
      raw.is_tombstone === true ||
      raw.recordState === 'TOMBSTONE' ||
      raw.record_state === 'TOMBSTONE' ||
      raw.deleted === true ||
      raw.voided === true ||
      tombstoneObj !== null,
  );

  const tombstoneReason =
    asNullableString(raw.tombstoneReason ?? raw.tombstone_reason ?? tombstoneObj?.reason) ??
    (isTombstone ? 'DELETED' : null);
  const deletedAt = asNullableString(
    raw.deletedAt ?? raw.deleted_at ?? tombstoneObj?.deletedAt ?? tombstoneObj?.deleted_at,
  );

  const rawNationalId = asNullableString(raw.nationalId ?? raw.national_id);
  const rawState = asNullableString(raw.nationalIdState ?? raw.national_id_state);
  let nationalIdState: 'VALID' | 'MISSING' | 'INVALID' = 'MISSING';
  if (rawState === 'VALID' || rawState === 'MISSING' || rawState === 'INVALID') {
    nationalIdState = rawState;
  } else if (rawNationalId && /^(\d{9}|\d{12})$/.test(rawNationalId)) {
    nationalIdState = 'VALID';
  } else if (rawNationalId) {
    nationalIdState = 'INVALID';
  }

  // Defensive validation even when BI marks VALID: only 9 or 12 digits are canonical CCCD/CMND
  if (nationalIdState === 'VALID' && (!rawNationalId || !/^(\d{9}|\d{12})$/.test(rawNationalId))) {
    nationalIdState = rawNationalId ? 'INVALID' : 'MISSING';
  }

  const personRaw = raw.person && typeof raw.person === 'object' ? asRecord(raw.person) : null;
  const person: BiEpisodePerson | null = personRaw
    ? {
        fullName: asNullableString(personRaw.fullName ?? personRaw.full_name),
        dateOfBirth: asNullableString(personRaw.dateOfBirth ?? personRaw.date_of_birth),
        dateOfBirthRaw: asNullableString(personRaw.dateOfBirthRaw ?? personRaw.date_of_birth_raw),
        gender: asNullableString(personRaw.gender),
        phone: asNullableString(personRaw.phone),
        address: asNullableString(personRaw.address),
        nationalIdIssuedAt: asNullableString(
          personRaw.nationalIdIssuedAt ?? personRaw.national_id_issued_at,
        ),
        nationalIdIssuedPlace: asNullableString(
          personRaw.nationalIdIssuedPlace ?? personRaw.national_id_issued_place,
        ),
      }
    : null;

  const recruiterRaw =
    raw.recruiter && typeof raw.recruiter === 'object' ? asRecord(raw.recruiter) : null;
  const recruiterId = asNullableString(recruiterRaw?.recruiterId ?? recruiterRaw?.recruiter_id);
  const recruiterName = asNullableString(recruiterRaw?.displayName ?? recruiterRaw?.display_name);
  const recruiter: BiEpisodeRecruiter | null =
    recruiterId && recruiterName
      ? {
          recruiterId,
          personnelCode: asNullableString(
            recruiterRaw?.personnelCode ?? recruiterRaw?.personnel_code,
          ),
          displayName: recruiterName,
        }
      : null;

  const statusRaw = raw.status && typeof raw.status === 'object' ? asRecord(raw.status) : null;
  const rawStatusValue = asNullableString(statusRaw?.value ?? raw.status);
  const status: BiEpisodeStatus | null =
    rawStatusValue === 'UNCONFIRMED' || rawStatusValue === 'ON' || rawStatusValue === 'OFF'
      ? {
          value: rawStatusValue,
          effectiveDate: asNullableString(statusRaw?.effectiveDate ?? statusRaw?.effective_date),
          leaveDate: asNullableString(statusRaw?.leaveDate ?? statusRaw?.leave_date),
          appliedAt: asNullableString(statusRaw?.appliedAt ?? statusRaw?.applied_at),
        }
      : null;

  return {
    episodeId,
    syncVersion,
    isTombstone,
    tombstoneReason,
    deletedAt,
    employeeCode: asNullableString(raw.employeeCode ?? raw.employee_code),
    nationalId: nationalIdState === 'VALID' ? rawNationalId : null,
    nationalIdState,
    person,
    projectId: asNullableString(raw.projectId ?? raw.project_id),
    firstWorkDate: asNullableString(raw.firstWorkDate ?? raw.first_work_date),
    laborType: asNullableString(raw.laborType ?? raw.labor_type),
    providerType: asNullableString(raw.providerType ?? raw.provider_type),
    recruiter,
    status,
  };
}

async function sleepMs(ms: number): Promise<void> {
  if (ms <= 0) return;
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function executeBiGetJson(
  url: string,
  config: BiSyncConnectionConfig,
  fetchImpl: typeof fetch = fetch,
): Promise<Record<string, unknown>> {
  const maxRetries = config.maxRetries ?? 2;
  const timeoutMs = config.timeoutMs ?? 25_000;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const requestId = randomUUID();
    const res = await fetchImpl(url, {
      method: 'GET',
      headers: {
        accept: 'application/json',
        authorization: `Bearer ${config.apiKey.trim()}`,
        'x-request-id': requestId,
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (res.ok) {
      const json = await res.json();
      return asRecord(json);
    }

    const retryable = res.status === 429 || res.status >= 500;
    if (retryable && attempt < maxRetries) {
      const retryAfterHeader = res.headers?.get?.('retry-after');
      const retryAfterSec = retryAfterHeader ? Number(retryAfterHeader) : NaN;
      const delayMs =
        Number.isFinite(retryAfterSec) && retryAfterSec > 0
          ? Math.min(retryAfterSec * 1000, 5_000)
          : 300 * (attempt + 1);
      await sleepMs(delayMs);
      continue;
    }

    let errorCode = `BI_HTTP_${res.status}`;
    let errorMessage = `BI API returned HTTP ${res.status}`;
    try {
      const errBody = asRecord(await res.json());
      const errObj = asRecord(errBody.error);
      if (typeof errObj.code === 'string' && errObj.code.trim()) {
        errorCode = errObj.code.trim();
      }
      if (typeof errObj.message === 'string' && errObj.message.trim()) {
        errorMessage = errObj.message.trim();
      }
    } catch {
      // Ignore non-JSON error body
    }
    throw new BiSyncHttpError(res.status, errorCode, errorMessage);
  }

  throw new BiSyncHttpError(503, 'BI_RETRY_EXHAUSTED', 'Exhausted retries calling BI API');
}

export async function fetchBiCatalog(
  config: BiSyncConnectionConfig,
  fetchImpl: typeof fetch = fetch,
): Promise<BiCatalogPayload> {
  const base = normalizeBiApiBaseUrl(config.baseUrl);
  const raw = await executeBiGetJson(`${base}/catalog`, config, fetchImpl);

  const rawProjects = Array.isArray(raw.projects) ? raw.projects : [];
  const projects: BiCatalogProject[] = rawProjects
    .map((p): BiCatalogProject | null => {
      const row = asRecord(p);
      const projectId = asNullableString(row.projectId ?? row.project_id);
      const displayName = asNullableString(row.displayName ?? row.display_name);
      if (!projectId || !displayName) return null;

      const locRaw =
        row.location && typeof row.location === 'object' ? asRecord(row.location) : null;
      const location: BiCatalogProjectLocation | null = locRaw
        ? {
            address: asNullableString(locRaw.address),
            latitude: asNullableNumber(locRaw.latitude),
            longitude: asNullableNumber(locRaw.longitude),
            radiusMeters: asNullableNumber(locRaw.radiusMeters ?? locRaw.radius_meters),
            confirmedAt: asNullableString(locRaw.confirmedAt ?? locRaw.confirmed_at),
          }
        : null;

      return {
        projectId,
        displayName,
        active: row.active !== false,
        version: asNullableNumber(row.version) ?? 1,
        updatedAt: asNullableString(row.updatedAt ?? row.updated_at),
        location,
      };
    })
    .filter((item): item is BiCatalogProject => item !== null);

  const rawRecruiters = Array.isArray(raw.recruiters) ? raw.recruiters : [];
  const recruiters: BiCatalogRecruiter[] = rawRecruiters
    .map((r): BiCatalogRecruiter | null => {
      const row = asRecord(r);
      const recruiterId = asNullableString(row.recruiterId ?? row.recruiter_id);
      const displayName = asNullableString(row.displayName ?? row.display_name);
      if (!recruiterId || !displayName) return null;
      return {
        recruiterId,
        displayName,
        personnelCode: asNullableString(row.personnelCode ?? row.personnel_code),
        personnelPosition: asNullableString(row.personnelPosition ?? row.personnel_position),
        active: row.active !== false,
        providerTypes: Array.isArray(row.providerTypes)
          ? row.providerTypes.filter((x): x is string => typeof x === 'string')
          : [],
        teams: [],
      };
    })
    .filter((item): item is BiCatalogRecruiter => item !== null);

  const rawLaborTypes = Array.isArray(raw.laborTypes) ? raw.laborTypes : [];
  const laborTypes: BiCatalogLaborType[] = rawLaborTypes
    .map((lt): BiCatalogLaborType | null => {
      const row = asRecord(lt);
      const key = asNullableString(row.key);
      const displayName = asNullableString(row.displayName ?? row.display_name);
      if (!key || !displayName) return null;
      return {
        key,
        displayName,
        active: row.active !== false,
        sortOrder: asNullableNumber(row.sortOrder ?? row.sort_order) ?? 0,
        version: asNullableNumber(row.version) ?? 1,
      };
    })
    .filter((item): item is BiCatalogLaborType => item !== null);

  return {
    ok: true,
    serverTime: asNullableString(raw.serverTime ?? raw.server_time) ?? new Date().toISOString(),
    projects,
    recruiters,
    laborTypes,
  };
}

export interface FetchBiWorkerEpisodesPageOptions {
  /** Opaque checkpoint token from previous completed run (used only on page 1). */
  checkpoint?: string | null;
  /** Opaque continuation cursor within the current run (used on pages >= 2). */
  pageCursor?: string | null;
  limit?: number;
}

/**
 * Kéo 1 trang `/worker-episodes` từ BI.
 * Quy tắc #2: `checkpoint` và `pageCursor` là token opaque 100%, truyền nguyên văn qua
 * encodeURIComponent, tuyệt đối không giải mã hay lùi 10 phút.
 */
export async function fetchBiWorkerEpisodesPage(
  config: BiSyncConnectionConfig,
  options: FetchBiWorkerEpisodesPageOptions = {},
  fetchImpl: typeof fetch = fetch,
): Promise<NormalizedBiWorkerEpisodesPage> {
  const base = normalizeBiApiBaseUrl(config.baseUrl);
  const limit = Math.min(Math.max(options.limit ?? 500, 1), 500);
  const queryParts: string[] = [];

  if (typeof options.pageCursor === 'string' && options.pageCursor.length > 0) {
    queryParts.push(`pageCursor=${encodeURIComponent(options.pageCursor)}`);
  } else if (typeof options.checkpoint === 'string' && options.checkpoint.length > 0) {
    queryParts.push(`checkpoint=${encodeURIComponent(options.checkpoint)}`);
  }
  queryParts.push(`limit=${limit}`);

  const url = `${base}/worker-episodes?${queryParts.join('&')}`;
  const raw = await executeBiGetJson(url, config, fetchImpl);

  const rawItems = Array.isArray(raw.items) ? raw.items : [];
  const items = rawItems.map((item) => normalizeBiEpisodeItem(item));

  const nextPageCursor = asNullableString(raw.nextPageCursor ?? raw.next_page_cursor);
  const checkpoint = asNullableString(
    raw.checkpoint ?? raw.nextCheckpoint ?? raw.next_checkpoint,
  );
  const hasMore =
    typeof raw.hasMore === 'boolean'
      ? raw.hasMore
      : typeof raw.has_more === 'boolean'
        ? raw.has_more
        : nextPageCursor !== null;

  return {
    serverTime: asNullableString(raw.serverTime ?? raw.server_time) ?? new Date().toISOString(),
    items,
    hasMore,
    nextPageCursor,
    checkpoint,
  };
}
