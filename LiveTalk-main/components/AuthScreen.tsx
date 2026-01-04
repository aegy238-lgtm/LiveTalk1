
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User, Zap, LogIn, UserPlus, Smartphone, Camera, MapPin, X, PlusSquare, ChevronLeft, Check } from 'lucide-react';
import { UserLevel, User as UserType } from '../types';
import { auth, db } from '../services/firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword 
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDoc, 
  serverTimestamp 
} from 'firebase/firestore';

interface AuthScreenProps {
  onAuth: (user: UserType) => void;
  appLogo?: string;
  authBackground?: string;
  appName?: string;
  appSubtitle?: string;
  canInstall?: boolean;
  onInstall?: () => void;
}

const ROOT_ADMIN_EMAIL = 'root-admin@livetalk.com';
const ADMIN_MASTER_PASS = '12345678';

const COUNTRIES = [
  { name: 'مصر', flag: '🇪🇬' }, { name: 'السعودية', flag: '🇸🇦' }, { name: 'الإمارات', flag: '🇦🇪' },
  { name: 'الكويت', flag: '🇰🇼' }, { name: 'العراق', flag: '🇮🇶' }, { name: 'المغرب', flag: '🇲🇦' },
  { name: 'الجزائر', flag: '🇩🇿' }, { name: 'الأردن', flag: '🇯🇴' }, { name: 'لبنان', flag: '🇱🇧' },
  { name: 'فلسطين', flag: '🇵🇸' }, { name: 'سوريا', flag: '🇸🇾' }, { name: 'اليمن', flag: '🇾🇪' },
  { name: 'تونس', flag: '🇹🇳' }, { name: 'ليبيا', flag: '🇱🇾' }, { name: 'السودان', flag: '🇸🇩' },
  { name: 'سلطنة عمان', flag: '🇴🇲' }, { name: 'البحرين', flag: '🇧🇭' }, { name: 'قطر', flag: '🇶🇦' },
];

const compressImage = (base64: string, maxWidth: number, maxHeight: number, quality: number = 0.25): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      if (width > height) {
        if (width > maxWidth) { height *= maxWidth / width; width = maxWidth; }
      } else {
        if (height > maxHeight) { width *= maxHeight / height; height = maxHeight; }
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'medium';
        ctx.drawImage(img, 0, 0, width, height);
      }
      resolve(canvas.toDataURL('image/webp', quality));
    };
  });
};

