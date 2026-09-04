"""STEP-06 cua hrp-v5-go-live-17: sua DUNG bon vi tri ket luan RUI RO, theo mau DEC-05."""
import io, sys

def patch(path, pairs):
    with io.open(path, encoding='utf-8') as f:
        src = f.read()
    for old, new, want in pairs:
        got = src.count(old)
        if got != want:
            print('FAIL %s: expected %d occurrence(s), found %d' % (path, want, got))
            print('----- needle -----')
            print(old)
            sys.exit(1)
        src = src.replace(old, new)
    with io.open(path, 'w', encoding='utf-8', newline='\n') as f:
        f.write(src)
    print('OK   %s' % path)


# ── 1. margin.service.ts:167 — vi tri 6 ──────────────────────────────────────
MARGIN_OLD = """  // Lineage: line.assignmentId -> assignment.worker
  const assignmentIds = statement.lines.map(l => l.assignmentId).filter((x): x is string => !!x);
  const assignments = assignmentIds.length
    ? await tx.projectAssignment.findMany({
        where: { id: { in: assignmentIds } },
        include: { worker: { select: { id: true, fullName: true } } },
      })
    : [];
  const assignmentMap = new Map(assignments.map(a => [a.id, a]));
"""

MARGIN_NEW = """  // Lineage: line.assignmentId -> assignment.workerId -> worker.fullName.
  //
  // KHONG select quan he `worker` o day. Quan he ay BAT BUOC (schema.prisma:588) va policy cua
  // `project_assignments` (m14_rls_matrix_repair:62) KHONG he goi `hrp_worker_visible_for(worker_id)`
  // nhu policy cua `workers` (m13_restore_rls_matrix:28): PM thay ca assignment LICH SU, con
  // predicate cha chi mo worker qua mot assignment `status='ACTIVE'`. Hang con doc duoc ma hang cha
  // khong doc duoc thi `findMany` NEM `Inconsistent query result` TRUOC mapper, va khong mot
  // optional-chaining nao do duoc (hrp-v5-hotfix-02 / go-live-17 DEC-05). Doc khoa ngoai vo huong
  // roi tra ten bang mot truy van thu hai: ten thieu vi cha khong doc duoc la `null`, khong la loi.
  const assignmentIds = statement.lines.map(l => l.assignmentId).filter((x): x is string => !!x);
  const assignments = assignmentIds.length
    ? await tx.projectAssignment.findMany({
        where: { id: { in: assignmentIds } },
        select: { id: true, workerId: true },
      })
    : [];
  const workerIdByAssignment = new Map(assignments.map(a => [a.id, a.workerId]));
  const lineageWorkerIds = [...new Set(assignments.map(a => a.workerId))];
  const lineageWorkers = lineageWorkerIds.length
    ? await tx.worker.findMany({
        where: { id: { in: lineageWorkerIds } },
        select: { id: true, fullName: true },
      })
    : [];
  const workerNameById = new Map(lineageWorkers.map(w => [w.id, w.fullName]));
  const workerNameOfAssignment = (assignmentId: string | null): string | null => {
    if (!assignmentId) return null;
    const workerId = workerIdByAssignment.get(assignmentId);
    return workerId ? workerNameById.get(workerId) ?? null : null;
  };
"""

MARGIN_MAP_OLD = "      workerName: l.assignmentId ? assignmentMap.get(l.assignmentId)?.worker?.fullName ?? null : null,"
MARGIN_MAP_NEW = "      workerName: workerNameOfAssignment(l.assignmentId),"

patch('src/domains/reconciliation/margin.service.ts', [
    (MARGIN_OLD, MARGIN_NEW, 1),
    (MARGIN_MAP_OLD, MARGIN_MAP_NEW, 1),
])


# ── 2. statement.service.ts:403 va :434 — vi tri 7 va 8 ──────────────────────
# Hai khoi giong nhau tung byte; ca hai deu tra ve nguyen doi tuong `assignment` trong response,
# nen o day GIU doi tuong assignment day du truong vo huong va chi doi NGUON cua khoa `worker`.
STMT_OLD = """  const assignments = assignmentIds.length
    ? await tx.projectAssignment.findMany({
        where: { id: { in: assignmentIds } },
        include: { worker: { select: { id: true, fullName: true } } },
      })
    : [];
  const assignmentMap = new Map(assignments.map(a => [a.id, a]));
"""

