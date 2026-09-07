/**
 * tsc-program-boundary.static.test.ts — hrp-v5-rf-05 / RQ-05 / DEC-02, DEC-03.
 *
 * Hàng rào này là GIÁ của `DEC-01`. Khoá `include` của `tsconfig.json` đã đổi từ hai mẫu đệ quy
 * trần sang một ALLOW-LIST tường minh. Allow-list hỏng KÍN: một thư mục nguồn thật sinh ra sau
 * này sẽ im lặng nằm ngoài `npm run typecheck` và lane vẫn xanh, không ai biết. Tệp này biến
 * điểm mù ấy thành một vết đỏ ồn ào.
 *
 * Ba tính chất khiến nó KHÔNG rơi vào lớp lỗi `TEXT_PAIRS` của `hrp-v5-go-live-08` — một bảng chỉ
 * liệt kê thứ tác giả nó VỪA THÊM thì xanh 100% mà không bảo vệ gì:
 *   1. Tập gốc chương trình được SUY từ chính mảng `include` đã phân tích của `tsconfig.json`
 *      (`DEC-03`). Không có mảng gốc nào chép tay đóng vai nguồn sự thật ở đây.
 *   2. Tập thách thức đến từ một phép QUÉT thư mục thật bằng thư viện chuẩn của Node, không phải
 *      từ một danh sách. Thêm một thư mục tầng gốc có mã TypeScript là hàng rào thấy ngay.
 *   3. Phân loại ĐÓNG: mỗi thư mục tầng gốc có `.ts` hoặc `.tsx` phải hoặc là gốc chương trình
 *      suy từ `include`, hoặc có tên trong `OUTSIDE_PROGRAM` KÈM LÝ DO. Không có nhánh thứ ba.
 *      Một thư mục chưa phân loại làm tệp này ĐỎ và thông điệp nêu đúng tên nó.
 *
 * Giới hạn CÓ TÊN: tệp này đọc `tsconfig.json` bằng `JSON.parse`, tức nó đòi tsconfig là JSON
 * THUẦN. Nếu về sau ai thêm comment vào tsconfig thì hàng rào đỏ với lỗi phân tích JSON nêu đúng
 * tên tệp — một vết đỏ to tiếng, không phải một điểm mù im lặng.
 *
 * Nó không gọi ra ngoài process: không `execSync`, không `git` (mục `4.3`). Một hàng rào phụ thuộc
 * `git` sẽ chết ở môi trường không có checkout. Nó không đọc một `DATABASE_URL` nào.
 */
import { existsSync, readFileSync, readdirSync, type Dirent } from 'node:fs';
import { dirname, join, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

/**
 * Sàn chống quét rỗng (`AC-06`). Đây là NGƯỠNG, không phải danh sách: một phép quét trả về gần như
 * không có gì — vì sai đường dẫn gốc, vì quyền, vì một lần refactor — sẽ làm mọi assertion phân
 * loại xanh một cách vô nghĩa. Ba con số dưới đây chặn đúng trạng thái ấy.
 */
const MIN_SCANNED_TS_FILES = 300;
const MIN_PROGRAM_ROOTS = 5;
const MIN_ROOT_LEVEL_TS_FILES = 5;

/** Hai thư mục hạ tầng không bao giờ là mã nguồn của repo. */
const SKIP_DIRS = new Set(['node_modules', '.git']);

/**
 * Thư mục tầng gốc CỐ Ý nằm ngoài chương trình tsc, mỗi mục kèm lý do. Đây là nhánh thứ hai của
 * phân loại đóng — không phải một cái van để nới ngưỡng. Thêm một tên vào đây là một quyết định
 * kiến trúc và phải có contract đứng sau.
 */
const OUTSIDE_PROGRAM: Record<string, string> = {
  'new-ui': 'nguyên mẫu UI chưa theo dõi bởi git, là đầu vào của một contract UI về sau (DEC-05)',
  scratch: 'vật liệu nháp của những round đã đóng, không phải mã chạy (DEC-05)',
  docs: 'bản chép đông lạnh làm hồ sơ audit; typecheck một ảnh chụp lịch sử là phép đo vô nghĩa (DEC-04)',
};

type PatternKind =
  | { kind: 'root'; root: string }
  | { kind: 'root-file'; match: string }
  | { kind: 'violation'; reason: string };

/**
 * Phân loại MỘT mẫu của `include`. Hàm thuần, nên khối tự-kiểm ở cuối tệp chạy được nó trên dữ
 * liệu BỊA mà không cần tới `tsconfig.json` thật.
 */
function classifyIncludePattern(pattern: string): PatternKind {
  const segments = pattern
    .split(sep)
    .join('/')
    .split('/')
    .filter((s) => s.length > 0);
  if (segments.length === 0) {
    return { kind: 'violation', reason: 'mẫu rỗng' };
  }
  const head = segments[0];
  if (head.includes('**')) {
    return { kind: 'violation', reason: 'glob đệ quy ở đoạn ĐẦU: ' + head };
  }
  if (segments.length === 1) {
    return { kind: 'root-file', match: head };
  }
  if (head.includes('*') || head.includes('?')) {
    return {
      kind: 'violation',
      reason: 'đoạn đầu là glob nên gốc chương trình không xác định: ' + head,
    };
  }
  return { kind: 'root', root: head };
}

/**
 * So một mẫu MỘT ĐOẠN với một TÊN tệp. Theo luật tsconfig, `*` không vượt qua dấu phân cách thư
 * mục, nên một chuỗi có dấu phân cách không bao giờ khớp một mẫu một đoạn.
 */
function matchesRootFilePattern(pattern: string, fileName: string): boolean {
  if (fileName.includes('/')) {
    return false;
  }
  const parts = pattern.split('*');
  if (parts.length === 1) {
    return pattern === fileName;
  }
  const literalLength = parts.reduce((n, s) => n + s.length, 0);
  if (fileName.length < literalLength) {
    return false;
  }
  if (!fileName.startsWith(parts[0]) || !fileName.endsWith(parts[parts.length - 1])) {
    return false;
  }
  let pos = parts[0].length;
  for (let i = 1; i < parts.length - 1; i += 1) {
    const at = fileName.indexOf(parts[i], pos);
    if (at < 0) {
      return false;
    }
    pos = at + parts[i].length;
  }
  return true;
}

function safeReaddir(dir: string): Dirent[] {
  try {
    return readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
}

function isTsSource(name: string): boolean {
  return name.endsWith('.ts') || name.endsWith('.tsx');
}

/** Quét đệ quy, trả về đường dẫn tương đối gốc repo dùng dấu phân cách `/`. */
function scanTsSources(root: string, relPrefix: string): string[] {
  const found: string[] = [];
  const stack: string[] = [''];
  while (stack.length > 0) {
    const rel = stack.pop();
    if (rel === undefined) {
      break;
    }
    const abs = rel.length === 0 ? root : join(root, rel.split('/').join(sep));
    for (const entry of safeReaddir(abs)) {
      const childRel = rel.length === 0 ? entry.name : rel + '/' + entry.name;
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name)) {
          stack.push(childRel);
        }
        continue;
      }
      if (entry.isFile() && isTsSource(entry.name)) {
        found.push(relPrefix + childRel);
      }
    }
  }
  return found;
}

