from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from supabase import create_client, Client
from fastapi.middleware.cors import CORSMiddleware

import os
from datetime import date
from groq import Groq
from datetime import date, datetime, timedelta, timezone
# Khởi tạo client Groq (Thay bằng Key thật của bạn nhé)
GROQ_API_KEY = "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" 
groq_client = Groq(api_key=GROQ_API_KEY)
# ==========================================
# 1. CẤU HÌNH SUPABASE
# ==========================================
# Hãy thay bằng URL và KEY thật của bạn trong Supabase (Mục Project Settings -> API)
SUPABASE_URL = "https://inhusetnfvozktmaszzl.supabase.co" 
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImluaHVzZXRuZnZvemt0bWFzenpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNjMwODcsImV4cCI6MjA4NzgzOTA4N30.fZj1B19eW9RoAX4ej6dcp_kGUDSO3tOqOv78H5RYirw" 
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

app = FastAPI()

# Bắt đầu đoạn cấu hình CORS
origins = [
    "http://localhost:5173", # Để bạn vẫn test được trên máy tính
    "http://localhost:3000",
    "https://studystreak.onrender.com", # <--- Tên miền Frontend thật của bạn trên Render
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"], # Cho phép tất cả các phương thức (GET, POST, PUT, DELETE...)
    allow_headers=["*"], # Cho phép tất cả các headers
)
# Kết thúc đoạn cấu hình CORS
class CheckinCreate(BaseModel):
    user_id: str
    subject: str
    mood: str
    participation: int
    goal: str
# ==========================================
# 3. ĐỊNH NGHĨA MODEL DỮ LIỆU (Pydantic)
# ==========================================
class UserRegister(BaseModel):
    name: str
    email: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

# ==========================================
# 4. API ĐĂNG KÝ VÀ ĐĂNG NHẬP
# ==========================================

@app.post("/register")
async def register(user: UserRegister):
    try:
        # Gọi hàm sign_up của Supabase Auth
        # Metadata giúp lưu thêm tên của học sinh cùng với tài khoản
        res = supabase.auth.sign_up({
            "email": user.email,
            "password": user.password,
            "options": {
                "data": {
                    "name": user.name
                }
            }
        })
        return {
            "message": "Đăng ký thành công!", 
            "user_id": res.user.id, 
            "name": user.name
        }
    except Exception as e:
        # Nếu email đã tồn tại hoặc mật khẩu quá ngắn, Supabase sẽ báo lỗi
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/login")
async def login(user: UserLogin):
    try:
        # Gọi hàm sign_in của Supabase Auth
        res = supabase.auth.sign_in_with_password({
            "email": user.email,
            "password": user.password
        })
        
        # Trích xuất tên từ metadata đã lưu lúc đăng ký
        name = res.user.user_metadata.get("name", "Chiến thần")
        
        return {
            "message": "Đăng nhập thành công!", 
            "user_id": res.user.id, 
            "name": name,
            "email": res.user.email
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail="Sai email hoặc mật khẩu. Vui lòng thử lại!")
# ==========================================
# SCHEMAS (Định nghĩa dữ liệu đầu vào)
# ==========================================
class UserCreate(BaseModel):
    username: str
    avatar_url: str | None = None  # Có thể để trống

