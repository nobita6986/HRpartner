/**
 * media.service.ts — AV4 Media Management service layer
 *
 * Source of truth cho mọi write+read của Media + MediaAssignment.
 * Routes (API + Server actions) chỉ wrap: auth + validation + revalidateTag.
 *
 * Design notes:
 * - Service dùng `Prisma.TransactionClient` hoặc `PrismaClient`. Caller chọn.
 * - Validation thực hiện ở service (không chỉ route) để tránh duplicate khi
 *   gọi từ server actions, cron, hay script nội bộ.
 * - Alt-text validation enforce ở `create` + `update` (REQUIRED khi PUBLIC).
 * - Delete cascade xóa MediaAssignment (Prisma onDelete: Cascade đã khai schema).
 */
import type { Media, MediaAssignment, Prisma } from '@prisma/client';
import {
  MAX_UPLOAD_BYTES,
  MEDIA_ALLOWED_MIME_TYPES,
  MEDIA_ASSIGNMENT_OWNER_TYPES,
  type AllowedMimeType,
  type MediaAssignmentInput,
  type MediaCreateInput,
  type MediaItemDto,
  type MediaListQuery,
  type MediaListResponse,
  type MediaUpdateInput,
  type MediaAssignmentDto,
  type MediaAssignmentOwnerType,
  type PublicMediaItemDto,
  type PublicMediaResponse,
} from './media.types';

export class MediaValidationError extends Error {
  constructor(message: string, public readonly field?: string) {
    super(message);
    this.name = 'MediaValidationError';
  }
}

export class MediaNotFoundError extends Error {
  constructor(id: string) {
    super(`Media ${id} không tồn tại.`);
    this.name = 'MediaNotFoundError';
  }
}

export class MediaAssignmentConflictError extends Error {
  constructor(public readonly mediaId: string, public readonly ownerType: string, public readonly ownerId: string) {
    super(`Media ${mediaId} đã được gán cho ${ownerType}:${ownerId}.`);
    this.name = 'MediaAssignmentConflictError';
  }
}

export class MediaAssignmentNotFoundError extends Error {
  constructor(id: string) {
    super(`MediaAssignment ${id} không tồn tại.`);
    this.name = 'MediaAssignmentNotFoundError';
  }
}

type MediaDelegate = Prisma.MediaDelegate;
type MediaAssignmentDelegate = Prisma.MediaAssignmentDelegate;
type MediaClient =
  | { media: MediaDelegate; mediaAssignment: MediaAssignmentDelegate }
  | (Prisma.TransactionClient & { media: MediaDelegate; mediaAssignment: MediaAssignmentDelegate });

/** Internal row from Prisma (subset used by mapper). */
type MediaRow = Media;
type MediaAssignmentRow = MediaAssignment;

/* ─── Validation ─────────────────────────────────────────────────────── */

export function validateCreateInput(input: MediaCreateInput): void {
  if (!input.url) throw new MediaValidationError('url là bắt buộc.', 'url');
  if (!input.url.startsWith('https://')) {
    throw new MediaValidationError('url phải là https://', 'url');
  }
  if (!input.filename) throw new MediaValidationError('filename là bắt buộc.', 'filename');
  if (!isAllowedMime(input.mimeType)) {
    throw new MediaValidationError(
      `mimeType phải là một trong: ${MEDIA_ALLOWED_MIME_TYPES.join(', ')}.`,
      'mimeType',
    );
  }
  if (input.size <= 0 || input.size > MAX_UPLOAD_BYTES) {
    throw new MediaValidationError(
      `size phải nằm trong (0, ${MAX_UPLOAD_BYTES}] bytes.`,
      'size',
    );
  }
  if (!input.ownerId) throw new MediaValidationError('ownerId là bắt buộc.', 'ownerId');
  validateAltText(input.alt, input.status ?? 'PUBLIC');
}

export function validateUpdateInput(input: MediaUpdateInput, currentStatus: 'PUBLIC' | 'INTERNAL'): void {
  // `url` không có trong MediaUpdateInput (đã loại khỏi DTO); xóa + upload lại nếu cần.
  // Giữ check để audit input từ route.
  if ('url' in input && (input as { url?: unknown }).url !== undefined) {
    throw new MediaValidationError('url không được cập nhật qua PATCH — xóa rồi upload lại.', 'url');
  }
  if (input.alt !== undefined) {
    const nextStatus = input.status ?? currentStatus;
    validateAltText(input.alt, nextStatus);
  }
  if (input.tags !== undefined) {
    for (const tag of input.tags) {
      if (typeof tag !== 'string' || tag.length === 0 || tag.length > 50) {
        throw new MediaValidationError('Mỗi tag phải là chuỗi 1..50 ký tự.', 'tags');
      }
    }
  }
  if (input.folder !== undefined && (typeof input.folder !== 'string' || input.folder.length > 100)) {
    throw new MediaValidationError('folder phải là chuỗi ≤ 100 ký tự.', 'folder');
  }
}

