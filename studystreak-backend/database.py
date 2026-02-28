import os
from dotenv import load_dotenv
from supabase import create_client, Client

# Load các biến từ file .env
load_dotenv()

URL: str = os.environ.get("SUPABASE_URL")
KEY: str = os.environ.get("SUPABASE_KEY")

# Khởi tạo client kết nối với Supabase
supabase: Client = create_client(URL, KEY)