# ==========================================
# ROUTES (Các API Endpoints)
# ==========================================
# ==========================================
# LOGIC TÍNH TOÁN STREAK (CHUỖI NGÀY)
# ==========================================
def update_checkin_streak(user_id: str, checkin_date: date):
    try:
        # 1. Tìm xem user này đã có record Streak loại "check_in_streak" chưa
        response = supabase.table("streaks").select("*").eq("user_id", user_id).eq("streak_type", "check_in_streak").execute()
        
        # 2. Nếu chưa có (Lần đầu tiên check-in) -> Tạo mới
        if not response.data:
            supabase.table("streaks").insert({
                "user_id": user_id,
                "streak_type": "check_in_streak",
                "current_count": 1,
                "highest_count": 1,
                "last_updated_date": checkin_date.isoformat()
            }).execute()
            return "Đã tạo chuỗi Check-in đầu tiên: 1 ngày! 🔥"
            
        # 3. Nếu đã có -> Tính toán khoảng cách ngày
        streak = response.data[0]
        # Chuyển chuỗi ngày từ DB sang dạng Date của Python
        last_date = datetime.strptime(streak["last_updated_date"], "%Y-%m-%d").date()
        
        delta_days = (checkin_date - last_date).days
        streak_id = streak["id"]
        current_count = streak["current_count"]
        highest_count = streak["highest_count"]
        freezes_left = streak["freezes_left"]

        # Kịch bản A: Check-in liên tục (Cách 1 ngày)
        if delta_days == 1:
            new_count = current_count + 1
            new_highest = max(new_count, highest_count)
            
            supabase.table("streaks").update({
                "current_count": new_count,
                "highest_count": new_highest,
                "last_updated_date": checkin_date.isoformat()
            }).eq("id", streak_id).execute()
            return f"Chuỗi tăng lên {new_count} ngày! Giữ vững phong độ nhé! 🚀"

        # Kịch bản B: Bỏ lỡ ngày (Cách > 1 ngày)
        elif delta_days > 1:
            # Nếu lỡ đúng 1 ngày (delta = 2) và có bùa cứu trợ
            if delta_days == 2 and freezes_left > 0:
                new_count = current_count + 1
                new_highest = max(new_count, highest_count)
                
                supabase.table("streaks").update({
                    "current_count": new_count,
                    "highest_count": new_highest,
                    "freezes_left": freezes_left - 1, # Trừ 1 bùa
                    "last_updated_date": checkin_date.isoformat()
                }).eq("id", streak_id).execute()
                return f"Phew! Đã dùng 1 bùa bảo vệ. Chuỗi tiếp tục là {new_count} ngày! 🛡️"
            
            # Nếu lỡ quá nhiều ngày hoặc hết bùa -> Reset về 1
            else:
                supabase.table("streaks").update({
                    "current_count": 1,
                    "last_updated_date": checkin_date.isoformat()
                }).eq("id", streak_id).execute()
                return "Rất tiếc, chuỗi đã bị đứt. Chúng ta làm lại từ mốc 1 ngày nhé! 💪"

        # Kịch bản C: delta_days == 0 (Đã tính cho ngày hôm nay rồi, không làm gì cả)
        return "Bạn đã nhận điểm Streak của ngày hôm nay rồi."

    except Exception as e:
        print("Lỗi khi update Streak:", e)
        return "Lỗi xử lý Streak."
@app.get("/")
def read_root():
    return {"message": "Chào mừng đến với StudyStreak API 🚀"}

# 1. API Lấy danh sách người dùng
@app.get("/users/")
def get_users():
    try:
        # Lệnh select("*") lấy toàn bộ dữ liệu từ bảng users
        response = supabase.table("users").select("*").execute()
        return {"status": "success", "data": response.data}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# 2. API Tạo người dùng mới
@app.post("/users/")
def create_user(user: UserCreate):
    try:
        # Lệnh insert() thêm dữ liệu vào bảng users
        response = supabase.table("users").insert({
            "username": user.username,
            "avatar_url": user.avatar_url
        }).execute()
        
        return {
            "status": "success", 
            "message": "Đã tạo tài khoản thành công!", 
            "data": response.data
        }
    except Exception as e:
        # Bắt lỗi (ví dụ: trùng username)
        raise HTTPException(status_code=400, detail="Lỗi tạo user (Có thể username đã tồn tại)")
    
from typing import List, Optional
from datetime import date

# 1. Schema cho từng môn học
class SubjectLogCreate(BaseModel):
    subject_name: str
    participation_level: int
    plus_points: int = 0
    plus_reason: Optional[str] = None
    minus_points: int = 0
    minus_reason: Optional[str] = None

# 2. Schema cho toàn bộ lượt Check-in trong ngày
class DailyCheckinCreate(BaseModel):
    user_id: str  # ID của user (UUID lấy từ Supabase)
    checkin_date: date  # Ngày check-in (VD: "2023-10-25")
    micro_goal_for_tomorrow: Optional[str] = None
    subjects: List[SubjectLogCreate]  # Danh sách các môn học
    
