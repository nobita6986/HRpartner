/**
 * k6-statement.js — Phase 5 UAT/Cutover STEP-07 (RQ-11).
 *
 * Load test: 20 concurrent VUs, 5 iterations each.
 * Target: GET /api/statements + GET /api/statements/margin (reconciliation).
 * Threshold: p95 response time < 2s.
 */

import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL ?? 'http://localhost:3000';
const VUS = 20;
const ITERATIONS = 5;

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
  const cookieStr = Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; ');

  // GET /api/statements
  const listRes = http.get(`${BASE_URL}/api/statements?take=20`, {
    headers: { 'Cookie': cookieStr },
  });

  check(listRes, {
    'statements status 200': (r) => r.status === 200,
    'statements p95 < 2s': (r) => r.timings.duration < 2000,
  });

  // GET /api/statements/margin
  const marginRes = http.get(`${BASE_URL}/api/statements/margin?month=8&year=2026`, {
    headers: { 'Cookie': cookieStr },
  });

  check(marginRes, {
    'margin status 200': (r) => r.status === 200,
    'margin p95 < 2s': (r) => r.timings.duration < 2000,
  });

  sleep(0.1);
}
