/**
 * required-relation-sweep.static.test.ts — hrp-v5-go-live-17 / RQ-01..RQ-05 / DEC-01..DEC-09.
 *
 * Đóng `F-05` của `hrp-v5-hotfix-02`: *"quét mọi service khác đang select quan hệ KHÔNG nullable
 * trên bảng bị RLS che"*. Lớp lỗi nằm trong QUERY ENGINE của Prisma, không nằm trong mã JS: select
 * một quan hệ bắt buộc trên bảng mà principal hiện tại không đọc được thì `findMany` ném
 * `Inconsistent query result` TRƯỚC khi mapper chạy — nên optional-chaining trong mapper vô hiệu, và
 * `mockResolvedValue` trên `findMany` KHÔNG BAO GIỜ tái lập được (`EV-07`: sự cố `500` gốc chạy song
 * song với `1418` test xanh).
 *
 * Điểm mù mà tệp này sửa (`EV-04`): hàng rào có sẵn ở `src/domains/job-board/public-select.static.test.ts`
 * ghim CỨNG đúng một tệp nguồn và một allowlist năm khoá — nó liệt kê cái tác giả nó VỪA THÊM, không
 * liệt kê cái nó BẢO VỆ, đúng lớp lỗi `TEXT_PAIRS` của `go-live-08`. Vì vậy tệp này KHÔNG ghim một
 * danh sách bảng hay một danh sách trường nào (`DEC-02`): nó TỰ SUY tập nguy hiểm từ
 * `prisma/migrations/**` cộng `prisma/schema.prisma` ngay lúc chạy, rồi quét cả `src/` và `app/`. Thêm
 * một migration bật RLS, hoặc thêm một vị trí select mới ở bất kỳ tệp nào, đều làm tệp này ĐỎ mà không
 * ai phải nhớ cập nhật một mảng literal.
 *
 * Ba mệnh đề ĐẾM ĐƯỢC:
 *   1. tập bảng bật RLS suy từ migration có ít nhất `34` phần tử;
 *   2. tập trường quan hệ BẮT BUỘC trỏ vào các bảng ấy có ít nhất `21` phần tử;
 *   3. tập vị trí select các trường ấy trong cây nguồn KHỚP CHÍNH XÁC tập ĐÓNG `TÁM` dòng còn lại
 *      sau `STEP-06` — tức mười hai dòng của `DEC-04` TRỪ bốn dòng đã sửa.
 *
 * Tệp này là tệp THỨ HAI (`DEC-01`): `public-select.static.test.ts` không đổi một byte, vì nó còn mang
 * hai assertion của `go-live-14` (`EV-05`). Nó nằm dưới `src/` vì lane unit không thu `app/**` (`EV-08`),
 * dù nó ĐỌC các tệp dưới `app/`. Nó không đọc một `DATABASE_URL` nào (`EV-09`).
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const MIGRATIONS_DIR = 'prisma/migrations';
const SCHEMA_PATH = 'prisma/schema.prisma';
const SCAN_ROOTS = ['src', 'app'] as const;
const SKIP_DIRS = new Set(['node_modules', '.next', '.git', 'dist', 'coverage']);

/**
 * Sàn chống rỗng, KHÔNG phải danh sách (`DEC-02`). Ba con số này là ngưỡng của `AC-03`; danh sách bảng
 * và danh sách trường thì tuyệt đối không được dán vào đây, nếu không hàng rào lại mù với migration kế.
 */
const MIN_RLS_TABLES = 34;
const MIN_DANGER_FIELDS = 21;
const MIN_DANGER_MODELS = 20;
const MIN_SCANNED_FILES = 200;

/** Số dòng nhìn lại để xác nhận một khoá đang nằm trong một object `include:`/`select:`. */
const CONTEXT_LOOKBACK = 25;

