/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import SupplementImage from './영양제_봉투의_텍스트를_202604141018.png';
import RoutineImage from './직장인 건강루틴.png';
// Using the English filenames pointing to the root directory where the user uploaded them
import homeImg from '../home.png';
import recordImg from '../record.png';
import searchImg from '../search.jpeg';
import socialImg from '../social.jpeg';
import proposeImg from '../propose.jpeg';
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
  Send,
  MapPin,
  Gift,
  Wallet,
  Flame,
  Home,
  Users,
  Settings,
  Search,
  ChevronRight,
  Circle,
  Battery,
  Wifi,
  Signal,
  SmartphoneNfc,
  Image as ImageIcon
} from 'lucide-react';
import { collection, addDoc, serverTimestamp, getDocs, query, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { signInWithPopup, signOut, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { db, auth, googleProvider } from './firebase';
import { heroImage } from './assets/heroBase64';

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

function InquiryForm() {
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message || isSubmitting) return;

    setIsSubmitting(true);
    try {
      if (db) {
        await addDoc(collection(db, 'inquiries'), {
          ...form,
          createdAt: serverTimestamp(),
        });
      } else {
        console.log("No DB, simulated submission:", form);
      }
      setSuccess(true);
      setTimeout(() => {
        setIsOpen(false);
        setSuccess(false);
        setForm({ name: '', email: '', message: '' });
      }, 3000);
    } catch (error) {
      console.error("Inquiry submitting error:", error);
      alert("전송 중 오류가 발생했습니다. 다시 시도해 주세요.");
    } finally {
      setIsSubmitting(false);
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

      {/* Inquiry Window */}
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
                <span className="font-bold">밀접 고객문의</span>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-white/80 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <div className="flex-1 p-5 overflow-y-auto bg-surface-container-lowest">
              {success ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                  <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-2">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">접수 완료</h3>
                  <p className="text-gray-600 px-4">
                    문의가 성공적으로 전달되었습니다.<br />담당자가 확인 후 빠르게 답변 드리겠습니다.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="flex flex-col h-full">
                  <p className="text-sm text-gray-600 mb-6">서비스에 대해 궁금한 점이나 건의사항이 있으신가요? 내용을 남겨주시면 이메일로 답변해 드립니다.</p>
                  
                  <div className="space-y-4 flex-1">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">이름</label>
                      <input 
                        required
                        type="text" 
                        value={form.name}
                        onChange={(e) => setForm({...form, name: e.target.value})}
                        className="w-full bg-white border border-outline-variant/50 px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                        placeholder="홍길동"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">이메일</label>
                      <input 
                        required
                        type="email" 
                        value={form.email}
                        onChange={(e) => setForm({...form, email: e.target.value})}
                        className="w-full bg-white border border-outline-variant/50 px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                        placeholder="email@example.com"
                      />
                    </div>
                    <div className="flex-1 flex flex-col">
                      <label className="block text-sm font-medium text-gray-700 mb-1">문의 내용</label>
                      <textarea 
                        required
                        value={form.message}
                        onChange={(e) => setForm({...form, message: e.target.value})}
                        className="w-full flex-1 bg-white border border-outline-variant/50 px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                        placeholder="궁금한 점을 상세히 적어주세요."
                      />
                    </div>
                  </div>

                  <button 
                    type="submit"
                    disabled={!form.name || !form.email || !form.message || isSubmitting}
                    className="mt-6 w-full bg-primary text-white p-3.5 rounded-xl font-bold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                  >
                    {isSubmitting ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        문의 등록하기
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

const MockupScan = () => (
  <div className="relative w-full h-[calc(100%+2rem)] -mt-4 bg-slate-900 flex flex-col font-sans overflow-hidden">
    {/* Status Bar */}
    <div className="flex justify-between items-center px-6 py-2 pt-6 text-[12px] font-bold text-white relative z-50">
      <span>9:41</span>
      <div className="flex items-center gap-1.5 opacity-90">
         <Signal className="w-3.5 h-3.5" />
         <Wifi className="w-3.5 h-3.5" />
         <Battery className="w-4 h-4" />
      </div>
    </div>

    {/* Camera / Scan Overlay */}
    <div className="flex-1 flex flex-col items-center justify-center relative z-10 px-6 mt-[-10%]">
       <div className="absolute inset-0 bg-gradient-to-b from-primary/20 to-transparent opacity-50"></div>
       
       <div className="w-48 h-48 relative flex items-center justify-center mb-10">
          <div className="absolute inset-0 border-[3px] border-primary/30 rounded-[2rem] animate-ping"></div>
          <div className="absolute inset-2 border-[3px] border-primary/50 rounded-[1.8rem] animate-pulse"></div>
          <div className="w-32 h-32 bg-primary flex items-center justify-center rounded-[1.8rem] shadow-[0_0_40px_rgba(16,185,129,0.5)] z-10 relative overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-1/2 bg-white/20"></div>
             <SmartphoneNfc className="w-16 h-16 text-white" strokeWidth={1.5} />
          </div>
       </div>

       <h2 className="text-[22px] md:text-[24px] font-bold text-white tracking-tight mb-3 font-headline text-center break-keep">자판기에 태그하세요</h2>
       <p className="text-[#94A3B8] text-[15px] text-center font-medium leading-[1.6] break-keep">스마트폰을 리더기에 가까이 대면<br/>준비된 영양제가 바로 나옵니다</p>
    </div>

    {/* Bottom Sheet */}
    <div className="bg-white rounded-t-[28px] p-0 relative z-20 shadow-[0_-20px_40px_rgba(0,0,0,0.1)] transition-transform duration-500 hover:-translate-y-2 flex flex-col items-start w-full text-left overflow-hidden">
       <div className="p-6 pb-8 w-full flex flex-col items-start px-5">
           <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6"></div>
           <div className="flex items-center gap-4 mb-5 w-full">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                 <Package className="w-6 h-6 text-primary" />
              </div>
              <div className="flex flex-col items-start">
                 <div className="text-[13px] font-bold text-primary mb-1">수령 대기 중</div>
                 <div className="text-[16px] font-bold text-[#1E293B] tracking-tight text-left break-keep">맞춤 영양제 3회분 (오메가3 외)</div>
              </div>
           </div>
           
           <img src={SupplementImage} alt="영양제 수령 안내" className="w-full h-[100px] object-cover rounded-xl mb-5 shadow-sm border border-slate-100/50" />

           <div className="bg-[#F8FAFC] rounded-2xl p-4 border border-slate-100 flex justify-between items-center w-full">
              <span className="text-[14px] font-medium text-slate-500">결제 수단</span>
              <span className="text-[14px] font-bold text-[#1E293B] flex items-center gap-1.5"><Wallet className="w-4 h-4 text-slate-400"/>밀접 스마트 월렛</span>
           </div>
       </div>
    </div>
  </div>
);

const MobileFrame = ({ children, activeTab }: { children: React.ReactNode, activeTab: string }) => (
  <div className="relative w-full h-[calc(100%+2rem)] -mt-4 bg-slate-50 flex flex-col font-sans overflow-hidden">
    {/* Status Bar */}
    <div className="flex justify-between items-center px-6 py-2 pt-6 text-[12px] font-bold text-slate-800 bg-white/90 backdrop-blur-sm relative z-50">
      <span>9:41</span>
      <div className="flex items-center gap-1.5 opacity-80">
         <Signal className="w-3.5 h-3.5" />
         <Wifi className="w-3.5 h-3.5" />
         <Battery className="w-4 h-4" />
      </div>
    </div>
    
    {/* Content Area */}
    <div className="flex-1 overflow-hidden relative">
      {children}
    </div>

    {/* Bottom Navigation */}
    <div className="absolute bottom-4 left-0 w-full bg-white border-t border-slate-100 flex justify-between px-6 py-3 pb-8 z-50 shadow-[0_-10px_20px_rgba(0,0,0,0.02)]">
      {[
        { id: 'home', icon: Home, label: '홈' },
        { id: 'map', icon: MapPin, label: '주변' },
        { id: 'social', icon: Users, label: '함께' },
        { id: 'my', icon: User, label: '마이' },
      ].map((item) => (
         <div key={item.id} className={`flex flex-col items-center gap-1 ${activeTab === item.id ? 'text-primary' : 'text-slate-400'}`}>
           <item.icon className="w-6 h-6" strokeWidth={activeTab === item.id ? 2.5 : 2} fill={activeTab === item.id ? 'currentColor' : 'none'} style={activeTab === item.id ? { fillOpacity: 0.15 } : {}} />
           <span className="text-[10px] font-bold">{item.label}</span>
         </div>
      ))}
    </div>
  </div>
);

const MockupHome = () => (
  <MobileFrame activeTab="home">
    <div className="p-5 h-full overflow-y-auto pb-28 space-y-6 text-left">
      <div className="flex justify-between items-center mt-2">
        <div>
          <h1 className="text-[22px] font-extrabold text-[#1E293B] tracking-tight">밀접</h1>
        </div>
        <Bell className="w-6 h-6 text-slate-500" />
      </div>
      
      <div className="bg-white rounded-[24px] p-5 shadow-sm border border-slate-100 flex flex-col items-center">
        <h2 className="text-[16px] font-bold text-[#1E293B] mb-5 self-start w-full break-keep">오늘의 영양 달성도</h2>
        <div className="relative w-40 h-40 mb-5">
           <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
             <circle cx="50" cy="50" r="45" fill="none" stroke="#F1F5F9" strokeWidth="8" />
             <circle 
               cx="50" cy="50" r="45" fill="none" stroke="#10b981" strokeWidth="8" 
               strokeDasharray="283" strokeDashoffset="75" strokeLinecap="round" 
               className="drop-shadow-[0_0_12px_rgba(16,185,129,0.3)] transition-all duration-1000" 
             />
           </svg>
           <div className="absolute inset-0 flex flex-col items-center justify-center">
             <span className="text-[44px] font-extrabold tracking-tighter text-[#1E293B] leading-none mb-1">75<span className="text-xl text-slate-400 font-bold ml-1">%</span></span>
             <span className="text-[12px] font-medium text-slate-400 tracking-tight">3/4 섭취 완료</span>
           </div>
        </div>
        <div className="w-full bg-[#ECFDF5] text-[#047857] rounded-xl py-3 px-4 flex items-center justify-center gap-2">
           <span className="w-2.5 h-2.5 rounded-full bg-[#10b981] animate-pulse"></span>
           <p className="text-[13px] font-bold tracking-tight break-keep">잘 하고 있어요! 1회만 더 섭취하세요.</p>
        </div>
      </div>

      <img src={RoutineImage} alt="직장인 건강루틴" className="w-full rounded-[24px] shadow-sm border border-slate-100 object-cover" />

      <div className="flex flex-col items-start w-full">
        <div className="flex justify-between items-center mb-4 px-1 w-full flex-wrap">
           <h3 className="text-[17px] font-bold text-[#1E293B] break-keep">맞춤 영양 루틴</h3>
           <span className="text-[14px] text-primary font-bold">2/3 완료</span>
        </div>
        <div className="space-y-3 w-full">
           {[
             { name: '활력 마그네슘', time: '아침 식후', done: true },
             { name: '눈 건조 오메가3', time: '점심 식후', done: true },
             { name: '수면 유도 테아닌', time: '취침 전', done: false },
           ].map((item, i) => (
             <div key={i} className={`flex items-center justify-between p-4 rounded-[20px] transition-all hover:scale-[1.01] ${item.done ? 'bg-slate-50 border border-transparent opacity-70' : 'bg-white shadow-sm border border-slate-100/80 shadow-[0_4px_16px_rgba(0,0,0,0.04)]'}`}>
               <div className="flex items-center gap-3.5">
                 <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${item.done ? 'bg-[#CBD5E1] text-white' : 'bg-primary/10 text-primary'}`}>
                   {item.done ? <CheckCircle2 className="w-6 h-6" /> : <div className="w-2.5 h-2.5 rounded-full bg-primary/70"></div>}
                 </div>
                 <div className="flex flex-col items-start">
                   <div className={`font-bold text-[15px] tracking-tight leading-snug break-keep ${item.done ? 'text-slate-500 line-through' : 'text-[#1E293B]'}`}>{item.name}</div>
                   <div className="text-[13px] text-slate-500 font-medium mt-0.5">{item.time}</div>
                 </div>
               </div>
               {!item.done && (
                 <button className="text-[13px] font-bold text-white bg-primary px-4 py-2 rounded-xl shadow-md shadow-primary/20 hover:bg-primary/90 transition-colors shrink-0 whitespace-nowrap">섭취하기</button>
               )}
             </div>
           ))}
        </div>
      </div>
    </div>
  </MobileFrame>
);

const MockupMap = () => (
  <MobileFrame activeTab="map">
    <div className="absolute inset-0 bg-[#E8F5E9] overflow-hidden rounded-b-3xl">
      <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'40\' height=\'40\' viewBox=\'0 0 40 40\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M0 0h40v40H0V0zm20 20h20v20H20V20zM0 20h20v20H0V20z\' fill=\'%2310b981\' fill-opacity=\'0.1\' fill-rule=\'evenodd\'/%3E%3C/svg%3E")' }}></div>
      
      <div className="absolute top-6 left-5 right-5 flex z-10">
        <div className="w-full bg-white h-[52px] rounded-2xl shadow-[0_8px_24px_rgba(16,185,129,0.12)] flex items-center px-4 gap-3 text-slate-400 border border-slate-100/50 text-left">
          <Search className="w-[22px] h-[22px] text-slate-400" />
          <span className="text-[15px] font-medium text-slate-400 break-keep">강남역 밀접 자판기 검색</span>
        </div>
      </div>

      <div className="absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-16 h-16 flex flex-col items-center">
        <div className="w-16 h-16 bg-white rounded-full shadow-xl flex items-center justify-center relative z-20 shrink-0">
          <MapPin className="w-8 h-8 text-primary" />
          <div className="absolute -bottom-2.5 w-3.5 h-3.5 bg-primary rounded-full shadow-[0_0_12px_rgba(16,185,129,0.8)] border-[2.5px] border-white"></div>
        </div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-36 h-36 bg-primary/20 rounded-full animate-ping z-10"></div>
      </div>
      
      {/* Another pin far away */}
      <div className="absolute top-[30%] left-[20%] opacity-60 scale-75">
        <div className="w-14 h-14 bg-white rounded-full shadow-lg flex items-center justify-center relative">
          <MapPin className="w-6 h-6 text-slate-400" />
        </div>
      </div>

      <div className="absolute bottom-[92px] left-4 right-4 z-20">
        <div className="bg-white rounded-[28px] p-6 shadow-[0_10px_40px_rgba(0,0,0,0.15)] border border-slate-100 flex flex-col text-left">
           <div className="flex justify-between items-start mb-5">
             <div className="flex flex-col items-start">
               <div className="flex items-center gap-2 mb-2">
                  <span className="bg-[#ECFDF5] text-[#047857] text-[11px] font-bold px-2.5 py-1 rounded-md flex items-center gap-1 leading-none"><Zap className="w-3.5 h-3.5"/>운영중</span>
                  <span className="bg-slate-100 text-slate-500 text-[11px] font-bold px-2.5 py-1 rounded-md leading-none">직영점</span>
               </div>
               <h3 className="text-[20px] font-bold text-[#1E293B] leading-tight tracking-tight mb-1">샐러디 강남점</h3>
               <p className="text-[14px] text-slate-500 break-keep">서울 서초구 강남대로 123</p>
             </div>
             <div className="bg-[#F8FAFC] px-3.5 py-2.5 rounded-2xl text-center border border-slate-100">
                <span className="block text-[12px] text-slate-500 font-medium mb-1">거리</span>
                <span className="block text-[16px] font-extrabold text-[#059669]">150m</span>
             </div>
           </div>
           
           <div className="w-full h-[1px] bg-slate-100 mb-5"></div>
           
           <div className="flex items-center justify-between w-full">
             <div className="flex flex-col items-start">
                <p className="text-[13px] font-bold text-slate-500 mb-2">현재 재고 (수령 가능)</p>
                <div className="flex -space-x-2.5">
                   <div className="w-9 h-9 rounded-full border-2 border-white bg-[#EFF6FF] flex items-center justify-center text-[15px] shadow-sm relative z-30">💊</div>
                   <div className="w-9 h-9 rounded-full border-2 border-white bg-[#ECFDF5] flex items-center justify-center text-[15px] shadow-sm relative z-20">🌿</div>
                   <div className="w-9 h-9 rounded-full border-2 border-white bg-[#FFF7ED] flex items-center justify-center text-[15px] shadow-sm relative z-10">🍎</div>
                </div>
             </div>
             <button className="bg-[#1E293B] text-white rounded-[16px] px-6 py-4 text-[15px] font-bold shadow-lg shadow-slate-900/20 hover:bg-slate-800 transition-colors flex items-center gap-1.5 break-keep">
               픽업 예약 <ArrowRight className="w-4 h-4 opacity-80"/>
             </button>
           </div>
        </div>
      </div>
    </div>
  </MobileFrame>
);

const MockupSocial = () => (
  <MobileFrame activeTab="social">
    <div className="p-5 h-full overflow-y-auto pb-28 bg-[#F8FAFC] text-left">
       <div className="flex justify-between items-center mb-6 mt-2">
         <h2 className="text-[20px] font-bold text-[#1E293B] tracking-tight">건강한 친구들</h2>
         <Search className="w-6 h-6 text-slate-500" />
       </div>
       
       <div className="flex gap-4 overflow-x-hidden mb-8 px-1 pb-2">
         {['나', '김엄마', '박철수', '이민수', '최영희'].map((name, i) => (
            <div key={i} className="flex flex-col items-center gap-2.5 min-w-max cursor-pointer">
               <div className={`w-16 h-16 rounded-full border-[3px] p-0.5 ${i === 0 ? 'border-primary' : i === 1 ? 'border-[#EA580C]' : 'border-slate-200'}`}>
                  <div className={`w-full h-full rounded-full overflow-hidden flex justify-center items-center ${i === 0 ? 'bg-primary/10' : 'bg-slate-200'}`}>
                     {/* Random cute avatars based on iteration */}
                     <span className="text-[26px]">{['😎','👩','🧑','👱','👧'][i]}</span>
                  </div>
               </div>
               <span className="text-[13px] font-bold text-slate-600 tracking-tight">{name}</span>
            </div>
         ))}
       </div>

       <div className="space-y-4 w-full">
         {[
           { name: '김엄마', badge: '가족', action: '활력 마그네슘 섭취', time: '방금 전', msg: '오늘도 건강 챙겼어요! 다들 화이팅', emoji: '👩' },
           { name: '박철수', badge: '친구', action: '종합 비타민 섭취', time: '2시간 전', msg: '점심 먹고 바로 완료입니다 ㅎㅎ', emoji: '🧑' },
           { name: '이민수', badge: '동료', action: '연속 섭취 7일 달성', time: '어제', msg: '일주일째 완벽한 루틴 달성 중 🔥', emoji: '👱' },
         ].map((feed, i) => (
           <div key={i} className="bg-white rounded-[24px] p-5 shadow-sm border border-slate-100/80 hover:shadow-md transition-shadow flex flex-col items-start w-full">
             <div className="flex justify-between items-start mb-3 w-full">
                <div className="flex items-center gap-3.5">
                   <div className="w-11 h-11 rounded-full bg-[#F1F5F9] flex items-center justify-center text-[22px] shrink-0">{feed.emoji}</div>
                   <div className="flex flex-col items-start">
                     <div className="flex items-center gap-2 mb-1">
                        <span className="text-[15px] font-bold text-[#1E293B] leading-none tracking-tight">{feed.name}</span>
                        <span className="bg-slate-100 text-slate-500 font-bold text-[11px] px-1.5 py-[2px] rounded-sm leading-none">{feed.badge}</span>
                     </div>
                     <div className="text-[13px] font-medium text-slate-400 flex items-center gap-1.5 break-keep">
                        <span className="text-primary font-bold">{feed.action}</span> • {feed.time}
                     </div>
                   </div>
                </div>
                <div className="w-6 h-6 flex justify-center items-center opacity-40 shrink-0">
                  <div className="flex flex-col gap-[3px]">
                     <div className="w-1 h-1 rounded-full bg-slate-900"></div>
                     <div className="w-1 h-1 rounded-full bg-slate-900"></div>
                     <div className="w-1 h-1 rounded-full bg-slate-900"></div>
                  </div>
                </div>
             </div>
             <div className="bg-[#F8FAFC] rounded-[16px] px-4 py-3 text-[14px] leading-relaxed font-medium text-slate-700 mb-4 ml-[58px] border border-slate-100 break-keep self-stretch text-left">
               "{feed.msg}"
             </div>
             <div className="flex gap-2.5 pl-[58px] w-[calc(100%-10px)]">
                <button className="flex-1 bg-white border border-slate-200 rounded-[14px] py-2.5 flex justify-center items-center gap-1.5 text-[13px] font-bold text-slate-600 hover:bg-slate-50 transition-colors">
                  👏 칭찬하기
                </button>
                <button className="flex-1 bg-[#FFF4ED] text-[#EA580C] rounded-[14px] py-2.5 flex justify-center items-center gap-1.5 text-[13px] font-bold hover:bg-[#FFEDD5] transition-colors">
                  <Flame className="w-4 h-4" /> 콕 찌르기
                </button>
             </div>
           </div>
         ))}
       </div>
    </div>
  </MobileFrame>
);

const MockupMyPage = () => (
  <MobileFrame activeTab="my">
    <div className="p-5 h-full overflow-y-auto pb-28 bg-white text-left break-keep">
       <div className="flex justify-between items-center mb-7 mt-2">
         <h2 className="text-[22px] font-bold text-[#1E293B] tracking-tight">마이페이지</h2>
         <Settings className="w-6 h-6 text-[#1E293B]" />
       </div>

       <div className="flex items-center gap-4.5 mb-9">
         <div className="w-[72px] h-[72px] rounded-full bg-slate-100 ring-4 ring-slate-50 overflow-hidden flex justify-center items-center text-[36px] shrink-0">
            😎
         </div>
         <div className="flex flex-col items-start ml-2 w-full">
            <h3 className="text-[20px] font-bold text-[#1E293B] tracking-tight">김밀접님</h3>
            <div className="flex items-center gap-2 mt-1.5">
               <span className="text-[11px] bg-[#FEE2E2] text-[#DC2626] font-bold px-2 py-0.5 rounded-sm">카카오 연동</span>
               <span className="text-[13px] text-slate-500 font-medium tracking-tight">user123@kakao.com</span>
            </div>
         </div>
       </div>

       <div className="bg-[#1E293B] rounded-[28px] p-6 text-white mb-8 shadow-xl shadow-slate-900/10 flex flex-col items-start w-full relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
          <div className="flex justify-between items-center w-full mb-5 relative z-10">
             <span className="text-[13px] font-semibold text-slate-300 tracking-tight">밀접 스마트 월렛</span>
             <button className="bg-white/10 hover:bg-white/20 px-3.5 py-1.5 rounded-full text-[12px] font-bold transition-colors">명세서</button>
          </div>
          <div className="text-[32px] font-bold mb-7 tracking-tight leading-none text-left w-full relative z-10">
             48,800<span className="text-[20px] font-semibold ml-1 text-slate-300">P</span>
          </div>
          <div className="flex gap-3 w-full relative z-10">
             <button className="flex-1 bg-primary text-white py-3.5 rounded-[16px] text-[15px] font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-colors">포인트 충전</button>
             <button className="flex-1 bg-white/15 text-white py-3.5 rounded-[16px] text-[15px] font-bold hover:bg-white/20 transition-colors flex items-center justify-center gap-1.5"><Gift className="w-[18px] h-[18px]"/> 선물 쿠폰</button>
          </div>
       </div>

       <div className="space-y-4 mb-8 w-full flex flex-col items-start">
          <h4 className="text-[17px] font-bold text-[#1E293B] mb-1 px-1">나의 웰니스 지표</h4>
          <div className="bg-[#F8FAFC] rounded-[24px] p-6 border border-slate-100 w-full flex flex-col text-left">
             <div className="flex justify-between items-center mb-6 w-full">
                <span className="text-[15px] font-bold text-slate-800">이번 달 섭취 달성률</span>
                <span className="bg-primary/10 text-primary px-2.5 py-1 rounded-md text-[12px] font-bold">최고 기록 갱신 중!</span>
             </div>
             {/* Mini bar chart */}
             <div className="flex items-end h-[84px] gap-2.5 mt-auto w-full">
                {[20, 60, 40, 80, 50, 70, 100].map((h, i) => (
                  <div key={i} className="flex-1 relative flex items-end justify-center" style={{ height: '100%' }}>
                     <div className={`w-full max-w-[12px] rounded-full transition-all duration-700 ${i === 6 ? 'bg-primary' : 'bg-[#CBD5E1]'}`} style={{ height: `${h}%` }}></div>
                     <span className={`absolute -bottom-6 text-[12px] font-bold ${i === 6 ? 'text-primary' : 'text-slate-400'}`}>{['월','화','수','목','금','토','일'][i]}</span>
                  </div>
                ))}
             </div>
             <div className="mt-10 pt-5 border-t border-slate-200/80 flex w-full">
                <div className="flex-1 flex flex-col items-start pl-1">
                  <div className="text-[12px] text-slate-500 font-bold mb-1">총 섭취 횟수</div>
                  <div className="text-[20px] font-bold text-[#1E293B] leading-none">16<span className="text-[14px] font-medium text-slate-400 ml-1">회</span></div>
                </div>
                <div className="w-[1px] bg-slate-200 h-10 self-center"></div>
                <div className="flex-1 flex flex-col items-start pl-5">
                  <div className="text-[12px] text-slate-500 font-bold mb-1">연속 달성일</div>
                  <div className="text-[20px] font-bold text-[#EA580C] leading-none">7<span className="text-[14px] font-medium text-slate-400 ml-1">일 🔥</span></div>
                </div>
             </div>
          </div>
       </div>
       
       <div className="space-y-1 w-full flex flex-col">
          {[
            { title: '구독 플랜 관리', icon: Package },
            { title: '밀접 결제 수단 등록', icon: Wallet },
            { title: '건강 정보 알림 설정', icon: Bell },
            { title: '1:1 고객 센터 문의', icon: MessageCircle }
          ].map((item, i) => (
             <div key={i} className="flex items-center justify-between py-4.5 px-3 rounded-2xl hover:bg-slate-50 transition-colors cursor-pointer group w-full">
                <div className="flex items-center gap-3.5">
                   <item.icon className="w-[20px] h-[20px] text-slate-400 group-hover:text-primary transition-colors" />
                   <span className="text-[15px] font-semibold text-slate-700">{item.title}</span>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-300" />
             </div>
          ))}
       </div>
    </div>
  </MobileFrame>
);

const UploadedMockup = ({ imgSrc, altText = "mockup" }: { imgSrc: string, altText?: string }) => {
  return (
    <div className="relative w-full h-full bg-black flex items-center justify-center overflow-hidden">
      <img 
        src={imgSrc} 
        alt={altText} 
        className="w-full h-auto block" 
      />
    </div>
  );
};

const StickyFeatures = () => {
  const [activeIndex, setActiveIndex] = useState(0);

  const features = [
    {
      title: "자판기 태그하고 즉시 수령",
      desc: "제휴 식당이나 오피스에 설치된 밀접 자판기에 스마트폰을 태그하세요. 내게 필요한 맞춤 영양제를 즉시 수령할 수 있습니다.",
      icon: <SmartphoneNfc className="w-7 h-7 text-primary" />,
      mockup: <UploadedMockup imgSrc={homeImg} altText="홈 화면" />
    },
    {
      title: "스마트 섭취 기록 & 분석",
      desc: "주·월 단위 리포트와 나의 활동 기록으로 매일매일 조금씩 건강해지는 증거를 확인하세요.",
      icon: <Activity className="w-7 h-7 text-primary" />,
      mockup: <UploadedMockup imgSrc={recordImg} altText="기록 화면" />
    },
    {
      title: "내 주변 밀접 자판기 탐색",
      desc: "위치 기반으로 가까운 제휴 식당의 영양제 자판기를 찾고 픽업 예약을 진행해보세요. 지도 앱 없이도 바로 찾아갈 수 있습니다.",
      icon: <MapPin className="w-7 h-7 text-primary" />,
      mockup: <UploadedMockup imgSrc={searchImg} altText="주변찾기 화면" />
    },
    {
      title: "소셜 & 루틴 메이트",
      desc: "친구, 가족, 직장 동료와 건강한 섭취 루틴을 공유하세요. 칭찬하고 찌르며 혼자가 아닌 함께하는 웰니스를 경험할 수 있습니다.",
      icon: <Users className="w-7 h-7 text-primary" />,
      mockup: <UploadedMockup imgSrc={socialImg} altText="소셜 화면" />
    },
    {
      title: "밀접 자판기 설치 제안하기",
      desc: "내 동선 주변에 아직 밀접 자판기가 없다면? 자주 방문하는 오피스나 식당에 설치를 제안하고, 필요한 영양을 가장 가까운 곳에서 만나보세요.",
      icon: <User className="w-7 h-7 text-primary" />,
      mockup: <UploadedMockup imgSrc={proposeImg} altText="제안하기" />
    }
  ];

  return (
    <section className="bg-white relative pb-20" id="features">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row">
        
        {/* Mobile View (Below md) */}
        <div className="block md:hidden">
          {features.map((f, i) => (
             <div key={i} className="py-8 px-5 border-b border-slate-100 last:border-0 relative">
               <div className="flex items-center gap-4 mb-3">
                 <div className="inline-flex items-center justify-center w-10 h-10 bg-primary-fixed rounded-xl shadow-sm border border-primary/10 shrink-0 [&>svg]:w-5 [&>svg]:h-5">
                   {f.icon}
                 </div>
                 <h3 className="text-lg font-headline font-bold text-[#1E293B] tracking-tight m-0">{f.title}</h3>
               </div>
               <p className="text-slate-600 text-sm leading-snug mb-5 keep-all">{f.desc}</p>
               <div className="w-full max-w-[240px] mx-auto bg-[#1E293B] rounded-[2rem] p-2 shadow-2xl relative border-[3px] border-[#0F172A] h-[480px] flex shrink-0">
                 {/* Speaker mock */}
                 <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-3 bg-[#0F172A] rounded-b-md z-20 flex justify-center items-center">
                    <div className="w-6 h-0.5 rounded-full bg-slate-800"></div>
                 </div>
                 <div className="w-full h-full bg-[#0F172A] rounded-[1.75rem] overflow-hidden relative">
                    {f.mockup}
                 </div>
               </div>
             </div>
          ))}
        </div>

        {/* Desktop View (md and above) */}
        <div className="hidden md:block w-1/2 relative pb-[30vh]">
          {features.map((f, i) => (
            <FeatureBlock key={i} feature={f} index={i} onVisible={setActiveIndex} />
          ))}
        </div>

        {/* Sticky Mockup Container (Desktop) */}
        <div className="hidden md:flex w-1/2 h-screen sticky top-0 items-center justify-center pointer-events-none">
          <div className="w-[300px] lg:w-[320px] bg-[#1E293B] rounded-[3rem] p-3.5 shadow-[0_32px_64px_rgba(15,23,42,0.2)] relative border-[6px] border-[#0F172A] ring-1 ring-slate-900/10 pointer-events-auto h-[600px] lg:h-[650px]">
            {/* Speaker hole mock */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-[#0F172A] rounded-b-xl z-20 flex justify-center items-center">
               <div className="w-12 h-1 rounded-full bg-slate-800"></div>
            </div>
            
            <div className="w-full h-full bg-[#0F172A] rounded-[2.25rem] overflow-hidden relative">
              <AnimatePresence mode="wait">
                 <motion.div
                   key={activeIndex}
                   initial={{ opacity: 0 }}
                   animate={{ opacity: 1 }}
                   exit={{ opacity: 0 }}
                   transition={{ duration: 0.3 }}
                   className="absolute inset-0 w-full h-full"
                 >
                    {features[activeIndex].mockup}
                 </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const FeatureBlock = ({ feature, index, onVisible }: any) => {
  const ref = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
         if (entry.isIntersecting) {
            onVisible(index);
         }
      },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [index, onVisible]);

  return (
    <div ref={ref} className="min-h-screen flex flex-col justify-center py-20 px-8 lg:px-12">
      <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-fixed rounded-2xl mb-8 shadow-sm border border-primary/10 transition-transform hover:scale-105 duration-300">
        {feature.icon}
      </div>
      <h3 className="text-3xl md:text-5xl font-headline font-extrabold text-[#1E293B] mb-6 tracking-tight keep-all">{feature.title}</h3>
      <p className="text-slate-600 text-lg md:text-xl leading-relaxed max-w-md keep-all font-body">
        {feature.desc}
      </p>
    </div>
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
    } catch (error: any) {
      console.error("Login failed", error);
      alert(`로그인 실패: ${error.message}\n\n(Firebase 승인된 도메인 설정을 다시 확인해주세요. https:// 나 / 없이 도메인 주소만 입력해야 합니다.)`);
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
              <div 
                className="image-frame rounded-3xl hover:rotate-0 transition-transform duration-700 relative"
                style={{ transform: 'rotate(1deg)' }}
              >
                <img 
                  alt="식당 키오스크에서 밀접(Mealjeop) 스마트 맞춤 조제 영양제를 꺼내 든 모습" 
                  className="w-full h-full object-cover rounded-2xl aspect-[1.8/1] md:aspect-[1.5/1] block relative z-10 bg-white" 
                  src={heroImage}
                />
              </div>
            </div>
          </div>
        </section>

        <StickyFeatures />

        {/* Values */}
        <section className="py-10 md:py-24 relative" id="values">
          {/* Subtle background decoration for values section */}
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
            <div className="absolute -top-20 -right-20 w-64 h-64 md:-top-40 md:-right-40 md:w-96 md:h-96 bg-blue-100/40 rounded-full blur-3xl"></div>
            <div className="absolute top-20 -left-20 w-64 h-64 md:top-40 md:-left-40 md:w-96 md:h-96 bg-slate-200/40 rounded-full blur-3xl"></div>
          </div>
          <div className="max-w-7xl mx-auto px-5 md:px-8">
            <div className="mb-6 md:mb-16 md:text-center">
              <h2 className="text-2xl md:text-5xl font-headline font-extrabold text-primary tracking-tighter mb-1 md:mb-4">Core Values</h2>
              <p className="text-on-surface-variant max-w-2xl md:mx-auto font-body keep-all text-xs md:text-lg">밀접이 추구하는 네 가지 핵심 가치입니다.</p>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-8">
              {/* Value 1 */}
              <div className="group bg-white p-4 md:p-12 rounded-[1.25rem] md:rounded-[2rem] hover:shadow-[0_24px_64px_rgba(26,54,93,0.08)] transition-all duration-500 flex flex-col gap-3 md:gap-8 border border-outline-variant/20 relative overflow-hidden min-h-[160px] md:min-h-[320px]">
                <img 
                  src="https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=800" 
                  alt="Space & Vitality" 
                  className="absolute inset-0 w-full h-full object-cover opacity-[0.06] group-hover:opacity-[0.12] group-hover:scale-105 transition-all duration-1000 grayscale" 
                  referrerPolicy="no-referrer" 
                />
                <div className="absolute inset-0 bg-gradient-to-br from-white/80 via-white/40 to-transparent"></div>
                
                <div className="relative z-10 w-9 h-9 md:w-16 md:h-16 rounded-xl md:rounded-2xl bg-surface-container-low flex items-center justify-center text-primary group-hover:scale-110 group-hover:bg-primary group-hover:text-white transition-all duration-500 shadow-sm shrink-0">
                  <Map className="w-5 h-5 md:w-8 md:h-8" />
                </div>
                <div className="relative z-10 space-y-1.5 md:space-y-4 mt-auto">
                  <h3 className="text-sm md:text-3xl font-headline font-bold text-primary tracking-tight keep-all leading-tight">Space &<br className="md:hidden" /> Vitality</h3>
                  <p className="text-on-surface-variant text-[11px] md:text-lg leading-snug md:leading-relaxed keep-all">식사하는 모든 공간 건강의 거점으로.</p>
                </div>
              </div>
              
              {/* Value 2 */}
              <div className="group bg-white p-4 md:p-12 rounded-[1.25rem] md:rounded-[2rem] hover:shadow-[0_24px_64px_rgba(26,54,93,0.08)] transition-all duration-500 flex flex-col gap-3 md:gap-8 border border-outline-variant/20 relative overflow-hidden min-h-[160px] md:min-h-[320px]">
                <img 
                  src="https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&q=80&w=800" 
                  alt="Pure Identity" 
                  className="absolute inset-0 w-full h-full object-cover opacity-[0.06] group-hover:opacity-[0.12] group-hover:scale-105 transition-all duration-1000 grayscale" 
                  referrerPolicy="no-referrer" 
                />
                <div className="absolute inset-0 bg-gradient-to-br from-white/80 via-white/40 to-transparent"></div>
                
                <div className="relative z-10 w-9 h-9 md:w-16 md:h-16 rounded-xl md:rounded-2xl bg-surface-container-low flex items-center justify-center text-primary group-hover:scale-110 group-hover:bg-secondary group-hover:text-white transition-all duration-500 shadow-sm shrink-0">
                  <Leaf className="w-5 h-5 md:w-8 md:h-8" />
                </div>
                <div className="relative z-10 space-y-1.5 md:space-y-4 mt-auto">
                  <h3 className="text-sm md:text-3xl font-headline font-bold text-primary tracking-tight keep-all leading-tight">Pure<br className="md:hidden" /> Identity</h3>
                  <p className="text-on-surface-variant text-[11px] md:text-lg leading-snug md:leading-relaxed keep-all">첨가물 최소화 순수 성분.</p>
                </div>
              </div>
              
              {/* Value 3 */}
              <div className="group bg-white p-4 md:p-12 rounded-[1.25rem] md:rounded-[2rem] hover:shadow-[0_24px_64px_rgba(26,54,93,0.08)] transition-all duration-500 flex flex-col gap-3 md:gap-8 border border-outline-variant/20 relative overflow-hidden min-h-[160px] md:min-h-[320px]">
                <img 
                  src="https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&q=80&w=800" 
                  alt="Trust Policy" 
                  className="absolute inset-0 w-full h-full object-cover opacity-[0.06] group-hover:opacity-[0.12] group-hover:scale-105 transition-all duration-1000 grayscale" 
                  referrerPolicy="no-referrer" 
                />
                <div className="absolute inset-0 bg-gradient-to-br from-white/80 via-white/40 to-transparent"></div>
                
                <div className="relative z-10 w-9 h-9 md:w-16 md:h-16 rounded-xl md:rounded-2xl bg-surface-container-low flex items-center justify-center text-primary group-hover:scale-110 group-hover:bg-primary group-hover:text-white transition-all duration-500 shadow-sm shrink-0">
                  <BadgeCheck className="w-5 h-5 md:w-8 md:h-8" />
                </div>
                <div className="relative z-10 space-y-1.5 md:space-y-4 mt-auto">
                  <h3 className="text-sm md:text-3xl font-headline font-bold text-primary tracking-tight keep-all leading-tight">Trust<br className="md:hidden" /> Policy</h3>
                  <p className="text-on-surface-variant text-[11px] md:text-lg leading-snug md:leading-relaxed keep-all">임상 데이터 기반 전문 영양사 검수.</p>
                </div>
              </div>
              
              {/* Value 4 */}
              <div className="group bg-white p-4 md:p-12 rounded-[1.25rem] md:rounded-[2rem] hover:shadow-[0_24px_64px_rgba(26,54,93,0.08)] transition-all duration-500 flex flex-col gap-3 md:gap-8 border border-outline-variant/20 relative overflow-hidden min-h-[160px] md:min-h-[320px]">
                <img 
                  src="https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&q=80&w=800" 
                  alt="Individual Sealing" 
                  className="absolute inset-0 w-full h-full object-cover opacity-[0.06] group-hover:opacity-[0.12] group-hover:scale-105 transition-all duration-1000 grayscale" 
                  referrerPolicy="no-referrer" 
                />
                <div className="absolute inset-0 bg-gradient-to-br from-white/80 via-white/40 to-transparent"></div>
                
                <div className="relative z-10 w-9 h-9 md:w-16 md:h-16 rounded-xl md:rounded-2xl bg-surface-container-low flex items-center justify-center text-primary group-hover:scale-110 group-hover:bg-primary group-hover:text-white transition-all duration-500 shadow-sm shrink-0">
                  <Package className="w-5 h-5 md:w-8 md:h-8" />
                </div>
                <div className="relative z-10 space-y-1.5 md:space-y-4 mt-auto">
                  <h3 className="text-sm md:text-3xl font-headline font-bold text-primary tracking-tight keep-all leading-tight">Individual<br className="md:hidden" /> Sealing</h3>
                  <p className="text-on-surface-variant text-[11px] md:text-lg leading-snug md:leading-relaxed keep-all">보존을 위한 독자적인 실링 기술.</p>
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
        <section className="py-10 md:py-32 relative" id="pre-register">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-blue-50/30 pointer-events-none"></div>
          <div className="max-w-4xl mx-auto px-4 md:px-8">
            <div className="bg-white p-5 md:p-16 rounded-2xl md:rounded-3xl border border-outline-variant/15 relative overflow-hidden shadow-[0_16px_32px_rgba(26,54,93,0.06)] md:shadow-[0_32px_64px_rgba(26,54,93,0.06)]">
              <div className="absolute top-0 right-0 w-40 h-40 md:w-64 md:h-64 bg-secondary/5 rounded-full blur-3xl -mr-20 -mt-20 md:-mr-32 md:-mt-32"></div>
              
              {!isRegistered ? (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="relative z-10"
                >
                  <div className="text-center mb-6 md:mb-12">
                    <h2 className="text-xl md:text-5xl font-headline font-extrabold text-primary tracking-tighter mb-2 md:mb-4 keep-all">내 주변에 밀접이 생기면<br className="hidden sm:block"/> 알려드릴게요.</h2>
                    <p className="text-on-surface-variant max-w-xl mx-auto font-body keep-all leading-snug md:leading-relaxed text-[13px] md:text-base">
                      {quizStep === 3 ? (
                        <><span className="text-secondary font-bold">분석하신 맞춤 영양 조합을 담았습니다.</span><br/>내 생활 반경에 키오스크가 설치되면 바로 픽업할 수 있게 알려드릴게요!</>
                      ) : (
                        <>주로 생활하시는 직장이나 생활 반경 내에<br className="hidden sm:block"/> 밀접 키오스크가 설치되는 경우, 가장 먼저 알림을 보내드립니다.</>
                      )}
                      <br />
                      <span className="inline-block mt-3 md:mt-4 px-3 py-1.5 md:px-5 md:py-2.5 bg-secondary/10 text-primary font-bold rounded-lg md:rounded-xl text-[11px] md:text-sm shadow-sm break-keep">
                        🎁 알림 신청 시, 런칭 후 <span className="text-secondary">3일치 맞춤 영양제 이용권</span> 제공
                      </span>
                    </p>
                  </div>
                  
                  <form onSubmit={handleRegister} className="space-y-3 md:space-y-6 max-w-xl mx-auto">
                    <div className="space-y-1 md:space-y-2">
                      <label className="block font-label text-[11px] md:text-sm font-bold text-primary">이름</label>
                      <input 
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2.5 md:px-6 md:py-4 rounded-xl border-none bg-surface-container-low shadow-sm focus:ring-2 focus:ring-secondary/20 focus:outline-none placeholder:text-outline text-on-surface text-[13px] md:text-base" 
                        placeholder="이름" 
                        required 
                        type="text"
                      />
                    </div>
                    <div className="space-y-1 md:space-y-2">
                      <label className="block font-label text-[11px] md:text-sm font-bold text-primary">주요 생활 지역 (직장/집)</label>
                      <input 
                        name="location"
                        value={formData.location}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2.5 md:px-6 md:py-4 rounded-xl border-none bg-surface-container-low shadow-sm focus:ring-2 focus:ring-secondary/20 focus:outline-none placeholder:text-outline text-on-surface text-[13px] md:text-base" 
                        placeholder="예: 강남구 여의도동" 
                        required 
                        type="text"
                      />
                    </div>
                    <div className="space-y-1 md:space-y-2">
                      <label className="block font-label text-[11px] md:text-sm font-bold text-primary">연락처</label>
                      <input 
                        name="contact"
                        value={formData.contact}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2.5 md:px-6 md:py-4 rounded-xl border-none bg-surface-container-low shadow-sm focus:ring-2 focus:ring-secondary/20 focus:outline-none placeholder:text-outline text-on-surface text-[13px] md:text-base" 
                        placeholder="010-0000-0000" 
                        required 
                        type="tel"
                      />
                    </div>
                    <div className="pt-2 md:pt-4">
                      <button 
                        disabled={isSubmitting}
                        className="w-full signature-gradient text-white py-3 md:py-5 rounded-xl md:rounded-2xl font-bold text-[14px] md:text-lg hover:scale-[1.01] active:scale-[0.98] transition-all shadow-md md:shadow-[0_12px_32px_rgba(26,54,93,0.15)] disabled:opacity-70 disabled:hover:scale-100" 
                        type="submit"
                      >
                        {isSubmitting ? '신청 중...' : '알림 신청하기'}
                      </button>
                    </div>
                    <p className="text-center text-[10px] md:text-xs text-outline font-label pt-2 md:pt-4 leading-tight md:leading-relaxed keep-all">
                      알림 신청 시 혜택 안내를 위한 마케팅 정보 활용에 동의하게 됩니다.
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
        <section className="py-10 md:py-32 relative bg-surface-container-lowest" id="restaurant-recommend">
          <div className="max-w-4xl mx-auto px-4 md:px-8">
            <div className="bg-primary p-5 md:p-16 rounded-2xl md:rounded-3xl relative overflow-hidden shadow-[0_16px_32px_rgba(26,54,93,0.08)] md:shadow-[0_32px_64px_rgba(26,54,93,0.15)]">
              <div className="absolute top-0 right-0 w-40 h-40 md:w-64 md:h-64 bg-secondary/20 rounded-full blur-3xl -mr-20 -mt-20 md:-mr-32 md:-mt-32"></div>
              <div className="absolute bottom-0 left-0 w-40 h-40 md:w-64 md:h-64 bg-secondary/10 rounded-full blur-3xl -ml-20 -mb-20 md:-ml-32 md:-mb-32"></div>
              
              {!isRestaurantRegistered ? (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="relative z-10"
                >
                  <div className="text-center mb-6 md:mb-12">
                    <div className="inline-flex items-center justify-center w-10 h-10 md:w-16 md:h-16 rounded-xl md:rounded-2xl bg-white/10 text-secondary mb-3 md:mb-6 backdrop-blur-sm">
                      <Map className="w-5 h-5 md:w-8 md:h-8" />
                    </div>
                    <h2 className="text-xl md:text-4xl font-headline font-extrabold text-white tracking-tighter mb-2 md:mb-4 keep-all">밀접 설치를 위한<br/>식당을 추천해주세요!</h2>
                    <p className="text-blue-100/80 max-w-xl mx-auto font-body keep-all text-[13px] md:text-lg leading-snug md:leading-relaxed">
                      추천해주신 식당에 오프라인 지점이 오픈되면,<br className="hidden md:block"/>
                      추첨을 통해 <strong className="text-secondary font-bold">맞춤 영양제 1주일 이용권</strong>을 드립니다.
                    </p>
                  </div>
                  
                  <form onSubmit={handleRestaurantSubmit} className="space-y-3 md:space-y-6 max-w-xl mx-auto">
                    <div className="space-y-1 md:space-y-2">
                      <label className="block font-label text-[11px] md:text-sm font-bold text-blue-100">추천 식당 상호명</label>
                      <input 
                        name="restaurantName"
                        value={restaurantFormData.restaurantName}
                        onChange={handleRestaurantInputChange}
                        className="w-full px-3 py-2.5 md:px-6 md:py-4 rounded-xl md:rounded-2xl border border-white/10 bg-white/5 text-white shadow-sm focus:ring-2 focus:ring-secondary/50 focus:border-secondary/50 focus:outline-none placeholder:text-blue-100/30 backdrop-blur-sm transition-all text-[13px] md:text-base" 
                        placeholder="예: 강남 코엑스점" 
                        required 
                        type="text"
                      />
                    </div>
                    <div className="space-y-1 md:space-y-2">
                      <label className="block font-label text-[11px] md:text-sm font-bold text-blue-100">위치 (주소)</label>
                      <input 
                        name="restaurantLocation"
                        value={restaurantFormData.restaurantLocation}
                        onChange={handleRestaurantInputChange}
                        className="w-full px-3 py-2.5 md:px-6 md:py-4 rounded-xl md:rounded-2xl border border-white/10 bg-white/5 text-white shadow-sm focus:ring-2 focus:ring-secondary/50 focus:border-secondary/50 focus:outline-none placeholder:text-blue-100/30 backdrop-blur-sm transition-all text-[13px] md:text-base" 
                        placeholder="예: 강남구 테헤란로" 
                        required 
                        type="text"
                      />
                    </div>
                    <div className="space-y-1 md:space-y-2">
                      <label className="block font-label text-[11px] md:text-sm font-bold text-blue-100">연락처</label>
                      <input 
                        name="contact"
                        value={restaurantFormData.contact}
                        onChange={handleRestaurantInputChange}
                        className="w-full px-3 py-2.5 md:px-6 md:py-4 rounded-xl md:rounded-2xl border border-white/10 bg-white/5 text-white shadow-sm focus:ring-2 focus:ring-secondary/50 focus:border-secondary/50 focus:outline-none placeholder:text-blue-100/30 backdrop-blur-sm transition-all text-[13px] md:text-base" 
                        placeholder="010-0000-0000" 
                        required 
                        type="tel"
                      />
                    </div>
                    <div className="pt-2 md:pt-4">
                      <button 
                        disabled={isRestaurantSubmitting}
                        className="w-full bg-secondary text-primary py-3 md:py-5 rounded-xl md:rounded-2xl font-bold text-[14px] md:text-lg hover:bg-secondary/90 hover:scale-[1.01] active:scale-[0.98] transition-all shadow-md md:shadow-[0_12px_32px_rgba(0,0,0,0.2)] disabled:opacity-70 disabled:hover:scale-100" 
                        type="submit"
                      >
                        {isRestaurantSubmitting ? '추천 중...' : '식당 추천완료'}
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

      <InquiryForm />
    </div>
  );
}
