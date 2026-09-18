import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/src/lib/db';
import { AuthSessionError, getAuthContext } from '@/src/shared/auth/auth-context';
import { withDbContext } from '@/src/shared/auth/with-db-context';
import { getLaborProfilesList } from '@/src/domains/talent/labor-profile.read-service';
import { createOrMatchLaborProfile } from '@/src/domains/talent/labor-profile.service';
import { z } from 'zod';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ADMIN_ROLES = new Set(['ADMIN', 'HR_MANAGER', 'HR_STAFF']);

export async function GET(req: NextRequest) {
  try {
    const ctx = await getAuthContext(req);
    if (!ADMIN_ROLES.has(ctx.role)) {
      return NextResponse.json({ error: 'FORBIDDEN', message: 'Not allowed' }, { status: 403 });
    }

    const prisma = getPrisma();
    const { searchParams } = new URL(req.url);
    const take = Math.min(parseInt(searchParams.get('take') ?? '20', 10), 100);
    const skip = parseInt(searchParams.get('skip') ?? '0', 10);
    const search = searchParams.get('search') ?? undefined;
    const exactPhone = searchParams.get('exactPhone') ?? undefined;
    const completeness = searchParams.get('completeness') ?? undefined;
    const identityVerification = searchParams.get('identityVerification') ?? undefined;
    const view = (searchParams.get('view') as any) ?? undefined;

    const result = await withDbContext(prisma, ctx, async (tx) => {
      return getLaborProfilesList(tx, ctx, { search, exactPhone, completeness, identityVerification, view, skip, take });
    });

    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof AuthSessionError) {
      return NextResponse.json({ error: e.code, message: e.message }, { status: 401 });
    }
    console.error('List LaborProfiles error:', e);
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed to fetch labor profiles' }, { status: 500 });
  }
}

const CreateProfileSchema = z.object({
  fullName: z.string().min(1).max(255),
  phone: z.string().min(1).max(20),
  cccdNumber: z.string().max(20).optional(),
  channel: z.string().default('OFFLINE'),
  consent: z.boolean(),
});

export async function POST(req: NextRequest) {
  try {
    const ctx = await getAuthContext(req);
    if (!ADMIN_ROLES.has(ctx.role)) {
      return NextResponse.json({ error: 'FORBIDDEN', message: 'Not allowed' }, { status: 403 });
    }

    const body = await req.json();
    const parsed = CreateProfileSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'INVALID_INPUT', message: 'Invalid payload' }, { status: 400 });
    }

    const prisma = getPrisma();
    const result = await withDbContext(prisma, ctx, async (tx) => {
      // Create or match profile
      const createResult = await createOrMatchLaborProfile(tx, {
        fullName: parsed.data.fullName,
        phone: parsed.data.phone,
        cccdNumber: parsed.data.cccdNumber,
      }, {
        actorId: ctx.userId,
        consentAt: parsed.data.consent ? new Date() : null,
      });

      if (createResult.laborProfileId) {
        // Explicitly persist LaborProfileIntake to record channel
        await tx.laborProfileIntake.create({
          data: {
            laborProfileId: createResult.laborProfileId,
            channel: parsed.data.channel,
            capturedByUserId: ctx.userId,
            consentAt: parsed.data.consent ? new Date() : null,
            effectiveAt: new Date(),
          },
        });
      }

      return { ...createResult, id: createResult.laborProfileId };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    if (e instanceof AuthSessionError) {
      return NextResponse.json({ error: e.code, message: e.message }, { status: 401 });
    }
    console.error('Create LaborProfile error:', e);
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed to create labor profile' }, { status: 500 });
  }
}
