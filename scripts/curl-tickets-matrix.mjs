/**
 * scripts/curl-tickets-matrix.mjs (TEMPORARY - STEP-06 verify AC-05)
 *
 * Test AC-05 matrix bằng cách:
 *  1. Sign JWT trực tiếp bằng jwt.ts (mô phỏng login).
 *  2. Gọi HTTP tới /api/tickets/* với Bearer header.
 *  3. Verify: 401 (no token), 200 (có token), 403 (thiếu permission / role ngoài 6).
 *
 * KHÔNG phụ thuộc vào /api/auth/login (login có vấn đề cache DB của Next.js dev).
 * Dùng jose trực tiếp để sign + đưa vào Bearer.
 */
import { SignJWT } from 'jose';
import { PrismaClient } from '@prisma/client';
import { setTimeout as wait } from 'node:timers/promises';

const SECRET = process.env.JWT_SECRET || 'wk89jpDi0Ezegly3GSK1WmTn2RZ7UVavqNYtBCbPJMIsOhXr';
const key = new TextEncoder().encode(SECRET);
const BASE = 'http://localhost:3000';

async function sign(userId, role) {
  return await new SignJWT({ role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(key);
}

async function curl(method, path, headers = {}, body = null) {
  const url = `${BASE}${path}`;
  const init = { method, headers: { ...headers } };
  if (body) {
    init.headers['content-type'] = 'application/json';
    init.body = JSON.stringify(body);
  }
  const res = await fetch(url, init);
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* keep text */ }
  return { status: res.status, json, text };
}

const p = new PrismaClient();

try {
  // Lấy user IDs theo role
  const admin = await p.user.findFirst({ where: { role: 'ADMIN', name: { contains: 'identity-core' } }, select: { id: true, role: true, isActive: true } });
  const hr = await p.user.findFirst({ where: { role: 'HR_MANAGER', name: { contains: 'identity-core' } }, select: { id: true, role: true, isActive: true } });
  const director = await p.user.findFirst({ where: { role: 'DIRECTOR' }, select: { id: true, role: true } });
  console.log(`ADMIN id=${admin?.id.substring(0, 8)}*** role=${admin?.role} isActive=${admin?.isActive}`);
  console.log(`HR id=${hr?.id.substring(0, 8)}*** role=${hr?.role} isActive=${hr?.isActive}`);
  console.log(`DIRECTOR id=${director?.id.substring(0, 8)}*** role=${director?.role}`);

  if (!admin || !hr) {
    console.log('SKIP: missing identity-core users');
    process.exit(0);
  }

  const adminJwt = await sign(admin.id, 'ADMIN');
  const hrJwt = await sign(hr.id, 'HR_MANAGER');
  const directorJwt = await sign(director?.id || 'fake', 'DIRECTOR');

  // 1. /api/me không token → 401
  console.log('\n=== AC-04: /api/me không token ===');
  const meNo = await curl('GET', '/api/me');
  console.log(`STATUS=${meNo.status} ${meNo.status === 401 ? 'PASS' : 'FAIL'}`);

  // 2. /api/me với admin token → 200
  console.log('\n=== AC-04: /api/me với ADMIN JWT ===');
  const meAdmin = await curl('GET', '/api/me', { authorization: `Bearer ${adminJwt}` });
  console.log(`STATUS=${meAdmin.status} body=${JSON.stringify(meAdmin.json).substring(0, 200)}`);

  // 3. /api/tickets không token → 401
  console.log('\n=== AC-05: /api/tickets không token ===');
  const tNo = await curl('GET', '/api/tickets');
  console.log(`STATUS=${tNo.status} ${tNo.status === 401 ? 'PASS' : 'FAIL'}`);

  // 4. /api/tickets với ADMIN → 200 (list - PHASE_KHOAHOC: 200 kể cả role yếu)
  console.log('\n=== AC-05: /api/tickets với ADMIN ===');
  const tAdmin = await curl('GET', '/api/tickets?take=5', { authorization: `Bearer ${adminJwt}` });
  console.log(`STATUS=${tAdmin.status} ${tAdmin.status === 200 ? 'PASS' : 'FAIL'}`);
  if (tAdmin.json) console.log(`  total=${tAdmin.json.total} items=${tAdmin.json.items?.length}`);

  // 5. /api/tickets/[id]/approve với HR_MANAGER (có CAN_APPROVE_TICKET_LEVEL2) → expect 200 hoặc 404 (id không tồn tại) hoặc 409 (transition invalid)
  console.log('\n=== AC-05: /api/tickets/[fake]/approve với HR_MANAGER (có permission) ===');
  const apHr = await curl('POST', '/api/tickets/00000000-0000-0000-0000-000000000000/approve', { authorization: `Bearer ${hrJwt}`, 'x-idempotency-key': 'test-1' }, { note: 'test' });
  console.log(`STATUS=${apHr.status} body=${JSON.stringify(apHr.json)?.substring(0, 200)}`);

  // 6. /api/tickets/[id]/approve với DIRECTOR (ngoài 6 TicketActorRole → 403 FORBIDDEN)
  console.log('\n=== AC-05: /api/tickets/[fake]/approve với DIRECTOR (ngoài 6 → 403) ===');
  const apDir = await curl('POST', '/api/tickets/00000000-0000-0000-0000-000000000000/approve', { authorization: `Bearer ${directorJwt}`, 'x-idempotency-key': 'test-2' }, { note: 'test' });
  console.log(`STATUS=${apDir.status} body=${JSON.stringify(apDir.json)?.substring(0, 200)}`);

  // 7. /api/tickets/[id]/reject với ADMIN (có CAN_PROCESS_TICKET) → expect 200/404/409
  console.log('\n=== AC-05: /api/tickets/[fake]/reject với ADMIN ===');
  const rjAdmin = await curl('POST', '/api/tickets/00000000-0000-0000-0000-000000000000/reject', { authorization: `Bearer ${adminJwt}`, 'x-idempotency-key': 'test-3' }, { reason: 'test' });
  console.log(`STATUS=${rjAdmin.status} body=${JSON.stringify(rjAdmin.json)?.substring(0, 200)}`);

  // 8. /api/tickets/[id]/cancel với DIRECTOR → 403
  console.log('\n=== AC-05: /api/tickets/[fake]/cancel với DIRECTOR ===');
  const cnDir = await curl('POST', '/api/tickets/00000000-0000-0000-0000-000000000000/cancel', { authorization: `Bearer ${directorJwt}`, 'x-idempotency-key': 'test-4' }, { reason: 'test' });
  console.log(`STATUS=${cnDir.status} body=${JSON.stringify(cnDir.json)?.substring(0, 200)}`);

  console.log('\n=== Done ===');
} finally {
  await p.$disconnect();
}
