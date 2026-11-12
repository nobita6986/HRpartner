'use client';

/**
 * bi-feed-sync-panel.tsx — hrp-bi-jobs-feed-sync-v1 (RQ-04)
 *
 * Admin/HR_MANAGER control card on `/admin/jobs/job-postings` showing the
 * status of the 30-minute BI Public Jobs Feed sync (`https://bi.hrpartner.vn/feeds/jobs.v1.json`)
 * and allowing immediate on-demand synchronization.
 */

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { BiJobsFeedSyncStats } from '@/src/domains/integrations/bi/bi-jobs-feed.service';

interface BiFeedSyncPanelProps {
  feedUrl: string;
  initialSync: BiJobsFeedSyncStats | null;
}

export function BiFeedSyncPanel({ feedUrl, initialSync }: BiFeedSyncPanelProps) {
  const router = useRouter();
  const [lastSync, setLastSync] = useState<BiJobsFeedSyncStats | null>(initialSync);
  const [isSyncing, setIsSyncing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  async function handleSync(forceUpdate = false) {
    setIsSyncing(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await fetch('/api/admin/jobs/bi-feed-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forceUpdate }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        message?: string;
        feedUrl?: string;
        syncedAt?: string;
        totalInFeed?: number;
        created?: number;
        updated?: number;
        unchanged?: number;
        archived?: number;
      };
      if (!res.ok || !json.ok) {
        setErrorMsg(json.message ?? 'Không thể đồng bộ từ BI Feed. Vui lòng thử lại.');
        return;
      }
      const nextStats: BiJobsFeedSyncStats = {
        feedUrl: json.feedUrl ?? feedUrl,
        syncedAt: json.syncedAt ?? new Date().toISOString(),
        totalInFeed: json.totalInFeed ?? 0,
        created: json.created ?? 0,
        updated: json.updated ?? 0,
        unchanged: json.unchanged ?? 0,
        archived: json.archived ?? 0,
      };
      setLastSync(nextStats);
      setSuccessMsg(
        `Đã đồng bộ ${nextStats.totalInFeed} tin từ BI Feed: +${nextStats.created} mới, ${nextStats.updated} cập nhật, ${nextStats.unchanged} giữ nguyên, ${nextStats.archived} lưu trữ.`,
      );
      router.refresh();
    } catch {
      setErrorMsg('Lỗi kết nối máy chủ khi đồng bộ BI Feed.');
    } finally {
      setIsSyncing(false);
    }
  }

  return (
    <section
      className="mb-6 rounded-xl border p-4 text-sm"
      style={{
        borderColor: 'var(--outline-variant)',
        backgroundColor: 'var(--color-surface)',
        color: 'var(--on-surface)',
      }}
      data-testid="bi-feed-sync-panel"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold">
              Đồng bộ Tin Tuyển dụng từ BI Feed (Chuẩn 4 phần)
            </h2>
            <span
              className="rounded-full px-2.5 py-0.5 text-xs font-medium"
              style={{
                backgroundColor: 'var(--color-primary-soft)',
                color: 'var(--color-primary-dark)',
              }}
            >
              Tự động quét: 30 phút / lần
            </span>
          </div>
          <p className="mt-1 text-xs" style={{ color: 'var(--on-surface-variant)' }}>
            Nguồn chuẩn: <code className="font-mono">{feedUrl}</code>
            {lastSync ? (
              <>
                {' · '}Lần quét gần nhất:{' '}
                <strong>{new Date(lastSync.syncedAt).toLocaleString('vi-VN')}</strong> (Tổng:{' '}
                <strong>{lastSync.totalInFeed}</strong> tin · Mới: <strong>{lastSync.created}</strong> · Cập
                nhật: <strong>{lastSync.updated}</strong> · Giữ nguyên:{' '}
                <strong>{lastSync.unchanged}</strong> · Đã gỡ/Lưu trữ:{' '}
                <strong>{lastSync.archived}</strong>)
              </>
            ) : (
              <> · Chưa ghi nhận lượt đồng bộ nào.</>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={isSyncing}
            onClick={() => handleSync(false)}
            className="rounded border px-3 py-1.5 text-sm font-medium"
            style={{
              borderColor: 'var(--color-primary)',
              backgroundColor: 'var(--color-primary-soft)',
              color: 'var(--color-primary-dark)',
              opacity: isSyncing ? 0.6 : 1,
              cursor: isSyncing ? 'not-allowed' : 'pointer',
            }}
            data-testid="bi-feed-sync-now-button"
          >
            {isSyncing ? 'Đang đồng bộ từ BI…' : 'Đồng bộ tin từ BI ngay'}
          </button>
          <button
            type="button"
            disabled={isSyncing}
            onClick={() => handleSync(true)}
            className="rounded border px-3 py-1.5 text-xs font-medium"
            style={{
              borderColor: 'var(--outline)',
              backgroundColor: 'var(--surface-container-lowest)',
              color: 'var(--on-surface-variant)',
              opacity: isSyncing ? 0.6 : 1,
              cursor: isSyncing ? 'not-allowed' : 'pointer',
            }}
            data-testid="bi-feed-force-sync-button"
          >
            Làm mới toàn bộ nội dung
          </button>
        </div>
      </div>

      {errorMsg && (
        <div
          role="alert"
          className="mt-3 rounded border p-2.5 text-xs"
          style={{ borderColor: '#f5b5b5', backgroundColor: '#fdecec', color: '#8a1c1c' }}
        >
          {errorMsg}
        </div>
      )}

      {successMsg && (
        <div
          role="status"
          className="mt-3 rounded border p-2.5 text-xs"
          style={{
            borderColor: 'var(--outline)',
            backgroundColor: 'var(--color-surface-container)',
            color: 'var(--on-surface)',
          }}
        >
          {successMsg}
        </div>
      )}
    </section>
  );
}
