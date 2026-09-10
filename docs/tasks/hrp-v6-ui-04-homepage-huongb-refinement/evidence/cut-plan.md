# Cut Plan — UI-04 Homepage Refinement + Admin V6 + Detail Page

Ngày: 10/09/2026. **CẬP NHẬT** theo Tier 0 chỉ thị mới (`docs/prompts/TIER0_UI04_OWNER_DECISIONS_AND_HOME_CONTENT.md`).

> Tier 0 đã thay cách chia: tách 2 plan (UI public riêng, Admin V6 riêng). Bản cut-plan cũ (gộp Phase A+B) **bị loại bỏ** vì mâu thuẫn với chỉ thị mới.

---

## 1. Tóm tắt thay đổi so với bản cũ

| Trước | Sau |
|---|---|
| Phase A (visual) + Phase B (pagination+admin) trong 1 task CRITICAL | **2 plan độc lập**: Plan UI (A→B→C→D) và Plan Admin V6 |
| Admin settings mở ngay trong Phase B | Admin editor/permission/schema tách sang Plan Admin V6 (không mở schema qua task UI style) |
| Tag tùy biến chưa chốt | **DEFER sang Plan Admin V6 #3** theo lộ trình V6 |
| Trang chi tiết chưa đề cập | **Task D.A (UI) + Task D.B (Editor)** — UI trước, editor sau |
| Chỉ lo BestJobs + Navbar + Recruiting | **A→B→C→D** thêm sections: Việc làm mới nhất, Giới thiệu HRP, Dải đối tác, Tin tức, Banner mobile, chi tiết |
| A11=engineering, A12=56px | A11=`apartment` trong vòng tròn nhẹ, A12=giữ monogram **64px** |
| A14=`{n} vị trí đang mở` | A14=**`Cần tuyển {n} người`** (n = availableSlots) |
| A13=copy "dự án trọng điểm" | A13=bỏ cả eyebrow + sub-heading; chỉ heading/icon. KHÔNG thêm claim "dự án trọng điểm" |
| B2=`URGENT \|\| CLOSING` | B2=**chỉ URGENT** (CLOSING = sắp đóng/hết hạn, không tự nhập chung Tuyển gấp) |
| B5=default 3, B6={3,6,9,12} | B5=**default 9** (3 hàng × 3 desktop theo demo1), B6=**{3,6,9,12}** |
| B8=[6..50] | B8=**integer [6..50]** — lựa chọn mật độ, không bảo đảm tránh trang rỗng |
| B10=Singleton `@default("default") @unique` | B10=singleton + **invariant DB** (CHECK constraint id='default', validation, missing row handling, concurrent update, cache invalidation) |
| B11=ADMIN hoặc SUPER_ADMIN | B11=**ADMIN thuần qua cơ chế hiện có**, server-side. KHÔNG phát minh SUPER_ADMIN |
| B4=mở API/service để filter URGENT | **OK** — mở scope `/api/jobs` cho filter URGENT trước pagination, giữ invariant eligibility/public projection và backward compatibility; KHÔNG client-filter một trang/overview 6 tin |
| B13=CRITICAL quét toàn repo | **CRITICAL sâu trên changed surface**, không quét toàn repo |
| B7/B9=mơ hồ | **Phân biệt rõ**: homepage search `append/load-more` (giữ); SSR `/viec-lam` có pagination URL (`listingPageSize` áp dụng cả hai bằng cách kiểm tra loader); giữ navigation riêng hiện có + metadata/URL SSR; KHÔNG biến SSR thành append |
| (chưa có) | **A16 search card nền trắng** (mới) |

---

## 2. Plan tổng thể — 2 plan độc lập

### Plan UI (public) — Tier 1 viết TASK A ngay

Chuỗi **A → B → C → D tuần tự**, một Tier 2 stream:

