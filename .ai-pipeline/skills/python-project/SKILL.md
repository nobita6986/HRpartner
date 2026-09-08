---
name: python-project
description: Use when the repository or an in-scope submodule is genuinely Python. Select tools from the repository configuration.
version: 1.0.0
license: Internal
---

# Python Project Protocol (sub-tool)

> Chỉ áp dụng khi Python là stack hoặc submodule thật trong scope; không dùng Python để né toolchain chính của repository.

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