STMT_NEW = """  // KHONG select quan he `worker`: quan he BAT BUOC + policy con khong dung predicate cua policy cha
  // => `Inconsistent query result` TRUOC mapper (xem ghi chu day du o margin.service.ts, DEC-05).
  // Hang assignment van doc day du truong vo huong nen HINH DANG response khong doi; chi nguon cua
  // khoa `worker` doi, va khoa ay thanh `null` khi hang cha khong doc duoc — khoa VAN CON.
  const assignments = assignmentIds.length
    ? await tx.projectAssignment.findMany({ where: { id: { in: assignmentIds } } })
    : [];
  const lineageWorkerIds = [...new Set(assignments.map(a => a.workerId))];
  const lineageWorkers = lineageWorkerIds.length
    ? await tx.worker.findMany({
        where: { id: { in: lineageWorkerIds } },
        select: { id: true, fullName: true },
      })
    : [];
  const workerById = new Map(lineageWorkers.map(w => [w.id, w]));
  const assignmentMap = new Map(
    assignments.map(a => [a.id, { ...a, worker: workerById.get(a.workerId) ?? null }]),
  );
"""

patch('src/domains/reconciliation/statement.service.ts', [(STMT_OLD, STMT_NEW, 2)])


# ── 3. submission.service.ts:248 — vi tri 12 ─────────────────────────────────
CLAIM_OLD = """  const [rows, total] = await Promise.all([
    tx.sourceClaim.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: opts?.take ?? 50,
      skip: opts?.skip ?? 0,
      include: {
        worker: { select: { fullName: true } },
        vendor: { select: { name: true } },
      },
    }),
    tx.sourceClaim.count({ where }),
  ]);
"""

CLAIM_NEW = """  // KHONG select quan he `worker` o day. Quan he ay BAT BUOC (schema.prisma:548), policy cua
  // `source_claims` (m14_rls_matrix_repair:45) mo hang theo `vendor_id`/`ctv_id` ma KHONG doi
  // `accepted`, con `hrp_worker_visible_for` (m13_restore_rls_matrix:20-21) chi mo `workers` cho
  // VENDOR_*/CTV qua mot claim DA `accepted`. Mot claim chua accepted cua chinh vendor minh: hang
  // con doc duoc, hang cha khong doc duoc, va quan he BAT BUOC lam `findMany` NEM `Inconsistent
  // query result` TRUOC mapper (hrp-v5-hotfix-02 / go-live-17 DEC-05). Duong nay VOI TAY duoc:
  // `LIST_ROLES` cua app/api/jobs/submissions/route.ts:25 co VENDOR_ADMIN va VENDOR_STAFF, va
  // nhanh claims la nhanh MAC DINH khi thieu tham so `tab`. `vendor` la quan he NULLABLE nen giu.
  const [rows, total] = await Promise.all([
    tx.sourceClaim.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: opts?.take ?? 50,
      skip: opts?.skip ?? 0,
      include: {
        vendor: { select: { name: true } },
      },
    }),
    tx.sourceClaim.count({ where }),
  ]);

  // Tra ten bang mot luot tra cuu thu hai theo khoa chinh. `findUnique` chu khong `findMany` la CO
  // Y: fake `tx.worker` cua src/domains/staffing/submission.service.test.ts:114 chi phoi ra
  // `findUnique`, va dieu 4.2 cua contract CAM task nay cham vao tep test do. Trang admin nay co
  // `take` toi da 50 nen so luot tra cuu bi chan tren; finding va de xuat go bo nam trong HANDOFF.
  const claimWorkerIds = [...new Set(rows.map((r) => r.workerId))];
  const claimWorkers = await Promise.all(
    claimWorkerIds.map((id) =>
      tx.worker.findUnique({ where: { id }, select: { id: true, fullName: true } }),
    ),
  );
  const claimWorkerName = new Map(
    claimWorkers.filter((w): w is { id: string; fullName: string } => w !== null).map((w) => [w.id, w.fullName]),
  );
"""

CLAIM_MAP_OLD = "      workerName: r.worker?.fullName ?? null,"
CLAIM_MAP_NEW = "      workerName: claimWorkerName.get(r.workerId) ?? null,"

patch('src/domains/staffing/submission.service.ts', [
    (CLAIM_OLD, CLAIM_NEW, 1),
    (CLAIM_MAP_OLD, CLAIM_MAP_NEW, 1),
])

print('STEP-06: 4 vi tri RUI RO da sua, 8 vi tri AN TOAN khong cham.')