#### Task A — Visual Polish + A16 Search Card Trắng (STANDARD/FOCUSED)
- Navbar: container 1200px, h-16, login text link, logo+menu gom cụm
- BestJobs: logo rounded-xl+border+bg-white 64px, ribbon sát góc + icon, salary thanh rộng + icon, section icon `local_fire_department`+circle, "Xem tất cả" `/viec-lam`
- Recruiting: icon `apartment`+vòng tròn nhẹ, monogram 64px, **bỏ eyebrow + bỏ sub-heading**, copy `Cần tuyển {n} người`
- **A16: search card nền trắng** (bỏ glass, dùng `bg-white`, label tối, CTA cam)

#### Task B — Pagination + Admin Config read-only (CRITICAL)
- Tab BestJobs: Tất cả / Tuyển gấp (CHỈ URGENT)
- Pagination prev/next, fetch riêng `/api/jobs`
- Homepage page size default 9, range {3,6,9,12}
- Listing page size default 12, range [6..50]
- Schema `HomepageSettings` singleton với invariant DB
- Admin write API + ADMIN permission

#### Task C — Section Renderer + Demo Content (STANDARD/FOCUSED)
- Thứ tự homepage: navbar → hero/search → BestJobs → Dự án → **Việc làm mới nhất** → Khu vực → **Giới thiệu HRP** → **Dải đối tác** → CTV → **Tin tức** → **Banner mobile** → Footer
- Demo content có cấu trúc + nhãn "Demo"/"Minh họa"
- UI_READY / INTEGRATION_PENDING seam

#### Task D — Detail Page + Editor Admin/Sale
- **D.A (UI, STANDARD)**: nâng cấp `/viec-lam/[slug]/page.tsx` với editorial sections (gallery, intro, benefits, requirements, sidebar company, related jobs, CTA)
- **D.B (Editor, CRITICAL)**: schema editorial fields, draft/preview/publish, Sale scope, ADMIN publish, media management

### Plan Admin V6 — Sau Plan UI

1. Editor tin Admin/Sale (D.B + mở rộng)
2. CMS homepage content (Plan C sections)
3. Tag tùy biến (DEFER sau UI-05)
4. Media management
5. Cache invalidation + integration test

**Exit gate**: Admin/Sale nhập → lưu → preview → publish → public hiển thị đúng.

---

## 3. Chuỗi thực thi

Tier 1 soạn TASK A ngay, không chờ thêm quyết định.

```
[A] ──┬──> [B] ──┬──> [C] ──┬──> [D.A] ──> [D.B]
      │         │         │
      └─────────┴─────────┴──> [Plan Admin V6] (sau khi D.A xong)
```

Một Tier 2 stream; không mở song song hai plan.

---

## 4. Phân lane

| Task | Lane | Audit mode |
|---|---|---|
| A | STANDARD | FOCUSED |
| B | CRITICAL | DEEP sâu schema/permission changed surface |
| C | STANDARD | FOCUSED |
| D.A | STANDARD | FOCUSED |
| D.B | CRITICAL | DEEP sâu schema/permission/API changed surface |
| Plan Admin V6 (các sub-task) | CRITICAL | DEEP sâu schema/permission/API |

**Nguyên tắc**: chỉ nâng CRITICAL vì có migration/auth. UI thuần không tự nâng CRITICAL.

---

## 5. Out-of-scope tổng

- Không thay `public.service.ts` ngoài scope B4/D.B
- Không thay `ApplyModal` / `SuccessModal` / `DetailApplyCta` ngoài style đồng bộ
- Không thay `/admin/settings` ở Phase A/B (chỉ thêm ở D.B nếu cần)
- Không CMS tag tùy biến ở Plan UI
- Không mở 2 Tier 2 stream song song

---

## 6. Visual gate

Owner live review post-push. KHÔNG phục hồi Edge/CDP/PNG/bbox markers cũ.

---

## 7. References

- Tier 0 chỉ thị mới: `docs/prompts/TIER0_UI04_OWNER_DECISIONS_AND_HOME_CONTENT.md`
- Field matrix: `evidence/field-matrix.md`
- Owner approval checklist (28 quyết định, cập nhật theo Tier 0): `evidence/OWNER_APPROVAL_REQUIRED.md`
- Gap matrix gốc: `evidence/gap-matrix.md`
- Bản plan tổng thể: `evidence/plan-overview.md`
