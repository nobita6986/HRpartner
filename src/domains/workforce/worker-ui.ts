export type WorkerEmploymentStatus = 'NONE' | 'ACTIVE' | 'SUSPENDED' | 'TERMINATED';

export const WORKER_STATUS_LABELS: Readonly<Record<WorkerEmploymentStatus, string>> = {
  NONE: 'Chưa rõ',
  ACTIVE: 'Đang làm',
  SUSPENDED: 'Tạm ngưng',
  TERMINATED: 'Đã nghỉ',
};

const WORKER_STATUS_TONES: Readonly<Record<WorkerEmploymentStatus, 'NEUTRAL' | 'SUCCESS' | 'WARN' | 'DANGER'>> = {
  NONE: 'NEUTRAL',
  ACTIVE: 'SUCCESS',
  SUSPENDED: 'WARN',
  TERMINATED: 'DANGER',
};

export function workerStatusLabel(status: string | null | undefined): string {
  if (!status) return 'Chưa có dữ liệu';
  return WORKER_STATUS_LABELS[status as WorkerEmploymentStatus] ?? 'Trạng thái khác';
}

export function workerStatusTone(status: string | null | undefined): 'NEUTRAL' | 'SUCCESS' | 'WARN' | 'DANGER' {
  return status ? WORKER_STATUS_TONES[status as WorkerEmploymentStatus] ?? 'NEUTRAL' : 'NEUTRAL';
}
