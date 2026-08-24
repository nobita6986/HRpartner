import { NextRequest, NextResponse } from 'next/server';
import {
  submitPublicApplication,
  ApplicationServiceError,
} from '@/src/domains/applications/application.service';
import { CvValidationError } from '@/src/domains/applications/apply-helpers';
import { getPrisma } from '@/src/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface ApplyBody {
  fullName?: string;
  phone?: string;
  slotId?: string | null;
  cccdNumber?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  experience?: string | null;
  consentAt?: string | null;
  consent?: boolean;
  idempotencyKey?: string;
  cv?: { fileName?: string; mimeType?: string; sizeBytes?: number } | null;
}

type RouteParams = { params: Promise<{ slug: string }> };

/** Idempotency key: header (standard or x- variant) then body. */
function extractIdempotencyKey(req: NextRequest, body: ApplyBody): string {
  return (
    req.headers.get('idempotency-key') ??
    req.headers.get('x-idempotency-key') ??
    body.idempotencyKey ??
    ''
  ).trim();
}

// Canonical public apply (DEC-01/RQ-02/RQ-09): the ONLY forward-facing apply
// URL. Delegates the entire write to the SECURITY DEFINER boundary; never
// creates a Worker/SourceClaim and never sets app.role. Idempotency key is
// REQUIRED (4.3) — the service raises IDEMPOTENCY_KEY_REQUIRED (400) if absent.
export async function POST(req: NextRequest, { params }: RouteParams) {
  const { slug } = await params;

  let body: ApplyBody;
  try {
    body = (await req.json()) as ApplyBody;
  } catch {
    return NextResponse.json({ error: 'INVALID_INPUT', message: 'Invalid JSON body' }, { status: 400 });
  }

  const idempotencyKey = extractIdempotencyKey(req, body);
  // consent may arrive as a boolean flag or an explicit timestamp.
  const consentAt = body.consentAt ?? (body.consent === true ? new Date().toISOString() : null);

  const prisma = getPrisma();
  try {
    const result = await prisma.$transaction((tx) =>
      submitPublicApplication(tx, {
        slug,
        slotId: body.slotId ?? null,
        fullName: body.fullName ?? '',
        phone: body.phone ?? '',
        cccdNumber: body.cccdNumber ?? null,
        dateOfBirth: body.dateOfBirth ?? null,
        gender: body.gender ?? null,
        experience: body.experience ?? null,
        consentAt,
        idempotencyKey,
        cv: body.cv ?? null,
      }),
    );
    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    if (e instanceof CvValidationError) {
      return NextResponse.json({ error: e.code, message: e.message }, { status: 422 });
    }
    if (e instanceof ApplicationServiceError) {
      return NextResponse.json({ error: e.code, message: e.message }, { status: e.httpStatus });
    }
    console.error('[public apply] unexpected error', e);
    return NextResponse.json({ error: 'INTERNAL', message: 'Internal server error' }, { status: 500 });
  }
}
