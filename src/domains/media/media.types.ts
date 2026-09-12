/**
 * media.types.ts — AV4 Media Management shared types
 *
 * DTO dùng giữa API routes, service và Admin UI. Tách khỏi schema.prisma
 * để (a) không phụ thuộc Prisma client type khi build UI, (b) test dễ.
 */
import { MediaStatus } from '@prisma/client';

export type MediaStatusEnum = MediaStatus;

export const MEDIA_ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
] as const;

export type AllowedMimeType = (typeof MEDIA_ALLOWED_MIME_TYPES)[number];

/** Max upload size: 5MB (DEC-01 RECOMMENDATION — Tier 1 tự quyết). */
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

/** Allowlist owner types cho MediaAssignment. AV2/AV6 thêm sau khi có model. */
export const MEDIA_ASSIGNMENT_OWNER_TYPES = [
  'JobPosting',
  'HomepageSection',
  'Article',
  'Partner',
] as const;

export type MediaAssignmentOwnerType = (typeof MEDIA_ASSIGNMENT_OWNER_TYPES)[number];

/** Folder defaults — UI sẽ populate các folder thường dùng. */
export const MEDIA_DEFAULT_FOLDERS = [
  'uncategorized',
  'job-postings',
  'homepage',
  'news',
  'banners',
] as const;

export type MediaFolder = (typeof MEDIA_DEFAULT_FOLDERS)[number];

/** Public DTO — không leak created_by_id, owner_id, internal fields. */
export interface MediaItemDto {
  id: string;
  url: string;
  alt: string;
  caption: string | null;
  folder: string;
  tags: string[];
  status: MediaStatusEnum;
  cover: boolean;
  filename: string;
  size: number;
  mimeType: string;
  order: number;
  createdAt: string;
  createdBy: { id: string; name: string | null } | null;
  assignmentCount: number;
}

/** Public read DTO (qua /api/public/media) — chỉ field cần cho render. */
export interface PublicMediaItemDto {
  id: string;
  url: string;
  alt: string;
  caption: string | null;
  order: number;
  cover: boolean;
}

export interface MediaListResponse {
  items: MediaItemDto[];
  total: number;
  take: number;
  skip: number;
}

export interface PublicMediaResponse {
  items: PublicMediaItemDto[];
}

/** Input create — gọi từ API sau khi client upload thành công tới Blob. */
export interface MediaCreateInput {
  url: string;
  alt: string;
  caption?: string | null;
  folder?: string;
  tags?: string[];
  status?: MediaStatusEnum;
  cover?: boolean;
  filename: string;
  size: number;
  mimeType: string;
  ownerId: string;
  createdById?: string | null;
}

/** Input update — PATCH /api/admin/media/[id]. */
export interface MediaUpdateInput {
  alt?: string;
  caption?: string | null;
  folder?: string;
  tags?: string[];
  status?: MediaStatusEnum;
  cover?: boolean;
  order?: number;
}

export interface MediaListQuery {
  folder?: string;
  tag?: string;
  status?: MediaStatusEnum;
  take?: number;
  skip?: number;
  search?: string;
}

export interface MediaAssignmentInput {
  mediaId: string;
  ownerType: MediaAssignmentOwnerType;
  ownerId: string;
  order?: number;
  cover?: boolean;
}

export interface MediaAssignmentDto {
  id: string;
  mediaId: string;
  ownerType: string;
  ownerId: string;
  order: number;
  cover: boolean;
  createdAt: string;
}