function findRepoRoot(): string {
  let dir = dirname(fileURLToPath(import.meta.url));
  for (let hop = 0; hop < 12; hop += 1) {
    if (existsSync(join(dir, 'tsconfig.json')) && existsSync(join(dir, 'package.json'))) {
      return dir;
    }
    const parent = dirname(dir);
    if (parent === dir) {
      break;
    }
    dir = parent;
  }
  throw new Error('không tìm được gốc repo, tức thư mục có cả tsconfig.json và package.json');
}

const REPO_ROOT = findRepoRoot();
const TSCONFIG_PATH = join(REPO_ROOT, 'tsconfig.json');

const parsedTsconfig = JSON.parse(readFileSync(TSCONFIG_PATH, 'utf8')) as { include?: unknown };
const includeRaw = parsedTsconfig.include;
const INCLUDE: string[] = Array.isArray(includeRaw)
  ? includeRaw.filter((p): p is string => typeof p === 'string')
  : [];

const classified = INCLUDE.map((pattern) => ({ pattern, kind: classifyIncludePattern(pattern) }));
const PROGRAM_ROOTS = new Set(
  classified
    .map((c) => c.kind)
    .filter((k): k is { kind: 'root'; root: string } => k.kind === 'root')
    .map((k) => k.root),
);
const ROOT_FILE_PATTERNS = classified
  .map((c) => c.kind)
  .filter((k): k is { kind: 'root-file'; match: string } => k.kind === 'root-file')
  .map((k) => k.match);

const rootEntries = safeReaddir(REPO_ROOT);
const rootDirNames = rootEntries
  .filter((e) => e.isDirectory() && !SKIP_DIRS.has(e.name))
  .map((e) => e.name)
  .sort();
const rootLevelTsFiles = rootEntries
  .filter((e) => e.isFile() && isTsSource(e.name))
  .map((e) => e.name)
  .sort();

const scannedByRootDir = new Map<string, string[]>();
for (const name of rootDirNames) {
  scannedByRootDir.set(name, scanTsSources(join(REPO_ROOT, name), name + '/'));
}
const rootDirsWithTs = rootDirNames.filter((n) => (scannedByRootDir.get(n) ?? []).length > 0);
const totalScanned =
  rootLevelTsFiles.length +
  rootDirNames.reduce((n, name) => n + (scannedByRootDir.get(name) ?? []).length, 0);

describe('tsc program boundary — sàn chống quét rỗng', () => {
  it('phép quét thấy đủ mã TypeScript để mọi assertion dưới có nghĩa', () => {
    expect(totalScanned).toBeGreaterThanOrEqual(MIN_SCANNED_TS_FILES);
  });

  it('include của tsconfig.json suy ra đủ gốc chương trình', () => {
    expect(PROGRAM_ROOTS.size).toBeGreaterThanOrEqual(MIN_PROGRAM_ROOTS);
  });

  it('tầng gốc repo có đủ tệp cấu hình TypeScript', () => {
    expect(rootLevelTsFiles.length).toBeGreaterThanOrEqual(MIN_ROOT_LEVEL_TS_FILES);
  });
});

