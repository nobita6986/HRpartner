---
name: python-project
description: Use when HRP works on a Python project OR Python sub-module (scripts, jobs, datapipe). HRP chính là Next.js/TypeScript nên skill này chỉ áp dụng cho các sub-tool Python (vd. seed scripts, MCP tools).
version: 1.0.0
license: HRP-Internal
---

# Python Project Protocol (sub-tool)

> **Lưu ý**: HRP chính là Next.js + TypeScript. Skill này chỉ áp dụng cho sub-tool Python (seed scripts, MCP tools, datapipe).

## 1. Môi trường & Convention (Python 3.10+)

- Type Hints bắt buộc: `list[str]`, `dict[str, Any]`, `str | None`.
- Không dùng module cũ (`typing.List`, `typing.Dict`).
- Dùng `@dataclass` hoặc Pydantic cho object cấu trúc.
- Format bằng **Black** + **Ruff**.

## 2. Cấu trúc thư mục

```text
project_root/
├── .ai-pipeline/      # Pipeline config
├── src/               # Source chính
├── tests/             # Unit & Integration
├── docs/
├── pyproject.toml     # ưu tiên hơn requirements.txt
└── .venv/             # không commit
```

## 3. Quản lý Virtual Environment (Windows)

```powershell
# uv (khuyến nghị)
uv venv
.\.venv\Scripts\Activate.ps1
uv pip install -r requirements.txt
```

## 4. Lỗi thường gặp trên Windows

- `Activate.ps1` bị Execution Policy:
  ```powershell
  Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
  ```
- Encoding: luôn `open("file.txt", "r", encoding="utf-8")`.
