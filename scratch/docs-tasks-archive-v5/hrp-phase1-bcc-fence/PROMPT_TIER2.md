# PROMPT — Giao Tier 2 (bên ngoài, do sếp chuyển tới Cursor/agent khác)

> Tier 1 (Planner) viết 16/08/2026 · Task: `hrp-phase1-bcc-fence` · Spec v1.1
> Sếp copy nguyên khối dưới đây sang Cursor/agent Tier 2 để tiếp tục thi công.

---

```text
/code hrp-phase1-bcc-fence
```

Đây là lượt giao **tiếp nối** — không làm lại từ đầu. Đọc theo thứ tự:

1. `docs/tasks/hrp-phase1-bcc-fence/TASK.md` (spec v1.1) — contract duy nhất.
2. `docs/tasks/hrp-phase1-bcc-fence/HANDOFF.md` — evidence phần đã xong.
3. `.ai-pipeline/tier2.md` + `.ai-pipeline/rules/00-global-rules.md` + `.ai-pipeline/rules/02-engineer-rules.md`.

## Tiến độ đã có (đừng làm lại)

- **STEP-01..08 ĐÃ XONG** — commit `5851b5b` (code), `a0123fd` + `1993f7d` (HANDOFF). Test 55/55 pass, build exit 0, `app/bcc/` diff rỗng.
- **Còn đúng STEP-09** (set ENV → seed → deploy → verify production) + hoàn thiện HANDOFF `READY_FOR_AUDIT`.

## Hướng dẫn STEP-09 (theo TASK.md §5, §6)

1. **5 giá trị ENV đã có sẵn trong file `.env` local** (gitignored — tuyệt đối không commit, không in): `ADMIN_PHONE`, `ADMIN_PASSWORD`, `HR_PHONE`, `HR_PASSWORD`, và `JWT_SECRET` (giá trị dev). **Lưu ý: production phải dùng JWT_SECRET RIÊNG** — tự sinh mới `openssl rand -hex 32`, không dùng lại secret dev.
2. Set 5 ENV production trên Vercel: tài khoản CLI hiện đang đăng nhập đúng (`nguyenchanhiepvp-8526`), project **`hrp-erp`** → https://hrpartner.vn. Set qua stdin (`echo "giá trị" | vercel env add <TÊN> production`) — KHÔNG in giá trị ra output, KHÔNG ghi vào repo.
3. Seed production (Neon main — dữ liệu thật): `vercel env pull --environment=production` (dùng xong xóa file `.env` đã pull nếu muốn) → chạy seed → chỉ upsert bảng `users`, KHÔNG migrate, KHÔNG đụng bảng khác, KHÔNG in DATABASE_URL.
4. Deploy `vercel --prod` → verify curl production, evidence **masked** (không để phone/password thật vào HANDOFF):
   - `/api/me` không token → 401
   - login sai → 401; login đúng → 200 + Set-Cookie HttpOnly
   - token sửa 1 ký tự → 401; logout → cookie xóa → 401
   - `/bcc` không cookie → 307 về `/login`; có cookie → 200 (AC-10)
   - `/job-board` vẫn public 200
5. Cập nhật `HANDOFF.md` — dòng cuối `Handoff status: READY_FOR_AUDIT`. KHÔNG tự audit, KHÔNG tự nhận xét verdict.
6. Commit tiếng Việt không dấu, chỉ `git add` đúng file (KHÔNG `git add -A`), KHÔNG đụng `appBCC/*` (2 file đang sửa dở của sếp), KHÔNG commit `.env`.

Nếu gặp blocker → ghi BLOCKED trong HANDOFF với evidence, đừng sửa mò.