function validateAltText(alt: string, status: 'PUBLIC' | 'INTERNAL'): void {
  if (status === 'PUBLIC') {
    if (!alt || alt.trim().length === 0) {
      throw new MediaValidationError('alt là bắt buộc khi status = PUBLIC (accessibility).', 'alt');
    }
    if (alt.length > 500) {
      throw new MediaValidationError('alt tối đa 500 ký tự.', 'alt');
    }
  } else {
    if (alt && alt.length > 500) {
      throw new MediaValidationError('alt tối đa 500 ký tự.', 'alt');
    }
  }
}

export function isAllowedMime(mime: string): mime is AllowedMimeType {
  return (MEDIA_ALLOWED_MIME_TYPES as readonly string[]).includes(mime);
}

export function isAllowedOwnerType(t: string): t is MediaAssignmentOwnerType {
  return (MEDIA_ASSIGNMENT_OWNER_TYPES as readonly string[]).includes(t);
}

/* ─── Mappers ─────────────────────────────────────────────────────────── */

export function toMediaItemDto(
  row: MediaRow,
  createdBy: { id: string; name: string | null } | null,
  assignmentCount: number,
): MediaItemDto {
  return {
    id: row.id,
    url: row.url,
    alt: row.alt,
    caption: row.caption,
    folder: row.folder,
    tags: row.tags,
    status: row.status,
    cover: row.cover,
    filename: row.filename,
    size: row.size,
    mimeType: row.mimeType,
    order: row.order,
    createdAt: row.createdAt.toISOString(),
    createdBy,
    assignmentCount,
  };
}

export function toMediaAssignmentDto(row: MediaAssignmentRow): MediaAssignmentDto {
  return {
    id: row.id,
    mediaId: row.mediaId,
    ownerType: row.ownerType,
    ownerId: row.ownerId,
    order: row.order,
    cover: row.cover,
    createdAt: row.createdAt.toISOString(),
  };
}

export function toPublicMediaItemDto(row: MediaAssignmentRow & { media: MediaRow }): PublicMediaItemDto {
  return {
    id: row.mediaId,
    url: row.media.publicUrl || row.media.url,
    alt: row.media.alt,
    caption: row.media.caption,
    order: row.order,
    cover: row.cover,
  };
}

/* ─── CRUD ───────────────────────────────────────────────────────────── */

/** Tạo Media record sau khi client upload thành công lên Vercel Blob. */
export async function createMedia(
  client: MediaClient,
  input: MediaCreateInput,
): Promise<MediaItemDto> {
  validateCreateInput(input);

  const created = await client.media.create({
    data: {
      url: input.url,
      alt: input.alt,
      caption: input.caption ?? null,
      folder: input.folder ?? 'uncategorized',
      tags: input.tags ?? [],
      status: input.status ?? 'PUBLIC',
      cover: input.cover ?? false,
      filename: input.filename,
      size: input.size,
      mimeType: input.mimeType,
      publicUrl: input.url, // mirror cho tương lai CDN map
      ownerId: input.ownerId,
      createdById: input.createdById ?? null,
    },
  });

  return toMediaItemDto(created, null, 0);
}

export async function getMedia(
  client: MediaClient,
  id: string,
): Promise<MediaItemDto> {
  const row = await client.media.findUnique({
    where: { id },
    include: {
      createdBy: { select: { id: true, name: true } },
      _count: { select: { assignments: true } },
    },
  });
  if (!row) throw new MediaNotFoundError(id);
  return toMediaItemDto(row, row.createdBy, row._count.assignments);
}

export async function updateMedia(
  client: MediaClient,
  id: string,
  input: MediaUpdateInput,
): Promise<MediaItemDto> {
  const existing = await client.media.findUnique({ where: { id }, select: { status: true } });
  if (!existing) throw new MediaNotFoundError(id);
  validateUpdateInput(input, existing.status);

  const updated = await client.media.update({
    where: { id },
    data: {
      alt: input.alt,
      caption: input.caption,
      folder: input.folder,
      tags: input.tags,
      status: input.status,
      cover: input.cover,
      order: input.order,
    },
    include: {
      createdBy: { select: { id: true, name: true } },
      _count: { select: { assignments: true } },
    },
  });
  return toMediaItemDto(updated, updated.createdBy, updated._count.assignments);
}

