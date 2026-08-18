/**
 * Feature flags — P1 Portals STEP-11 (DEC-11, §11.4).
 *
 * Reads env vars. Default ON for portal/check-in after STEP-04/05 done;
 * commission/zaloLogin always OFF.
 */

const get = (k: string, def = false): boolean => {
  const v = process.env[k];
  if (!v) return def;
  return v === 'true' || v === '1';
};

export const FEATURE_FLAGS = {
  vendorPortal: get('FEATURE_VENDOR_PORTAL', true),
  gpsCheckin:   get('FEATURE_GPS_CHECKIN',   true),
  pushNotify:   get('FEATURE_PUSH_NOTIFY',   true),
  commission:   get('FEATURE_COMMISSION',   false), // P2 — always OFF
  zaloLogin:    get('FEATURE_ZALO_LOGIN',   false), // always OFF
};

/**
 * Check if push is enabled (both feature flag AND VAPID keys present).
 * Per DEC-05: missing VAPID keys → flag off, app still runs.
 */
export function isPushAvailable(): boolean {
  return FEATURE_FLAGS.pushNotify &&
    !!process.env.VAPID_PUBLIC_KEY &&
    !!process.env.VAPID_PRIVATE_KEY;
}