/**
 * Tập vị trí KỲ VỌNG, và chỉ là kỳ vọng — nó ĐỐI CHIẾU với kết quả quét, nó không THAY cho phép quét.
 * Đây là chỗ khác nhau giữa "ghim cứng" và "khẳng định": tập bảng cùng tập trường vẫn do mã tự suy;
 * riêng tập vị trí thì `RQ-03` đòi khớp CHÍNH XÁC, nên từng dòng phải viết ra.
 *
 * `DEC-04` liệt kê MƯỜI HAI dòng — đó là ảnh chụp TRƯỚC `STEP-06`. Phép phân loại của `STEP-05`
 * (`evidence/s05-policy-classification.txt`) kết luận `8` AN TOÀN và `4` RỦI RO; `STEP-06` sửa đúng bốn
 * dòng RỦI RO theo `DEC-05`, nên bốn dòng ấy KHÔNG còn là một select quan hệ nữa và biến khỏi tập quét:
 *
 *   - `src/domains/reconciliation/margin.service.ts:167 worker`      (đã sửa, `DEC-05`)
 *   - `src/domains/reconciliation/statement.service.ts:403 worker`   (đã sửa, `DEC-05`)
 *   - `src/domains/reconciliation/statement.service.ts:434 worker`   (đã sửa, `DEC-05`)
 *   - `src/domains/staffing/submission.service.ts:248 worker`        (đã sửa, `DEC-05`)
 *
 * TÁM dòng dưới đây là tám vị trí AN TOÀN — chúng CÒN LẠI có chủ ý, không phải sót: `AC-08` đỏ nếu một
 * vị trí AN TOÀN bị sửa. Con số tám không được suy ra bằng phép trừ trên giấy: nó là số ĐO của lượt
 * chạy trong `evidence/s07-barrier-red.txt`, nơi hàng rào tự liệt kê đúng bốn dòng đã mất.
 */
const EXPECTED_HITS = [
  'app/api/projects/route.ts:65 clientCompany',
  'app/api/vendor/orders/route.ts:44 project',
  'app/api/vendor/submissions/route.ts:62 project',
  'src/domains/applications/application-queue.service.ts:178 project',
  'src/domains/applications/application-queue.service.ts:211 project',
  'src/domains/staffing/order.service.ts:153 project',
  'src/domains/staffing/order.service.ts:179 project',
  'src/domains/staffing/submission.service.ts:204 project',
] as const;

interface SourceEntry {
  readonly path: string;
  readonly source: string;
}

interface DangerField {
  readonly owner: string;
  readonly field: string;
  readonly target: string;
}

function isTestFile(path: string): boolean {
  return /\.test\.tsx?$/.test(path) || path.includes('/__tests__/');
}

/**
 * Bỏ comment khối và comment dòng, theo đúng hai mẫu của `src/domains/job-board/public-select.static.test.ts:23`
 * (`RQ-05`, `AC-06`). Khác một điểm CÓ Ý: chỗ bị bỏ được thay bằng khoảng trắng giữ nguyên số dòng, vì
 * kết luận của tệp này là một SỐ DÒNG. Xoá thẳng như tệp kia sẽ làm mọi vị trí lệch đi.
 */
