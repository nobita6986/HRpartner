/**
 * site-gps-http.ts — error mapping cho routes GPS (Task hrp-t1a-android-gps-
 * project-site-config). Tách khỏi route.ts vì Next.js App Router kiểm tra
 * nghiêm các named export của route files (chỉ HTTP method + config là hợp lệ).
 */
import { NextResponse } from 'next/server';
import { SiteGpsServiceError } from './site-gps.service';

export function mapSiteGpsError(e: SiteGpsServiceError): NextResponse {
  switch (e.code) {
    case 'NOT_FOUND':
      return NextResponse.json({ error: e.code, message: e.message }, { status: 404 });
    case 'PERMISSION_DENIED':
      return NextResponse.json({ error: e.code, message: e.message }, { status: 403 });
    case 'VALIDATION':
      return NextResponse.json({ error: e.code, message: e.message }, { status: 400 });
    default:
      return NextResponse.json({ error: 'INTERNAL', message: e.message }, { status: 500 });
  }
}
