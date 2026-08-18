/**
 * k6-transfer.js — Phase 5 UAT/Cutover STEP-07 (RQ-11).
 *
 * Load test: 100 concurrent VUs, 10 iterations each.
 * Target: POST /api/staffing/transfers (worker transfer).
 * Threshold: p95 response time < 2s.
 */

import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL ?? 'http://localhost:3000';
const VUS = 100;
const ITERATIONS = 10;

export const options = {
  iterations: VUS * ITERATIONS,
  vus: VUS,
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    http_req_failed: ['rate<0.01'],
  },
};

function getAdminCookie() {
  const phone = __ENV.ADMIN_PHONE ?? '090****001';
  const password = __ENV.ADMIN_PASSWORD ?? 'password';
  const res = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify({ phone, password }), {
    headers: { 'Content-Type': 'application/json' },
  });
  return res.cookies;
}

export default function () {
  const cookies = getAdminCookie();
  const body = JSON.stringify({
    workerId: `seed-worker-EMP-00${1 + (__VU % 5)}`,
    fromProjectId: 'seed-proj-DA-2026-018',
    toProjectId: 'seed-proj-DA-2026-022',
    effectiveDate: new Date().toISOString().slice(0, 10),
    reason: `Load test transfer ${__VU}-${__ITER}`,
  });

  const res = http.post(`${BASE_URL}/api/staffing/transfers`, body, {
    headers: {
      'Content-Type': 'application/json',
      'Cookie': Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; '),
    },
  });

  check(res, {
    'status 200-299 or 400-499': (r) => (r.status >= 200 && r.status < 300) || (r.status >= 400 && r.status < 500),
    'response time < 2s': (r) => r.timings.duration < 2000,
  });

  sleep(0.1);
}
