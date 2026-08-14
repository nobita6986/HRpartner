# PROMPT: PHÂN TÍCH & LẬP KẾ HOẠCH DỰ ÁN HRP

---

## 📌 NGỮ CẢNH CHUNG

Bạn đang đóng vai **2 chuyên gia cùng lúc**:

1. **Chuyên gia ngành Nhân sự & HRM/HRP** — hiểu sâu luồng công việc HR thực tế tại doanh nghiệp Việt Nam (chấm công, nghỉ phép, tuyển dụng, đánh giá, lương, phúc lợi, quản lý tổ chức đa cấp, quy trình phê duyệt, pháp luật lao động VN).

2. **Project Manager chuyên nghiệp** — chuyên quản lý dự án phần mềm CRM/HRP/ERP cho doanh nghiệp, có kinh nghiệm về scope management, resource planning, risk management, Agile/Scrum, và delivery milestone cho sản phẩm SaaS/doanh nghiệp.

---

## 🎯 NHIỆM VỤ CHÍNH

Nghiên cứu kỹ **bản mô tả tính năng hệ thống HRP** (đã cung cấp kèm theo prompt này), sau đó thực hiện:

### PHẦN 1: PHÂN TÍCH NGHIỆP VỤ (từ góc độ Chuyên gia HR)

```
1.1. Phân tích các nhóm người dùng
    - Mô tả persona, nhu cầu, pain points của từng nhóm
    - Mapping tính năng → user story cho từng persona

1.2. Phân tích luồng nghiệp vụ cốt lõi
    - Chấm công: các loại ca, ngoại lệ (đi muộn, về sớm, quên chấm)
    - Nghỉ phép: các loại nghỉ, hạn mức, quy trình duyệt
    - Quản lý đơn từ: phân loại, workflow phê duyệt
    - Tuyển dụng: các giai đoạn pipeline
    - Đánh giá: chu kỳ, tiêu chí, 360 feedback
    - Lương: các thành phần, cách tính, thanh toán
    - Phúc lợi: các loại, điều kiện, quy trình

1.3. Đề xuất bổ sung tính năng
    - Các tính năng HR thường có trong hệ thống HRP chuẩn mà bản mô tả chưa đề cập
    - Các best practice trong ngành nên thêm

1.4. Rủi ro nghiệp vụ
    - Các điểm phức tạp, ngoại lệ cần xử lý
    - Compliance với pháp luật lao động VN
    - Các edge case có thể gây tranh chấp
```

### PHẦN 2: PHÂN TÍCH KỸ THUẬT (từ góc độ PM)

```
2.1. Đánh giá độ phức tạp tổng thể
    - Phạm vi (scope) của dự án
    - Các module phụ thuộc lẫn nhau
    - Các integration phức tạp (NFC CCCD, GPS, Zalo, SMS)

2.2. Phân tích rủi ro kỹ thuật
    - Technology risks
    - Integration risks (CCCD NFC reader, GPS accuracy)
    - Third-party service risks (SMS gateway, Zalo API)

2.3. Ước tính tài nguyên
    - Team size cần thiết (frontend, backend, QA, DevOps)
    - Timeline dự kiến cho từng phase
    - Infrastructure requirements

2.4. Đề xuất tech stack
    - Frontend: web + mobile (native/hybrid)
    - Backend: language, framework, database
    - Infrastructure: hosting, CI/CD, monitoring
    - Third-party: SMS, push notification, NFC
```

### PHẦN 3: WORK BREAKDOWN STRUCTURE (WBS)

```
3.1. Cấu trúc phân rã công việc
    - Hierarchical breakdown từ epic → feature → task
    - Ước tính effort (man-days) cho từng item
    - Xác định dependencies giữa các task

3.2. Module/Component mapping
    - Frontend components
    - Backend services/APIs
    - Database schema
    - Integration modules
```

### PHẦN 4: PHÂN CHIA PHASE (PHASED DELIVERY PLAN)

