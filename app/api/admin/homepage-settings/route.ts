/**
 * POST /api/admin/homepage-settings — AV1 admin write.
 *
 * Auth: ADMIN, HR_MANAGER or DIRECTOR. Other roles get 403.
 * Validates + clamps input via `updateHomepageSettings`, then
 * `revalidateTag('homepage-settings')` so the public projection cache
 * is invalidated.
 *
 * Phase B / UI2 — the body also accepts:
 *   - `newsSectionEnabled: boolean` — admin-managed news-section toggle.
 *   - `stickyAnnouncement: object | null` — Phase A `StickyAnnouncementSchema`
 *     payload, or `null` to clear. URL safety is enforced server-side
 *     through `normalizeCtaUrl`; any unsafe URL yields 400.
 */
import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { ZodError } from 'zod';
import { getPrisma } from '@/src/lib/db';
import { AuthSessionError, getAuthContext } from '@/src/shared/auth/auth-context';
import {
  SettingsRowMissingError,
  updateHomepageSettings,
} from '@/src/domains/job-board/public-settings.service';
import {
  InvalidChatUrlError,
  InvalidPhoneNumberError,
  normalizeChatUrl,
  normalizePhoneNumber,
} from '@/src/domains/job-board/chat-links';
import { normalizeCtaUrl, InvalidCtaUrlError } from '@/src/domains/job-board/public-content-controls/url-safety';
import { StickyAnnouncementSchema } from '@/src/domains/job-board/public-content-controls/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ADMIN_ROLES = new Set(['ADMIN', 'HR_MANAGER', 'DIRECTOR']);

interface AdminSettingsBody {
  bestJobsPageSize?: number;
  listingPageSize?: number;
  zaloChatUrl?: string | null;
  messengerChatUrl?: string | null;
  phoneCallNumber?: string | null;
  newsSectionEnabled?: boolean;
  stickyAnnouncement?: unknown;
}

function badRequest(message: string): NextResponse {
  return NextResponse.json(
    { error: 'INVALID_INPUT', message },
    { status: 400, headers: { 'Cache-Control': 'no-store' } },
  );
}