export async function deleteMedia(
  client: MediaClient,
  id: string,
  blobDeleter: (url: string) => Promise<void>,
): Promise<{ id: string }> {
  const row = await client.media.findUnique({ where: { id }, select: { url: true } });
  if (!row) throw new MediaNotFoundError(id);

  // Xóa trên Vercel Blob TRƯỚC; nếu fail, không xóa DB record (giữ lại cho retry).
  await blobDeleter(row.url);

  await client.media.delete({ where: { id } });
  return { id };
}

export async function listMedia(
  client: MediaClient,
  query: MediaListQuery,
): Promise<MediaListResponse> {
  const take = Math.min(50, Math.max(1, query.take ?? 20));
  const skip = Math.max(0, query.skip ?? 0);

  const where: Prisma.MediaWhereInput = {};
  if (query.folder) where.folder = query.folder;
  if (query.status) where.status = query.status;
  if (query.tag) where.tags = { has: query.tag };
  if (query.search) {
    where.OR = [
      { filename: { contains: query.search, mode: 'insensitive' } },
      { alt: { contains: query.search, mode: 'insensitive' } },
      { caption: { contains: query.search, mode: 'insensitive' } },
    ];
  }

  const [rows, total] = await Promise.all([
    client.media.findMany({
      where,
      take,
      skip,
      orderBy: [{ cover: 'desc' }, { createdAt: 'desc' }],
      include: {
        createdBy: { select: { id: true, name: true } },
        _count: { select: { assignments: true } },
      },
    }),
    client.media.count({ where }),
  ]);

  return {
    items: rows.map((r) => toMediaItemDto(r, r.createdBy, r._count.assignments)),
    total,
    take,
    skip,
  };
}

/* ─── Assignment ─────────────────────────────────────────────────────── */

export async function assignMedia(
  client: MediaClient,
  input: MediaAssignmentInput,
): Promise<MediaAssignmentDto> {
  if (!isAllowedOwnerType(input.ownerType)) {
    throw new MediaValidationError(
      `ownerType phải là một trong: ${MEDIA_ASSIGNMENT_OWNER_TYPES.join(', ')}.`,
      'ownerType',
    );
  }
  const exists = await client.media.findUnique({ where: { id: input.mediaId }, select: { id: true } });
  if (!exists) throw new MediaNotFoundError(input.mediaId);

  // Check duplicate
  const dup = await client.mediaAssignment.findUnique({
    where: {
      mediaId_ownerType_ownerId: {
        mediaId: input.mediaId,
        ownerType: input.ownerType,
        ownerId: input.ownerId,
      },
    },
  });
  if (dup) {
    throw new MediaAssignmentConflictError(input.mediaId, input.ownerType, input.ownerId);
  }

  const created = await client.mediaAssignment.create({
    data: {
      mediaId: input.mediaId,
      ownerType: input.ownerType,
      ownerId: input.ownerId,
      order: input.order ?? 0,
      cover: input.cover ?? false,
    },
  });
  return toMediaAssignmentDto(created);
}

export async function unassignMedia(
  client: MediaClient,
  assignmentId: string,
): Promise<{ id: string }> {
  const row = await client.mediaAssignment.findUnique({ where: { id: assignmentId } });
  if (!row) throw new MediaAssignmentNotFoundError(assignmentId);
  await client.mediaAssignment.delete({ where: { id: assignmentId } });
  return { id: assignmentId };
}

export async function listAssignmentsForMedia(
  client: MediaClient,
  mediaId: string,
): Promise<MediaAssignmentDto[]> {
  const rows = await client.mediaAssignment.findMany({
    where: { mediaId },
    orderBy: [{ cover: 'desc' }, { order: 'asc' }, { createdAt: 'asc' }],
  });
  return rows.map(toMediaAssignmentDto);
}

/* ─── Public read (no auth) ──────────────────────────────────────────── */

export async function listPublicMediaForOwner(
  client: MediaClient,
  ownerType: string,
  ownerId: string,
): Promise<PublicMediaResponse> {
  // Chỉ trả PUBLIC media cho owner
  const rows = await client.mediaAssignment.findMany({
    where: {
      ownerType,
      ownerId,
      media: { status: 'PUBLIC' },
    },
    include: { media: true },
    orderBy: [{ cover: 'desc' }, { order: 'asc' }, { createdAt: 'asc' }],
  });
  return { items: rows.map(toPublicMediaItemDto) };
}
