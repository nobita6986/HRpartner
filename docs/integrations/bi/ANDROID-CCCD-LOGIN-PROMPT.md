# Prompt Bàn Giao Cho T0-Android — Hỗ Trợ Đăng Nhập CCCD & Đổi Mật Khẩu Lần Đầu (`hrp-bi-worker-sync-v1`)

## 1. Bối cảnh & Mục tiêu
Backend HRP đã triển khai đồng bộ tự động NLĐ từ hệ thống Mini-BI (`hrp-bi-worker-sync-v1`). Mỗi NLĐ được cấp tài khoản đăng nhập bằng **Số CCCD (9 hoặc 12 chữ số) + mật khẩu ban đầu** do QLDA gửi.
Để đảm bảo tương thích ngược 100% với app Android hiện tại, Backend **giữ nguyên tên trường `phone`** trong request `POST /api/auth/login` và mở rộng phản hồi kèm cờ `mustChangePassword`.

## 2. Hợp đồng API trên Backend HRP

### 2.1 `POST /api/auth/login`
- **Request JSON:**
  ```json
  {
    "phone": "001099012345",
    "password": "Ab3..."
  }
  ```
  *(Trường `phone` chấp nhận cả **Số CCCD 9/12 chữ số** lẫn **Số điện thoại 10 chữ số**).*
- **Response JSON (`200 OK`):**
  ```json
  {
    "ok": true,
    "token": "<jwt>",
    "role": "WORKER",
    "mustChangePassword": true,
    "user": {
      "id": "...",
      "name": "Trần Văn Nam",
      "phone": "0912345678",
      "role": "WORKER",
      "mustChangePassword": true
    },
    "worker": { ... }
  }
  ```
- **Rate-limit (`429 Too Many Requests`):**
  ```json
  {
    "error": "TOO_MANY_ATTEMPTS",
    "message": "Bạn đã nhập sai quá nhiều lần. Vui lòng thử lại sau 15 phút."
  }
  ```

### 2.2 `POST /api/auth/change-password`
- **Headers:** `Authorization: Bearer <jwt>`
- **Request JSON:**
  ```json
  {
    "currentPassword": "<mật khẩu ban đầu hoặc hiện tại>",
    "newPassword": "<mật khẩu mới >= 8 ký tự, khác currentPassword>"
  }
  ```
- **Response JSON (`200 OK`):**
  ```json
  {
    "ok": true,
    "mustChangePassword": false,
    "message": "Đổi mật khẩu thành công."
  }
  ```

### 2.3 Chặn thao tác khi chưa đổi mật khẩu lần đầu (`403 PASSWORD_CHANGE_REQUIRED`)
Khi `mustChangePassword === true`:
- Các API chấm công (`POST /api/worker/checkins/events`, `POST /api/worker/checkins`) và sửa hồ sơ (`PATCH /api/workers/me`) trả `403` với mã lỗi `PASSWORD_CHANGE_REQUIRED`.
- `GET /api/workers/me` trả thêm `mobileAccess.mustChangePassword: true` và `mobileAccess.canCheckIn: false`.

### 2.4 `PATCH /api/workers/me` (NLĐ tự cập nhật thông tin cá nhân)
- **Headers:** `Authorization: Bearer <jwt>`
- **Allowlist các trường cho phép sửa:** `fullName`, `phone`, `dateOfBirth` (`YYYY-MM-DD`), `gender` (`MALE` | `FEMALE` | `OTHER`), `maritalStatus`, `permanentAddress`, `currentAddress`, `hometown`, `ethnicGroup`, `religion`, `bankAccount`, `bankName`, `bankBranch`, `taxCode`, `insuranceCode`, `selfieImageUrl`.
- **Không cho phép sửa:** `cccdNumber`, trạng thái làm việc, dự án phân công.

## 3. Yêu cầu cập nhật trên Repo Android
1. **Màn hình Đăng nhập (`LoginScreen`):**
   - Đổi nhãn ô nhập từ `"Số điện thoại"` thành `"Số CCCD hoặc Số điện thoại"`.
   - Bỏ bộ chặn regex cứng chỉ cho phép đầu số `0xxxxxxxxx` phía client; cho phép nhập chuỗi `9` chữ số (CMND), `12` chữ số (CCCD) hoặc `10` chữ số (SĐT).
   - Giữ nguyên key JSON gửi lên là `"phone"`.
2. **Luồng bắt buộc đổi mật khẩu lần đầu (`ChangePasswordScreen` / Dialog):**
   - Khi `POST /api/auth/login` trả `mustChangePassword == true` (hoặc khi nhận `403 PASSWORD_CHANGE_REQUIRED`), điều hướng NLĐ tới màn hình đặt mật khẩu mới (`>= 8` ký tự) gọi `POST /api/auth/change-password` trước khi vào màn hình chính.
3. **Màn hình Hồ sơ cá nhân (`ProfileScreen`):**
   - Cho phép NLĐ chỉnh sửa họ tên và các thông tin cá nhân qua `PATCH /api/workers/me` (riêng ô Số CCCD hiển thị read-only).