function validateBody(body: AdminSettingsBody): string | null {
  if (body.bestJobsPageSize !== undefined) {
    if (typeof body.bestJobsPageSize !== 'number' || !Number.isFinite(body.bestJobsPageSize)) {
      return 'bestJobsPageSize phải là số.';
    }
    if (![3, 6, 9, 12].includes(body.bestJobsPageSize)) {
      return 'bestJobsPageSize phải là một trong {3, 6, 9, 12}.';
    }
  }
  if (body.listingPageSize !== undefined) {
    if (typeof body.listingPageSize !== 'number' || !Number.isFinite(body.listingPageSize)) {
      return 'listingPageSize phải là số.';
    }
    if (body.listingPageSize < 6 || body.listingPageSize > 50) {
      return 'listingPageSize phải nằm trong [6, 50].';
    }
  }
  try {
    if (body.zaloChatUrl !== undefined) normalizeChatUrl(body.zaloChatUrl, 'zalo');
    if (body.messengerChatUrl !== undefined) normalizeChatUrl(body.messengerChatUrl, 'messenger');
    if (body.phoneCallNumber !== undefined) normalizePhoneNumber(body.phoneCallNumber);
  } catch (error) {
    if (error instanceof InvalidChatUrlError) return error.message;
    if (error instanceof InvalidPhoneNumberError) return error.message;
    return 'URL kênh chat không hợp lệ.';
  }
  if (body.newsSectionEnabled !== undefined && typeof body.newsSectionEnabled !== 'boolean') {
    return 'newsSectionEnabled phải là boolean.';
  }
  if (body.stickyAnnouncement !== undefined && body.stickyAnnouncement !== null) {
    if (typeof body.stickyAnnouncement !== 'object' || Array.isArray(body.stickyAnnouncement)) {
      return 'stickyAnnouncement phải là object hoặc null.';
    }
    const parsed = StickyAnnouncementSchema.safeParse(body.stickyAnnouncement);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      return first ? `stickyAnnouncement không hợp lệ: ${first.message}` : 'stickyAnnouncement không hợp lệ.';
    }
    if (parsed.data.ctaUrl) {
      try {
        normalizeCtaUrl(parsed.data.ctaUrl);
      } catch (error) {
        if (error instanceof InvalidCtaUrlError) return `ctaUrl không hợp lệ: ${error.message}`;
        return 'ctaUrl không hợp lệ.';
      }
    }
  }
  return null;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let ctx;
  try {
    ctx = await getAuthContext(req);
  } catch (e) {
    if (e instanceof AuthSessionError) {
      return NextResponse.json({ error: e.code, message: e.message }, { status: 401 });
    }
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed to build auth context' }, { status: 500 });
  }

  if (!ADMIN_ROLES.has(ctx.role)) {
    return NextResponse.json(
      { error: 'FORBIDDEN', message: `Role ${ctx.role} không có quyền sửa cài đặt homepage.` },
      { status: 403 },
    );
  }

  let body: AdminSettingsBody;
  try {
    const raw = (await req.json()) as Record<string, unknown>;
    if (
      Object.prototype.hasOwnProperty.call(raw, 'bestJobsPageSize') &&
      typeof raw.bestJobsPageSize !== 'number'
    ) {
      return badRequest('bestJobsPageSize phải là số.');
    }
    if (
      Object.prototype.hasOwnProperty.call(raw, 'listingPageSize') &&
      typeof raw.listingPageSize !== 'number'
    ) {
      return badRequest('listingPageSize phải là số.');
    }
    if (
      Object.prototype.hasOwnProperty.call(raw, 'zaloChatUrl') &&
      raw.zaloChatUrl !== null &&
      typeof raw.zaloChatUrl !== 'string'
    ) {
      return badRequest('zaloChatUrl phải là chuỗi hoặc null.');
    }
    if (
      Object.prototype.hasOwnProperty.call(raw, 'messengerChatUrl') &&
      raw.messengerChatUrl !== null &&
      typeof raw.messengerChatUrl !== 'string'
    ) {
      return badRequest('messengerChatUrl phải là chuỗi hoặc null.');
    }
    if (
      Object.prototype.hasOwnProperty.call(raw, 'phoneCallNumber') &&
      raw.phoneCallNumber !== null &&
      typeof raw.phoneCallNumber !== 'string'
    ) {
      return badRequest('phoneCallNumber phải là chuỗi hoặc null.');
    }
    if (
      Object.prototype.hasOwnProperty.call(raw, 'newsSectionEnabled') &&
      typeof raw.newsSectionEnabled !== 'boolean'
    ) {
      return badRequest('newsSectionEnabled phải là boolean.');
    }
    if (Object.prototype.hasOwnProperty.call(raw, 'stickyAnnouncement')) {
      const v = raw.stickyAnnouncement;
      if (v !== null && (typeof v !== 'object' || Array.isArray(v))) {
        return badRequest('stickyAnnouncement phải là object hoặc null.');
      }
    }
    body = {
      bestJobsPageSize: typeof raw.bestJobsPageSize === 'number' ? raw.bestJobsPageSize : undefined,
      listingPageSize: typeof raw.listingPageSize === 'number' ? raw.listingPageSize : undefined,
      zaloChatUrl: Object.prototype.hasOwnProperty.call(raw, 'zaloChatUrl')
        ? (raw.zaloChatUrl as string | null)
        : undefined,
      messengerChatUrl: Object.prototype.hasOwnProperty.call(raw, 'messengerChatUrl')
        ? (raw.messengerChatUrl as string | null)
        : undefined,
      phoneCallNumber: Object.prototype.hasOwnProperty.call(raw, 'phoneCallNumber')
        ? (raw.phoneCallNumber as string | null)
        : undefined,
      newsSectionEnabled: Object.prototype.hasOwnProperty.call(raw, 'newsSectionEnabled')
        ? (raw.newsSectionEnabled as boolean)
        : undefined,
      stickyAnnouncement: Object.prototype.hasOwnProperty.call(raw, 'stickyAnnouncement')
        ? (raw.stickyAnnouncement as unknown)
        : undefined,
    };
  } catch {
    return badRequest('Body không phải JSON hợp lệ.');
  }

  const violation = validateBody(body);
  if (violation) return badRequest(violation);

  if (
    body.bestJobsPageSize === undefined &&
    body.listingPageSize === undefined &&
    body.zaloChatUrl === undefined &&
    body.messengerChatUrl === undefined &&
    body.phoneCallNumber === undefined &&
    body.newsSectionEnabled === undefined &&
    body.stickyAnnouncement === undefined
  ) {
    return badRequest(
      'Phải cung cấp ít nhất một trường cài đặt homepage, kênh liên hệ, hoặc UI2.',
    );
  }

  const prisma = getPrisma();
  try {
    // Validate the new fields through Zod (StickyAnnouncementSchema already
    // ran inside validateBody). For TypeScript narrowing we re-parse here:
    const updateInput: Parameters<typeof updateHomepageSettings>[1] = {
      bestJobsPageSize: body.bestJobsPageSize,
      listingPageSize: body.listingPageSize,
      zaloChatUrl: body.zaloChatUrl,
      messengerChatUrl: body.messengerChatUrl,
      phoneCallNumber: body.phoneCallNumber,
      newsSectionEnabled: body.newsSectionEnabled,
    };
    if (body.stickyAnnouncement !== undefined) {
      if (body.stickyAnnouncement === null) {
        updateInput.stickyAnnouncement = null;
      } else {
        updateInput.stickyAnnouncement = StickyAnnouncementSchema.parse(body.stickyAnnouncement);
      }
    }
    const result = await updateHomepageSettings(prisma, updateInput, ctx.userId ?? null);
    // Invalidate the public projection cache so the next read sees the new value.
    revalidateTag('homepage-settings');
    return NextResponse.json(
      { settings: result.settings },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (e) {
    if (e instanceof SettingsRowMissingError) {
      return NextResponse.json(
        { error: 'SETTINGS_ROW_MISSING', message: 'Settings row chưa tồn tại. Gọi GET để bootstrap.' },
        { status: 409, headers: { 'Cache-Control': 'no-store' } },
      );
    }
    if (e instanceof ZodError) {
      const first = e.issues[0];
      const message = first ? `${first.path.join('.') || 'stickyAnnouncement'}: ${first.message}` : 'stickyAnnouncement không hợp lệ.';
      return badRequest(`stickyAnnouncement không hợp lệ: ${message}`);
    }
    console.error('[admin/homepage-settings POST] error:', e);
    return NextResponse.json(
      { error: 'INTERNAL', message: 'Failed to update homepage settings' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
