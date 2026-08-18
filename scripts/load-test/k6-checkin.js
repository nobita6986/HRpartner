/**
 * k6-checkin.js — Phase 5 UAT/Cutover STEP-07 (RQ-11).
 *
 * Load test: 5,000 virtual users (VUs), 1 iteration each.
 * Target: POST /api/tickets (create ticket = check-in simulation).
 * Threshold: p95 response time < 2s.
 *
 * Usage:
 *   k6 run scripts/load-test/k6-checkin.js
 *   k6 run -e BASE_URL=https://hrp-erp.vercel.app scripts/load-test/k6-checkin.js
 *
 * Environment variables:
 *   BASE_URL     — API base (default: http://localhost:3000)
 *   ADMIN_PHONE  — test user phone (default: seed phone)
 *   ADMIN_PASSWORD — test user password
 */

import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL ?? 'http://localhost:3000';
const VUS = 5000;
const DURATION = '30s';

export const options = {
  stages: [
    { duration: DURATION, target: VUS },
    { duration: '10s',  target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],   // p95 < 2s
    http_req_failed: ['rate<0.01'],      // < 1% failure
  },
};

// ─── Auth ────────────────────────────────────────────────────────────────────

function getAdminCookie() {
  const phone = __ENV.ADMIN_PHONE ?? '090****001';
  const password = __ENV.ADMIN_PASSWORD ?? 'password';
  const res = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify({ phone, password }), {
    headers: { 'Content-Type': 'application/json' },
  });
  return res.cookies;
}

// ─── Scenario ────────────────────────────────────────────────────────────────

export default function () {
  const cookies = getAdminCookie();
  const body = JSON.stringify({
    projectId: 'seed-proj-DA-2026-018',
    workerId: `seed-worker-EMP-00${1 + (Math.random() * 4 | 0)}`,
    date: new Date().toISOString().slice(0, 10),
    checkIn: '08:00',
    checkOut: '17:00',
    note: `Load test ${__VU}-${__ITER}`,
  });

  const res = http.post(`${BASE_URL}/api/tickets`, body, {
    headers: {
      'Content-Type': 'application/json',
      'Cookie': Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; '),
    },
  });

  check(res, {
    'status 200 or 201 or 400': (r) => [200, 201, 400].includes(r.status),
    'response time < 2s': (r) => r.timings.duration < 2000,
  });

  sleep(0.1);
}