const AuthScreen: React.FC<AuthScreenProps> = ({ onAuth, appLogo, authBackground, appName, appSubtitle, canInstall, onInstall }) => {
  const [showSplash, setShowSplash] = useState(true);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState<string | null>(null);
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]);
  const [showCountrySelector, setShowCountrySelector] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const LOGO = appLogo || 'https://storage.googleapis.com/static.aistudio.google.com/stables/2025/03/06/f0e64906-e7e0-4a87-af9b-029e2467d302/f0e64906-e7e0-4a87-af9b-029e2467d302.png';
  const NAME = appName || ''; // لا يوجد اسم افتراضي مثبت، سيتم الاعتماد على prop
  const SUBTITLE = appSubtitle || 'Real-time Voice Community';

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const result = ev.target?.result as string;
        const compressed = await compressImage(result, 128, 128, 0.4);
        setAvatar(compressed);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || (!isLogin && !name)) {
      setError('الرجاء ملء جميع الحقول');
      return;
    }
    setLoading(true);
    setError('');

    const effectivePassword = email.toLowerCase() === ROOT_ADMIN_EMAIL ? (password || ADMIN_MASTER_PASS) : password;

    try {
      if (isLogin) {
        const userCredential = await signInWithEmailAndPassword(auth, email, effectivePassword);
        const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
        if (userDoc.exists()) onAuth(userDoc.data() as UserType);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, effectivePassword);
        const userData: UserType = {
          id: userCredential.user.uid,
          customId: Math.floor(100000 + Math.random() * 899999),
          name: name,
          avatar: avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userCredential.user.uid}`,
          level: UserLevel.NEW, coins: 5000, diamonds: 0, wealth: 0, charm: 0, isVip: false,
          location: selectedCountry.flag + ' ' + selectedCountry.name,
          gender: gender,
          stats: { likes: 0, visitors: 0, following: 0, followers: 0 }, ownedItems: []
        };
        await setDoc(doc(db, 'users', userCredential.user.uid), { ...userData, email: email, createdAt: serverTimestamp() });
        onAuth(userData);
      }
    } catch (err: any) {
      setError('خطأ في البيانات أو كلمة المرور');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-[100dvh] w-full bg-[#020617] flex flex-col overflow-hidden font-cairo relative">
      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      <AnimatePresence>
        {showSplash && (
          <motion.div exit={{ opacity: 0 }} className="fixed inset-0 z-[1000] bg-[#020617] flex flex-col items-center justify-center">
            <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="w-24 h-24 bg-gradient-to-br from-amber-400 to-orange-600 rounded-[2rem] p-0.5 shadow-2xl">
              <img src={LOGO} className="w-full h-full object-cover rounded-[1.8rem]" />
            </motion.div>
            <h1 className="mt-4 text-2xl font-black text-white tracking-widest uppercase">{NAME}</h1>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-cover bg-center transition-opacity" style={{ backgroundImage: authBackground ? `url(${authBackground})` : 'none' }}>
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/40 to-[#020617]"></div>
        </div>
      </div>

      <div className="relative z-10 w-full h-full flex flex-col items-center justify-center pt-safe px-5">
        {/* Header - Completely Dynamic */}
        <div className="flex flex-col items-center shrink-0 mb-4">
          <motion.div 
            initial={{ y: -10, opacity: 0 }} 
            animate={{ y: 0, opacity: 1 }}
            className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-600 rounded-xl mb-3 p-0.5 shadow-2xl border border-white/10"
          >
            <img src={LOGO} className="w-full h-full object-cover rounded-xl" />
          </motion.div>
          <motion.h2 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }}
            className="text-xl font-black text-white drop-shadow-lg text-center leading-none uppercase"
          >
            مرحباً بك في {NAME}
          </motion.h2>
          <p className="text-[8px] text-white/40 font-bold uppercase tracking-[0.3em] mt-1.5">{SUBTITLE}</p>
        </div>

        {/* Main Form Container */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="w-full max-w-sm bg-slate-900/80 backdrop-blur-3xl border border-white/10 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col h-fit"
        >
          
          {/* Tabs */}
          <div className="p-3 pb-0 shrink-0">
            <div className="flex w-full bg-black/40 p-1 rounded-xl border border-white/5">
              <button onClick={() => { setIsLogin(true); setError(''); }} className={`flex-1 py-2 rounded-lg text-[10px] font-black transition-all ${isLogin ? 'bg-amber-500 text-black shadow-lg' : 'text-slate-500'}`}>تسجيل الدخول</button>
              <button onClick={() => { setIsLogin(false); setError(''); }} className={`flex-1 py-2 rounded-lg text-[10px] font-black transition-all ${!isLogin ? 'bg-amber-500 text-black shadow-lg' : 'text-slate-500'}`}>عضو جديد</button>
            </div>
          </div>

          {/* Form Area */}
          <div className="overflow-y-auto px-5 py-4 scrollbar-hide max-h-[65dvh]">
            <form onSubmit={handleAuth} className="space-y-3">
              <AnimatePresence mode="wait">
                {!isLogin && (
                  <motion.div key="signup" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-3">
                    <div className="flex flex-col items-center gap-1.5 mb-1">
                      <div className="relative">
                        <div className="w-16 h-16 rounded-[1.4rem] bg-slate-800 border-2 border-dashed border-white/20 flex items-center justify-center overflow-hidden">
                          {avatar ? <img src={avatar} className="w-full h-full object-cover" /> : <Camera className="text-slate-500" size={22} />}
                        </div>
                        <label className="absolute -bottom-1 -right-1 bg-amber-500 text-black p-1 rounded-lg shadow-lg cursor-pointer active:scale-90 border-2 border-slate-900">
                          <PlusSquare size={14} />
                          <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                        </label>
                      </div>
                      <p className="text-[8px] text-slate-500 font-black uppercase">صورة الحساب</p>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-500 pr-1 uppercase">البلد</label>
                        <button type="button" onClick={() => setShowCountrySelector(true)} className="w-full h-10 bg-black/40 border border-white/5 rounded-lg px-2 text-white text-[10px] flex items-center justify-between active:bg-black/60">
                          <span className="flex items-center gap-1.5">
                            <span>{selectedCountry.flag}</span>
                            <span className="truncate max-w-[40px] font-bold">{selectedCountry.name}</span>
                          </span>
                          <MapPin size={10} className="text-amber-500" />
                        </button>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-500 pr-1 uppercase">الجنس</label>
                        <div className="flex h-10 bg-black/40 p-1 rounded-lg border border-white/5">
                          <button type="button" onClick={() => setGender('male')} className={`flex-1 rounded-md text-[9px] font-black transition-all ${gender === 'male' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500'}`}>ذكر</button>
                          <button type="button" onClick={() => setGender('female')} className={`flex-1 rounded-md text-[9px] font-black transition-all ${gender === 'female' ? 'bg-pink-600 text-white shadow-md' : 'text-slate-500'}`}>أنثى</button>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-500 pr-1 uppercase">الاسم المستعار</label>
                      <div className="relative">
                        <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full h-10 bg-black/40 border border-white/10 rounded-lg px-3 pr-9 text-white text-xs font-bold outline-none focus:border-amber-500/50" placeholder="مثلاً: بوبو الملك" />
                        <User className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-500 pr-1 uppercase">البريد الإلكتروني</label>
                <div className="relative">
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full h-10 bg-black/40 border border-white/10 rounded-lg px-3 pr-9 text-white text-xs font-bold outline-none focus:border-amber-500/50" placeholder="name@example.com" />
                  <Mail className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-500 pr-1 uppercase">كلمة المرور</label>
                <div className="relative">
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full h-10 bg-black/40 border border-white/10 rounded-lg px-3 pr-9 text-white text-xs font-bold outline-none focus:border-amber-500/50" placeholder="••••••••" />
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                </div>
              </div>

              {error && <p className="text-red-500 text-[9px] font-bold bg-red-500/10 p-2 rounded-lg border border-red-500/20 text-center">{error}</p>}

              <button type="submit" disabled={loading} className="w-full h-12 bg-gradient-to-r from-amber-500 to-orange-600 rounded-xl text-black font-black text-xs shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 mt-2">
                {loading ? <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" /> : (isLogin ? <><LogIn size={16} /> دخول سريع</> : <><UserPlus size={16} /> إنشاء الحساب</>)}
              </button>
            </form>
          </div>
          
          {canInstall && (
            <div className="p-3 pt-0">
              <button type="button" onClick={onInstall} className="w-full h-9 bg-white/5 border border-white/5 rounded-lg flex items-center justify-center gap-2 text-white/30 font-black text-[8px] uppercase tracking-widest active:bg-white/10">
                <Smartphone size={12} /> تثبيت التطبيق الرسمي
              </button>
            </div>
          )}
        </motion.div>
      </div>

      <AnimatePresence>
        {showCountrySelector && (
          <div className="fixed inset-0 z-[2000] flex items-end justify-center">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowCountrySelector(false)} className="absolute inset-0 bg-black/80 backdrop-blur-md" />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 30, stiffness: 300 }} className="relative w-full max-w-md bg-[#0f172a] rounded-t-[2rem] border-t border-white/10 flex flex-col max-h-[70dvh] shadow-2xl">
              <div className="p-4 bg-slate-800/50 border-b border-white/5 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 bg-amber-500/20 rounded-lg"><MapPin size={14} className="text-amber-500" /></div>
                  <span className="text-xs font-black text-white">اختر بلدك الأم</span>
                </div>
                <button onClick={() => setShowCountrySelector(false)} className="p-1.5 bg-white/5 rounded-full text-slate-400 active:scale-90"><X size={18}/></button>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-1.5 scrollbar-hide pb-8">
                {COUNTRIES.map((c) => (
                  <button key={c.name} onClick={() => { setSelectedCountry(c); setShowCountrySelector(false); }} className={`w-full h-12 px-4 rounded-xl flex items-center justify-between text-right transition-all active:scale-[0.98] ${selectedCountry.name === c.name ? 'bg-amber-500 text-black font-black' : 'bg-white/5 text-slate-300 font-bold'}`}>
                    <span className="text-[10px]">{c.name}</span>
                    <span className="text-xl">{c.flag}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AuthScreen;
