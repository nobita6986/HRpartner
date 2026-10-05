export type VendorStatus = 'ACTIVE' | 'INACTIVE';

export const VENDOR_STATUS_LABELS: Readonly<Record<VendorStatus, string>> = {
  ACTIVE: 'Hoạt động',
  INACTIVE: 'Tạm ngưng',
};

export function vendorStatusLabel(value: string): string {
  return VENDOR_STATUS_LABELS[value as VendorStatus] ?? 'Trạng thái khác';
}

export function vendorStatusTone(value: string): 'NEUTRAL' | 'SUCCESS' | 'WARN' | 'DANGER' {
  if (value === 'ACTIVE') return 'SUCCESS';
  if (value === 'INACTIVE') return 'WARN';
  return 'NEUTRAL';
}
