/**
 * rate-limit-provider.ts — V5-OPS-06A / RQ-01 / STEP-01 (DEC-01/02/03).
 *
 * Chọn provider LAZY tại request đầu tiên (build KHÔNG cần secret — RQ-01):
 *   - Upstash env đầy đủ  → Upstash adapter (distributed).
 *   - Ngoài production + CHƯA cấu hình Upstash → memory fake (dev DX, DEC-03).
 *   - Production thiếu/sai env, hoặc env sai định dạng ở mọi môi trường → throw
 *     RateLimitUnavailableError ⇒ caller trả 503. KHÔNG có RAM fallback ở production (DEC-02).
 *
 * Test injection (`__setRateLimitRuntime`) tự chặn khi production (DEC-03).
 */
import { createMemoryRateLimitProvider } from './rate-limit-memory';
import {
  envLabel,
  isProductionEnv,
  RateLimitUnavailableError,
  resolveHashSecret,
  resolveRateLimitConfig,
  type EnvLike,
  type RateLimitProvider,
} from './rate-limit-port';
import { createUpstashRateLimitProvider } from './rate-limit-upstash';

export interface RateLimitRuntime {
  readonly provider: RateLimitProvider;
  readonly hashSecret: string;
}

let injected: RateLimitRuntime | null = null;
let cached: { fingerprint: string; runtime: RateLimitRuntime } | null = null;

/** Fingerprint chỉ dùng SỰ CÓ MẶT của env (không giá trị, không độ dài secret ra ngoài). */
function fingerprint(env: EnvLike): string {
  return [
    envLabel(env),
    env.UPSTASH_REDIS_REST_URL ? 'u1' : 'u0',
    env.UPSTASH_REDIS_REST_TOKEN ? 't1' : 't0',
    env.RATE_LIMIT_HASH_SECRET ? 's1' : 's0',
  ].join('|');
}

function build(env: EnvLike): RateLimitRuntime {
  try {
    const config = resolveRateLimitConfig(env);
    return { provider: createUpstashRateLimitProvider(config), hashSecret: config.hashSecret };
  } catch (err) {
    const missingConfig =
      err instanceof RateLimitUnavailableError && err.reason === 'CONFIG_MISSING';
    // DEC-02: production KHÔNG fallback. Env sai định dạng (CONFIG_INVALID) cũng không fallback.
    if (isProductionEnv(env) || !missingConfig) throw err;
    return {
      provider: createMemoryRateLimitProvider({ env }),
      hashSecret: resolveHashSecret(env),
    };
  }
}

/** Throws RateLimitUnavailableError khi không thể có provider hợp lệ. */
export function getRateLimitRuntime(env: EnvLike = process.env): RateLimitRuntime {
  if (injected) return injected;
  const fp = fingerprint(env);
  if (cached && cached.fingerprint === fp) return cached.runtime;
  const runtime = build(env);
  cached = { fingerprint: fp, runtime };
  return runtime;
}

/** Test-only (DEC-03): từ chối hoạt động ở production. */
export function __setRateLimitRuntime(
  runtime: { provider: RateLimitProvider; hashSecret?: string },
  env: EnvLike = process.env,
): void {
  if (isProductionEnv(env)) throw new RateLimitUnavailableError('MEMORY_IN_PRODUCTION');
  injected = { provider: runtime.provider, hashSecret: runtime.hashSecret ?? resolveHashSecret(env) };
}

export function __resetRateLimitRuntime(): void {
  injected = null;
  cached = null;
}
