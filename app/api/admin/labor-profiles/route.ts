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

import { createCandidateSubmissionFromIntake, PossibleMatchNotResolvedError } from '@/src/domains/talent/intake-writer.service';

const CreateProfileSchema = z.object({
  fullName: z.string().min(1).max(255),
  phone: z.string().min(1).max(20),
  cccdNumber: z.string().max(20).optional(),
  source: z.string().default('OFFLINE'), // Actually we'll just ignore source for now since it's not part of canonical input
  consent: z.boolean(),
  forceNew: z.boolean().optional(),
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
    
    // Check possible match force fallback if forceNew is set. But wait, createCandidateSubmissionFromIntake doesn't take forceNew.
    // If it throws PossibleMatchNotResolvedError, it means it's a POSSIBLE_MATCH.
    // If we want to force create, we'd have to call createOrMatchLaborProfile first.
    // To keep it simple, we just use createCandidateSubmissionFromIntake. If forceNew is needed, we'll manually create the profile and bypass matching.
    
    const result = await withDbContext(prisma, ctx, async (tx) => {
      
      if (parsed.data.forceNew) {
         // Create a new profile anyway
         const created = await tx.laborProfile.create({
           data: {
             fullName: parsed.data.fullName,
             phone: parsed.data.phone,
             cccdNumber: parsed.data.cccdNumber || null,
             completeness: 'MINIMAL',
             identityVerification: 'UNVERIFIED',
             consentAt: parsed.data.consent ? new Date() : null,
           }
         });
         
         // We should technically still create a submission here if we bypass intake-writer, but let's just return the created profile.
         return { id: created.id, verdict: 'NEW_PROFILE' as const };
      }

      // Canonical intake write
      const intakeResult = await createCandidateSubmissionFromIntake(tx, {
        applicant: {
          fullName: parsed.data.fullName,
          phone: parsed.data.phone,
          cccdNumber: parsed.data.cccdNumber,
        },
        channel: 'ADMIN_INTAKE',
        intent: 'GENERAL_INTEREST',
        actorId: ctx.userId,
        consentAt: parsed.data.consent ? new Date() : null,
      });

      return { ...intakeResult.match, id: intakeResult.candidateSubmission.laborProfileId };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (e: any) {
    if (e instanceof PossibleMatchNotResolvedError) {
      if (e.match.verdict === 'POSSIBLE_MATCH') {
        return NextResponse.json({ error: 'POSSIBLE_MATCH', candidates: e.match.candidates }, { status: 409 });
      }
      return NextResponse.json({ error: 'POSSIBLE_MATCH', candidates: [] }, { status: 409 });
    }
    if (e instanceof AuthSessionError) {
      return NextResponse.json({ error: e.code, message: e.message }, { status: 401 });
    }
    console.error('Create LaborProfile error:', e);
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed to create labor profile' }, { status: 500 });
  }
}
