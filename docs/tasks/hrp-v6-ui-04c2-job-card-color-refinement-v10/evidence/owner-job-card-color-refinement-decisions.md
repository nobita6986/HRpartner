# Owner decisions -- Job Card color refinement v10

Ngay: 10/09/2026
Ap dung cho: `hrp-v6-ui-04c2-job-card-color-refinement-v10`

## Quyet dinh 16 diem

1. **CTA `Xem chi tiet` -- DOI sang outline/ghost:** `border border-slate-300 bg-white text-slate-700 hover:bg-slate-50`. Khong dung nut xanh solid.
2. **CTA `Ung tuyen nhanh` -- DOI sang cam thuong hieu:** dung semantic token hien co (`bg-primary`, hover dam hon, chu trang). Vien toi da 1px neu can; tuyet doi khong co vien cam/nau day nhu phien ban cu.
3. **Salary pill -- GIU dang pill nho, tang do doc vua du:** uu tien `bg-emerald-50 text-emerald-700` hoac token tuong duong, co the them `border-emerald-100`; khong bien thanh thanh full-width, khong dung nen cam/do bet.
4. **Title -- DOI:** `text-base font-semibold leading-snug line-clamp-2`. Giu toi da hai dong va them `title` attribute de nguoi dung van doc duoc tieu de day du khi hover.
5. **Button font -- GIU `text-sm font-medium`.** Khong dung chu qua dam.
6. **Footer padding -- DOI thanh `px-4 py-3`.**
7. **Footer gap -- DUNG `gap-2` o mobile va co the `sm:gap-3` khi du cho.**
8. **Footer layout -- DUNG `justify-between`:** salary o trai, nhom CTA o phai; cho phep wrap co kiem soat tren man hinh hep, khong ep noi dung tran card.
9. **Separator -- DOI thanh `border-t border-slate-200`** de phan cap ro hon.
10. **Radius -- GIU `rounded-xl`.**
11. **Card border -- GIU `border border-slate-200`.**
12. **Shadow -- GIU `shadow-sm hover:shadow-md transition-all duration-200`.** Hover lift nhe, khong shadow nang.
13. **ARIA -- GIU ten hanh dong ro:** CTA that co accessible name `Ung tuyen nhanh`; preview co `Ban xem truoc` va trang thai disabled dung semantic.
14. **Nhan mobile -- KHONG an toan bo chu bang `hidden sm:inline`.** Mobile phai con nhan nhin thay `Ung tuyen`; accessible name day du van la `Ung tuyen nhanh`. Hover/focus khong duoc lam mat chu hoac lam chu trung mau nen.
15. **Test -- CHO PHEP sua `featured-job-card.test.ts`.** Tier 1 phai dua file nay vao allowlist v1.0. Bo sung hoac cap nhat kiem tra co y nghia cho accessible label, preview disabled va viec hai CTA khong kich hoat click card ngoai y muon; khong viet test chi sao chep danh sach class.
16. **Surface -- GIU:** `bg-white border border-slate-200 rounded-xl shadow-sm`; khong doi lai semantic `surface` trong task nay.

## Interaction invariants

- Click vao vung card ngoai CTA tiep tuc di den canonical job detail URL.
- `Xem chi tiet` tiep tuc di den canonical job detail URL.
- `Ung tuyen nhanh` tiep tuc mo ApplyModal va phai chan dieu huong card do bubbling.
- Hover/focus cua `Ung tuyen nhanh` luon giu icon va chu co contrast ro; khong tai dien loi nut con nen nhung mat chu.
- Preview giu disabled, khong mo modal va khong gia lap live integration.
- Ribbon `Tuyen gap` giu compact, `bg-orange-500/75`, khong lay cho trong flow cua title va khong che title.

## Boundary va gate

- Tier 1 thay toan bo placeholder, bump spec len `v1.0`, mo allowlist cho test file va chuyen `READY_FOR_EXECUTION` sau khi `verify-task.ps1` PASS.
- Lane giu `FAST`; neu implementation buoc phai cham ngoai component va test tuong ung thi dung va bao Tier 0.
- Khong doi API, schema, route, ApplyModal contract, du lieu job hoac package.
- Owner live visual review dien ra tren production sau khi 04c1 va 04c2 da push.
- Day la quyet dinh day du cua Owner. Tier 1 va Tier 2 khong hoi lai 16 diem tren.
