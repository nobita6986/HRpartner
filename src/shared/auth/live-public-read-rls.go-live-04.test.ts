/**
 * live-public-read-rls.go-live-04.test.ts — V5-go-live-04 / RQ-05, RQ-06, RQ-07, RQ-08 /
 * STEP-10 / AC-06, AC-07, AC-08, AC-10.
 *
 * LIVE evidence trên DB THẬT cho đường đọc công khai — bằng chứng duy nhất phân biệt
 * "code đúng" với "im lặng trả 0 dòng": defect P0 gốc không ném lỗi nào. Ba call site gọi
 * `prisma.$transaction` trần ⇒ `app.role` NULL ⇒ mọi nhánh `hrp_project_visible_for` so
 * sánh với NULL ⇒ 3 bảng FORCE RLS trả rỗng, trong khi mọi gate tĩnh vẫn xanh.
 *
 * Bốn chứng minh bắt buộc của DEC-05, CÙNG một kết nối `DATABASE_URL`:
 *   (a) `rolbypassrls` và `rolsuper` của `current_user` = false — kết nối bypass RLS thì
 *       mọi kết quả dưới đây vô nghĩa.
 *   (b) Negative control: cùng kết nối, cùng truy vấn, KHÔNG set GUC ⇒ 0 dòng.
 *   (c) Qua `withPublicDb` ⇒ ≥ 1 dòng, và MỌI dòng principal công khai nhìn thấy được
 *       đều có `is_public = true`.
 *   (d) Dự án `is_public = false` của fixture KHÔNG xuất hiện ở bất kỳ đường đọc nào.
 * Cộng RQ-05: một lệnh ghi phát trong transaction của helper bị từ chối SQLSTATE `25006`,
 * dùng `WHERE` không khớp dòng nào nên kể cả khi read-only hỏng cũng không hỏng dữ liệu.
 *
 * Nếu (b) trả ra dòng: DỪNG — kết nối đang BYPASSRLS hoặc trỏ branch tắt RLS, toàn bộ
 * evidence của round vô giá trị (DEC-05).
 *
 * Seed/teardown qua `DATABASE_URL_ADMIN` (bypass RLS); mọi phép đo hành vi CHỈ qua
 * `DATABASE_URL` (app_user_writer). Thiếu env ⇒ self-skip, preflight in `ENV_BLOCKED` —
 * KHÔNG phải PASS (DEC-12). `console.log` là CÓ CHỦ ĐÍCH: AC-06/07/08/10 đòi log in ra
 * giá trị thật (rolname, SQLSTATE, id fixture, số dòng) chứ không chỉ assert xanh.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { readRlsContext } from './rls-context';
import { PUBLIC_READ_ONLY_GUC, PUBLIC_READ_PRINCIPAL, withPublicDb } from './with-public-db';
import { getPublicJobProjection, listPublicJobProjection } from '@/src/domains/job-board/public.service';

const ADMIN_URL = process.env.DATABASE_URL_ADMIN;
const WRITER_URL = process.env.DATABASE_URL;
const enabled = Boolean(process.env.GOLIVE04_LIVE_PUBLIC_READ && ADMIN_URL && WRITER_URL);

describe.skipIf(!enabled)('V5-go-live-04 LIVE — đường đọc công khai dưới FORCE RLS', () => {
  const admin = new PrismaClient({ datasourceUrl: ADMIN_URL });
  const writer = new PrismaClient({ datasourceUrl: WRITER_URL });

  const RUN = `gl04-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const ccId = `cc-${RUN}`;
  const pubId = `prj-pub-${RUN}`;
  const privId = `prj-priv-${RUN}`;
  const pubCode = `GL04-PUB-${RUN}`; // is_public = true  → PHẢI thấy
  const privCode = `GL04-PRIV-${RUN}`; // is_public = false → PHẢI KHÔNG thấy
  const orderIds = [`so-${pubId}`, `so-${privId}`];
  const NO_MATCH_ID = `no-such-project-${RUN}`; // WHERE không khớp dòng nào

  /** Dọn theo thứ tự FK: slot → order → project → client company. Idempotent. */
  async function cleanup(): Promise<void> {
    await admin.staffingOrderSlot.deleteMany({ where: { staffingOrderId: { in: orderIds } } }).catch(() => {});
    await admin.staffingOrder.deleteMany({ where: { id: { in: orderIds } } }).catch(() => {});
    await admin.project.deleteMany({ where: { id: { in: [pubId, privId] } } }).catch(() => {});
    await admin.clientCompany.deleteMany({ where: { id: ccId } }).catch(() => {});
  }

  beforeAll(async () => {
    await Promise.all([admin.$connect(), writer.$connect()]);
    await cleanup(); // rác của một lần chạy bị ngắt trước đó
    await admin.clientCompany.create({ data: { id: ccId, code: `CC-${RUN}`, name: `Client ${RUN}` } });
    // Hai dự án GIỐNG NHAU MỌI THỨ trừ `is_public` ⇒ khác biệt duy nhất giải thích được
    // sự có/vắng của chúng trong kết quả chính là cờ đó, không phải status hay slot.
    for (const [id, code, isPublic] of [[pubId, pubCode, true], [privId, privCode, false]] as const) {
      await admin.project.create({
        data: {
          id, code, name: `DEMO ${code}`, clientCompanyId: ccId, status: 'ACTIVE', isPublic,
          siteAddress: 'KCN VSIP 1, Bình Dương', startDate: new Date('2026-01-01'),
        },
      });
      await admin.staffingOrder.create({
        data: {
          id: `so-${id}`, projectId: id, code: `SO-${code}`, title: `Order ${code}`,
          status: 'OPEN', deadlineDate: new Date('2027-01-01'),
        },
      });
      await admin.staffingOrderSlot.create({
        data: {
          staffingOrderId: `so-${id}`, positionCode: 'ASSEMBLER', positionTitle: 'Công nhân lắp ráp',
          slotsNeeded: 5, slotsFilled: 1, shiftStart: '06:00', shiftEnd: '14:00',
          validFrom: new Date('2026-01-01'), workLocation: 'KCN VSIP 1',
        },
      });
    }
  }, 60_000);

  // Dọn trong `finally` (DEC-12): fixture bị xoá kể cả khi test đỏ giữa đường.
  afterAll(async () => {
    try {
      await cleanup();
      const left = await admin.project.count({ where: { id: { in: [pubId, privId] } } });
      console.log(`[go-live-04][cleanup] fixture còn lại = ${left} (kỳ vọng 0)`);
    } finally {
      await Promise.all([admin.$disconnect(), writer.$disconnect()]);
    }
  }, 60_000);

  // ══ (a) DEC-05: kết nối đọc công khai KHÔNG bypass RLS ══════════════════════
  it('AC-10(a): current_user không BYPASSRLS và không SUPERUSER', async () => {
    const rows = await writer.$queryRawUnsafe<Array<{ rolname: string; rolbypassrls: boolean; rolsuper: boolean }>>(
      `SELECT current_user::text AS rolname, r.rolbypassrls, r.rolsuper
         FROM pg_roles r WHERE r.rolname = current_user`,
    );
    expect(rows).toHaveLength(1);
    console.log(
      `[go-live-04][AC-10a] current_user=${rows[0].rolname}` +
        ` rolbypassrls=${rows[0].rolbypassrls} rolsuper=${rows[0].rolsuper}`,
    );
    // Superuser bỏ qua RLS bất chấp cờ `rolbypassrls` ⇒ phải chốt CẢ HAI, không thì (b)(c)(d)
    // chỉ chứng minh được "câu SQL chạy được", chứ không chứng minh được RLS đang gác.
    expect(rows[0].rolbypassrls).toBe(false);
    expect(rows[0].rolsuper).toBe(false);
  }, 30_000);

  // ══ (b) DEC-05: negative control — không GUC thì phải 0 dòng ════════════════
  it('AC-08: cùng kết nối, KHÔNG set GUC ⇒ app.role rỗng và 0 dòng', async () => {
    const probe = await writer.$transaction(async (tx) => ({
      guc: await readRlsContext(tx),
      list: await listPublicJobProjection(tx, { limit: 50 }),
      detail: await getPublicJobProjection(tx, pubCode),
    }));
    console.log(
      `[go-live-04][AC-08] no-GUC app.role="${probe.guc.role}" total=${probe.list.total}` +
        ` jobs=${probe.list.jobs.length} detail(${pubCode})=${probe.detail === null ? 'null' : 'FOUND'}`,
    );
    expect(probe.guc.role).toBe('');
    // Có dòng ở đây ⇒ DỪNG cả round: kết nối bypass RLS hoặc branch tắt RLS (DEC-05).
    expect(probe.list.total).toBe(0);
    expect(probe.list.jobs).toHaveLength(0);
    expect(probe.detail).toBeNull();
  }, 30_000);

  // ══ (c) DEC-05: qua helper ⇒ CÓ dòng, và CHỈ dòng public ════════════════════
  it('AC-10(c): helper trả ≥ 1 job và mọi dòng nhìn thấy được đều is_public = true', async () => {
    const seen = await withPublicDb(writer, async (tx) => ({
      guc: await readRlsContext(tx),
      readOnly: await tx.$queryRawUnsafe<Array<{ ro: string }>>(
        `SELECT current_setting('${PUBLIC_READ_ONLY_GUC}') AS ro`,
      ),
      list: await listPublicJobProjection(tx, { limit: 50 }),
      detail: await getPublicJobProjection(tx, pubCode),
      // KHÔNG `where`: đây là TOÀN BỘ tập dòng mà principal công khai nhìn thấy. Một dòng
      // `is_public = false` lọt vào đây nghĩa là policy hở — không phải service lọc sai.
      visible: await tx.project.findMany({ select: { id: true, code: true, isPublic: true } }),
    }));

    const leaked = seen.visible.filter((row) => !row.isPublic).map((row) => row.code);
    console.log(
      `[go-live-04][AC-10c] app.role="${seen.guc.role}" app.user_id="${seen.guc.user_id}"` +
        ` ${PUBLIC_READ_ONLY_GUC}=${seen.readOnly[0]?.ro} total=${seen.list.total}` +
        ` jobs=${seen.list.jobs.length} visibleRows=${seen.visible.length} leaked=${JSON.stringify(leaked)}`,
    );

    expect(seen.guc.role).toBe(PUBLIC_READ_PRINCIPAL.role);
    expect(seen.guc.user_id).toBe(PUBLIC_READ_PRINCIPAL.userId);
    expect(seen.readOnly[0]?.ro).toBe('on');
    expect(seen.list.total).toBeGreaterThanOrEqual(1);
    expect(seen.list.jobs.map((job) => job.slug)).toContain(pubCode);
    expect(seen.detail?.slug).toBe(pubCode);
    expect(seen.visible.length).toBeGreaterThanOrEqual(1);
    expect(leaked).toEqual([]);
  }, 30_000);

  // ══ (d) fixture âm phải vắng mặt — ở CẢ hai tầng: service và RLS ════════════
  it('AC-06: dự án is_public = false vắng mặt ở mọi đường đọc công khai', async () => {
    // Chứng minh nó TỒN TẠI trước (admin thấy) ⇒ "vắng mặt" bên dưới không phải vì seed lỗi.
    const asAdmin = await admin.project.findUnique({
      where: { id: privId },
      select: { id: true, code: true, isPublic: true, status: true },
    });
    console.log(
      `[go-live-04][AC-06] fixture non-public id=${privId} code=${privCode}` +
        ` isPublic=${asAdmin?.isPublic} status=${asAdmin?.status}`,
    );
    expect(asAdmin?.isPublic).toBe(false);
    expect(asAdmin?.status).toBe('ACTIVE');

    const seen = await withPublicDb(writer, async (tx) => ({
      list: await listPublicJobProjection(tx, { limit: 50 }),
      detail: await getPublicJobProjection(tx, privCode),
      row: await tx.project.findMany({ where: { id: privId }, select: { id: true } }),
    }));
    console.log(
      `[go-live-04][AC-06] qua helper: detail(${privCode})=${seen.detail === null ? 'null' : 'FOUND'}` +
        ` rlsRows=${seen.row.length} slugs=${JSON.stringify(seen.list.jobs.map((job) => job.slug))}`,
    );
    expect(seen.list.jobs.map((job) => job.slug)).not.toContain(privCode);
    expect(seen.list.jobs.map((job) => job.id)).not.toContain(privId);
    expect(seen.detail).toBeNull();
    expect(seen.row).toHaveLength(0); // RLS chặn ở tầng DÒNG, không chỉ ở `where` của service
  }, 30_000);

  // ══ RQ-05: read-only chặn ghi — RISK-02 (policy FOR ALL nới SELECT là nới cả DELETE) ══
  it('AC-07: DELETE phát trong transaction của helper bị từ chối SQLSTATE 25006', async () => {
    let sqlstate = '';
    let message = '';
    try {
      await withPublicDb(writer, (tx) =>
        // `WHERE id = <id không tồn tại>`: kể cả khi read-only hỏng thì câu này cũng không
        // xoá được dòng nào ⇒ an toàn tuyệt đối với dữ liệu thật (DEC-06: chỉ đọc).
        tx.$executeRawUnsafe(`DELETE FROM outsourcing_projects WHERE id = $1`, NO_MATCH_ID),
      );
    } catch (err) {
      message = String((err as Error).message ?? '');
      // Prisma bọc lỗi raw thành P2010; SQLSTATE thật nằm ở `meta.code`. Fallback quét
      // message để không phụ thuộc hình dạng lỗi của một phiên bản driver cụ thể.
      const meta = (err as { meta?: Record<string, unknown> }).meta ?? {};
      sqlstate = String(meta.code ?? '') || (message.match(/\b25006\b/)?.[0] ?? '');
    }
    console.log(
      `[go-live-04][AC-07] sqlstate=${sqlstate} message=${message.replace(/\s+/g, ' ').slice(0, 240)}`,
    );
    expect(sqlstate).toBe('25006'); // không ném lỗi ⇒ sqlstate rỗng ⇒ test ĐỎ, đúng ý muốn

    // Và dữ liệu không hề bị chạm: cả hai fixture vẫn còn.
    expect(await admin.project.count({ where: { id: { in: [pubId, privId] } } })).toBe(2);
  }, 30_000);
});
