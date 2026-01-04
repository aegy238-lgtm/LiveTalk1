
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Home, User as UserIcon, Plus, Bell, Crown, Gem, Settings, ChevronRight, Edit3, Share2, LogOut, Shield, Database, ShoppingBag, Camera, Trophy, Flame, Sparkles, UserX, Star, ShieldCheck, MapPin, Download, Smartphone, MessageCircle, Languages, Smartphone as MobileIcon, Wallet, Medal, Lock, AlertCircle, Key, X, Zap, BadgeCheck, ChevronLeft, Award, Coins, Users, UserPlus, Eye, Heart, Gamepad2, UserCheck } from 'lucide-react';
import RoomCard from './components/RoomCard';
import VoiceRoom from './components/VoiceRoom';
import AuthScreen from './components/AuthScreen';
import Toast, { ToastMessage } from './components/Toast';
import VIPModal from './components/VIPModal';
import EditProfileModal from './components/EditProfileModal';
import BagModal from './components/BagModal';
import WalletModal from './components/WalletModal';
import CreateRoomModal from './components/CreateRoomModal';
import GlobalBanner from './components/GlobalBanner';
import GlobalLuckyBagBanner from './components/GlobalLuckyBagBanner';
import AdminPanel from './components/AdminPanel';
import MiniPlayer from './components/MiniPlayer';
import PrivateChatModal from './components/PrivateChatModal';
import MessagesTab from './components/MessagesTab';
import ActivitiesTab from './components/ActivitiesTab';
import AgencyRechargeModal from './components/AgencyRechargeModal';
import WheelGameModal from './components/WheelGameModal';
import SlotsGameModal from './components/SlotsGameModal';
import LionWheelGameModal from './components/LionWheelGameModal';
import CPModal from './components/CPModal';
import HostAgentDashboard from './components/HostAgentDashboard';
import GlobalLeaderboardModal from './components/GlobalLeaderboardModal';
import { DEFAULT_VIP_LEVELS, DEFAULT_GIFTS, DEFAULT_STORE_ITEMS } from './constants';
import { Room, User, VIPPackage, UserLevel, Gift, StoreItem, GameSettings, GlobalAnnouncement, LuckyBag, GameType } from './types';
import { AnimatePresence, motion } from 'framer-motion';
import { db, auth } from './services/firebase';
import { EconomyEngine } from './services/economy'; 
import { collection, onSnapshot, doc, setDoc, query, orderBy, addDoc, getDoc, serverTimestamp, deleteDoc, updateDoc, arrayUnion, arrayRemove, increment, limit, where, writeBatch, Timestamp } from 'firebase/firestore';
import { deleteUser, signOut } from 'firebase/auth';

const translations = {
  ar: { home: "غرفة", messages: "المحادثة", profile: "انا", activities: "النشاطات", createRoom: "إنشاء", activeRooms: "الغرف النشطة", wallet: "Wallet", vip: "VIP", store: "المتجر", bag: "حقيبة", level: "مستوى", agency: "وكالة", cp: "CP", invite: "دعوة", blacklist: "القائمة السوداء", privacy: "الخصوصية والسياسة", settings: "إعدادات", id: "ID", myWallet: "المحفظة", logout: "خروج", officialAgent: "وكيل رسمي" },
  en: { home: "Room", messages: "Chats", profile: "Me", activities: "Activities", createRoom: "Create", activeRooms: "Active Rooms", wallet: "Wallet", vip: "VIP", store: "Store", bag: "Bag", level: "Level", agency: "Agency", cp: "CP", invite: "Invite", blacklist: "Blacklist", privacy: "Privacy", settings: "Settings", id: "ID", myWallet: "Wallet", logout: "Logout", officialAgent: "Official Agent" }
};

const ROOT_ADMIN_EMAIL = 'root-admin@livetalk.com';
const PERMANENT_LOGO_URL = 'https://storage.googleapis.com/static.aistudio.google.com/stables/2025/03/06/f0e64906-e7e0-4a87-af9b-029e2467d302/f0e64906-e7e0-4a87-af9b-029e2467d302.png';

