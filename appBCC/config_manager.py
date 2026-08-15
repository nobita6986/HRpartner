import json
import os
import hashlib

CONFIG_DIR = "config"
MAPPING_CACHE_FILE = os.path.join(CONFIG_DIR, "mapping_cache.json")

def init_config():
    if not os.path.exists(CONFIG_DIR):
        os.makedirs(CONFIG_DIR)
    if not os.path.exists(MAPPING_CACHE_FILE):
        with open(MAPPING_CACHE_FILE, "w", encoding="utf-8") as f:
            json.dump({}, f)

def generate_file_signature(headers):
    """
    Tạo chữ ký (signature) dựa trên danh sách các header của file.
    Việc này giúp định danh cấu trúc của file Excel.
    """
    header_str = "|".join(sorted([str(h).strip().lower() for h in headers]))
    return hashlib.md5(header_str.encode('utf-8')).hexdigest()

def get_mapping_from_cache(headers):
    """
    Kiểm tra xem cấu trúc file (headers) đã từng được AI map và lưu cache chưa.
    """
    init_config()
    signature = generate_file_signature(headers)
    with open(MAPPING_CACHE_FILE, "r", encoding="utf-8") as f:
        cache = json.load(f)
    return cache.get(signature)

def save_mapping_to_cache(headers, mapping):
    """
    Lưu kết quả mapping của AI vào cache để tái sử dụng.
    """
    init_config()
    signature = generate_file_signature(headers)
    with open(MAPPING_CACHE_FILE, "r", encoding="utf-8") as f:
        cache = json.load(f)
        
    cache[signature] = mapping
    
    with open(MAPPING_CACHE_FILE, "w", encoding="utf-8") as f:
        json.dump(cache, f, ensure_ascii=False, indent=4)
