export type ClientStatus = 'PROSPECT' | 'ACTIVE' | 'BLACKLISTED';

export const CLIENT_STATUS_LABELS: Readonly<Record<ClientStatus, string>> = {
  PROSPECT: 'Tiềm năng',
  ACTIVE: 'Đang hợp tác',
  BLACKLISTED: 'Danh sách đen',
};

const CLIENT_STATUS_TONES: Readonly<Record<ClientStatus, 'NEUTRAL' | 'SUCCESS' | 'WARN' | 'DANGER'>> = {
  PROSPECT: 'WARN',
  ACTIVE: 'SUCCESS',
  BLACKLISTED: 'DANGER',
};

export function clientStatusLabel(value: string): string {
  return CLIENT_STATUS_LABELS[value as ClientStatus] ?? 'Trạng thái khác';
}

export function clientStatusTone(value: string): 'NEUTRAL' | 'SUCCESS' | 'WARN' | 'DANGER' {
  return CLIENT_STATUS_TONES[value as ClientStatus] ?? 'NEUTRAL';
}

const COMPANY_SIZE_LABELS: Readonly<Record<string, string>> = {
  SMALL: 'Nhỏ',
  MEDIUM: 'Vừa',
  LARGE: 'Lớn',
  ENTERPRISE: 'Doanh nghiệp',
};

export function companySizeLabel(value: string | null | undefined): string {
  if (!value) return '—';
  return COMPANY_SIZE_LABELS[value] ?? 'Quy mô khác';
}