const calculateLvl = (pts: number) => {
  if (!pts || pts <= 0) return 1;
  const l = Math.floor(Math.sqrt(pts) / 200);
  return Math.max(1, Math.min(100, l));
};

const HeaderLevelBadge: React.FC<{ level: number; type: 'wealth' | 'recharge' }> = ({ level, type }) => {
  const isWealth = type === 'wealth';
  return (
    <div className="relative h-4 min-w-[42px] flex items-center group cursor-default">
      <div className={`absolute inset-0 rounded-l-sm rounded-r-lg border border-amber-500/30 ${
        isWealth ? 'bg-gradient-to-r from-[#6a29e3] to-[#8b5cf6]' : 'bg-[#121212]'
      }`}></div>
      <div className="relative z-10 flex-1 text-center pr-1">
        <span className="text-[7px] font-black italic text-white drop-shadow-md">{level}</span>
      </div>
      <div className="relative z-20 w-4 h-4 flex items-center justify-center -ml-1">
        <div className={`absolute inset-0 rounded-sm transform rotate-45 border border-amber-500/50 ${
          isWealth ? 'bg-[#7c3aed]' : 'bg-black'
        }`}></div>
        <span className="relative z-30 text-[6px] mb-0.5">👑</span>
      </div>
    </div>
  );
};

