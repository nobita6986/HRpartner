# HANDOFF — `hrp-v6-admin-detail-foundation`

## Tóm tắt công việc (W2)
Đã hoàn thành thiết lập các components UI dùng chung cho Admin Detail Pages và tích hợp thành công trên Pilot route (`/admin/jobs/job-postings`).

- `Breadcrumb`: Đường dẫn semantic, điều hướng ổn định.
- `RelatedObjects`: Panel hiển thị các đối tượng có quan hệ với deep-link.
- `EmptyState`: Component rỗng có tính định hướng action.
- `RowLink`: Giải pháp UX/Accessibility click nguyên hàng cho data table mà không vi phạm nested `<a>`.

## Verification Evidence
- **Typecheck & Lint:** `tsc --noEmit` pass; `npm run lint` pass đối với các file in-scope.
- **Unit Tests:** `npm run test:unit` pass (bao gồm 4 bài test UI focused `admin-detail-foundation.test.ts` trực tiếp cho `Breadcrumb`, `RelatedObjects`, `EmptyState`, và `RowLink`).
- **Build:** Next.js build hoàn thành thành công.
- **Browser Smoke:** `NOT_RUN` / `ENV_BLOCKED`.
  - Có rủi ro tương tác (residual interaction risk) liên quan đến `RowLink` khi áp dụng class class `before:inset-0` trên table rows. Bắt buộc phải thực hiện manual smoke khi có session Vercel thật để kiểm tra click propagation.

## Next Steps
Bàn giao code qua PR để T0 review theo quy trình chuẩn.
