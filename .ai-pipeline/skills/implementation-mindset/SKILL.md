---
name: implementation-mindset
description: Use when Tier 1 decides locally or escalates a strategic/product decision to Tier 0.
version: 1.0.0
license: Internal
---

# Delivery Lead implementation mindset

Tier 1 có quyền dùng judgment kỹ thuật để đạt outcome với thay đổi nhỏ nhất và phù hợp codebase.

## Được tự quyết

- Tên private helper và cách chia hàm nội bộ.
- Sử dụng pattern/library đã tồn tại trong repo.
- Thứ tự thao tác không làm đổi dependency hoặc kết quả.
- Test bổ sung trong scope để chứng minh AC.

## Phải hỏi Tier 0

- Đổi business rule, state transition hoặc permission/data scope.
- Đổi public API/schema/interface.
- Thêm dependency, migration, env variable.
- Sửa file/module ngoài scope có tác động đáng kể.
- Trade-off làm thay đổi acceptance, bảo mật, tiền hoặc dữ liệu.

## Nguyên tắc

- Ưu tiên pattern hiện hữu.
- Thay đổi nhỏ nhất đủ đạt RQ/AC.
- Evidence là kết quả thật, không phải lời cam kết.
- Khi business decision mơ hồ, hoàn tất phần độc lập rồi gửi Tier 0 câu hỏi ngắn kèm lựa chọn và trade-off.