export default function App() {
  const [initializing, setInitializing] = useState(true);
  const [activeTab, setActiveTab] = useState<'home' | 'messages' | 'profile' | 'rank'>('home');
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [isRoomMinimized, setIsRoomMinimized] = useState(false);
  const [isUserMuted, setIsUserMuted] = useState(true);
  const [language, setLanguage] = useState<'ar' | 'en'>('ar');
  
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]); 
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [storeItems, setStoreItems] = useState<StoreItem[]>([]);
  const [vipLevels, setVipLevels] = useState<VIPPackage[]>([]);
  const [announcement, setAnnouncement] = useState<GlobalAnnouncement | null>(null);
  const [appBanner, setAppBanner] = useState('');
  const [appName, setAppName] = useState(''); // سيبدأ فارغاً ليتم جلب الاسم الفعلي من قاعدة البيانات حصراً
  const [appSubtitle, setAppSubtitle] = useState('');
  const [authBackground, setAuthBackground] = useState('');
  const [privateChatPartner, setPrivateChatPartner] = useState<User | null>(null);
  const [activeGame, setActiveGame] = useState<GameType | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showGlobalLeaderboard, setShowGlobalLeaderboard] = useState(false);
  
  const [gameSettings, setGameSettings] = useState<GameSettings>({
    slotsWinRate: 35,
    wheelWinRate: 45,
    lionWinRate: 30,
    luckyGiftWinRate: 30,
    luckyGiftRefundPercent: 0,
    luckyXEnabled: false,
    luckyMultipliers: [],
    wheelJackpotX: 8,
    wheelNormalX: 2,
    slotsSevenX: 20,
    slotsFruitX: 5,
    availableEmojis: [],
    emojiDuration: 4,
    wheelChips: [10000, 1000000, 5000000, 20000000],
    slotsChips: [10000, 1000000, 5000000, 20000000],
    lionChips: [100, 1000, 10000, 100000]
  });

  const lastAnnouncementId = useRef<string | null>(null);
  const [appLogo, setAppLogo] = useState(() => localStorage.getItem('vivo_live_fixed_logo') || PERMANENT_LOGO_URL);

  const t = translations[language];

  // تحديث عنوان التبويب في المتصفح فوراً عند تغير الاسم في لوحة التحكم
  useEffect(() => {
    if (appName) {
      document.title = appName;
    }
  }, [appName]);

  const isRootAdmin = useMemo(() => {
    const currentEmail = auth.currentUser?.email?.toLowerCase();
    return currentEmail === ROOT_ADMIN_EMAIL.toLowerCase();
  }, [auth.currentUser?.email]);

  const checkAdminPrivileges = async (loggedInUser: User) => {
    const currentEmail = auth.currentUser?.email?.toLowerCase();
    if (currentEmail === ROOT_ADMIN_EMAIL.toLowerCase() && !loggedInUser.isAdmin) {
      try {
         await updateDoc(doc(db, 'users', loggedInUser.id), { isAdmin: true });
         setUser(prev => prev ? { ...prev, isAdmin: true } : null);
      } catch (e) {}
    }
  };

  const handleInstallApp = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
      setDeferredPrompt(null);
    }
  };

  useEffect(() => {
    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    const qAnnouncements = query(collection(db, 'global_announcements'), orderBy('timestamp', 'desc'), limit(1));
    const unsubAnnouncements = onSnapshot(qAnnouncements, (snapshot) => {
      if (!snapshot.empty) {
        const data = snapshot.docs[0].data() as GlobalAnnouncement;
        const id = snapshot.docs[0].id;
        if (id !== lastAnnouncementId.current) {
          lastAnnouncementId.current = id;
          setAnnouncement({ id, ...data });
          setTimeout(() => setAnnouncement(null), data.type === 'lucky_win' ? 10000 : 8000);
        }
      }
    });

    const unsubIdentity = onSnapshot(doc(db, 'appSettings', 'identity'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.appBanner) setAppBanner(data.appBanner);
        if (data.appLogo) setAppLogo(data.appLogo);
        if (data.appName) setAppName(data.appName);
        if (data.appSubtitle) setAppSubtitle(data.appSubtitle);
        if (data.authBackground) setAuthBackground(data.authBackground);
      } else {
        // قيم افتراضية في حال عدم وجود مستند في قاعدة البيانات
        setAppName('تطبيقي');
      }
    });

    const unsubGames = onSnapshot(doc(db, 'appSettings', 'games'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.gameSettings) setGameSettings(prev => ({...prev, ...data.gameSettings}));
      }
    });

    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
        const usersData = snapshot.docs.map(doc => {
          const d = doc.data();
          return { id: doc.id, ...d, wealthLevel: calculateLvl(d.wealth || 0), rechargeLevel: calculateLvl(d.rechargePoints || 0), coins: Number(d.coins || 0), diamonds: Number(d.diamonds || 0) } as User;
        });
        setUsers(usersData);
        if (user) {
          const currentInDb = usersData.find(u => u.id === user.id);
          if (currentInDb) {
            setUser(currentInDb);
            checkAdminPrivileges(currentInDb);
          }
        }
    });

    const qRooms = query(collection(db, 'rooms'), orderBy('listeners', 'desc'));
    const unsubRooms = onSnapshot(qRooms, (snapshot) => {
      const roomsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Room));
      setRooms(roomsData);
    });

    const unsubGifts = onSnapshot(collection(db, 'gifts'), (snapshot) => {
      const giftsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Gift));
      setGifts(giftsData.length > 0 ? giftsData : DEFAULT_GIFTS);
    });

    const unsubStore = onSnapshot(collection(db, 'store'), (snapshot) => {
      const storeData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StoreItem));
      setStoreItems(storeData.length > 0 ? storeData : DEFAULT_STORE_ITEMS);
    });

    const unsubVips = onSnapshot(collection(db, 'vip'), (snapshot) => {
      const vipData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VIPPackage));
      setVipLevels(vipData.length > 0 ? vipData.sort((a,b) => a.level - b.level) : DEFAULT_VIP_LEVELS);
    });

    const savedUser = localStorage.getItem('voice_chat_user');
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      getDoc(doc(db, 'users', parsedUser.id)).then((docSnap) => {
        if (docSnap.exists()) {
          const uData = { id: docSnap.id, ...docSnap.data() } as User;
          setUser(uData);
          checkAdminPrivileges(uData);
        }
        setInitializing(false);
      });
    } else { setInitializing(false); }
    
    return () => { 
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      unsubAnnouncements(); unsubIdentity(); unsubGames(); unsubRooms(); unsubUsers(); unsubGifts(); unsubStore(); unsubVips();
    };
  }, []);

  const handleUpdateUser = async (updatedData: any) => {
    if (!user) return;
    const firestoreData = Object.fromEntries(Object.entries(updatedData).filter(([_, v]) => v !== undefined));
    setUser(prev => prev ? { ...prev, ...firestoreData } : null);
    try { 
      await updateDoc(doc(db, 'users', user.id), firestoreData); 
      if (firestoreData.customId || firestoreData.name || firestoreData.avatar || firestoreData.badge || firestoreData.frame || firestoreData.isSpecialId || firestoreData.idColor) {
        const roomRef = doc(db, 'rooms', user.id);
        const roomSnap = await getDoc(roomRef);
        if (roomSnap.exists()) {
          const roomData = roomSnap.data() as Room;
          const updatedSpeakers = [...(roomData.speakers || [])];
          if (updatedSpeakers[0] && updatedSpeakers[0].id === user.id) {
            updatedSpeakers[0] = { ...updatedSpeakers[0], ...firestoreData };
            await updateDoc(roomRef, {
              hostCustomId: firestoreData.customId || updatedSpeakers[0].customId,
              speakers: updatedSpeakers
            });
          }
        }
      }
    } catch (e) {
      console.error("Sync user update to room failed", e);
    }
  };

  const handleUpdateRoom = async (roomId: string, data: Partial<Room>) => {
    try { await updateDoc(doc(db, 'rooms', roomId), data); } catch (e) {}
  };

  const handleLogout = async () => {
    await signOut(auth); setUser(null); setCurrentRoom(null);
    localStorage.removeItem('voice_chat_user');
  };

  const handleRoomJoin = async (room: Room) => {
    setCurrentRoom(room); 
    setIsRoomMinimized(false);
    try { await updateDoc(doc(db, 'rooms', room.id), { listeners: increment(1) }); } catch (e) {}
  };

  const handleRoomLeave = async () => {
    if (!currentRoom || !user) return;
    const roomId = currentRoom.id; 
    const isHost = currentRoom.hostId === user.id;
    setCurrentRoom(null);
    try {
      if (isHost) { await deleteDoc(doc(db, 'rooms', roomId)); } 
      else { await updateDoc(doc(db, 'rooms', roomId), { speakers: (currentRoom.speakers || []).filter(s => s.id !== user.id), listeners: increment(-1) }); }
    } catch (e) {}
  };

  const executeCreateRoom = async (data: any) => {
    if (!user) return;
    try {
      const hostAsSpeaker = { 
        id: user.id, 
        customId: user.customId,
        name: user.name, 
        avatar: user.avatar, 
        badge: user.badge || null,
        isSpecialId: user.isSpecialId || false,
        idColor: user.idColor || null,
        seatIndex: 0, 
        isMuted: false, 
        charm: 0, 
        frame: user.frame || null 
      };
      const roomDocRef = doc(db, 'rooms', user.id);
      const roomData = { ...data, hostId: user.id, hostCustomId: user.customId, listeners: 1, speakers: [hostAsSpeaker], micCount: 8 };
      await setDoc(roomDocRef, roomData);
      handleRoomJoin({ id: user.id, ...roomData } as any);
    } catch (e) { alert('فشل إنشاء الغرفة'); }
  };

  const [showVIPModal, setShowVIPModal] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [showBagModal, setShowBagModal] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showCreateRoomModal, setShowCreateRoomModal] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showAgencyModal, setShowAgencyModal] = useState(false);
  const [showCPModal, setShowCPModal] = useState(false);
  const [showHostAgentDashboard, setShowHostAgentDashboard] = useState(false);

  const handleBuyVIP = (vip: VIPPackage) => {
    const currentCoins = Number(user?.coins || 0);
    if (currentCoins < vip.cost) {
      alert('عذراً، رصيدك غير كافٍ لتفعيل هذه الرتبة 🪙');
      return;
    }
    handleUpdateUser({ 
      isVip: true, 
      vipLevel: vip.level, 
      coins: currentCoins - vip.cost, 
      wealth: Number(user?.wealth || 0) + vip.cost, 
      frame: vip.frameUrl 
    });
    setShowVIPModal(false);
  };

  if (initializing) return (
    <div className="h-[100dvh] w-full bg-[#020617] flex flex-col items-center justify-center font-cairo">
      <div className="w-32 h-32 bg-gradient-to-br from-amber-400 to-orange-600 rounded-[2.5rem] overflow-hidden shadow-2xl p-1 animate-pulse">
        <img src={appLogo} className="w-full h-full object-cover rounded-[2.3rem]" />
      </div>
      <h1 className="mt-6 text-xl font-black text-white tracking-widest animate-pulse">{appName || 'جاري التحميل...'}</h1>
    </div>
  );

  if (!user) return <AuthScreen onAuth={(u) => { setUser(u); localStorage.setItem('voice_chat_user', JSON.stringify(u)); }} appLogo={appLogo} authBackground={authBackground} appName={appName} appSubtitle={appSubtitle} canInstall={!!deferredPrompt} onInstall={handleInstallApp} />;

  return (
    <div className={`h-[100dvh] w-full bg-[#030816] text-white relative md:max-w-md mx-auto shadow-2xl overflow-hidden flex flex-col font-cairo`}>
      <div className="absolute top-0 left-0 right-0 z-[10000] pointer-events-none">
        <AnimatePresence>{announcement && ( <GlobalBanner announcement={announcement} /> )}</AnimatePresence>
      </div>
      
      <div className="flex-1 overflow-y-auto pb-24 scrollbar-hide">
        {activeTab === 'home' && (
           <div className="mt-2 space-y-3 px-4">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                  <img src={appLogo} className="w-8 h-8 rounded-lg" />
                  <span className="text-xs font-black text-white/40 uppercase tracking-widest truncate max-w-[120px]">{appName}</span>
                </div>
              </div>
              <div className="relative w-full h-28 rounded-2xl overflow-hidden bg-slate-800 border border-white/5 shadow-lg">{appBanner && <img src={appBanner} className="w-full h-full object-cover" />}</div>
              <div className="flex justify-between items-center px-1">
                <h2 className="text-xs font-bold text-white flex items-center gap-1.5"><Flame size={14} className="text-orange-500" /> {t.activeRooms}</h2>
                <button onClick={() => setShowGlobalLeaderboard(true)} className="bg-gradient-to-r from-amber-500 to-orange-600 p-2 rounded-xl border border-amber-400/30 shadow-lg shadow-amber-900/20 active:scale-90 transition-transform"><Trophy size={18} className="text-white" fill="currentColor" /></button>
              </div>
              <div className="grid gap-2.5">{rooms.map(room => ( <RoomCard key={room.id} room={room} onClick={handleRoomJoin} /> ))}</div>
           </div>
        )}

        {activeTab === 'messages' && <MessagesTab currentUser={user} onOpenChat={(p) => setPrivateChatPartner(p)} />}
        {activeTab === 'rank' && <ActivitiesTab onOpenGame={setActiveGame} />}

        {activeTab === 'profile' && (
          <div className="flex flex-col bg-[#030816] min-h-full" dir="rtl">
            <div className="relative w-full h-44 md:h-48 shrink-0 overflow-hidden">
               {user.cover ? <img src={user.cover} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gradient-to-br from-blue-900 via-indigo-950 to-black"></div>}
               <div className="absolute inset-0 bg-gradient-to-t from-[#030816] via-transparent to-black/30"></div>
               <div className="absolute bottom-3 right-5 flex items-center gap-3">
                  <div className="relative w-16 h-16 md:w-20 md:h-20">
                     <div className="w-full h-full rounded-full border-2 border-white/20 overflow-hidden bg-slate-900 shadow-2xl"><img src={user.avatar} className="w-full h-full object-cover" /></div>
                     {user.frame && <img src={user.frame} className="absolute inset-0 scale-[1.3] pointer-events-none" />}
                  </div>
                  <div className="flex flex-col gap-1">
                     <div className="flex items-center gap-1.5"><h2 className="text-base md:text-lg font-black text-white">{user.name}</h2></div>
                     <div className="flex items-center gap-2">
                        {user.badge ? (
                          <div className="relative flex items-center justify-center h-6 min-w-[70px] px-2.5" onClick={() => navigator.clipboard.writeText(user.customId || user.id)}><img src={user.badge} className="absolute inset-0 w-full h-full object-fill z-0" /><span className="relative z-10 text-white font-black text-[8px]">ID:{user.customId || user.id}</span></div>
                        ) : (
                          <div className="bg-white/10 px-2 py-0.5 rounded-lg border border-white/10 text-[9px] font-black" onClick={() => navigator.clipboard.writeText(user.customId || user.id)}>ID:{user.customId || user.id}</div>
                        )}
                        <HeaderLevelBadge level={user.wealthLevel || 1} type="wealth" />
                        <HeaderLevelBadge level={user.rechargeLevel || 1} type="recharge" />
                     </div>
                  </div>
               </div>
               <button onClick={() => setShowEditProfileModal(true)} className="absolute top-10 left-5 p-2 bg-black/40 rounded-full border border-white/10"><Camera size={16} /></button>
            </div>

            <div className="grid grid-cols-2 gap-3 px-4 mt-5">
               <button onClick={() => setShowWalletModal(true)} className="h-20 rounded-2xl bg-gradient-to-r from-blue-400 to-cyan-500 flex flex-col items-center justify-center"><Wallet size={20}/><span className="font-black uppercase text-sm">Wallet</span></button>
               <button onClick={() => setShowVIPModal(true)} className="h-20 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-800 flex flex-col items-center justify-center"><Crown size={20}/><span className="font-black uppercase text-sm">VIP</span></button>
            </div>

            <div className="mx-4 mt-5 p-5 bg-white/5 rounded-[2rem] border border-white/5 grid grid-cols-4 gap-y-6">
               <button onClick={() => user.isHostAgent ? setShowHostAgentDashboard(true) : alert('للنشطاء فقط')} className="flex flex-col items-center gap-1"><div className={`w-12 h-12 rounded-2xl flex items-center justify-center border shadow-lg ${user.isHostAgent ? 'bg-blue-600 border-blue-400' : 'bg-slate-800'}`}><UserCheck size={20}/></div><span className="text-[10px] font-black">{t.officialAgent}</span></button>
               <button onClick={() => setShowBagModal(true)} className="flex flex-col items-center gap-1"><div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center"><ShoppingBag size={20}/></div><span className="text-[10px] font-black">حقيبة</span></button>
               <button className="flex flex-col items-center gap-1"><div className="w-12 h-12 bg-blue-700 rounded-2xl flex items-center justify-center"><Trophy size={20}/></div><span className="text-[10px] font-black">مستوى</span></button>
               <button onClick={() => user.isAgency && setShowAgencyModal(true)} className="flex flex-col items-center gap-1"><div className="w-12 h-12 bg-blue-900 rounded-2xl flex items-center justify-center"><Zap size={20}/></div><span className="text-[10px] font-black">وكالة</span></button>
               <button onClick={() => setShowCPModal(true)} className="flex flex-col items-center gap-1"><div className="w-12 h-12 bg-pink-600 rounded-2xl flex items-center justify-center"><Heart size={20}/></div><span className="text-[10px] font-black">CP</span></button>
            </div>

            <div className="mt-6 px-6 grid grid-cols-4 gap-4 pb-20">
               <button className="flex flex-col items-center gap-1"><div className="p-2 bg-white/5 rounded-full"><UserPlus size={16}/></div><span className="text-[9px]">دعوة</span></button>
               <button className="flex flex-col items-center gap-1"><div className="p-2 bg-white/5 rounded-full"><UserX size={16}/></div><span className="text-[9px]">حظر</span></button>
               <button className="flex flex-col items-center gap-1"><div className="p-2 bg-white/5 rounded-full"><ShieldCheck size={16}/></div><span className="text-[9px]"> خصوصية</span></button>
               
               <button 
                  onClick={() => {
                    if (isRootAdmin) setShowAdminPanel(true);
                    else alert('ليست لديك صلاحيات المالك 🛡️');
                  }} 
                  className="flex flex-col items-center gap-1 group active:scale-95 transition-all"
                >
                 <div className={`p-2 rounded-full transition-all duration-200 ${isRootAdmin ? 'bg-amber-500 text-black shadow-[0_0_15px_rgba(245,158,11,0.5)]' : 'bg-white/5 text-slate-600'}`}>
                   <Settings size={16} className={isRootAdmin ? 'animate-spin-slow' : ''} />
                 </div>
                 <span className={`text-[9px] ${isRootAdmin ? 'text-amber-500 font-black' : 'text-slate-600'}`}>إعدادات</span>
               </button>
            </div>
            <button onClick={handleLogout} className="mx-8 mb-24 py-3 bg-red-600/10 text-red-500 rounded-xl border border-red-500/20 font-black text-xs">خروج</button>
          </div>
        )}
      </div>

      <AnimatePresence>{isRoomMinimized && currentRoom && (<MiniPlayer room={currentRoom} onExpand={() => setIsRoomMinimized(false)} onLeave={handleRoomLeave} isMuted={isUserMuted} onToggleMute={() => setIsUserMuted(!isUserMuted)} />)}</AnimatePresence>

      <div className="absolute bottom-0 left-0 right-0 bg-[#030816] border-t border-blue-900/30 h-20 flex items-center px-4 z-20 pb-[env(safe-area-inset-bottom)]">
         <div className="relative w-full h-14 bg-gradient-to-r from-blue-900/40 via-blue-800/20 to-blue-900/40 rounded-full border border-blue-800/30 flex items-center justify-around">
            <button onClick={() => setActiveTab('home')} className={activeTab === 'home' ? 'text-cyan-400' : 'text-slate-500'}><Home size={20}/></button>
            <button onClick={() => setActiveTab('messages')} className={activeTab === 'messages' ? 'text-cyan-400' : 'text-slate-500'}><MessageCircle size={20}/></button>
            <button onClick={() => user.roomTemplate ? executeCreateRoom(user.roomTemplate) : setShowCreateRoomModal(true)} className="w-14 h-14 bg-blue-600 rounded-full flex items-center justify-center -translate-y-4 border-4 border-[#030816] shadow-lg"><Plus size={28}/></button>
            <button onClick={() => setActiveTab('rank')} className={activeTab === 'rank' ? 'text-cyan-400' : 'text-slate-500'}><Gamepad2 size={20}/></button>
            <button onClick={() => setActiveTab('profile')} className={activeTab === 'profile' ? 'text-cyan-400' : 'text-slate-500'}><UserIcon size={20}/></button>
         </div>
      </div>

      <AnimatePresence>
        {currentRoom && !isRoomMinimized && (
          <VoiceRoom room={currentRoom} currentUser={user!} onUpdateUser={handleUpdateUser} onLeave={handleRoomLeave} onMinimize={() => setIsRoomMinimized(true)} gifts={gifts} onEditProfile={() => setShowEditProfileModal(true)} gameSettings={gameSettings} onUpdateRoom={handleUpdateRoom} isMuted={isUserMuted} onToggleMute={() => setIsUserMuted(!isUserMuted)} users={users} onOpenPrivateChat={setPrivateChatPartner} />
        )}
      </AnimatePresence>
      
      <AnimatePresence>{privateChatPartner && ( <PrivateChatModal partner={privateChatPartner} currentUser={user!} onClose={() => setPrivateChatPartner(null)} /> )}</AnimatePresence>

      {showGlobalLeaderboard && <GlobalLeaderboardModal isOpen={showGlobalLeaderboard} onClose={() => setShowGlobalLeaderboard(false)} users={users} />}
      {showVIPModal && <VIPModal user={user} vipLevels={vipLevels} onClose={() => setShowVIPModal(false)} onBuy={handleBuyVIP} />}
      {showEditProfileModal && <EditProfileModal isOpen={showEditProfileModal} onClose={() => setShowEditProfileModal(false)} currentUser={user} onSave={handleUpdateUser} />}
      {showBagModal && <BagModal isOpen={showBagModal} onClose={() => setShowBagModal(false)} items={storeItems} user={user} onBuy={(item) => EconomyEngine.spendCoins(user.id, user.coins, user.wealth, item.price, user.ownedItems || [], item.id, handleUpdateUser)} onEquip={(item) => handleUpdateUser(item.type === 'frame' ? { frame: item.url } : { activeBubble: item.url })} />}
      {showWalletModal && <WalletModal isOpen={showWalletModal} onClose={() => setShowWalletModal(false)} user={user} onExchange={(amt) => EconomyEngine.exchangeDiamonds(user.id, user.coins, user.diamonds, amt, handleUpdateUser)} />}
      
      {showAdminPanel && isRootAdmin && <AdminPanel isOpen={showAdminPanel} onClose={() => setShowAdminPanel(false)} currentUser={user!} users={users} onUpdateUser={async (id, data) => await updateDoc(doc(db, 'users', id), data)} rooms={rooms} setRooms={setRooms} onUpdateRoom={handleUpdateRoom} gifts={gifts} storeItems={storeItems} vipLevels={vipLevels} gameSettings={gameSettings} setGameSettings={(s) => setDoc(doc(db, 'appSettings', 'games'), { gameSettings: s }, { merge: true })} appBanner={appBanner} onUpdateAppBanner={(url) => setDoc(doc(db, 'appSettings', 'identity'), { appBanner: url }, { merge: true })} appLogo={appLogo} onUpdateAppLogo={(url) => setDoc(doc(db, 'appSettings', 'identity'), { appLogo: url }, { merge: true })} appName={appName} onUpdateAppName={(name) => setDoc(doc(db, 'appSettings', 'identity'), { appName: name }, { merge: true })} appSubtitle={appSubtitle} onUpdateAppSubtitle={(sub) => setDoc(doc(db, 'appSettings', 'identity'), { appSubtitle: sub }, { merge: true })} authBackground={authBackground} onUpdateAuthBackground={(url) => setDoc(doc(db, 'appSettings', 'identity'), { authBackground: url }, { merge: true })} />}
      
      {showCreateRoomModal && <CreateRoomModal isOpen={showCreateRoomModal} onClose={() => setShowCreateRoomModal(false)} onCreate={executeCreateRoom} />}
      {user.isAgency && showAgencyModal && <AgencyRechargeModal isOpen={showAgencyModal} onClose={() => setShowAgencyModal(false)} agentUser={user} users={users} onCharge={(tid, amt) => EconomyEngine.agencyTransfer(user.id, user.agencyBalance!, tid, users.find(u => u.id === tid)?.coins || 0, users.find(u => u.id === tid)?.rechargePoints || 0, amt, (ad, td) => { handleUpdateUser(ad); updateDoc(doc(db, 'users', tid), td); })} />}
      {showCPModal && <CPModal isOpen={showCPModal} onClose={() => setShowCPModal(false)} currentUser={user} users={users} gameSettings={gameSettings} onUpdateUser={handleUpdateUser} />}
      {user.isHostAgent && showHostAgentDashboard && <HostAgentDashboard isOpen={showHostAgentDashboard} onClose={() => setShowHostAgentDashboard(false)} agentUser={user} allUsers={users} />}
      
      {activeGame === 'wheel' && <WheelGameModal isOpen={activeGame === 'wheel'} onClose={() => setActiveGame(null)} userCoins={Number(user.coins)} onUpdateCoins={(c) => handleUpdateUser({ coins: c })} winRate={gameSettings.wheelWinRate} gameSettings={gameSettings} />}
      {activeGame === 'slots' && <SlotsGameModal isOpen={activeGame === 'slots'} onClose={() => setActiveGame(null)} userCoins={Number(user.coins)} onUpdateCoins={(c) => handleUpdateUser({ coins: c })} winRate={gameSettings.slotsWinRate} gameSettings={gameSettings} />}
      {activeGame === 'lion' && <LionWheelGameModal isOpen={activeGame === 'lion'} onClose={() => setActiveGame(null)} userCoins={Number(user.coins)} onUpdateCoins={(c) => handleUpdateUser({ coins: c })} gameSettings={gameSettings} />}
    </div>
  );
}