function stripComments(source: string): string {
  const keepLines = (chunk: string): string => chunk.replace(/[^\n]/g, ' ');
  return source.replace(/\/\*[\s\S]*?\*\//g, keepLines).replace(/\/\/[^\n]*/g, keepLines);
}

/** Mọi `migration.sql` dưới `prisma/migrations`, đọc bằng filesystem chứ không bằng một danh sách tay. */
function readMigrationSql(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(join(process.cwd(), dir), { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const file = join(process.cwd(), dir, entry.name, 'migration.sql');
    try {
      out.push(readFileSync(file, 'utf8'));
    } catch {
      // Một thư mục migration không có migration.sql là hợp lệ; nó chỉ không góp bảng nào.
    }
  }
  return out;
}

/**
 * Comment của SQL là `--`, không phải `//`, và `--` trong TypeScript là phép giảm nên KHÔNG được dùng
 * chung một hàm. Tách riêng để một `ALTER TABLE` đã bị comment trong migration không bị tính là một bảng
 * đang bật RLS.
 */
function stripSqlComments(sql: string): string {
  const keepLines = (chunk: string): string => chunk.replace(/[^\n]/g, ' ');
  return sql.replace(/\/\*[\s\S]*?\*\//g, keepLines).replace(/--[^\n]*/g, keepLines);
}

/**
 * DETECTOR MỘT (`RQ-01`) — tập bảng bật RLS, suy từ chính văn bản migration. Nhận nguồn qua tham số nên
 * cùng MỘT logic chấm cả migration thật lẫn chuỗi giả của fixture âm: không có bản thứ hai để lệch nhau.
 */
function rlsTablesFrom(sqlTexts: readonly string[]): Set<string> {
  const tables = new Set<string>();
  const re = /ALTER\s+TABLE\s+(?:ONLY\s+)?"?(?:public"?\.)?"?(\w+)"?\s+(?:ENABLE|FORCE)\s+ROW\s+LEVEL\s+SECURITY/gi;
  for (const sql of sqlTexts) {
    for (const m of stripSqlComments(sql).matchAll(re)) tables.add(m[1]);
  }
  return tables;
}


/** Model của `schema.prisma` cùng tên bảng vật lý của nó, suy từ `@@map` khi có. */
function parseModels(schema: string): Map<string, { table: string; body: string }> {
  const models = new Map<string, { table: string; body: string }>();
  for (const m of stripComments(schema).matchAll(/^model\s+(\w+)\s*\{([\s\S]*?)^\}/gm)) {
    const body = m[2];
    const mapped = /@@map\("([^"]+)"\)/.exec(body);
    models.set(m[1], { table: mapped ? mapped[1] : m[1], body });
  }
  return models;
}

/**
 * DETECTOR HAI (`RQ-02`) — trường quan hệ BẮT BUỘC (không dấu hỏi, không mảng) mà bảng ĐÍCH nằm trong
 * tập RLS. Đây là tập nguy hiểm đúng nghĩa: nó đổi mỗi lần schema hay migration đổi.
 */
function requiredRelationFields(schema: string, rlsTables: ReadonlySet<string>): DangerField[] {
  const models = parseModels(schema);
  const out: DangerField[] = [];
  for (const [owner, def] of models) {
    for (const raw of def.body.split('\n')) {
      const m = /^(\w+)\s+(\w+)(\?)?(\[\])?\s/.exec(`${raw.trim()} `);
      if (!m) continue;
      const [, field, target, optional, list] = m;
      if (optional || list) continue;
      const targetTable = models.get(target)?.table;
      if (targetTable && rlsTables.has(targetTable)) out.push({ owner, field, target });
    }
  }
  return out;
}

/** Quét đệ quy `src/` và `app/`, trả đường dẫn dùng `/` để assertion không phụ thuộc HĐH. */
function collectSources(roots: readonly string[]): SourceEntry[] {
  const out: SourceEntry[] = [];

  const walk = (dir: string): void => {
    for (const entry of readdirSync(join(process.cwd(), dir), { withFileTypes: true })) {
      const rel = `${dir}/${entry.name}`;
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name)) walk(rel);
        continue;
      }
      if (!/\.tsx?$/.test(entry.name) || isTestFile(rel)) continue;
      out.push({ path: rel, source: readFileSync(join(process.cwd(), rel), 'utf8') });
    }
  };

  for (const root of roots) walk(root);
  return out;
}

/**
 * DETECTOR BA (`RQ-03`) — đúng hàm mà fixture âm bắn thẳng vào. Một khoá nguy hiểm được coi là một vị
 * trí khi nó xuất hiện dưới dạng khoá của object (`field: true` hay `field: {`) VÀ trong `CONTEXT_LOOKBACK`
 * dòng trước đó có một `include:`/`select:` mở ngoặc. Comment bị bỏ TRƯỚC khi đếm (`RQ-05`), nên một ví
 * dụ trong docblock không thành finding và một vị trí thật sau hai gạch chéo không thành an toàn.
 */