describe('tsc program boundary — hình dạng của include', () => {
  it('không mẫu nào có glob đệ quy ở đoạn ĐẦU', () => {
    const offenders = classified
      .filter((c) => c.kind.kind === 'violation')
      .map((c) => c.pattern + ' — ' + (c.kind as { reason: string }).reason);
    expect(offenders).toEqual([]);
  });

  it('include tồn tại và mọi phần tử là chuỗi', () => {
    expect(Array.isArray(includeRaw)).toBe(true);
    expect(INCLUDE.length).toBe(Array.isArray(includeRaw) ? includeRaw.length : -1);
  });
});

describe('tsc program boundary — phân loại ĐÓNG', () => {
  it('mỗi thư mục tầng gốc có mã TypeScript là gốc chương trình, hoặc NGOÀI kèm lý do', () => {
    const unclassified = rootDirsWithTs.filter(
      (name) =>
        !PROGRAM_ROOTS.has(name) &&
        !Object.prototype.hasOwnProperty.call(OUTSIDE_PROGRAM, name),
    );
    expect(unclassified).toEqual([]);
  });

  it('mỗi mục của danh sách NGOÀI có lý do không rỗng', () => {
    const missingReason = Object.keys(OUTSIDE_PROGRAM).filter(
      (k) => (OUTSIDE_PROGRAM[k] ?? '').trim().length === 0,
    );
    expect(missingReason).toEqual([]);
  });

  it('không tên nào vừa là gốc chương trình vừa nằm trong danh sách NGOÀI', () => {
    const both = Object.keys(OUTSIDE_PROGRAM).filter((k) => PROGRAM_ROOTS.has(k));
    expect(both).toEqual([]);
  });

  it('mỗi tệp TypeScript ở tầng gốc repo khớp một mẫu một-đoạn của include', () => {
    const uncovered = rootLevelTsFiles.filter(
      (name) => !ROOT_FILE_PATTERNS.some((p) => matchesRootFilePattern(p, name)),
    );
    expect(uncovered).toEqual([]);
  });
});

describe('tsc program boundary — tự-kiểm bộ so mẫu trên dữ liệu BỊA', () => {
  const FAKE_PATTERNS: Array<{ pattern: string; kind: PatternKind['kind']; root?: string }> = [
    { pattern: 'zzz-fake/**/*.ts', kind: 'root', root: 'zzz-fake' },
    { pattern: 'zzz-fake/deep/**/*.tsx', kind: 'root', root: 'zzz-fake' },
    { pattern: 'fake-env.d.ts', kind: 'root-file' },
    { pattern: '*.fake.ts', kind: 'root-file' },
    { pattern: '**/*.ts', kind: 'violation' },
    { pattern: '**/*.tsx', kind: 'violation' },
    { pattern: '**/fake/*.ts', kind: 'violation' },
    { pattern: '*/fake/*.ts', kind: 'violation' },
  ];

  const FAKE_MATCHES: Array<[string, string, boolean]> = [
    ['*.config.ts', 'zzz.config.ts', true],
    ['*.config.ts', 'zzz.integration-files.ts', false],
    ['*.config.ts', 'sub/zzz.config.ts', false],
    ['fake-middleware.ts', 'fake-middleware.ts', true],
    ['fake-middleware.ts', 'fake-middleware.tsx', false],
    ['*.d.ts', 'fake-env.d.ts', true],
    ['*.d.ts', 'fake-env.ts', false],
  ];

  it('phân loại mẫu đúng trên tám mẫu bịa', () => {
    const actual = FAKE_PATTERNS.map((c) => {
      const k = classifyIncludePattern(c.pattern);
      return k.kind === 'root' ? c.pattern + ' => root:' + k.root : c.pattern + ' => ' + k.kind;
    });
    const expected = FAKE_PATTERNS.map((c) =>
      c.kind === 'root' ? c.pattern + ' => root:' + c.root : c.pattern + ' => ' + c.kind,
    );
    expect(actual).toEqual(expected);
  });

  it('bộ so mẫu một-đoạn đúng trên bảy cặp bịa', () => {
    const actual = FAKE_MATCHES.map(
      ([p, name]) => p + ' ~ ' + name + ' => ' + String(matchesRootFilePattern(p, name)),
    );
    const expected = FAKE_MATCHES.map(([p, name, want]) => p + ' ~ ' + name + ' => ' + String(want));
    expect(actual).toEqual(expected);
  });

  it('một gốc bịa chưa phân loại làm phép kiểm phân loại ĐỎ', () => {
    const fakeRootDirsWithTs = [...rootDirsWithTs, 'zzz-unclassified-fake'];
    const unclassified = fakeRootDirsWithTs.filter(
      (name) =>
        !PROGRAM_ROOTS.has(name) &&
        !Object.prototype.hasOwnProperty.call(OUTSIDE_PROGRAM, name),
    );
    expect(unclassified).toEqual(['zzz-unclassified-fake']);
  });
});
