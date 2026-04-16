/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Activity, 
  FlaskConical, 
  ShieldCheck, 
  Navigation, 
  Leaf, 
  BadgeCheck, 
  Package, 
  ArrowRight, 
  Moon, 
  Zap, 
  Apple, 
  Eye, 
  Dumbbell, 
  Heart, 
  ShoppingCart, 
  CheckCircle2,
  Map,
  Bell,
  LogOut,
  User,
  Pill,
  Trash2,
  Download,
  MessageCircle,
  X,
  Send
} from 'lucide-react';
import { collection, addDoc, serverTimestamp, getDocs, query, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { signInWithPopup, signOut, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { db, auth, googleProvider } from './firebase';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string;
    email?: string | null;
    emailVerified?: boolean;
    isAnonymous?: boolean;
    tenantId?: string | null;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

function AdminDashboard() {
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const regSnapshot = await getDocs(query(collection(db, 'registrations'), orderBy('createdAt', 'desc')));
        const recSnapshot = await getDocs(query(collection(db, 'restaurant_recommendations'), orderBy('createdAt', 'desc')));
        
        setRegistrations(regSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setRecommendations(recSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
        console.error("Error fetching admin data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleDeleteRegistration = async (id: string) => {
    if (window.confirm('정말 삭제하시겠습니까?')) {
      try {
        await deleteDoc(doc(db, 'registrations', id));
        setRegistrations(prev => prev.filter(item => item.id !== id));
      } catch (error) {
        console.error("Error deleting registration:", error);
        alert('삭제 중 오류가 발생했습니다.');
      }
    }
  };

  const handleDeleteRecommendation = async (id: string) => {
    if (window.confirm('정말 삭제하시겠습니까?')) {
      try {
        await deleteDoc(doc(db, 'restaurant_recommendations', id));
        setRecommendations(prev => prev.filter(item => item.id !== id));
      } catch (error) {
        console.error("Error deleting recommendation:", error);
        alert('삭제 중 오류가 발생했습니다.');
      }
    }
  };

  const downloadCSV = (data: any[], filename: string, type: 'registration' | 'recommendation') => {
    if (data.length === 0) return;
    
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF"; // Add BOM for Korean characters
    
    if (type === 'registration') {
      csvContent += "이름,지역,연락처,신청일시\n";
      data.forEach(item => {
        const date = item.createdAt ? new Date(item.createdAt.seconds * 1000).toLocaleString('ko-KR') : '';
        csvContent += `"${item.name}","${item.location}","${item.contact}","${date}"\n`;
      });
    } else {
      csvContent += "식당명,위치,연락처,추천일시\n";
      data.forEach(item => {
        const date = item.createdAt ? new Date(item.createdAt.seconds * 1000).toLocaleString('ko-KR') : '';
        csvContent += `"${item.restaurantName}","${item.restaurantLocation}","${item.contact}","${date}"\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return <div className="pt-32 pb-20 text-center text-on-surface-variant">데이터를 불러오는 중입니다...</div>;
  }

  return (
    <div className="pt-32 pb-20 max-w-7xl mx-auto px-8">
      <h2 className="text-3xl font-headline font-extrabold text-primary mb-8">관리자 대시보드</h2>
      
      <div className="grid md:grid-cols-2 gap-8">
        {/* 알림 신청 내역 */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-outline-variant/20">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-primary flex items-center gap-2">
              <Bell className="w-5 h-5 text-secondary" />
              사전 알림 신청 내역 ({registrations.length})
            </h3>
            <button 
              onClick={() => downloadCSV(registrations, '사전알림신청내역', 'registration')}
              className="flex items-center gap-1 text-xs font-bold bg-surface-container-highest text-primary px-3 py-1.5 rounded-lg hover:bg-surface-container-highest/80 transition-colors"
            >
              <Download className="w-4 h-4" /> 엑셀 다운로드
            </button>
          </div>
          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
            {registrations.length === 0 ? (
              <p className="text-on-surface-variant text-sm">신청 내역이 없습니다.</p>
            ) : (
              registrations.map(reg => (
                <div key={reg.id} className="p-4 bg-surface-container-lowest rounded-2xl border border-outline-variant/10 relative group">
                  <button 
                    onClick={() => handleDeleteRegistration(reg.id)}
                    className="absolute top-4 right-4 text-outline hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                    title="삭제"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <div className="font-bold text-primary">{reg.name}</div>
                  <div className="text-sm text-on-surface-variant mt-1">지역: {reg.location}</div>
                  <div className="text-sm text-on-surface-variant">연락처: {reg.contact}</div>
                  {reg.createdAt && (
                    <div className="text-xs text-outline mt-2">
                      {new Date(reg.createdAt.seconds * 1000).toLocaleString('ko-KR')}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* 식당 추천 내역 */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-outline-variant/20">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-primary flex items-center gap-2">
              <Map className="w-5 h-5 text-secondary" />
              식당 추천 내역 ({recommendations.length})
            </h3>
            <button 
              onClick={() => downloadCSV(recommendations, '식당추천내역', 'recommendation')}
              className="flex items-center gap-1 text-xs font-bold bg-surface-container-highest text-primary px-3 py-1.5 rounded-lg hover:bg-surface-container-highest/80 transition-colors"
            >
              <Download className="w-4 h-4" /> 엑셀 다운로드
            </button>
          </div>
          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
            {recommendations.length === 0 ? (
              <p className="text-on-surface-variant text-sm">추천 내역이 없습니다.</p>
            ) : (
              recommendations.map(rec => (
                <div key={rec.id} className="p-4 bg-surface-container-lowest rounded-2xl border border-outline-variant/10 relative group">
                  <button 
                    onClick={() => handleDeleteRecommendation(rec.id)}
                    className="absolute top-4 right-4 text-outline hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                    title="삭제"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <div className="font-bold text-primary">{rec.restaurantName}</div>
                  <div className="text-sm text-on-surface-variant mt-1">위치: {rec.restaurantLocation}</div>
                  <div className="text-sm text-on-surface-variant">연락처: {rec.contact}</div>
                  {rec.createdAt && (
                    <div className="text-xs text-outline mt-2">
                      {new Date(rec.createdAt.seconds * 1000).toLocaleString('ko-KR')}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

import { GoogleGenAI } from '@google/genai';
import Markdown from 'react-markdown';

function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'model', content: string }[]>([
    { role: 'model', content: '안녕하세요! 밀접 서비스에 대해 궁금한 점이 있으신가요? 무엇이든 물어보세요.' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY });

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const systemInstruction = `
        당신은 '밀접(Mealjeop)' 서비스의 친절하고 전문적인 고객 지원 챗봇입니다.
        
        [서비스 소개]
        - 밀접은 식당, 편의점, 구내식당 등에서 식사 후 바로 나에게 맞는 맞춤형 영양제를 즉석에서 조제해주는 키오스크 서비스입니다.
        - 사놓고 안 먹는 영양제나 늘 챙겨다녀야 하는 개별 포장 영양제의 불편함을 해소합니다.
        
        [가격 정보]
        - 1회분 맞춤 조제 기본 가격은 250원이며, 선택하는 영양 성분(수면, 활력, 소화 등) 1개당 300원이 추가됩니다.
        - 예: 성분 1개 선택 시 550원, 2개 선택 시 850원, 3개 선택 시 1,150원.
        
        [이벤트 및 혜택]
        - 사전 알림 신청: 내 주변에 밀접 키오스크가 생기면 알려주는 알림을 신청하면, 해당 지역 서비스 개시 후 '3일치 맞춤 영양제 이용권'을 제공합니다.
        - 식당 추천: 밀접 키오스크 설치를 원하는 식당을 추천해주시면, 추첨을 통해 '1주일치 맞춤 영양제 이용권'을 드립니다.
        
        [답변 가이드라인]
        - 항상 친절하고 공손한 한국어(존댓말)로 답변하세요.
        - 질문에 대해 명확하고 간결하게 답변하세요.
        - 서비스와 관련 없는 질문에는 "죄송하지만 밀접 서비스와 관련된 질문에만 답변해 드릴 수 있습니다."라고 정중히 거절하세요.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          ...messages.map(m => ({ role: m.role, parts: [{ text: m.content }] })),
          { role: 'user', parts: [{ text: userMessage }] }
        ],
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.7,
        }
      });

      if (response.text) {
        setMessages(prev => [...prev, { role: 'model', content: response.text }]);
      }
    } catch (error) {
      console.error("Chatbot error:", error);
      setMessages(prev => [...prev, { role: 'model', content: '죄송합니다. 일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 w-14 h-14 bg-primary text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-transform z-50 ${isOpen ? 'hidden' : 'flex'}`}
      >
        <MessageCircle className="w-7 h-7" />
      </button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 right-6 w-[350px] sm:w-[400px] h-[500px] bg-white rounded-3xl shadow-2xl border border-outline-variant/20 flex flex-col z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="bg-primary text-white p-4 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5" />
                <span className="font-bold">밀접 고객센터</span>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-white/80 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 p-4 overflow-y-auto bg-surface-container-lowest flex flex-col gap-4">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div 
                    className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                      msg.role === 'user' 
                        ? 'bg-secondary text-white rounded-tr-sm' 
                        : 'bg-surface-container-low text-on-surface border border-outline-variant/20 rounded-tl-sm'
                    }`}
                  >
                    {msg.role === 'model' ? (
                      <div className="markdown-body prose prose-sm max-w-none prose-p:leading-relaxed prose-p:m-0">
                        <Markdown>{msg.content}</Markdown>
                      </div>
                    ) : (
                      msg.content
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-surface-container-low text-on-surface border border-outline-variant/20 p-3 rounded-2xl rounded-tl-sm text-sm flex gap-1 items-center">
                    <div className="w-2 h-2 bg-outline rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-outline rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-outline rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="p-4 bg-white border-t border-outline-variant/20">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="궁금한 점을 입력해주세요..."
                  className="flex-1 bg-surface-container-low px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-secondary/30"
                />
                <button 
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className="bg-primary text-white p-2.5 rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default function App() {
  const [quizStep, setQuizStep] = useState(1);
  const [gender, setGender] = useState<string | null>(null);
  const [concerns, setConcerns] = useState<string[]>([]);
  const [isRegistered, setIsRegistered] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRestaurantRegistered, setIsRestaurantRegistered] = useState(false);
  const [isRestaurantSubmitting, setIsRestaurantSubmitting] = useState(false);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);

  const isAdmin = user?.email === 'zealdream@gmail.com';

  const [formData, setFormData] = useState({
    name: '',
    location: '',
    contact: ''
  });

  const [restaurantFormData, setRestaurantFormData] = useState({
    restaurantName: '',
    restaurantLocation: '',
    contact: ''
  });

  const toggleConcern = (concern: string) => {
    setConcerns(prev => {
      if (prev.includes(concern)) {
        return prev.filter(c => c !== concern);
      }
      if (prev.length < 3) {
        return [...prev, concern];
      }
      return prev;
    });
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setFormData(prev => ({
          ...prev,
          name: currentUser.displayName || prev.name
        }));
      }
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleRestaurantInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setRestaurantFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const path = 'registrations';
      await addDoc(collection(db, path), {
        name: formData.name,
        location: formData.location,
        contact: formData.contact,
        userId: user?.uid || null,
        createdAt: serverTimestamp()
      });
      setIsRegistered(true);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'registrations');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRestaurantSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsRestaurantSubmitting(true);
    
    try {
      await addDoc(collection(db, 'restaurant_recommendations'), {
        ...restaurantFormData,
        createdAt: serverTimestamp(),
        userId: user?.uid || 'anonymous'
      });
      setIsRestaurantRegistered(true);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'restaurant_recommendations');
    } finally {
      setIsRestaurantSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50/60 to-white font-body text-on-surface selection:bg-secondary-container selection:text-on-secondary-container">
      {/* TopNavBar */}
      <header className="fixed top-0 w-full z-50 glass-effect shadow-[0_8px_32px_rgba(26,54,93,0.04)]">
        <nav className="flex justify-between items-center w-full px-6 py-4 max-w-7xl mx-auto">
          <div className="text-2xl font-headline font-black text-primary tracking-tight">밀접</div>
          <div className="hidden md:flex items-center gap-10">
            <a className="text-slate-600 hover:text-primary transition-colors font-label text-sm font-medium leading-relaxed" href="#service">Service</a>
            <a className="text-slate-600 hover:text-primary transition-colors font-label text-sm font-medium leading-relaxed" href="#values">Values</a>
            <a className="text-primary font-bold border-b-2 border-secondary pb-1 font-label text-sm leading-relaxed" href="#quiz-section">Analyze</a>
            <a className="text-slate-600 hover:text-primary transition-colors font-label text-sm font-medium leading-relaxed" href="#pre-register">Kiosk Alert</a>
          </div>
          <div className="flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-3">
                {isAdmin && (
                  <button 
                    onClick={() => setShowAdminDashboard(!showAdminDashboard)}
                    className="text-xs font-bold bg-primary text-white px-3 py-1.5 rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    {showAdminDashboard ? '홈으로' : '관리자 대시보드'}
                  </button>
                )}
                <span className="text-sm font-medium text-slate-600 hidden sm:block">{user.displayName}님</span>
                <button onClick={handleLogout} className="text-slate-500 hover:text-primary transition-colors" title="로그아웃">
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <button onClick={handleLogin} className="text-slate-600 hover:text-primary transition-colors font-label text-sm font-medium flex items-center gap-1">
                <User className="w-4 h-4" /> 로그인
              </button>
            )}
            <a className="signature-gradient text-white px-6 py-2.5 rounded-2xl font-bold text-sm tracking-tight hover:opacity-90 active:scale-95 transition-all duration-300 hidden sm:block" href="#pre-register">
              설치 알림 신청
            </a>
          </div>
        </nav>
      </header>

      <main>
        {showAdminDashboard && isAdmin ? (
          <AdminDashboard />
        ) : (
          <>
            {/* Hero Section */}
            <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
          <div className="max-w-7xl mx-auto px-8 relative z-10 grid md:grid-cols-2 gap-16 items-center">
            <motion.div 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-50px" }}
              variants={{
                hidden: {},
                visible: { transition: { staggerChildren: 0.15 } }
              }}
              className="space-y-8"
            >
              <motion.div 
                variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } } }}
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-secondary-container text-on-secondary-container text-xs font-bold uppercase tracking-wider"
              >
                Next-Gen Health Tech
              </motion.div>
              <motion.h1 
                variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } } }}
                className="font-headline font-extrabold text-primary tracking-tighter leading-[1.3] keep-all"
              >
                <span className="block text-[11px] sm:text-sm md:text-base lg:text-lg text-on-surface-variant mb-3 font-semibold tracking-tight whitespace-nowrap">사놓고 안 먹는 영양제, 늘 챙겨다녀야 하는 개별 포장 영양제는 이제 그만!</span>
                <span className="block text-xl sm:text-2xl md:text-3xl lg:text-[2.2rem] xl:text-[2.5rem] leading-[1.2] whitespace-nowrap">식당에서 <span className="text-secondary">‘즉석 맞춤 제조’</span>해서 드세요.</span>
              </motion.h1>
              <motion.p 
                variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } } }}
                className="text-base md:text-lg text-on-surface-variant leading-relaxed max-w-lg keep-all"
              >
                식당, 편의점, 구내식당 등 식사가 있는 어느 곳이든,<br className="hidden md:block"/> <strong className="text-secondary font-bold">밀접 키오스크</strong>가 설치된 곳에서 식사 후 언제나<br className="hidden md:block"/> 나에게 딱 맞는 맞춤형 영양제를 가장 신선하고 안전하게 만나보세요.
              </motion.p>
              <motion.div 
                variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } } }}
                className="flex flex-col sm:flex-row gap-3 pt-6 w-full max-w-lg"
              >
                <a className="signature-gradient text-white px-6 py-4 rounded-2xl font-bold text-lg shadow-[0_20px_40px_rgba(26,54,93,0.15)] hover:scale-[1.02] transition-all flex items-center justify-center gap-2 flex-1" href="#quiz-section">
                  맞춤 분석 시작하기
                  <Activity className="w-5 h-5" />
                </a>
                <a className="bg-surface-container-highest text-primary px-6 py-4 rounded-2xl font-bold text-lg hover:bg-surface-container-highest/80 transition-all flex items-center justify-center gap-2 flex-1" href="#restaurant-recommend">
                  식당 추천하기
                  <Map className="w-5 h-5" />
                </a>
              </motion.div>
            </motion.div>
            <div className="relative">
              <div className="absolute -top-12 -right-12 w-64 h-64 bg-secondary/10 rounded-full blur-3xl"></div>
              <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-primary/5 rounded-full blur-3xl"></div>
              <motion.div 
                initial={{ opacity: 0, x: 30, rotate: 4 }}
                whileInView={{ opacity: 1, x: 0, rotate: 1 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 }}
                className="image-frame rounded-3xl hover:rotate-0 transition-transform duration-700"
              >
                <img 
                  alt="식당 키오스크에서 밀접(Mealjeop) 스마트 맞춤 조제 영양제를 꺼내 든 모습" 
                  className="w-full h-full object-cover rounded-2xl aspect-[1.8/1] md:aspect-[1.5/1]" 
                  src="/hero_image_v2.png"
                  referrerPolicy="no-referrer"
                />
              </motion.div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-24" id="service">
          <div className="max-w-7xl mx-auto px-8">
            <div className="mb-16">
              <h2 className="text-3xl md:text-5xl font-headline font-extrabold text-primary tracking-tighter mb-4">Precision Wellness</h2>
              <p className="text-on-surface-variant max-w-2xl font-body keep-all">과학적 정밀함과 일상의 미학을 결합한 밀접만의 혁신적인 경험입니다.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              {/* Feature 1 */}
              <div className="group bg-white/80 backdrop-blur-sm p-10 rounded-3xl hover:bg-white hover:shadow-[0_12px_48px_rgba(26,54,93,0.08)] transition-all duration-500 flex flex-col items-start gap-8 border border-transparent hover:border-outline-variant/15">
                <div className="w-16 h-16 rounded-2xl bg-primary-fixed flex items-center justify-center text-primary">
                  <FlaskConical className="w-8 h-8" />
                </div>
                <div className="space-y-4">
                  <h3 className="text-2xl font-headline font-bold text-primary keep-all">맞춤형 영양 설계</h3>
                  <p className="text-on-surface-variant leading-relaxed keep-all">
                    빅데이터 기반의 알고리즘이 당신의 라이프스타일과 생체 데이터를 분석하여 내 몸에 꼭 필요한 성분만 큐레이션합니다.
                  </p>
                  <div className="pt-2">
                    <span className="inline-flex items-center gap-1 text-secondary font-bold text-sm">
                      Personalized Curation <ArrowRight className="w-4 h-4" />
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Feature 2 */}
              <div className="group bg-white/80 backdrop-blur-sm p-10 rounded-3xl hover:bg-white hover:shadow-[0_12px_48px_rgba(26,54,93,0.08)] transition-all duration-500 flex flex-col items-start gap-8 border border-transparent hover:border-outline-variant/15">
                <div className="w-16 h-16 rounded-2xl bg-secondary-container/30 flex items-center justify-center text-secondary">
                  <ShieldCheck className="w-8 h-8" />
                </div>
                <div className="space-y-4">
                  <h3 className="text-2xl font-headline font-bold text-primary keep-all">타협 없는 위생과 안전</h3>
                  <p className="text-on-surface-variant leading-relaxed keep-all">
                    제약 수준의 개별 진공 포장 시스템을 도입하여 가장 깨끗한 상태 그대로, 변질 걱정 없는 안전함을 제공합니다.
                  </p>
                  <div className="pt-2">
                    <span className="inline-flex items-center gap-1 text-secondary font-bold text-sm">
                      Clinical Hygiene <ArrowRight className="w-4 h-4" />
                    </span>
                  </div>
                </div>
              </div>

              {/* Feature 3 */}
              <div className="group bg-white/80 backdrop-blur-sm p-10 rounded-3xl hover:bg-white hover:shadow-[0_12px_48px_rgba(26,54,93,0.08)] transition-all duration-500 flex flex-col items-start gap-8 border border-transparent hover:border-outline-variant/15">
                <div className="w-16 h-16 rounded-2xl bg-tertiary-fixed flex items-center justify-center text-primary">
                  <Navigation className="w-8 h-8" />
                </div>
                <div className="space-y-4">
                  <h3 className="text-2xl font-headline font-bold text-primary keep-all">끊김 없는 O2O 경험</h3>
                  <p className="text-on-surface-variant leading-relaxed keep-all">
                    앱에서 분석하고 근거리 제휴 식당과 호텔에서 즉시 픽업하는 스마트 매니지먼트. 일상과 영양을 하나로 연결합니다.
                  </p>
                  <div className="pt-2">
                    <span className="inline-flex items-center gap-1 text-secondary font-bold text-sm">
                      Instant Pickup <ArrowRight className="w-4 h-4" />
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Values */}
        <section className="py-24 relative" id="values">
          {/* Subtle background decoration for values section */}
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
            <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-100/40 rounded-full blur-3xl"></div>
            <div className="absolute top-40 -left-40 w-96 h-96 bg-slate-200/40 rounded-full blur-3xl"></div>
          </div>
          <div className="max-w-7xl mx-auto px-8">
            <div className="mb-16 md:text-center">
              <h2 className="text-3xl md:text-5xl font-headline font-extrabold text-primary tracking-tighter mb-4">Core Values</h2>
              <p className="text-on-surface-variant max-w-2xl md:mx-auto font-body keep-all text-lg">밀접이 추구하는 네 가지 핵심 가치입니다.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
              {/* Value 1 */}
              <div className="group bg-white p-10 md:p-12 rounded-[2rem] hover:shadow-[0_24px_64px_rgba(26,54,93,0.08)] transition-all duration-500 flex flex-col gap-8 border border-outline-variant/20 relative overflow-hidden min-h-[320px]">
                <img 
                  src="https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=800" 
                  alt="Space & Vitality" 
                  className="absolute inset-0 w-full h-full object-cover opacity-[0.06] group-hover:opacity-[0.12] group-hover:scale-105 transition-all duration-1000 grayscale" 
                  referrerPolicy="no-referrer" 
                />
                <div className="absolute inset-0 bg-gradient-to-br from-white/80 via-white/20 to-transparent"></div>
                
                <div className="relative z-10 w-16 h-16 rounded-2xl bg-surface-container-low flex items-center justify-center text-primary group-hover:scale-110 group-hover:bg-primary group-hover:text-white transition-all duration-500 shadow-sm">
                  <Map className="w-8 h-8" />
                </div>
                <div className="relative z-10 space-y-4 mt-auto">
                  <h3 className="text-2xl md:text-3xl font-headline font-bold text-primary tracking-tight keep-all">Space & Vitality</h3>
                  <p className="text-on-surface-variant text-lg leading-relaxed keep-all">우리는 당신이 식사하는 모든 공간이 건강의 거점이 되는 미래를 만듭니다.</p>
                </div>
              </div>
              
              {/* Value 2 */}
              <div className="group bg-white p-10 md:p-12 rounded-[2rem] hover:shadow-[0_24px_64px_rgba(26,54,93,0.08)] transition-all duration-500 flex flex-col gap-8 border border-outline-variant/20 relative overflow-hidden min-h-[320px]">
                <img 
                  src="https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&q=80&w=800" 
                  alt="Pure Identity" 
                  className="absolute inset-0 w-full h-full object-cover opacity-[0.06] group-hover:opacity-[0.12] group-hover:scale-105 transition-all duration-1000 grayscale" 
                  referrerPolicy="no-referrer" 
                />
                <div className="absolute inset-0 bg-gradient-to-br from-white/80 via-white/20 to-transparent"></div>
                
                <div className="relative z-10 w-16 h-16 rounded-2xl bg-surface-container-low flex items-center justify-center text-primary group-hover:scale-110 group-hover:bg-secondary group-hover:text-white transition-all duration-500 shadow-sm">
                  <Leaf className="w-8 h-8" />
                </div>
                <div className="relative z-10 space-y-4 mt-auto">
                  <h3 className="text-2xl md:text-3xl font-headline font-bold text-primary tracking-tight keep-all">Pure Identity</h3>
                  <p className="text-on-surface-variant text-lg leading-relaxed keep-all">첨가물을 최소화한 순수 성분으로 신체의 본연의 밸런스를 되찾아줍니다.</p>
                </div>
              </div>
              
              {/* Value 3 */}
              <div className="group bg-white p-10 md:p-12 rounded-[2rem] hover:shadow-[0_24px_64px_rgba(26,54,93,0.08)] transition-all duration-500 flex flex-col gap-8 border border-outline-variant/20 relative overflow-hidden min-h-[320px]">
                <img 
                  src="https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&q=80&w=800" 
                  alt="Trust Policy" 
                  className="absolute inset-0 w-full h-full object-cover opacity-[0.06] group-hover:opacity-[0.12] group-hover:scale-105 transition-all duration-1000 grayscale" 
                  referrerPolicy="no-referrer" 
                />
                <div className="absolute inset-0 bg-gradient-to-br from-white/80 via-white/20 to-transparent"></div>
                
                <div className="relative z-10 w-16 h-16 rounded-2xl bg-surface-container-low flex items-center justify-center text-primary group-hover:scale-110 group-hover:bg-primary group-hover:text-white transition-all duration-500 shadow-sm">
                  <BadgeCheck className="w-8 h-8" />
                </div>
                <div className="relative z-10 space-y-4 mt-auto">
                  <h3 className="text-2xl md:text-3xl font-headline font-bold text-primary tracking-tight keep-all">Trust Policy</h3>
                  <p className="text-on-surface-variant text-lg leading-relaxed keep-all">모든 성분과 배합비는 임상 데이터를 바탕으로 전문 영양사의 검수를 거칩니다.</p>
                </div>
              </div>
              
              {/* Value 4 */}
              <div className="group bg-white p-10 md:p-12 rounded-[2rem] hover:shadow-[0_24px_64px_rgba(26,54,93,0.08)] transition-all duration-500 flex flex-col gap-8 border border-outline-variant/20 relative overflow-hidden min-h-[320px]">
                <img 
                  src="https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&q=80&w=800" 
                  alt="Individual Sealing" 
                  className="absolute inset-0 w-full h-full object-cover opacity-[0.06] group-hover:opacity-[0.12] group-hover:scale-105 transition-all duration-1000 grayscale" 
                  referrerPolicy="no-referrer" 
                />
                <div className="absolute inset-0 bg-gradient-to-br from-white/80 via-white/20 to-transparent"></div>
                
                <div className="relative z-10 w-16 h-16 rounded-2xl bg-surface-container-low flex items-center justify-center text-primary group-hover:scale-110 group-hover:bg-primary group-hover:text-white transition-all duration-500 shadow-sm">
                  <Package className="w-8 h-8" />
                </div>
                <div className="relative z-10 space-y-4 mt-auto">
                  <h3 className="text-2xl md:text-3xl font-headline font-bold text-primary tracking-tight keep-all">Individual Sealing</h3>
                  <p className="text-on-surface-variant text-lg leading-relaxed keep-all">공기와 습기를 차단하는 독자적인 실링 기술로 매일 새 제품을 만나는 듯한 신선함을 경험하세요.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Quiz Section */}
        <section className="py-32 bg-primary overflow-hidden relative" id="quiz-section">
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
              <path d="M0 100 C 20 0, 50 0, 100 100" fill="none" stroke="white" strokeWidth="0.5"></path>
            </svg>
          </div>
          <div className="max-w-4xl mx-auto px-8 relative z-10">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-headline font-extrabold text-white tracking-tighter mb-4 keep-all">나만의 영양 밸런스 찾기</h2>
              <p className="text-blue-100/70 max-w-xl mx-auto font-body keep-all text-lg">단 30초, 몇 가지 질문을 통해 당신에게 꼭 필요한 영양 조합을 분석해 드립니다.</p>
            </div>
            
            <div className="bg-white rounded-[2.5rem] p-8 md:p-12 shadow-[0_40px_80px_rgba(0,0,0,0.3)] relative min-h-[500px] flex flex-col justify-center overflow-hidden">
              <AnimatePresence mode="wait">
                {quizStep === 1 && (
                  <motion.div 
                    key="step1"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="w-full space-y-8"
                  >
                    <div className="space-y-2">
                      <span className="text-secondary font-bold text-sm tracking-widest uppercase">Step 01 / 02</span>
                      <h3 className="text-3xl font-headline font-extrabold text-primary keep-all">기본적인 정보를 알려주세요.</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <label className="block text-sm font-bold text-on-surface-variant">성별</label>
                        <div className="flex gap-4">
                          <button 
                            onClick={() => setGender('male')}
                            className={`flex-1 py-4 px-6 border-2 rounded-2xl font-bold transition-all ${gender === 'male' ? 'border-secondary bg-secondary-container/20 text-secondary' : 'border-surface-container-highest text-primary hover:border-secondary/50'}`}
                          >
                            남성
                          </button>
                          <button 
                            onClick={() => setGender('female')}
                            className={`flex-1 py-4 px-6 border-2 rounded-2xl font-bold transition-all ${gender === 'female' ? 'border-secondary bg-secondary-container/20 text-secondary' : 'border-surface-container-highest text-primary hover:border-secondary/50'}`}
                          >
                            여성
                          </button>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <label className="block text-sm font-bold text-on-surface-variant">연령대</label>
                        <select className="w-full py-4 px-6 border-2 border-surface-container-highest rounded-2xl font-bold text-primary focus:border-secondary focus:ring-0 outline-none transition-all bg-transparent">
                          <option value="20s">20대</option>
                          <option value="30s">30대</option>
                          <option value="40s">40대</option>
                          <option value="50s+">50대 이상</option>
                        </select>
                      </div>
                    </div>
                    <div className="pt-6">
                      <button 
                        onClick={() => setQuizStep(2)}
                        className="w-full py-5 signature-gradient text-white rounded-2xl font-bold text-lg hover:scale-[1.01] transition-all flex items-center justify-center gap-2"
                      >
                        다음으로 <ArrowRight className="w-5 h-5" />
                      </button>
                    </div>
                  </motion.div>
                )}

                {quizStep === 2 && (
                  <motion.div 
                    key="step2"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="w-full space-y-8"
                  >
                    <div className="space-y-2">
                      <span className="text-secondary font-bold text-sm tracking-widest uppercase">Step 02 / 02</span>
                      <h3 className="text-3xl font-headline font-extrabold text-primary keep-all">가장 고민되는 건강 분야는 무엇인가요?</h3>
                      <p className="text-on-surface-variant text-sm">최대 3개까지 선택 가능합니다.</p>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {[
                        { id: 'sleep', label: '수면/스트레스', icon: Moon },
                        { id: 'energy', label: '활력/피로 개선', icon: Zap },
                        { id: 'digestion', label: '소화/장 건강', icon: Apple },
                        { id: 'vision', label: '눈 건강', icon: Eye },
                        { id: 'immunity', label: '면역력 강화', icon: Dumbbell },
                        { id: 'circulation', label: '혈행 개선', icon: Heart },
                      ].map((item) => {
                        const isSelected = concerns.includes(item.id);
                        return (
                          <button 
                            key={item.id}
                            onClick={() => toggleConcern(item.id)}
                            className={`p-4 border-2 rounded-2xl text-left transition-all flex flex-col gap-3 group ${isSelected ? 'border-secondary bg-secondary-container/20' : 'border-surface-container-highest hover:border-secondary/50'}`}
                          >
                            <item.icon className={`w-6 h-6 transition-colors ${isSelected ? 'text-secondary' : 'text-primary group-hover:text-secondary'}`} />
                            <span className={`font-bold ${isSelected ? 'text-secondary' : 'text-primary'}`}>{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex gap-4 pt-4">
                      <button 
                        onClick={() => setQuizStep(1)}
                        className="flex-1 py-5 border-2 border-surface-container-highest text-primary rounded-2xl font-bold text-lg hover:bg-surface-container-low transition-all"
                      >
                        이전
                      </button>
                      <button 
                        onClick={() => setQuizStep(3)}
                        className="flex-[2] py-5 signature-gradient text-white rounded-2xl font-bold text-lg hover:scale-[1.01] transition-all"
                      >
                        결과 분석하기
                      </button>
                    </div>
                  </motion.div>
                )}

                {quizStep === 3 && (
                  <motion.div 
                    key="step3"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="w-full space-y-8"
                  >
                    <div className="text-center space-y-4">
                      <div className="w-20 h-20 bg-secondary-container rounded-full flex items-center justify-center mx-auto text-secondary">
                        <BadgeCheck className="w-10 h-10" />
                      </div>
                      <h3 className="text-3xl font-headline font-extrabold text-primary keep-all">분석된 맞춤 영양 조합입니다.</h3>
                    </div>
                    <div className="bg-surface-container-low rounded-3xl p-6 md:p-8 space-y-6">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                          { id: 'sleep', name: '테아닌', color: 'bg-green-100 text-green-600', desc: '스트레스 완화' },
                          { id: 'energy', name: '비타민 B군', color: 'bg-yellow-100 text-yellow-600', desc: '활력 충전' },
                          { id: 'digestion', name: '유산균', color: 'bg-blue-100 text-blue-600', desc: '장 건강' },
                          { id: 'vision', name: '루테인', color: 'bg-purple-100 text-purple-600', desc: '눈 피로 개선' },
                          { id: 'immunity', name: '아연/비타민C', color: 'bg-orange-100 text-orange-600', desc: '면역력 강화' },
                          { id: 'circulation', name: '오메가3', color: 'bg-amber-100 text-amber-600', desc: '혈행 개선' }
                        ].filter(pill => concerns.length === 0 || concerns.includes(pill.id)).slice(0, 4).map((pill) => (
                          <div key={pill.name} className="bg-white p-4 rounded-2xl shadow-sm border border-outline-variant/20 flex flex-col items-center text-center gap-3 hover:border-secondary/50 transition-colors">
                            <div className={`w-12 h-12 rounded-full ${pill.color} flex items-center justify-center shadow-inner`}>
                              <Pill className="w-6 h-6" />
                            </div>
                            <div>
                              <div className="font-bold text-primary text-sm">{pill.name}</div>
                              <div className="text-xs text-on-surface-variant mt-1">{pill.desc}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      <div className="bg-white p-6 rounded-2xl border border-secondary/30 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
                        <div className="text-center md:text-left shrink-0">
                          <div className="text-sm font-bold text-secondary mb-1">1회분 맞춤 조제 가격</div>
                          <div className="flex items-baseline justify-center md:justify-start gap-1">
                            <span className="text-3xl font-headline font-black text-primary">
                              {concerns.length === 0 ? '850' : (concerns.length * 300 + 250).toLocaleString()}
                            </span>
                            <span className="text-on-surface-variant font-medium">원</span>
                          </div>
                        </div>
                        <div className="h-px w-full md:w-px md:h-16 bg-outline-variant/30"></div>
                        <div className="text-center md:text-left">
                          <p className="text-primary font-bold text-lg keep-all">대용량 구매 부담 없이, 딱 한 포만!</p>
                          <p className="text-sm text-on-surface-variant mt-1.5 leading-relaxed keep-all">
                            선택하신 <span className="font-bold text-secondary">
                              {concerns.length === 0 
                                ? '수면과 활력' 
                                : concerns.map(c => ({
                                    sleep: '수면', energy: '활력', digestion: '소화', 
                                    vision: '눈 건강', immunity: '면역력', circulation: '혈행'
                                  }[c])).join(', ')}
                            </span> 개선 성분을 담았습니다.<br className="hidden md:block" />
                            밀접 키오스크가 있는 주변 식당에서 식사 후 바로 신선하게 이용해보세요.
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="pt-4">
                      <button 
                        onClick={() => {
                          const el = document.getElementById('pre-register');
                          el?.scrollIntoView({ behavior: 'smooth' });
                        }}
                        className="w-full py-5 signature-gradient text-white rounded-2xl font-bold text-lg hover:scale-[1.01] transition-all flex items-center justify-center gap-2 shadow-xl"
                      >
                        내 주변 밀접서비스 이용 가능 알림 신청하기
                        <Bell className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => {
                          const el = document.getElementById('restaurant-recommend');
                          el?.scrollIntoView({ behavior: 'smooth' });
                        }}
                        className="w-full py-4 bg-surface-container-highest text-primary rounded-2xl font-bold text-lg hover:bg-surface-container-highest/80 transition-all flex items-center justify-center gap-2 shadow-sm mt-3"
                      >
                        밀접 키오스크 설치 식당 추천하기
                        <Map className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => {
                          setQuizStep(1);
                          setConcerns([]);
                          setGender(null);
                        }}
                        className="w-full py-3 text-on-surface-variant font-medium text-sm mt-2 hover:text-primary transition-colors"
                      >
                        다시 분석하기
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </section>

        {/* Pre-launch Form */}
        <section className="py-32 relative" id="pre-register">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-blue-50/30 pointer-events-none"></div>
          <div className="max-w-4xl mx-auto px-8">
            <div className="bg-white p-8 md:p-16 rounded-3xl border border-outline-variant/15 relative overflow-hidden shadow-[0_32px_64px_rgba(26,54,93,0.06)]">
              <div className="absolute top-0 right-0 w-64 h-64 bg-secondary/5 rounded-full blur-3xl -mr-32 -mt-32"></div>
              
              {!isRegistered ? (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="relative z-10"
                >
                  <div className="text-center mb-12">
                    <h2 className="text-3xl md:text-5xl font-headline font-extrabold text-primary tracking-tighter mb-4 keep-all">내 주변에 밀접이 생기면<br className="hidden sm:block"/> 알려드릴게요.</h2>
                    <p className="text-on-surface-variant max-w-xl mx-auto font-body keep-all leading-relaxed">
                      {quizStep === 3 ? (
                        <><span className="text-secondary font-bold">분석하신 맞춤 영양 조합을 담았습니다.</span><br/>내 생활 반경에 키오스크가 설치되면 바로 픽업할 수 있게 알려드릴게요!</>
                      ) : (
                        <>주로 생활하시는 직장이나 생활 반경 내에<br className="hidden sm:block"/> 밀접 키오스크가 설치되는 경우, 가장 먼저 알림을 보내드립니다.</>
                      )}
                      <br />
                      <span className="inline-block mt-4 px-5 py-2.5 bg-secondary/10 text-primary font-bold rounded-xl text-sm shadow-sm">
                        🎁 알림 신청 시, 해당 지역 서비스 개시 후 <span className="text-secondary">3일치 맞춤 영양제 이용권</span>을 드립니다!
                      </span>
                    </p>
                  </div>
                  
                  <form onSubmit={handleRegister} className="space-y-6 max-w-xl mx-auto">
                    <div className="space-y-2">
                      <label className="block font-label text-sm font-bold text-primary">이름</label>
                      <input 
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        className="w-full px-6 py-4 rounded-2xl border-none bg-surface-container-low shadow-sm focus:ring-2 focus:ring-secondary/20 focus:outline-none placeholder:text-outline text-on-surface" 
                        placeholder="성함을 입력해 주세요" 
                        required 
                        type="text"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block font-label text-sm font-bold text-primary">주요 생활 지역 (직장/집)</label>
                      <input 
                        name="location"
                        value={formData.location}
                        onChange={handleInputChange}
                        className="w-full px-6 py-4 rounded-2xl border-none bg-surface-container-low shadow-sm focus:ring-2 focus:ring-secondary/20 focus:outline-none placeholder:text-outline text-on-surface" 
                        placeholder="예: 강남구 테헤란로, 여의도동" 
                        required 
                        type="text"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block font-label text-sm font-bold text-primary">연락처</label>
                      <input 
                        name="contact"
                        value={formData.contact}
                        onChange={handleInputChange}
                        className="w-full px-6 py-4 rounded-2xl border-none bg-surface-container-low shadow-sm focus:ring-2 focus:ring-secondary/20 focus:outline-none placeholder:text-outline text-on-surface" 
                        placeholder="010-0000-0000" 
                        required 
                        type="tel"
                      />
                    </div>
                    <div className="pt-4">
                      <button 
                        disabled={isSubmitting}
                        className="w-full signature-gradient text-white py-5 rounded-2xl font-bold text-lg hover:scale-[1.01] active:scale-[0.98] transition-all shadow-[0_12px_32px_rgba(26,54,93,0.15)] disabled:opacity-70 disabled:hover:scale-100" 
                        type="submit"
                      >
                        {isSubmitting ? '신청 중...' : '내 주변 밀접서비스 이용 가능 알림 신청하기'}
                      </button>
                    </div>
                    <p className="text-center text-xs text-outline font-label pt-4 leading-relaxed keep-all">
                      알림 신청 시 서비스 론칭 정보 및 혜택 안내를 위한 <br className="md:hidden"/> 마케팅 정보 활용에 동의하게 됩니다.
                    </p>
                  </form>
                </motion.div>
              ) : (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-20 relative z-10"
                >
                  <div className="w-20 h-20 bg-secondary rounded-full flex items-center justify-center mx-auto mb-6 text-white shadow-lg">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                  <h3 className="text-3xl font-headline font-extrabold text-primary mb-4 keep-all">알림 신청이 완료되었습니다.</h3>
                  <p className="text-on-surface-variant">입력하신 지역에 밀접 키오스크가 설치되면 연락처로 가장 먼저 알려드릴게요!</p>
                </motion.div>
              )}
            </div>
          </div>
        </section>

        {/* Restaurant Recommendation Form */}
        <section className="py-20 md:py-32 relative bg-surface-container-lowest" id="restaurant-recommend">
          <div className="max-w-4xl mx-auto px-8">
            <div className="bg-primary p-8 md:p-16 rounded-3xl relative overflow-hidden shadow-[0_32px_64px_rgba(26,54,93,0.15)]">
              <div className="absolute top-0 right-0 w-64 h-64 bg-secondary/20 rounded-full blur-3xl -mr-32 -mt-32"></div>
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-secondary/10 rounded-full blur-3xl -ml-32 -mb-32"></div>
              
              {!isRestaurantRegistered ? (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="relative z-10"
                >
                  <div className="text-center mb-12">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 text-secondary mb-6 backdrop-blur-sm">
                      <Map className="w-8 h-8" />
                    </div>
                    <h2 className="text-3xl md:text-4xl font-headline font-extrabold text-white tracking-tighter mb-4 keep-all">밀접 키오스크 설치를 원하는<br/> 식당을 추천해주세요!</h2>
                    <p className="text-blue-100/80 max-w-xl mx-auto font-body keep-all text-lg leading-relaxed">
                      추천해주신 식당에 밀접 키오스크가 설치되면,<br className="hidden md:block"/>
                      추천인 중 추첨을 통해 <strong className="text-secondary font-bold">1주일치 맞춤 영양제 이용권</strong>을 드립니다.
                    </p>
                  </div>
                  
                  <form onSubmit={handleRestaurantSubmit} className="space-y-6 max-w-xl mx-auto">
                    <div className="space-y-2">
                      <label className="block font-label text-sm font-bold text-blue-100">추천 식당 상호명</label>
                      <input 
                        name="restaurantName"
                        value={restaurantFormData.restaurantName}
                        onChange={handleRestaurantInputChange}
                        className="w-full px-6 py-4 rounded-2xl border border-white/10 bg-white/5 text-white shadow-sm focus:ring-2 focus:ring-secondary/50 focus:border-secondary/50 focus:outline-none placeholder:text-blue-100/30 backdrop-blur-sm transition-all" 
                        placeholder="예: 밀접식당 강남점" 
                        required 
                        type="text"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block font-label text-sm font-bold text-blue-100">식당 지역 / 위치</label>
                      <input 
                        name="restaurantLocation"
                        value={restaurantFormData.restaurantLocation}
                        onChange={handleRestaurantInputChange}
                        className="w-full px-6 py-4 rounded-2xl border border-white/10 bg-white/5 text-white shadow-sm focus:ring-2 focus:ring-secondary/50 focus:border-secondary/50 focus:outline-none placeholder:text-blue-100/30 backdrop-blur-sm transition-all" 
                        placeholder="예: 서울시 강남구 테헤란로 123" 
                        required 
                        type="text"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block font-label text-sm font-bold text-blue-100">연락처 (경품 지급용)</label>
                      <input 
                        name="contact"
                        value={restaurantFormData.contact}
                        onChange={handleRestaurantInputChange}
                        className="w-full px-6 py-4 rounded-2xl border border-white/10 bg-white/5 text-white shadow-sm focus:ring-2 focus:ring-secondary/50 focus:border-secondary/50 focus:outline-none placeholder:text-blue-100/30 backdrop-blur-sm transition-all" 
                        placeholder="010-0000-0000" 
                        required 
                        type="tel"
                      />
                    </div>
                    <div className="pt-4">
                      <button 
                        disabled={isRestaurantSubmitting}
                        className="w-full bg-secondary text-primary py-5 rounded-2xl font-bold text-lg hover:bg-secondary/90 hover:scale-[1.01] active:scale-[0.98] transition-all shadow-[0_12px_32px_rgba(0,0,0,0.2)] disabled:opacity-70 disabled:hover:scale-100" 
                        type="submit"
                      >
                        {isRestaurantSubmitting ? '추천 중...' : '식당 추천하고 혜택 받기'}
                      </button>
                    </div>
                  </form>
                </motion.div>
              ) : (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-20 relative z-10"
                >
                  <div className="w-24 h-24 bg-secondary/20 rounded-full flex items-center justify-center mx-auto mb-8 backdrop-blur-sm">
                    <CheckCircle2 className="w-12 h-12 text-secondary" />
                  </div>
                  <h3 className="text-2xl md:text-3xl font-headline font-bold text-white mb-4 keep-all">소중한 추천 감사합니다!</h3>
                  <p className="text-blue-100/80 text-lg keep-all">
                    추천해주신 식당에 밀접 키오스크가 설치되면<br className="hidden md:block"/>
                    입력해주신 연락처로 개별 안내해 드리겠습니다.
                  </p>
                </motion.div>
              )}
            </div>
          </div>
        </section>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-surface-container w-full py-16">
        <div className="flex flex-col md:flex-row justify-between items-start w-full px-8 max-w-7xl mx-auto gap-8">
          <div className="space-y-4">
            <div className="font-headline font-bold text-2xl text-primary tracking-tight">밀접</div>
            <div className="space-y-1 font-body text-xs text-slate-700 leading-loose">
              <p>Representative: James Kim</p>
              <p>Email: support@mealjeop.com</p>
              <p>Business Registration: 123-45-67890</p>
              <p>Address: 서울특별시 강남구 테헤란로 123, 4층</p>
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row gap-8 md:gap-16">
            <div className="flex flex-col gap-3">
              <h4 className="font-headline font-bold text-primary text-sm">Policy</h4>
              <a className="font-body text-xs text-slate-700 opacity-70 hover:opacity-100 hover:text-secondary transition-all" href="#">Privacy Policy</a>
              <a className="font-body text-xs text-slate-700 opacity-70 hover:opacity-100 hover:text-secondary transition-all" href="#">Terms of Service</a>
            </div>
            <div className="flex flex-col gap-3">
              <h4 className="font-headline font-bold text-primary text-sm">Social</h4>
              <a className="font-body text-xs text-slate-700 opacity-70 hover:opacity-100 hover:text-secondary transition-all" href="#">Instagram</a>
              <a className="font-body text-xs text-slate-700 opacity-70 hover:opacity-100 hover:text-secondary transition-all" href="#">LinkedIn</a>
            </div>
          </div>
          
          <div className="md:text-right">
            <div className="font-body text-xs text-slate-700 opacity-70 leading-loose">
              © 2026 (주)밀접. All rights reserved.
            </div>
          </div>
        </div>
      </footer>

      <Chatbot />
    </div>
  );
}
