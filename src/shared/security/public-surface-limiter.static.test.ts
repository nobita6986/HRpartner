/**
 * public-surface-limiter.static.test.ts — hrp-v5-go-live-18 / RQ-05, RQ-06 / DEC-05, DEC-06.
 *
 * Bất biến được canh: MỌI tệp trên bề mặt công khai có tham chiếu `withPublicDb` đều phải đi qua
 * limiter trước khi chạm DB. Tập consumer ở đây TỰ SUY bằng cách quét cây `src/` và `app/`, KHÔNG
 * phải một mảng ba đường dẫn dán tay — vì mảng dán tay chỉ liệt kê thứ tác giả VỪA THÊM, đúng
 * điểm mù `TEXT_PAIRS` của `go-live-08`: bề mặt thứ tư ai đó thêm sáu tháng sau sẽ vô hình.
 *
 * Hai phép kiểm cố ý đọc HAI dạng nguồn khác nhau:
 *   - Tư cách consumer đọc nguồn THÔ, đúng phương pháp `grep -rl` của `EV-02`, nên con số `3` ở
 *     đây so sánh được trực tiếp với số đo ghi trong contract.
 *   - Phép kiểm limiter đọc nguồn đã BÓC comment, nên một cái tên nằm trong lời chú giải không
 *     đủ để hàng rào cho qua.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

/** Hàm mở transaction đọc công khai. Tệp nào tham chiếu nó là một bề mặt đọc DB. */
const DB_ENTRY = 'withPublicDb';

/**
 * Hai điểm vào của limiter (`DEC-01`): route dùng bản trả `NextResponse`, còn Server Component
 * dùng bản chỉ-trả-quyết-định. Một consumer hợp lệ phải gọi MỘT trong hai.
 */
const LIMITER_ENTRIES = ['enforceRateLimits', 'evaluateRateLimits'] as const;

/** Hai cây chứa toàn bộ mã chạy trên bề mặt công khai. Bỏ `app/` là hỏng phép quét (`AC-09`). */
const SCAN_ROOTS = ['src', 'app'] as const;

const SKIP_DIRS = new Set(['node_modules', '.next', '.git', 'dist', 'coverage']);

/** Sàn cho số tệp quét được: một walker hỏng trả về rỗng thì KHÔNG được phép xanh. */
const MIN_SCANNED_FILES = 150;

interface SourceEntry {
  readonly path: string;
  readonly source: string;
}

/** Test không phải bề mặt runtime: `*.test.ts(x)` và mọi thứ trong `__tests__` đều ngoài phạm vi. */
function isTestFile(path: string): boolean {
  return /\.test\.tsx?$/.test(path) || path.includes('/__tests__/');
}

/** Quét đệ quy, trả đường dẫn tương đối dùng `/` để assertion không phụ thuộc HĐH. */
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

/** Bóc comment: một cái tên trong lời chú giải KHÔNG được tính là có gọi limiter. */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
}

/** Tệp ĐỊNH NGHĨA suy ra từ chính chữ ký export, nên dời tệp cũng không làm hàng rào mù. */
function isDefinition(entry: SourceEntry): boolean {
  return /export\s+(?:async\s+)?(?:function|const)\s+withPublicDb\b/.test(stripComments(entry.source));
}

/** Consumer = tham chiếu `withPublicDb` mà KHÔNG phải nơi định nghĩa nó (`RQ-05`). */
function consumerEntries(entries: readonly SourceEntry[]): SourceEntry[] {
  return entries.filter((entry) => entry.source.includes(DB_ENTRY)).filter((entry) => !isDefinition(entry));
}

/**
 * DETECTOR — đúng hàm mà fixture âm của `RQ-06` bắn thẳng vào. Nhận nguồn qua tham số chứ không
 * tự đọc đĩa, nên cùng MỘT logic chấm điểm cả cây thật lẫn chuỗi giả: không có bản thứ hai để
 * lệch nhau, và fixture âm thật sự kiểm đường đo đang chạy trên production code.
 */
function consumersMissingLimiter(entries: readonly SourceEntry[]): string[] {
  return consumerEntries(entries)
    .filter((entry) => {
      const code = stripComments(entry.source);
      return !LIMITER_ENTRIES.some((name) => code.includes(name));
    })
    .map((entry) => entry.path);
}

