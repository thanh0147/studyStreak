import { useState, useEffect } from 'react';
import axios from 'axios';
import { BookOpen, Target, Sparkles, Flame, Brain, CheckCircle2, Plus, X, Award, LogIn, UserPlus } from 'lucide-react';
import Confetti from 'react-confetti';

function App() {
  // ==========================================
  // STATE: NGƯỜI DÙNG & XÁC THỰC
  // ==========================================
  const [currentUser, setCurrentUser] = useState(null); // null = chưa đăng nhập
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [authForm, setAuthForm] = useState({ email: '', password: '', name: '' });

  // ==========================================
  // STATE: DASHBOARD & CHECK-IN
  // ==========================================
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [mood, setMood] = useState(null);
  const [subject, setSubject] = useState('Toán');
  const [participation, setParticipation] = useState(null);
  const [goal, setGoal] = useState('');
  const [calendar, setCalendar] = useState([]);

  // ==========================================
  // MOCK DATA (Dữ liệu giả)
  // ==========================================
  const mockStreak = 5; 
  const mockAdvice = "Cú Mèo thấy 3 ngày nay bạn đều 'Kiệt sức'. Đừng cố quá nhé! Hôm nay không cần đặt mục tiêu gì mới, học xong môn Toán thì đi ngủ sớm lúc 10h thôi. Mình luôn ở đây! 🦉";
  const mockBadges = [
    { id: 1, icon: '🦉', name: 'Cú Đêm', desc: 'Check-in sau 11h đêm', color: 'bg-purple-100 text-purple-600' },
    { id: 2, icon: '🔥', name: 'Chiến Thần Toán', desc: '5 ngày Tích cực môn Toán', color: 'bg-orange-100 text-orange-600' },
  ];
  // Khởi tạo mảng rỗng thay vì dữ liệu giả
  const [pastGoals, setPastGoals] = useState([]);
  const [advice, setAdvice] = useState("Cú Mèo đang phân tích dữ liệu của bạn...");
  const [streak, setStreak] = useState(0);
  // Hàm gọi API lấy mục tiêu
  const fetchAdvice = async (userId) => {
    try {
      const response = await axios.get(`http://localhost:8000/advice/${userId}`);
      setAdvice(response.data.advice);
    } catch (error) {
      console.error("Lỗi khi tải lời khuyên:", error);
      setAdvice("Cú Mèo đang bận đi bắt chuột rồi, bạn đợi chút nhé! 🦉");
    }
  };
  const fetchStreak = async (userId) => {
    try {
      const response = await axios.get(`http://localhost:8000/streak/${userId}`);
      setStreak(response.data.streak);
    } catch (error) {
      console.error("Lỗi khi tải streak:", error);
    }
  };
  const fetchCalendar = async (userId) => {
    try {
      const response = await axios.get(`http://localhost:8000/calendar/${userId}`);
      setCalendar(response.data.data);
    } catch (error) {
      console.error("Lỗi khi tải lịch sử:", error);
    }
  };
  const fetchGoals = async (userId) => {
    try {
      const response = await axios.get(`http://localhost:8000/goals/${userId}`);
      setPastGoals(response.data.data);
    } catch (error) {
      console.error("Lỗi khi tải mục tiêu:", error);
    }
  };

  // useEffect tự động chạy khi currentUser thay đổi (khi vừa đăng nhập xong)
  useEffect(() => {
    if (currentUser) {
      fetchGoals(currentUser.id);
      fetchAdvice(currentUser.id);
      fetchStreak(currentUser.id);
      fetchCalendar(currentUser.id);
    }
  }, [currentUser]);

  // ==========================================
  // HÀM XỬ LÝ (HANDLERS)
  // ==========================================
const handleAuthSubmit = async (e) => {
    e.preventDefault(); // Ngăn trình duyệt load lại trang khi bấm submit
    
    try {
      if (isLoginMode) {
        // 1. GỌI API ĐĂNG NHẬP
        const response = await axios.post('http://localhost:8000/login', {
          email: authForm.email,
          password: authForm.password
        });
        
        // Nhận dữ liệu trả về từ FastAPI và cho phép vào Dashboard
        setCurrentUser({
          id: response.data.user_id,
          name: response.data.name,
          email: response.data.email
        });
        
        alert("🎉 Đăng nhập thành công! Chào mừng " + response.data.name);

      } else {
        // 2. GỌI API ĐĂNG KÝ
        const response = await axios.post('http://localhost:8000/register', {
          name: authForm.name,
          email: authForm.email,
          password: authForm.password
        });
        
        // Đăng ký xong thì cho vào Dashboard luôn
        setCurrentUser({
          id: response.data.user_id,
          name: response.data.name,
          email: authForm.email
        });
        
        alert("🎉 Đăng ký thành công! Chào mừng " + response.data.name);
      }
    } catch (error) {
      // 3. XỬ LÝ LỖI (Bắt lỗi từ FastAPI gửi về)
      console.error("Lỗi xác thực:", error);
      if (error.response && error.response.data && error.response.data.detail) {
        alert("❌ Lỗi: " + error.response.data.detail);
      } else {
        alert("❌ Không thể kết nối đến máy chủ. Hãy chắc chắn Backend (FastAPI) đang chạy!");
      }
    }
  };

  const handleLogout = () => setCurrentUser(null);

  const getPetState = (streak) => {
    if (streak === 0) return { icon: "🥚", name: "Trứng Rồng (Đang ngủ)", bg: "bg-gray-100" };
    if (streak < 3) return { icon: "🦎", name: "Thằn Lằn Nhỏ", bg: "bg-green-100" };
    if (streak < 7) return { icon: "🦖", name: "Khủng Long Chiến", bg: "bg-blue-100" };
    return { icon: "🐉", name: "Thần Long Lửa", bg: "bg-red-100" };
  };
  const currentPet = getPetState(streak);

  const toggleGoal = async (id) => {
    // 1. Cập nhật UI ngay lập tức để người dùng thấy mượt mà (Optimistic UI)
    setPastGoals(pastGoals.map(g => g.id === id ? { ...g, done: !g.done } : g));

    // 2. Gọi API chạy ngầm để lưu xuống Database
    try {
      await axios.put(`http://localhost:8000/goals/${id}/toggle`);
    } catch (error) {
      console.error("Lỗi lưu trạng thái:", error);
      alert("❌ Có lỗi xảy ra khi lưu trạng thái mục tiêu!");
      // Nếu API lỗi, tải lại danh sách từ DB để đồng bộ lại trạng thái đúng
      if (currentUser) fetchGoals(currentUser.id);
    }
  };

  const handleCheckinSubmit = async () => {
    try {
      // Gọi API FastAPI và gửi kèm dữ liệu từ form
      await axios.post('http://localhost:8000/checkins', {
        user_id: currentUser.id, // Quan trọng: Lấy ID của người đang đăng nhập!
        subject: subject,
        mood: mood,
        participation: participation,
        goal: goal
      });

      // Nếu thành công thì đóng Modal, bắn pháo hoa
      setIsModalOpen(false);
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 5000);
      fetchGoals(currentUser.id);
      fetchAdvice(currentUser.id);
      fetchStreak(currentUser.id);
      fetchCalendar(currentUser.id);

      // Reset lại form cho lần check-in sau
      setMood(null);
      setParticipation(null);
      setGoal('');
      
    } catch (error) {
      console.error("Lỗi Check-in:", error);
      alert("❌ Không thể lưu Check-in. Hãy kiểm tra lại Backend!");
    }
  };

  // ==========================================
  // MÀN HÌNH 1: ĐĂNG NHẬP / ĐĂNG KÝ
  // ==========================================
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#f3f4f6] flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-xl w-full max-w-md p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-100 rounded-bl-full -z-0 opacity-50"></div>
          
          <div className="text-center mb-8 relative z-10">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-500 text-white rounded-2xl mb-4 shadow-lg">
              <Sparkles className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-black text-gray-800">StudyStreak</h1>
            <p className="text-gray-500 text-sm mt-1">Người bạn đồng hành học tập của bạn</p>
          </div>

          <form onSubmit={handleAuthSubmit} className="space-y-4 relative z-10">
            {!isLoginMode && (
              <div>
                <label className="text-sm font-bold text-gray-700 block mb-1">Tên gọi của bạn</label>
                <input required type="text" value={authForm.name} onChange={(e) => setAuthForm({...authForm, name: e.target.value})} className="w-full p-3 rounded-xl border-2 border-gray-100 focus:border-blue-500 outline-none" placeholder="VD: Mèo Lười" />
              </div>
            )}
            <div>
              <label className="text-sm font-bold text-gray-700 block mb-1">Email</label>
              <input required type="email" value={authForm.email} onChange={(e) => setAuthForm({...authForm, email: e.target.value})} className="w-full p-3 rounded-xl border-2 border-gray-100 focus:border-blue-500 outline-none" placeholder="hocsinh@example.com" />
            </div>
            <div>
              <label className="text-sm font-bold text-gray-700 block mb-1">Mật khẩu</label>
              <input required type="password" value={authForm.password} onChange={(e) => setAuthForm({...authForm, password: e.target.value})} className="w-full p-3 rounded-xl border-2 border-gray-100 focus:border-blue-500 outline-none" placeholder="••••••••" />
            </div>

            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl shadow-md transition-transform transform active:scale-95 flex justify-center items-center gap-2 mt-6">
              {isLoginMode ? <><LogIn className="w-5 h-5"/> Bắt đầu ngay</> : <><UserPlus className="w-5 h-5"/> Tạo tài khoản</>}
            </button>
          </form>

          <div className="mt-6 text-center text-sm relative z-10">
            <span className="text-gray-500">{isLoginMode ? "Chưa có tài khoản?" : "Đã có tài khoản?"} </span>
            <button type="button" onClick={() => setIsLoginMode(!isLoginMode)} className="text-blue-600 font-bold hover:underline">
              {isLoginMode ? "Đăng ký tại đây" : "Đăng nhập ngay"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // MÀN HÌNH 2: DASHBOARD
  // ==========================================
  return (
    <div className="min-h-screen bg-[#f3f4f6] text-gray-800 font-sans pb-12">
      {showConfetti && <Confetti width={window.innerWidth} height={window.innerHeight} recycle={false} numberOfPieces={600} style={{ zIndex: 100 }} />}

      <header className="bg-white shadow-sm pt-8 pb-6 px-6 mb-8">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Chào, {currentUser.name}! 🚀</h1>
            <p className="text-gray-500 mt-1">Sẵn sàng để nuôi lớn Rồng con của bạn chưa?</p>
          </div>
          
          <div className="flex gap-3">
            <button onClick={handleLogout} className="px-4 py-3 rounded-2xl font-bold text-gray-500 hover:bg-gray-100 transition-colors">
              Đăng xuất
            </button>
            <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-bold text-lg shadow-lg shadow-blue-200 transition-all transform hover:-translate-y-1 active:scale-95 flex items-center gap-2">
              <Plus className="w-6 h-6" /> Check-in
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center text-center relative overflow-hidden">
            <div className="absolute top-4 right-4 flex items-center gap-1 bg-orange-100 text-orange-600 px-3 py-1 rounded-full text-sm font-bold">
              <Flame className="w-4 h-4" /> {streak} ngày
            </div>
            <h2 className="text-gray-500 font-semibold mb-4 w-full text-left">Người bạn đồng hành</h2>
            <div className={`w-28 h-28 rounded-full flex items-center justify-center text-6xl shadow-inner mb-4 transition-all ${currentPet.bg}`}>
              {currentPet.icon}
            </div>
            <h3 className="text-xl font-bold text-gray-800">{currentPet.name}</h3>
            <p className="text-sm text-gray-400 mt-1">Giữ chuỗi check-in để thú cưng mau lớn nhé!</p>
          </div>
{/* Widget 2: Góc nhìn của Cú (Lời khuyên Tâm lý) */}
          <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-6 rounded-3xl shadow-md text-white flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Brain className="w-6 h-6 text-indigo-200" />
                <h2 className="font-bold text-lg text-indigo-50">Cú Mèo nhắn gửi</h2>
              </div>
              <p className="text-indigo-100 leading-relaxed text-sm italic">
                "{advice}" {/* <--- Thay mockAdvice thành advice ở đây */}
              </p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-4">
              <Target className="w-6 h-6 text-red-500" />
              <h2 className="font-bold text-lg text-gray-700">Sổ tay Hành trình</h2>
            </div>
            <div className="space-y-3">
              {pastGoals.map((g) => (
                <div key={g.id} onClick={() => toggleGoal(g.id)} className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer hover:shadow-md ${g.done ? 'bg-green-50/50 border-green-200' : 'bg-gray-50 border-gray-100'}`}>
                  <button className="mt-0.5 transition-transform transform hover:scale-110 active:scale-90">
                    <CheckCircle2 className={`w-6 h-6 ${g.done ? 'text-green-500' : 'text-gray-300'}`} />
                  </button>
                  <div>
                    <p className={`text-sm font-medium transition-all ${g.done ? 'text-gray-400 line-through' : 'text-gray-700'}`}>{g.text}</p>
                    <p className="text-xs text-gray-400 mt-1">{g.date}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-6">
            <Award className="w-6 h-6 text-yellow-500" />
            <h2 className="font-bold text-lg text-gray-700">Bộ sưu tập Huy hiệu Bí ẩn</h2>
          </div>
          <div className="flex flex-wrap gap-4">
            {mockBadges.map(badge => (
              <div key={badge.id} className={`flex items-center gap-3 px-4 py-3 rounded-2xl ${badge.color} bg-opacity-20 border border-current/10`}>
                <span className="text-3xl drop-shadow-sm">{badge.icon}</span>
                <div>
                  <h3 className="font-bold text-sm">{badge.name}</h3>
                  <p className="text-xs opacity-80">{badge.desc}</p>
                </div>
              </div>
            ))}
            <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-gray-100 border border-gray-200 border-dashed text-gray-400">
              <span className="text-3xl opacity-50">🔒</span>
              <div>
                <h3 className="font-bold text-sm">???</h3>
                <p className="text-xs">Tiếp tục khám phá nhé</p>
              </div>
            </div>
          </div>
        </div>
      </main>
      {/* WIDGET: MINI CALENDAR (LỊCH SỬ TÍCH CỰC) */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-6">
            <span className="text-2xl">📅</span>
            <h2 className="font-bold text-lg text-gray-700">Phong độ 7 ngày qua</h2>
          </div>
          
          {calendar.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-4">Chưa có buổi học nào gần đây. Hãy check-in nhé!</p>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-2 custom-scrollbar">
              {calendar.map((item, index) => {
                // Định dạng hiển thị dựa trên mức độ tích cực
                let statusInfo = { icon: "😶", color: "bg-gray-50 border-gray-200 text-gray-500", label: "Im lặng" };
                if (item.participation === 1) statusInfo = { icon: "🙋‍♂️", color: "bg-green-50 border-green-200 text-green-600", label: "Tham gia" };
                if (item.participation === 2) statusInfo = { icon: "🔥", color: "bg-orange-50 border-orange-200 text-orange-600", label: "Tích cực" };

                // Chuyển format ngày (từ YYYY-MM-DD sang DD/MM)
                const dateParts = item.date.split("-");
                const shortDate = `${dateParts[2]}/${dateParts[1]}`;

                return (
                  <div key={`${item.date}-${index}`} className={`min-w-[100px] flex-shrink-0 p-3 rounded-2xl border ${statusInfo.color} flex flex-col items-center gap-2 transition-transform hover:scale-105`}>
                    <p className="text-xs font-bold opacity-70">{shortDate}</p>
                    <span className="text-2xl drop-shadow-sm">{statusInfo.icon}</span>
                    <h3 className="font-bold text-sm">{item.subject}</h3>
                    <p className="text-[10px] uppercase font-bold opacity-80">{statusInfo.label}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      {/* MODAL CHECK-IN */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-opacity">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden relative animate-in fade-in zoom-in duration-200">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-white hover:text-gray-200 bg-black/20 rounded-full p-1 transition-colors">
              <X className="w-5 h-5" />
            </button>
            <div className="bg-blue-500 p-6 text-white text-center">
              <h1 className="text-2xl font-bold flex items-center justify-center gap-2">
                <Sparkles className="w-6 h-6" /> Check-in Hôm Nay
              </h1>
            </div>
            <div className="p-6 space-y-7 max-h-[75vh] overflow-y-auto">
              <div>
                <label className="text-gray-700 font-semibold mb-3 block text-center">Năng lượng hôm nay của bạn thế nào?</label>
                <div className="flex justify-center gap-4">
                  <button onClick={() => setMood('kietsuc')} className={`text-4xl transition-transform ${mood === 'kietsuc' ? 'scale-125 filter drop-shadow-md' : 'opacity-50 hover:opacity-100 hover:scale-110'}`}>😩</button>
                  <button onClick={() => setMood('binhthuong')} className={`text-4xl transition-transform ${mood === 'binhthuong' ? 'scale-125 filter drop-shadow-md' : 'opacity-50 hover:opacity-100 hover:scale-110'}`}>😌</button>
                  <button onClick={() => setMood('trantre')} className={`text-4xl transition-transform ${mood === 'trantre' ? 'scale-125 filter drop-shadow-md' : 'opacity-50 hover:opacity-100 hover:scale-110'}`}>🤩</button>
                </div>
              </div>
              <hr className="border-gray-100" />
              <div>
                <label className="flex items-center gap-2 text-gray-700 font-semibold mb-3">
                  <BookOpen className="w-5 h-5 text-blue-500" /> Bạn vừa học môn gì?
                </label>
                <div className="flex gap-2">
                  {['Toán', 'Văn', 'Anh'].map((mon) => (
                    <button key={mon} onClick={() => setSubject(mon)} className={`flex-1 py-2 rounded-xl font-bold text-sm transition-all ${subject === mon ? 'bg-blue-100 text-blue-600 border-2 border-blue-500' : 'bg-gray-50 text-gray-500 border-2 border-transparent hover:bg-gray-100'}`}>{mon}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-gray-700 font-semibold mb-3 block">Mức độ tham gia?</label>
                <div className="grid grid-cols-3 gap-3">
                  <button onClick={() => setParticipation(0)} className={`p-3 rounded-2xl border-2 flex flex-col items-center gap-1 transition-all ${participation === 0 ? 'border-gray-500 bg-gray-50 scale-105' : 'border-gray-100 hover:border-gray-300'}`}>
                    <span className="text-2xl">😶</span><span className="text-[10px] font-bold text-gray-500 uppercase">Im lặng</span>
                  </button>
                  <button onClick={() => setParticipation(1)} className={`p-3 rounded-2xl border-2 flex flex-col items-center gap-1 transition-all ${participation === 1 ? 'border-green-500 bg-green-50 scale-105' : 'border-gray-100 hover:border-green-300'}`}>
                    <span className="text-2xl">🙋‍♂️</span><span className="text-[10px] font-bold text-green-600 uppercase">Tham gia</span>
                  </button>
                  <button onClick={() => setParticipation(2)} className={`p-3 rounded-2xl border-2 flex flex-col items-center gap-1 transition-all ${participation === 2 ? 'border-orange-500 bg-orange-50 scale-105' : 'border-gray-100 hover:border-orange-300'}`}>
                    <span className="text-2xl">🔥</span><span className="text-[10px] font-bold text-orange-600 uppercase">Tích cực</span>
                  </button>
                </div>
              </div>
              <div>
                <label className="flex items-center gap-2 text-gray-700 font-semibold mb-3">
                  <Target className="w-5 h-5 text-red-500" /> Mục tiêu cho ngày mai
                </label>
                <input type="text" value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="VD: Giơ tay 1 lần..." className="w-full p-3 rounded-xl border-2 border-gray-100 focus:border-blue-500 focus:ring-0 outline-none text-sm" />
              </div>
              <button 
                onClick={handleCheckinSubmit} disabled={participation === null || mood === null}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-200 transition-all transform hover:-translate-y-1 active:scale-95 flex justify-center items-center"
              >
                Gửi Check-in & Nuôi Rồng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;