function selectHits(path: string, source: string, fields: ReadonlySet<string>): string[] {
  const lines = stripComments(source).split('\n');
  const hits: string[] = [];
  for (let i = 0; i < lines.length; i += 1) {
    for (const field of fields) {
      const key = new RegExp(`(^|[\\s{,])${field}\\s*:\\s*(true|\\{)`);
      if (!key.test(lines[i])) continue;
      const ctx = lines.slice(Math.max(0, i - CONTEXT_LOOKBACK), i + 1).join('\n');
      if (/\b(include|select)\s*:\s*\{/.test(ctx)) hits.push(`${path}:${i + 1} ${field}`);
    }
  }
  return hits;
}

function sweep(entries: readonly SourceEntry[], fields: ReadonlySet<string>): string[] {
  return entries.flatMap((entry) => selectHits(entry.path, entry.source, fields)).sort();
}

describe('quan hệ BẮT BUỘC trên bảng bị RLS che: tập vị trí select là một tập ĐÓNG', () => {
  const rlsTables = rlsTablesFrom(readMigrationSql(MIGRATIONS_DIR));
  const schema = readFileSync(join(process.cwd(), SCHEMA_PATH), 'utf8');
  const danger = requiredRelationFields(schema, rlsTables);
  const fields = new Set(danger.map((d) => d.field));
  const scanned = collectSources(SCAN_ROOTS);

  it('quét được cả hai cây nguồn, không phải một tập rỗng', () => {
    expect(scanned.length).toBeGreaterThanOrEqual(MIN_SCANNED_FILES);
    for (const root of SCAN_ROOTS) {
      expect(scanned.some((entry) => entry.path.startsWith(`${root}/`))).toBe(true);
    }
  });

  it('mệnh đề MỘT: tập bảng bật RLS suy từ migration, không từ một mảng literal (EV-01, AC-03)', () => {
    expect(rlsTables.size).toBeGreaterThanOrEqual(MIN_RLS_TABLES);
  });

  it('mệnh đề HAI: tập trường quan hệ bắt buộc trỏ vào bảng RLS (EV-02, AC-03)', () => {
    expect(danger.length).toBeGreaterThanOrEqual(MIN_DANGER_FIELDS);
    expect(new Set(danger.map((d) => d.owner)).size).toBeGreaterThanOrEqual(MIN_DANGER_MODELS);
    // Mỗi trường nguy hiểm phải trỏ vào một model THẬT có trong schema, không phải một tên rơi rớt.
    for (const d of danger) expect(parseModels(schema).has(d.target)).toBe(true);
  });

  it('mệnh đề BA: tập vị trí select KHỚP CHÍNH XÁC tám dòng còn lại sau STEP-06 (EV-03, AC-04)', () => {
    expect(sweep(scanned, fields)).toEqual([...EXPECTED_HITS].sort());
  });

  /**
   * `AC-04` đòi "phép quét phủ cả `src/` và `app/`, chứng minh bằng chính sự có mặt của BỐN dòng thuộc
   * `app/api/`". Danh sách của `DEC-04` chỉ có BA dòng dưới `app/api/` — `projects/route.ts:65`,
   * `vendor/orders/route.ts:44`, `vendor/submissions/route.ts:62` — và chín dòng dưới `src/`. Số đo lại
   * bằng chính `scratch/f05/usage.py` của Tier 1 cũng ra ba, nên lời văn "bốn" là một lệch của contract,
   * ghi thành finding trong `HANDOFF`.
   *
   * Sau `STEP-06`, cả BỐN dòng đã sửa đều nằm dưới `src/`, nên nhánh `app/` KHÔNG đổi (`3`) còn nhánh
   * `src/` giảm từ `9` xuống `5`. Assertion dưới đây khẳng định SỐ ĐO của lượt chạy hiện tại, không
   * khẳng định con số của lời văn, và cũng không khẳng định một phép trừ chưa chạy.
   */
  it('phép quét phủ cả app/, chứng minh bằng chính ba dòng app/api trong kết quả (AC-04)', () => {
    const hits = sweep(scanned, fields);
    expect(hits.filter((hit) => hit.startsWith('app/api/'))).toHaveLength(3);
    expect(hits.filter((hit) => hit.startsWith('src/'))).toHaveLength(5);
  });
});

/**
 * FIXTURE ÂM (`RQ-04`, `DEC-07`). Không có khối này thì một detector luôn trả rỗng cũng xanh — đúng bài
 * học `UI_PAIRS` của `go-live-08`. Mọi chuỗi dưới đây là nguồn BỊA với tên bảng BỊA: không một dòng nào
 * của migration thật, và không một tên bảng RLS thật nào bị dán vào tệp test (`AC-02`).
 */
describe('fixture âm: ba detector phải BẮT được nguồn giả', () => {
  const FAKE_SQL = [
    'ALTER TABLE "fake_vault" ENABLE ROW LEVEL SECURITY;',
    'ALTER TABLE ONLY public."fake_audit" FORCE ROW LEVEL SECURITY;',
    '-- ALTER TABLE "fake_disabled" ENABLE ROW LEVEL SECURITY;',
  ].join('\n');

  const FAKE_SCHEMA = [
    'model FakeVault {',
    '  id String @id',
    '  @@map("fake_vault")',
    '}',
    'model FakeChild {',
    '  id      String    @id',
    '  vault   FakeVault @relation(fields: [vaultId], references: [id])',
    '  spare   FakeVault? @relation("spare", fields: [spareId], references: [id])',
    '  many    FakeVault[]',
    '  @@map("fake_children")',
    '}',
  ].join('\n');

  const FAKE_HIT = ['const rows = await tx.fakeChild.findMany({', '  include: { vault: { select: { id: true } } },', '});'].join('\n');

  it('detector MỘT bắt được bảng bật RLS trong SQL giả, và bỏ dòng đã comment', () => {
    const tables = rlsTablesFrom([FAKE_SQL]);
    expect([...tables].sort()).toEqual(['fake_audit', 'fake_vault']);
  });

  it('detector HAI bắt đúng quan hệ BẮT BUỘC, bỏ quan hệ nullable và bỏ quan hệ mảng', () => {
    const found = requiredRelationFields(FAKE_SCHEMA, new Set(['fake_vault']));
    expect(found.map((d) => `${d.owner}.${d.field}`)).toEqual(['FakeChild.vault']);
  });

  it('detector HAI trả rỗng khi bảng đích KHÔNG bật RLS', () => {
    expect(requiredRelationFields(FAKE_SCHEMA, new Set(['other_table']))).toEqual([]);
  });

  it('detector BA bắt được một vị trí select quan hệ bắt buộc trong nguồn giả', () => {
    expect(selectHits('fake/child.service.ts', FAKE_HIT, new Set(['vault']))).toEqual([
      'fake/child.service.ts:2 vault',
    ]);
  });

  it('detector BA KHÔNG tính một vị trí nằm trong comment dòng, và số dòng không lệch (RQ-05)', () => {
    const commented = FAKE_HIT.split('\n')
      .map((line, i) => (i === 1 ? `// ${line}` : line))
      .join('\n');
    expect(selectHits('fake/child.service.ts', commented, new Set(['vault']))).toEqual([]);
    const shifted = `/* ${'x\n'.repeat(3)} */\n${FAKE_HIT}`;
    expect(selectHits('fake/child.service.ts', shifted, new Set(['vault']))).toEqual([
      'fake/child.service.ts:6 vault',
    ]);
  });

  it('detector BA KHÔNG tính một khoá nằm ngoài mọi object include/select', () => {
    expect(selectHits('fake/x.ts', 'const shape = { vault: true };', new Set(['vault']))).toEqual([]);
  });
});