describe('bề mặt công khai: mọi consumer của withPublicDb phải đi qua limiter', () => {
  const scanned = collectSources(SCAN_ROOTS);
  const referencing = scanned.filter((entry) => entry.source.includes(DB_ENTRY));
  const definitions = referencing.filter(isDefinition);
  const consumers = consumerEntries(scanned);

  it('quét được cả hai cây, không phải một tập rỗng', () => {
    expect(scanned.length).toBeGreaterThanOrEqual(MIN_SCANNED_FILES);
    for (const root of SCAN_ROOTS) {
      expect(scanned.some((entry) => entry.path.startsWith(`${root}/`))).toBe(true);
    }
    // `AC-09`: phép quét phải phủ CẢ `src/` lẫn `app/` — cả hai cây đều có tệp chạm `withPublicDb`.
    for (const root of SCAN_ROOTS) {
      expect(referencing.some((entry) => entry.path.startsWith(`${root}/`))).toBe(true);
    }
  });

  it('suy ra đúng một tệp định nghĩa và loại nó khỏi tập consumer', () => {
    expect(definitions).toHaveLength(1);
    expect(definitions[0]?.path).toBe('src/shared/auth/with-public-db.ts');
    expect(consumers.map((entry) => entry.path)).not.toContain(definitions[0]?.path);
    expect(consumers).toHaveLength(referencing.length - 1);
  });

  it('tập consumer có đúng 3 phần tử (EV-02)', () => {
    expect(consumers.map((entry) => entry.path)).toHaveLength(3);
  });

  it('MỖI consumer tham chiếu limiter, không chỉ một tệp nào đó', () => {
    expect(consumersMissingLimiter(scanned)).toEqual([]);
  });
});

/**
 * FIXTURE ÂM (`RQ-06`, `DEC-06`). Không có khối này thì một detector luôn trả rỗng cũng xanh, và
 * hàng rào trở thành đồ trang trí. Đường dẫn ở đây là đường dẫn BỊA, không phải trang thật.
 */
describe('fixture âm: detector phải BẮT một consumer thiếu limiter', () => {
  const BAD_PATH = 'app/(fake)/surface-without-limiter/page.tsx';
  const GOOD_PATH = 'app/api/fake-surface/route.ts';

  const bad: SourceEntry = {
    path: BAD_PATH,
    source: [
      "import { withPublicDb } from '@/src/shared/auth/with-public-db';",
      'export default async function Page() {',
      '  return withPublicDb(getPrisma(), (tx) => readSomething(tx));',
      '}',
    ].join('\n'),
  };

  const good: SourceEntry = {
    path: GOOD_PATH,
    source: [
      "import { withPublicDb } from '@/src/shared/auth/with-public-db';",
      "import { enforceRateLimits } from '@/src/shared/security/rate-limit-guard';",
      'export async function GET() {',
      "  const denied = await enforceRateLimits({ buckets: [], routeClass: 'GET /fake' });",
      '  if (denied) return denied;',
      '  return withPublicDb(getPrisma(), (tx) => readSomething(tx));',
      '}',
    ].join('\n'),
  };

  it('bắt được nguồn giả có withPublicDb mà thiếu limiter', () => {
    expect(consumersMissingLimiter([bad])).toEqual([BAD_PATH]);
  });

  it('không bắt oan nguồn giả đã có limiter', () => {
    expect(consumersMissingLimiter([good])).toEqual([]);
  });

  it('lọc đúng phần tử trong tập trộn, không phải trả cả tập', () => {
    expect(consumersMissingLimiter([good, bad])).toEqual([BAD_PATH]);
  });

  it('tên limiter chỉ nằm trong comment thì KHÔNG cho qua', () => {
    const commented: SourceEntry = {
      path: BAD_PATH,
      source: `// enforceRateLimits sẽ thêm sau\n${bad.source}`,
    };
    expect(consumersMissingLimiter([commented])).toEqual([BAD_PATH]);
  });

  it('nơi ĐỊNH NGHĨA withPublicDb không bị tính là consumer thiếu limiter', () => {
    const definition: SourceEntry = {
      path: 'src/shared/auth/fake-definition.ts',
      source: 'export async function withPublicDb<T>(prisma: unknown, fn: () => T) { return fn(); }',
    };
    expect(consumersMissingLimiter([definition])).toEqual([]);
  });
});
