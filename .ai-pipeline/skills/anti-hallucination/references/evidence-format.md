# Evidence Format (HRP)

## Block chuẩn trong HANDOFF.md / AUDIT.md

```markdown
### STEP-0X / AC-0X / AUD-0X

- **Command (verbatim)**: `<full command>`
- **Exit code**: `<0 | 1 | 124 | ...>`
- **Output (truncated, relevant)**:
  ```
  <actual output snippet>
  ```
- **Date/time**: `<YYYY-MM-DD HH:mm TZ>`
- **Author/Tier**: `<Tier 2 | Tier 3>`
```

## Quy tắc

- Command phải verbatim, không diễn giải.
- Exit code bắt buộc.
- Output chỉ trích phần relevant; full log → `evidence/<file>.log`.
- Tier 3 tự chạy lại command, không tin HANDOFF evidence.

## Output files allowed trong evidence/

- `*.log`, `*.txt`, `*.json`, `*.xml`
- `*.png`, `*.jpg` (screenshot UI)
- `*.csv` (test export)
- KHÔNG lưu evidence trong `docs/architecture/` hay root.
