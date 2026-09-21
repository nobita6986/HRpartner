// gen-fixtures.mjs — generates the 24-fixture normalization corpus.
// Run: node tests/db/_fixtures/gen-fixtures.mjs > tests/db/_fixtures/normalization-fixtures.json
//
// Each fixture records the canonical TS-normalized output of
// normalizePhone() / normalizeFullName() for a given input string. The
// integration test AC-13 loads this corpus and asserts that the PL/pgSQL
// functions hrp_normalize_phone / hrp_normalize_full_name (created in
// prisma/migrations/20260919100000_aff03b_public_intake_rpc/migration.sql)
// produce IDENTICAL output. This is the scoring-parity gate (RQ-14, AC-17).

// Force UTF-8 output — on Windows `process.stdout` defaults to UTF-16 LE when
// piped, which corrupts the JSON for Vite's json plugin (BOM + null bytes).
if (process.stdout.setDefaultEncoding) {
  process.stdout.setDefaultEncoding('utf8');
}

function normalizePhone(input) {
  if (input == null) return '';
  const trimmed = String(input).trim();
  if (!trimmed) return '';
  const digits = trimmed.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('84') && digits.length > 9) {
    return digits.slice(2);
  }
  if (digits.startsWith('0') && digits.length > 1) {
    return digits.slice(1);
  }
  return digits;
}

function normalizeFullName(input) {
  if (input == null) return '';
  return String(input).trim().toLowerCase().replace(/\s+/g, ' ');
}

const inputs = [
  // 12 phone fixtures
  { kind: 'phone', input: '+84 987 654 321', note: 'international +84 prefix, with spaces' },
  { kind: 'phone', input: '0987654321', note: 'VN 0-prefix 10 digits' },
  { kind: 'phone', input: '84 987 654 321', note: 'no +, leading 84' },
  { kind: 'phone', input: '+84987654321', note: '+84 prefix, no spaces' },
  { kind: 'phone', input: '0987 654 321', note: 'VN with spaces' },
  { kind: 'phone', input: '(0987) 654-321', note: 'parentheses + dashes' },
  { kind: 'phone', input: '  0987654321  ', note: 'leading/trailing whitespace' },
  { kind: 'phone', input: '09876543210', note: '11 digits, VN 0-prefix' },
  { kind: 'phone', input: '01234567890', note: '11 digits, 01x prefix (mobile)' },
  { kind: 'phone', input: 'abcd', note: 'non-digit-only input' },
  { kind: 'phone', input: '', note: 'empty string' },
  { kind: 'phone', input: '+84  ', note: 'just +84 + spaces' },
  // 12 full_name fixtures
  { kind: 'full_name', input: '  Nguyễn   Văn   A ', note: 'multi-space, leading/trailing' },
  { kind: 'full_name', input: 'Nguyễn Văn A', note: 'single spaces' },
  { kind: 'full_name', input: 'nguyễn văn a', note: 'already lowercase' },
  { kind: 'full_name', input: 'NGUYỄN VĂN A', note: 'all uppercase' },
  { kind: 'full_name', input: 'Trần Thị Bé', note: 'multi-word' },
  { kind: 'full_name', input: '\tLê\nHoàng\nNam\r\n', note: 'mixed whitespace incl tabs/newlines' },
  { kind: 'full_name', input: '   ', note: 'whitespace-only' },
  { kind: 'full_name', input: '', note: 'empty' },
  { kind: 'full_name', input: 'Phạm Minh Khôi', note: '4 words' },
  { kind: 'full_name', input: 'Đỗ Thanh Hà', note: 'mixed accents' },
  { kind: 'full_name', input: 'Đào   Văn     Long', note: 'many spaces between words' },
  { kind: 'full_name', input: 'Vũ Ngọc Ánh', note: 'middle name' },
];

const fixtures = [];
for (const f of inputs) {
  if (f.kind === 'phone') {
    fixtures.push({
      ts: { phone: f.input, fullName: '' },
      ts_phone: normalizePhone(f.input),
      ts_full_name: '',
      note: f.note,
    });
  } else {
    fixtures.push({
      ts: { phone: '', fullName: f.input },
      ts_phone: '',
      ts_full_name: normalizeFullName(f.input),
      note: f.note,
    });
  }
}

// Write explicit UTF-8 bytes — `process.stdout.write` on Windows PowerShell
// pipes can emit UTF-16 LE even after setDefaultEncoding, which corrupts the
// JSON for Vite's json plugin (BOM + null bytes). The fixed JSON contract:
//   * UTF-8 (no BOM)
//   * LF newlines
//   * trailing newline (keeps POSIX-friendly)
const json = JSON.stringify(fixtures, null, 2) + '\n';
process.stdout.write(Buffer.from(json, 'utf8'));
