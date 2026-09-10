# HANDOFF — `hrp-v6-ui-04c1-r9-footer-map-osm`

## Round R9 — Thay cột 3 ContactForm → OpenStreetMap iframe

### Owner directive

11/09/2026 01:22 UTC+7: "bỏ hẳn cột THÔNG TIN LIÊN HỆ / thay vào đó nội dung khác như là map đến công ty, nhưng lưu ý về chiều cao ở 3 cột footer phải tương đương nhau"

### Why OpenStreetMap (not Google Maps)

Google Maps embed v1 endpoint **bắt buộc API key** — không có key trong `.env` → iframe trắng. OpenStreetMap hoàn toàn free, không cần key.

Owner pick `osm-embed` ở AskQuestion.

### Technical details

- **Map endpoint**: `https://www.openstreetmap.org/export/embed.html`
- **bbox**: `105.20,21.35,105.30,21.45` (tọa độ Phú Thọ, Việt Nam — địa chỉ: "Khu đất DV Tân Ngọc, Thống Nhất, Bắc Kế, Xã Bình Tuyền, Tỉnh Phú Thọ")
- **iframe height**: 220px — gần bằng cột 2 (5 services × ~40px + header ≈ 240px)
- **3 cột chiều cao**:
  - Cột 1: ~248px (7 dòng text)
  - Cột 2: ~240px (5 services)
  - Cột 3: ~255px (iframe 220px + header + gap)

### Diff

```diff
- {/* Cột 3: Liên hệ */}
- <div className="flex flex-col gap-3">
-   <h3>THÔNG TIN LIÊN HỆ</h3>
-   <div className="rounded-2xl bg-primary-container/40 p-4 md:p-5">
-     <ContactForm disabled={true} />
-   </div>
- </div>
+ {/* Cột 3: Bản đồ */}
+ <div className="flex flex-col gap-y-3">
+   <h3>BẢN ĐỒ</h3>
+   <div className="overflow-hidden rounded-2xl border border-outline-variant">
+     <iframe
+       title="HRP Việt Nam - Bản đồ"
+       width="100%" height="220"
+       loading="lazy"
+       src="https://www.openstreetmap.org/export/embed.html?bbox=105.20%2C21.35%2C105.30%2C21.45&layer=mapnik&marker=21.40%2C105.25"
+     />
+   </div>
+ </div>
```

Dead code: `ContactForm` import xóa (chỉ dùng trong GlobalFooter).

## Commit

- Branch: `main`
- SHA: `39950a1`
- Message: `feat(ui): hrp-v6-ui-04c1-r9-footer-map-osm fast round -- bo cot 3 ContactForm, thay OpenStreetMap iframe embed; bo dead import ContactForm`
- Pushed: ✅ push thành công
- Files: `app/components/GlobalFooter.tsx` (+14/-5), `docs/tasks/.../TASK.md` (+136)
- Vercel auto-deploy trigger từ main push

## Open Questions

- **Q1**: Tọa độ bản đồ có chính xác không? Nếu không, cung cấp link Google Maps → em extract tọa độ.
- **Q2**: Header "BẢN ĐỒ" hay muốn giữ "THÔNG TIN LIÊN HỆ"? (em đổi theo context map)
- **Q3**: Chiều cao iframe 220px có OK không?

## Gates

| Gate | Result |
|---|---|
| Local `npm run typecheck` | ✅ exit 0 |
| Visual Vercel | ⏳ https://hrpvietnam.com/ (anh refresh) |