@app.post("/checkins/")
def create_daily_checkin(payload: DailyCheckinCreate):
    try:
        # --- BƯỚC 1: LƯU VÀO BẢNG daily_checkins ---
        checkin_response = supabase.table("daily_checkins").insert({
            "user_id": payload.user_id,
            "checkin_date": payload.checkin_date.isoformat(),
            "micro_goal_for_tomorrow": payload.micro_goal_for_tomorrow
        }).execute()
        
        # Lấy ID của lượt check-in vừa tạo
        new_checkin = checkin_response.data[0]
        checkin_id = new_checkin["id"]

        # --- BƯỚC 2: CHUẨN BỊ DỮ LIỆU ĐỂ LƯU VÀO BẢNG subject_logs ---
        # Chúng ta sẽ biến đổi List các object thành List các dictionary để insert 1 lần (Bulk Insert)
        subjects_data_to_insert = []
        for subject in payload.subjects:
            subjects_data_to_insert.append({
                "checkin_id": checkin_id,
                "user_id": payload.user_id,
                "subject_name": subject.subject_name,
                "participation_level": subject.participation_level,
                "plus_points": subject.plus_points,
                "plus_reason": subject.plus_reason,
                "minus_points": subject.minus_points,
                "minus_reason": subject.minus_reason
            })

        # Lưu toàn bộ môn học vào database cùng 1 lúc
        # --- BƯỚC 3 (MỚI): CẬP NHẬT STREAK SAU KHI CHECK-IN THÀNH CÔNG ---
        streak_message = update_checkin_streak(payload.user_id, payload.checkin_date)
        if subjects_data_to_insert:
            supabase.table("subject_logs").insert(subjects_data_to_insert).execute()

        return {
            "status": "success",
            "message": "Check-in thành công! Bạn làm tốt lắm!",
            "checkin_id": checkin_id,
            "streak": streak_message,
        }

    except Exception as e:
        error_msg = str(e)
        # Bắt lỗi vi phạm UNIQUE (đã check-in trong ngày rồi)
        if "duplicate key value violates unique constraint" in error_msg:
            raise HTTPException(status_code=400, detail="Hôm nay bạn đã check-in rồi! Hãy quay lại vào ngày mai nhé.")
        
        raise HTTPException(status_code=400, detail=f"Lỗi hệ thống: {error_msg}")
    
@app.post("/checkins")
async def create_checkin(checkin: CheckinCreate):
    try:
        # Gọi lệnh insert để nhét dữ liệu vào bảng 'checkins' trên Supabase
        data = supabase.table("checkins").insert({
            "user_id": checkin.user_id,
            "subject": checkin.subject,
            "mood": checkin.mood,
            "participation": checkin.participation,
            "goal": checkin.goal
        }).execute()
        
        return {"message": "Check-in thành công!", "data": data.data}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Lỗi khi lưu check-in: {str(e)}")
    
@app.get("/goals/{user_id}")
async def get_goals(user_id: str):
    try:
        # Thêm is_done vào câu select
        response = supabase.table("checkins").select("id, goal, created_at, is_done").eq("user_id", user_id).order("created_at", desc=True).limit(10).execute()
        
        goals_list = []
        for item in response.data:
            if item.get("goal") and item.get("goal").strip():
                date_str = item["created_at"][:10]
                goals_list.append({
                    "id": item["id"],
                    "text": item["goal"],
                    "done": item.get("is_done", False), # <--- Lấy trạng thái thật từ Database
                    "date": date_str
                })
        return {"status": "success", "data": goals_list}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Lỗi lấy dữ liệu: {str(e)}")
    
@app.get("/advice/{user_id}")
async def get_advice(user_id: str):
    try:
        # 1. Lấy tối đa 3 lần check-in gần nhất từ Supabase
        response = supabase.table("checkins") \
            .select("mood, participation, subject, goal") \
            .eq("user_id", user_id) \
            .order("created_at", desc=True) \
            .limit(3) \
            .execute()
        
        data = response.data
        
        if not data:
            return {"advice": "Chào mừng bạn mới! Hãy check-in mỗi ngày để Cú Mèo hiểu bạn hơn và đưa ra những lời khuyên phù hợp nhé! 🦉✨"}

        # 2. Xử lý dữ liệu thô thành câu văn để "mớm" cho AI
        history_lines = []
        for item in data:
            # Chuyển đổi trạng thái cho AI dễ hiểu
            mood_text = {"kietsuc": "kiệt sức", "binhthuong": "bình thường", "trantre": "tràn trề năng lượng"}.get(item.get("mood"), "không rõ")
            part_text = {0: "im lặng", 1: "có tham gia", 2: "rất tích cực"}.get(item.get("participation"), "không rõ")
            
            line = f"- Học môn {item.get('subject')}, cảm xúc: {mood_text}, thái độ học: {part_text}, mục tiêu ngày mai: {item.get('goal')}"
            history_lines.append(line)
            
        history_text = "\n".join(history_lines)

        # 3. Prompt Engineering: Tiêm "nhân cách" cho AI
        system_prompt = """Bạn là Cú Mèo, một trợ lý học tập dễ thương, thấu hiểu tâm lý. 
        Dựa vào lịch sử check-in của học sinh, hãy đưa ra 1 lời khuyên ngắn gọn (tối đa 3 câu).
        - Nếu học sinh mệt, hãy an ủi.
        - Nếu học sinh tích cực, hãy khen ngợi.
        - Nhắc đến môn học hoặc mục tiêu của họ để tạo sự gần gũi.
        - Luôn xưng là "Cú Mèo" và gọi người dùng là "bạn". 
        - Kết thúc luôn có một emoji 🦉."""

        user_prompt = f"Đây là 3 lần check-in gần nhất của tôi:\n{history_text}\n\nHãy cho tôi lời khuyên ngay lúc này."

        # 4. Gọi API Groq (Sử dụng model Llama 3 vì nó cực nhanh và thông minh)
        chat_completion = groq_client.chat.completions.create(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            model="llama-3.1-8b-instant", # Bạn có thể đổi sang llama3-70b-8192 nếu muốn AI suy luận sâu hơn
            temperature=0.7,
            max_tokens=150,
        )

        # Trích xuất câu trả lời từ AI
        advice_text = chat_completion.choices[0].message.content

        return {"advice": advice_text}
        
    except Exception as e:
        print("Lỗi Groq:", str(e))
        # Backup nếu API lỗi để frontend không bị sập
        return {"advice": "Cú Mèo đang bận đi bắt chuột rồi, dữ liệu AI đang quá tải chút xíu! 🦉"}
    