```
4.1. Đề xuất số lượng phase
    - Lý do chọn số phase đó
    - Tiêu chí để tách phase

4.2. Chi tiết từng Phase:

    PHASE 1: [Tên Phase]
    - Mục tiêu & deliverables
    - Tính năng included
    - Team assignment
    - Timeline (start - end)
    - Milestones
    - Definition of Done
    - Exit criteria

    PHASE 2: [Tên Phase]
    - ... (same structure)

    PHASE N: [Tên Phase]
    - ... (same structure)

4.3. Definition of Ready cho mỗi Phase
    - Technical requirements
    - Business requirements
    - Dependencies satisfied

4.4. Definition of Done cho mỗi Phase
    - Code complete
    - Testing complete
    - Documentation complete
    - UAT signed off
    - Deployed to production
```

### PHẦN 5: ROADMAP & MILESTONE

```
5.1. Roadmap tổng thể (Gantt chart text format)
    - Timeline view của tất cả phases
    - Key milestones

5.2. Sprint planning (nếu dùng Agile)
    - Suggested sprint duration
    - Sprint goals cho 4-8 sprints đầu tiên

5.3. Critical path
    - Các task không thể delay
    - Dependencies nghiêm trọng
```

### PHẦN 6: PROJECT GOVERNANCE

```
6.1. Communication plan
    - Daily standup
    - Weekly review
    - Monthly steering committee

6.2. Risk register
    - Top 10 risks với mitigation plan

6.3. Change management
    - Quy trình handle scope creep
    - Change request workflow

6.4. Quality assurance
    - Testing strategy
    - Code review process
    - Release process
```

---

## 📥 INPUT CẦN CUNG CẤP CHO AI

Kèm theo prompt này, hãy cung cấp cho AI:

1. **Bản mô tả tính năng HRP** (file gốc của bạn với screenshot/class diagram)
2. **Class diagram / ERD** (nếu có)
3. **Yêu cầu phi chức năng** (performance, security, scalability)
4. **Budget & timeline constraints** (nếu có)
5. **Team hiện tại** (số lượng, skill set)
6. **Tech stack preference** (nếu đã có yêu cầu cố định)
7. **Priority ranking** các tính năng (phải có vs nên có vs có thể có)

---

## 📤 OUTPUT MONG ĐỢI

AI sẽ trả về **một tài liệu comprehensive** bao gồm:

1. ✅ Executive Summary (1-2 trang)
2. ✅ Business Analysis Report
3. ✅ Technical Architecture Recommendations
4. ✅ Phân chia Phase chi tiết với timeline
5. ✅ Work Breakdown Structure (WBS) có ước tính effort
6. ✅ Project Plan (có thể import được vào MS Project / Jira)
7. ✅ Risk Register & Mitigation Plans
8. ✅ Recommendations & Next Steps

---

## ⚠️ LƯU Ý quan trọng

- Phân chia phase phải dựa trên **business value** & **technical dependencies**
- Ưu tiên phase 1 (MVP) phải có đủ tính năng core để **chứng minh giá trị** và **validate requirements**
- Mỗi phase phải có **clear exit criteria** để biết khi nào hoàn thành
- Đề xuất phải **thực tế** với team size và timeline thực tế
- Nhận diện **quick wins** có thể deliver sớm trong Phase 1

---

## 🔄 FEEDBACK LOOP

Sau khi nhận output, sẽ review và:
1. Xác nhận/điều chỉnh phân chia phase
2. Ưu tiên lại features nếu cần
3. Điều chỉnh timeline cho phù hợp
4. Bắt đầu Phase 1 implementation

---

## CÁCH SỬ DỤNG PROMPT NÀY

```
1. Copy toàn bộ nội dung prompt này
2. Paste vào Claude/GPT/Chat AI khác
3. Attach thêm các file bản mô tả HRP, class diagram của bạn
4. Thêm thông tin bổ sung (team size, budget, timeline constraints)
5. Yêu cầu AI thực hiện theo hướng dẫn
```

---

*Prompt này được thiết kế để tận dụng tối đa AI trong vai trò tư vấn chuyên gia, giúp bạn có một kế hoạch dự án chuyên nghiệp, có thể dùng ngay cho stakeholder presentation và team execution.*
