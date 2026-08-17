import os
import json
from openai import OpenAI

DICT_FILE = "column_dict.json"

STANDARD_COLUMNS = [
    "employee_code", "full_name", "base_salary", "normal_hours",
    "ot_130", "ot_150", "ot_180", "ot_200", "ot_210", "ot_250", "ot_260",
    "sunday_200", "sunday_night_240", "sunday_night_270",
    "holiday_300", "holiday_night_390",
    "absent_days", "total_days", "suat_an"
]

def load_dict():
    if os.path.exists(DICT_FILE):
        try:
            with open(DICT_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except:
            return {}
    return {}

def save_dict(d):
    with open(DICT_FILE, "w", encoding="utf-8") as f:
        json.dump(d, f, ensure_ascii=False, indent=4)

def get_mapping_from_ai(headers, review_callback=None):
    """
    Sử dụng LLM (Deepseek API) + Local Dictionary để map column.
    Chỉ gọi AI cho những header chưa có trong từ điển.
    """
    column_dict = load_dict()
    
    # Lọc ra những cột chưa biết
    unknown_headers = []
    for h in headers:
        if h not in column_dict:
            unknown_headers.append(h)
            
    # Nếu tất cả đã có trong từ điển, trả về luôn
    if not unknown_headers:
        return {h: column_dict[h] for h in headers if h in column_dict and column_dict[h] is not None}
        
    api_key = os.environ.get("DEEPSEEK_API_KEY")
    if not api_key:
        print("Cảnh báo: Thiếu DEEPSEEK_API_KEY, sẽ chỉ sử dụng từ điển local.")
        return {h: column_dict[h] for h in headers if h in column_dict and column_dict[h] is not None}

    client = OpenAI(
        api_key=api_key,
        base_url="https://api.deepseek.com/v1"
    )

    prompt = f"""
Bạn là một AI chuyên phân tích dữ liệu Bảng Chấm Công/Bảng Lương.
Nhiệm vụ: Ánh xạ các cột (headers) từ file Excel thô về một Schema chuẩn duy nhất.

[SCHEMA CHUẨN (Mục tiêu)]
{json.dumps(STANDARD_COLUMNS, ensure_ascii=False)}

[HEADERS THÔ CẦN MAP]
{json.dumps(unknown_headers, ensure_ascii=False)}

Yêu cầu:
1. Output DƯỚI DẠNG JSON DUY NHẤT. Key là Tên cột THÔ, Value là Tên cột CHUẨN.
2. CHỈ ánh xạ những cột khớp ý nghĩa. Cột nào không liên quan (hoặc là ngày tháng như 1, 2, 3...31) thì truyền Value là `null`.
3. Ví dụ: "Mã NV" -> "employee_code", "Họ và Tên" -> "full_name", "Lương CB" -> "base_salary", "1.5" -> "ot_150", "2.0" -> "ot_200", "Ngày" -> null.
    """

    try:
        response = client.chat.completions.create(
            model="deepseek-chat",
            messages=[
                {"role": "system", "content": "You are a data mapping assistant. Only output raw JSON."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.1,
            timeout=15.0
        )
        
        result_text = response.choices[0].message.content.strip()
        
        if result_text.startswith("```json"):
            result_text = result_text.replace("```json", "").replace("```", "").strip()
        elif result_text.startswith("```"):
            result_text = result_text.replace("```", "").strip()
            
        ai_mapping = json.loads(result_text)
        
        if review_callback and unknown_headers:
            ai_mapping = review_callback(unknown_headers, ai_mapping)
        
        # Cập nhật từ điển
        for h in unknown_headers:
            # Nếu AI map được thì lưu giá trị, nếu AI không map hoặc bỏ qua thì lưu null để lần sau không gọi lại
            column_dict[h] = ai_mapping.get(h)
            
        save_dict(column_dict)
        
        # Trả về kết quả tổng hợp cho các cột được yêu cầu
        final_mapping = {}
        for h in headers:
            mapped_val = column_dict.get(h)
            if mapped_val is not None:
                final_mapping[h] = mapped_val
                
        return final_mapping
        
    except Exception as e:
        print(f"Lỗi AI: {str(e)}. Fallback sử dụng từ điển local.")
        return {h: column_dict[h] for h in headers if h in column_dict and column_dict[h] is not None}