@app.get("/streak/{user_id}")
async def get_streak(user_id: str):
    try:
        # 1. Lấy tất cả ngày check-in của user, sắp xếp mới nhất lên đầu
        response = supabase.table("checkins").select("created_at").eq("user_id", user_id).order("created_at", desc=True).execute()
        
        if not response.data:
            return {"streak": 0}

        # 2. Lọc ra danh sách các ngày duy nhất (vì 1 ngày có thể check-in nhiều môn)
        unique_dates = []
        for item in response.data:
            # Lấy 10 ký tự đầu (YYYY-MM-DD) và chuyển thành kiểu date
            date_str = item["created_at"][:10]
            date_obj = datetime.strptime(date_str, "%Y-%m-%d").date()
            if date_obj not in unique_dates:
                unique_dates.append(date_obj)

        if not unique_dates:
            return {"streak": 0}

        # 3. Thuật toán đếm Streak
        today = datetime.now(timezone.utc).date()
        streak = 0
        
        # Kiểm tra xem hôm nay hoặc hôm qua có check-in không
        # Nếu ngay cả hôm qua cũng không check-in -> Chuỗi đã đứt = 0
        if unique_dates[0] == today:
            streak = 1
            current_check_date = today
            start_idx = 1
        elif unique_dates[0] == today - timedelta(days=1):
            streak = 1
            current_check_date = unique_dates[0]
            start_idx = 1
        else:
            return {"streak": 0}

        # Lùi dần về quá khứ xem các ngày trước đó có liên tiếp không
        for i in range(start_idx, len(unique_dates)):
            if unique_dates[i] == current_check_date - timedelta(days=1):
                streak += 1
                current_check_date = unique_dates[i]
            else:
                break # Đứt chuỗi thì dừng đếm

        return {"streak": streak}

    except Exception as e:
        print("Lỗi tính streak:", str(e))
        return {"streak": 0}
    
@app.put("/goals/{goal_id}/toggle")
async def toggle_goal(goal_id: int):
    try:
        # 1. Lấy trạng thái hiện tại của mục tiêu này
        response = supabase.table("checkins").select("is_done").eq("id", goal_id).single().execute()
        current_status = response.data.get("is_done", False)
        
        # 2. Đảo ngược trạng thái (Đang False thành True, đang True thành False)
        new_status = not current_status
        
        # 3. Cập nhật lại vào Supabase
        supabase.table("checkins").update({"is_done": new_status}).eq("id", goal_id).execute()
        
        return {"message": "Đã cập nhật", "is_done": new_status}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Lỗi khi toggle mục tiêu: {str(e)}")
    
@app.get("/calendar/{user_id}")
async def get_calendar(user_id: str):
    try:
        # Lấy ngày hiện tại lùi lại 7 ngày
        seven_days_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
        
        # Lấy dữ liệu từ Supabase, lọc 7 ngày gần nhất
        response = supabase.table("checkins") \
            .select("created_at, subject, participation") \
            .eq("user_id", user_id) \
            .gte("created_at", seven_days_ago) \
            .order("created_at", desc=True) \
            .execute()

        calendar_data = []
        for item in response.data:
            # Cắt chuỗi lấy ngày (YYYY-MM-DD)
            date_str = item["created_at"][:10]
            calendar_data.append({
                "id": item.get("id", len(calendar_data)),
                "date": date_str,
                "subject": item["subject"],
                "participation": item["participation"]
            })
            
        return {"status": "success", "data": calendar_data}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Lỗi lấy lịch sử: {str(e)}")