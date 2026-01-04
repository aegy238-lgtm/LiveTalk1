
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { db } from '../../services/firebase';
import { doc, collection, addDoc, updateDoc, increment, serverTimestamp, writeBatch, onSnapshot, getDoc, query, orderBy, limit, where, Timestamp, setDoc, deleteDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { Gift, Room, User, LuckyMultiplier, GameType, LuckyBag, CPPartner } from '../../types';
import { EconomyEngine } from '../../services/economy';

// استيراد المكونات
import RoomBackground from './RoomBackground';
import RoomHeader from './RoomHeader';
import GiftAnimationLayer from './GiftAnimationLayer';
import Seat from './Seat';
import ComboButton from './ComboButton';
import ControlBar from './ControlBar';
import ReactionPicker from './ReactionPicker';
import GiftModal from '../GiftModal';
import RoomSettingsModal from '../RoomSettingsModal';
import RoomRankModal from '../RoomRankModal';
import RoomToolsModal from './RoomToolsModal'; 
import LuckyBagModal from '../LuckyBagModal';
import LuckyBagActive from '../LuckyBagActive';
import UserProfileSheet from '../UserProfileSheet';
import GameCenterModal from '../GameCenterModal';
import WheelGameModal from '../WheelGameModal';
import SlotsGameModal from '../SlotsGameModal';
import LionWheelGameModal from '../LionWheelGameModal';
import WinStrip from '../WinStrip';
import { AnimatePresence, motion } from 'framer-motion';
import { Lock, Unlock, User as UserIcon, X, Mic } from 'lucide-react';

// دالة حساب المستوى الموحدة لضمان التطابق
const calcLevel = (pts: number) => {
  if (!pts || pts <= 0) return 1;
  const l = Math.floor(Math.sqrt(pts) / 200);
  return Math.max(1, Math.min(100, l));
};

const ChatLevelBadge: React.FC<{ level: number; type: 'wealth' | 'recharge' }> = ({ level, type }) => {
  const isWealth = type === 'wealth';
  return (
    <div className="relative h-[18px] min-w-[58px] flex items-center pr-3 group cursor-default shrink-0">
      <div className={`absolute inset-0 right-3 rounded-l-md border border-amber-500/60 shadow-lg ${
        isWealth 
          ? 'bg-gradient-to-r from-[#6a29e3] to-[#8b5cf6]' 
          : 'bg-[#121212]'
      }`}>
        <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]"></div>
      </div>
      <div className="relative z-10 flex-1 text-center pl-1 pr-1">
        <span className="text-[10px] font-black italic tracking-tighter text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] leading-none block transform translate-y-[0.5px]">
          {level}
        </span>
      </div>
      <div className="relative z-20 w-[20px] h-[20px] flex items-center justify-center -mr-2">
        <div className={`absolute inset-0 rounded-sm transform rotate-45 border border-amber-500 shadow-md ${
          isWealth ? 'bg-[#7c3aed]' : 'bg-[#000]'
        }`}></div>
        <span className="relative z-30 text-[9px] mb-0.5 drop-shadow-md select-none">👑</span>
      </div>
    </div>
  );
};

const VoiceRoom: React.FC<any> = ({ 
  room, onLeave, onMinimize, currentUser, gifts, gameSettings, onUpdateRoom, 
  isMuted, onToggleMute, onUpdateUser, users, onEditProfile, onAnnouncement, onOpenPrivateChat
}) => {
  const [showGifts, setShowGifts] = useState(false);
  const [showEmojis, setShowEmojis] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showTools, setShowTools] = useState(false);
  const [showRank, setShowRank] = useState(false);
  const [showLuckyBag, setShowLuckyBag] = useState(false);
  const [activeBags, setActiveBags] = useState<LuckyBag[]>([]);
  const [showGameCenter, setShowGameCenter] = useState(false);
  const [activeGame, setActiveGame] = useState<GameType | null>(null);
  const [showProfileSheet, setShowProfileSheet] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [selectedUserForProfile, setSelectedUserForProfile] = useState<User | null>(null);
  const [micSkins, setMicSkins] = useState<Record<number, string>>({});
  const [selectedRecipientIds, setSelectedRecipientIds] = useState<string[]>([]);
  const [adminSeatMenuIndex, setAdminSeatMenuIndex] = useState<number | null>(null);
  
  // حالة محلية للأقفال والمايكات لضمان التحديث الفوري (Optimistic UI)
  const [localLockedSeats, setLocalLockedSeats] = useState<number[]>(room.lockedSeats || []);
  const [localMicsLocked, setLocalMicsLocked] = useState<boolean>(!!room.micsLocked);
  const [localMicCount, setLocalMicCount] = useState<number>(Number(room.micCount || 8));
  
  const [sessionStartTime] = useState<Timestamp>(Timestamp.now());
  const [localSpeakers, setLocalSpeakers] = useState<any[]>(room.speakers || []);
  const [comboState, setComboState] = useState<{gift: Gift, recipients: string[], count: number} | null>(null);
  const [luckyWinAmount, setLuckyWinAmount] = useState<number>(0); 
  
  const comboSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const comboExpireTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSyncData = useRef<{giftId: string, count: number, recipients: string[], totalCost: number, totalWin: number} | null>(null);

  const giftAnimRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const isHost = room.hostId === currentUser.id;
  const isModerator = room.moderators?.includes(currentUser.id);
  const isAdmin = isHost || isModerator;

  // مزامنة الحالات المحلية مع بيانات الغرفة القادمة من السيرفر لضمان الاتساق
  useEffect(() => {
    setLocalLockedSeats(room.lockedSeats || []);
  }, [room.lockedSeats]);

  useEffect(() => {
    setLocalMicsLocked(!!room.micsLocked);
  }, [room.micsLocked]);

  useEffect(() => {
    setLocalMicCount(Number(room.micCount || 8));
  }, [room.micCount]);

  useEffect(() => {
    const q = query(
      collection(db, 'lucky_bags'),
      where('roomId', '==', room.id)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const now = Date.now();
      const bags = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as LuckyBag))
        .filter(bag => {
          const expiryTime = bag.expiresAt?.toMillis ? bag.expiresAt.toMillis() : 0;
          return expiryTime > now;
        });
      setActiveBags(bags);
    });

    return () => unsub();
  }, [room.id]);

  useEffect(() => {
    if (comboState) {
      if (comboExpireTimerRef.current) clearTimeout(comboExpireTimerRef.current);
      comboExpireTimerRef.current = setTimeout(() => {
        setComboState(null);
      }, 5000);
    }
    return () => {
      if (comboExpireTimerRef.current) clearTimeout(comboExpireTimerRef.current);
    };
  }, [comboState?.count]);

  useEffect(() => {
    setLocalSpeakers(room.speakers || []);
  }, [room.speakers]);

  const sanitizeSpeakers = (speakers: any[]) => {
    return (speakers || []).map(s => ({
      id: s.id || '',
      name: s.name || 'مستخدم',
      avatar: s.avatar || '', 
      seatIndex: Number(s.seatIndex) ?? 0,
      isMuted: !!s.isMuted,
      charm: Number(s.charm || 0),
      activeEmoji: s.activeEmoji || null,
      frame: s.frame || null
    }));
  };

  useEffect(() => {
    const messagesRef = collection(db, 'rooms', room.id, 'messages');
    const q = query(
      messagesRef, 
      where('timestamp', '>=', sessionStartTime),
      orderBy('timestamp', 'desc'), 
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMessages(msgs.reverse());
      setTimeout(() => {
        if (messagesEndRef.current && chatContainerRef.current) {
          const container = chatContainerRef.current;
          const isAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 150;
          if (isAtBottom) messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
      }, 300);
    });
    return () => unsubscribe();
  }, [room.id, sessionStartTime]);

  useEffect(() => {
    const fetchSkins = async () => {
      try {
        const snap = await getDoc(doc(db, 'appSettings', 'micSkins'));
        if (snap.exists()) setMicSkins(snap.data() as Record<number, string>);
      } catch (e) {}
    };
    fetchSkins();
  }, []);

  const pickLuckyMultiplier = (multipliers: LuckyMultiplier[]) => {
    const totalChance = multipliers.reduce((sum, m) => sum + m.chance, 0);
    let random = Math.random() * totalChance;
    for (const m of multipliers) {
      if (random < m.chance) return m;
      random -= m.chance;
    }
    return multipliers[0];
  };

  const commitPendingSyncAndClear = async (gift: Gift) => {
    if (!pendingSyncData.current) return;
    const data = pendingSyncData.current;
    pendingSyncData.current = null;
    commitSingleGift(gift, data.count, data.recipients, data.totalCost, data.totalWin, localSpeakers);
  };

  const commitSingleGift = async (gift: Gift, qty: number, recIds: string[], cost: number, win: number, speakers: any[]) => {
    try {
      const batch = writeBatch(db);
      
      batch.update(doc(db, 'users', currentUser.id), {
        coins: increment(-cost + win),
        wealth: increment(cost)
      });

      recIds.forEach(rid => {
        const targetUser = users.find((u: any) => u.id === rid);
        if (targetUser?.isHost && targetUser.hostAgencyId) {
           const hostDiamonds = cost * 0.70;
           const agentCommission = cost * 0.01;
           batch.update(doc(db, 'users', rid), {
             charm: increment(cost / recIds.length),
             diamonds: increment(hostDiamonds),
             hostProduction: increment(cost)
           });
           getDoc(doc(db, 'host_agencies', targetUser.hostAgencyId)).then(agencySnap => {
              if (agencySnap.exists()) {
                 const agencyData = agencySnap.data();
                 updateDoc(doc(db, 'users', agencyData.agentId), { diamonds: increment(agentCommission) });
                 updateDoc(doc(db, 'host_agencies', targetUser.hostAgencyId), { totalProduction: increment(cost) });
              }
           });
        } else {
           batch.update(doc(db, 'users', rid), {
             charm: increment(cost / recIds.length),
             diamonds: increment(cost / recIds.length)
           });
        }
        batch.set(doc(db, 'rooms', room.id, 'contributors', currentUser.id), {
          userId: currentUser.id, name: currentUser.name, avatar: currentUser.avatar,
          amount: increment(cost / recIds.length)
        }, { merge: true });
      });

      batch.set(doc(collection(db, 'rooms', room.id, 'gift_events')), {
        giftId: gift.id, giftIcon: gift.icon, giftAnimation: gift.animationType || 'pop',
        senderId: currentUser.id, senderName: currentUser.name,
        recipientIds: recIds, quantity: qty, timestamp: serverTimestamp()
      });

      batch.set(doc(collection(db, 'rooms', room.id, 'messages')), {
        userId: currentUser.id, userName: currentUser.name,
        userWealthLevel: currentUser.wealthLevel || calcLevel(Number(currentUser.wealth || 0)),
        userRechargeLevel: currentUser.rechargeLevel || calcLevel(Number(currentUser.rechargePoints || 0)),
        content: win > 0 ? `أرسل ${gift.name} x${qty} وفاز بـ ${win.toLocaleString()} 🪙!` : `أرسل ${gift.name} x${qty} 🎁`,
        type: 'gift', isLuckyWin: win > 0, timestamp: serverTimestamp()
      });

      if (win >= 100000 || (!gift.isLucky && cost >= 5000)) {
        const recipientsNames = recIds.map(rid => users.find((u: any) => u.id === rid)?.name || 'مستلم').join(', ');
        batch.set(doc(collection(db, 'global_announcements')), {
          senderName: currentUser.name, recipientName: recipientsNames, giftName: gift.name, giftIcon: gift.icon,
          roomTitle: room.title, roomId: room.id, type: win >= 100000 ? 'lucky_win' : 'gift',
          amount: win >= 100000 ? win : cost, timestamp: serverTimestamp()
        });
      }
      batch.update(doc(db, 'rooms', room.id), { speakers: sanitizeSpeakers(speakers) });
      await batch.commit();
    } catch (e) { console.error("Sync Error:", e); }
  };

  const executeGiftSendOptimistic = (gift: Gift, quantity: number, recipientIds: string[], isComboHit: boolean = false) => {
    const totalCost = gift.cost * quantity * recipientIds.length;
    const giftValuePerRecipient = gift.cost * quantity;
    if (Number(currentUser.coins || 0) < totalCost) { alert('رصيدك لا يكفي!'); return false; }
    let winAmount = 0;
    if (gift.isLucky) {
      const isWin = (Math.random() * 100) < (gameSettings.luckyGiftWinRate || 30);
      if (isWin && gameSettings.luckyMultipliers?.length > 0) {
        const picked = pickLuckyMultiplier(gameSettings.luckyMultipliers);
        winAmount = gift.cost * quantity * picked.value;
      }
    }
    onUpdateUser({ 
      coins: Number(currentUser.coins) - totalCost + winAmount, 
      wealth: Number(currentUser.wealth || 0) + totalCost 
    });
    const updatedSpeakers = localSpeakers.map((s: any) => {
      if (recipientIds.includes(s.id)) return { ...s, charm: (Number(s.charm) || 0) + giftValuePerRecipient };
      return s;
    });
    setLocalSpeakers(updatedSpeakers);
    if (winAmount > 0) { setLuckyWinAmount(winAmount); setTimeout(() => luckyWinAmount > 0 && setLuckyWinAmount(0), 6000); }
    if (giftAnimRef.current) {
      giftAnimRef.current.trigger({
        id: 'local-' + Date.now(), giftId: gift.id, giftName: gift.name, giftIcon: gift.icon, giftAnimation: gift.animationType || 'pop',
        senderId: currentUser.id, senderName: currentUser.name, senderAvatar: currentUser.avatar,
        recipientIds, quantity, timestamp: Timestamp.now()
      });
    }
    if (isComboHit) {
      if (!pendingSyncData.current) { pendingSyncData.current = { giftId: gift.id, count: 0, recipients: recipientIds, totalCost: 0, totalWin: 0 }; }
      pendingSyncData.current.count += quantity;
      pendingSyncData.current.totalCost += totalCost;
      pendingSyncData.current.totalWin += winAmount;
      if (comboSyncTimerRef.current) clearTimeout(comboSyncTimerRef.current);
      comboSyncTimerRef.current = setTimeout(() => commitPendingSyncAndClear(gift), 1200);
    } else { commitSingleGift(gift, quantity, recipientIds, totalCost, winAmount, updatedSpeakers); }
    return true;
  };

  const handleSeatClick = (index: number) => {
    const s = localSpeakers.find(s => s.seatIndex === index);
    if (s) { setSelectedUserForProfile(s); setShowProfileSheet(true); }
    else {
      // إذا كان الأدمن يضغط على مقعد فارغ، تظهر ميزة التحكم الجديدة
      if (isAdmin) {
        setAdminSeatMenuIndex(index);
        return;
      }
      
      // للمستخدم العادي: التحقق من القفل (باستخدام القائمة المحلية لسرعة الاستجابة)
      const isIndividuallyLocked = localLockedSeats.includes(index);
      if ((localMicsLocked || isIndividuallyLocked) && !isAdmin) {
        alert('هذا المقعد مغلق حالياً من قبل الإدارة 🔒');
        return;
      }

      executeSeatJoin(index);
    }
  };

  const executeSeatJoin = (index: number) => {
    const updated = sanitizeSpeakers([...localSpeakers.filter(s => s.id !== currentUser.id), { id: currentUser.id, name: currentUser.name, avatar: currentUser.avatar, seatIndex: index, isMuted, charm: (localSpeakers.find(s => s.id === currentUser.id)?.charm || 0), activeEmoji: null, frame: currentUser.frame || null }]);
    setLocalSpeakers(updated);
    onUpdateRoom(room.id, { speakers: updated });
  };

  const handleAdminSeatAction = async (action: 'join' | 'lock' | 'unlock') => {
    if (adminSeatMenuIndex === null) return;
    const index = adminSeatMenuIndex;
    setAdminSeatMenuIndex(null);

    if (action === 'join') {
      executeSeatJoin(index);
    } else if (action === 'lock') {
      // تحديث متفائل فوري للواجهة
      setLocalLockedSeats(prev => [...prev, index]);
      // التحديث في قاعدة البيانات في الخلفية
      await updateDoc(doc(db, 'rooms', room.id), { lockedSeats: arrayUnion(index) });
    } else if (action === 'unlock') {
      // تحديث متفائل فوري للواجهة
      setLocalLockedSeats(prev => prev.filter(i => i !== index));
      // التحديث في قاعدة البيانات في الخلفية
      await updateDoc(doc(db, 'rooms', room.id), { lockedSeats: arrayRemove(index) });
    }
  };

  const handleToolAction = async (action: string) => {
    setShowTools(false);
    if (action === 'settings') setShowSettings(true);
    else if (action === 'rank') setShowRank(true);
    else if (action === 'luckybag') setShowLuckyBag(true);
    else if (action === 'mic_layout') {
      const layouts = [8, 10, 15, 20];
      const currentCount = localMicCount;
      const currentIndex = layouts.indexOf(currentCount);
      const next = layouts[(currentIndex + 1) % layouts.length];
      
      // 1. التحديث الفوري للواجهة (الفوري)
      setLocalMicCount(next);
      const filtered = localSpeakers.filter(s => Number(s.seatIndex) < next);
      setLocalSpeakers(filtered);
      
      // 2. التحديث في خلفية النظام (Firebase) بدون انتظار
      onUpdateRoom(room.id, { 
        micCount: next, 
        speakers: sanitizeSpeakers(filtered) 
      });
    } else if (action === 'open_mics') {
      const nextState = !localMicsLocked;
      // تحديث متفائل فوري
      setLocalMicsLocked(nextState);
      // التحديث في الخلفية
      onUpdateRoom(room.id, { micsLocked: nextState });
      alert(nextState ? 'تم قفل جميع المقاعد 🔒' : 'تم فتح جميع المقاعد ✅');
    } else if (action === 'reset_charm') {
      if (confirm('تصفير كاريزما الجميع؟')) {
        const updated = sanitizeSpeakers(localSpeakers.map(s => ({ ...s, charm: 0 })));
        setLocalSpeakers(updated);
        await onUpdateRoom(room.id, { speakers: updated });
      }
    }
  };

  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;
    try {
      await addDoc(collection(db, 'rooms', room.id, 'messages'), {
        userId: currentUser.id,
        userName: currentUser.name,
        userWealthLevel: currentUser.wealthLevel || calcLevel(Number(currentUser.wealth || 0)),
        userRechargeLevel: currentUser.rechargeLevel || calcLevel(Number(currentUser.rechargePoints || 0)),
        userBubble: currentUser.activeBubble || null,
        userVip: currentUser.isVip,
        content: text,
        type: 'text',
        timestamp: serverTimestamp()
      });
    } catch (e) {
      console.error("Chat Error:", e);
    }
  };

  const handleSendEmoji = async (emoji: string) => {
    if (!localSpeakers.find(s => s.id === currentUser.id)) return;
    
    try {
      const updated = sanitizeSpeakers(localSpeakers.map(s => 
        s.id === currentUser.id ? { ...s, activeEmoji: emoji } : s
      ));
      setLocalSpeakers(updated);
      await onUpdateRoom(room.id, { speakers: updated });
      
      const duration = (gameSettings.emojiDuration || 4) * 1000;
      setTimeout(async () => {
        setLocalSpeakers(prev => {
          const res = sanitizeSpeakers(prev.map(s => 
            (s.id === currentUser.id && s.activeEmoji === emoji) ? { ...s, activeEmoji: null } : s
          ));
          onUpdateRoom(room.id, { speakers: res });
          return res;
        });
      }, duration);
    } catch (e) {}
  };

  const handleSendGift = (gift: Gift, quantity: number) => {
    if (selectedRecipientIds.length === 0) return;
    const success = executeGiftSendOptimistic(gift, quantity, selectedRecipientIds);
    if (success) {
      setComboState({ gift, recipients: selectedRecipientIds, count: quantity });
    }
  };

  const handleSendLuckyBag = async (amount: number, recipients: number) => {
    try {
      const bagId = 'bag_' + Date.now();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); 

      await setDoc(doc(db, 'lucky_bags', bagId), {
        id: bagId,
        senderId: currentUser.id,
        senderName: currentUser.name,
        senderAvatar: currentUser.avatar,
        roomId: room.id,
        roomTitle: room.title,
        totalAmount: amount,
        remainingAmount: amount,
        recipientsLimit: recipients,
        claimedBy: [],
        createdAt: serverTimestamp(),
        expiresAt: Timestamp.fromDate(expiresAt)
      });

      await updateDoc(doc(db, 'users', currentUser.id), {
        coins: increment(-amount)
      });
      
      onUpdateUser({ coins: Number(currentUser.coins) - amount });

      await addDoc(collection(db, 'global_announcements'), {
        senderName: currentUser.name,
        giftIcon: '💰',
        roomTitle: room.title,
        roomId: room.id,
        type: 'lucky_bag',
        amount: amount,
        timestamp: serverTimestamp()
      });
    } catch (e) {
      alert('فشل إرسال الحقيبة');
    }
  };

  const handleClaimBag = async (bag: LuckyBag) => {
    if (bag.claimedBy.includes(currentUser.id)) return;
    
    try {
      const bagSnap = await getDoc(doc(db, 'lucky_bags', bag.id));
      if (!bagSnap.exists()) return;
      const bagData = bagSnap.data() as LuckyBag;
      
      if (bagData.remainingAmount <= 0 || bagData.claimedBy.length >= bagData.recipientsLimit) {
        alert('تم استنفاد محتويات الحقيبة!');
        return;
      }

      const share = Math.floor(bagData.totalAmount / bagData.recipientsLimit);
      
      await updateDoc(doc(db, 'lucky_bags', bag.id), {
        claimedBy: arrayUnion(currentUser.id),
        remainingAmount: increment(-share)
      });

      await updateDoc(doc(db, 'users', currentUser.id), {
        coins: increment(share)
      });
      
      onUpdateUser({ coins: Number(currentUser.coins) + share });
      setLuckyWinAmount(share);
      setTimeout(() => setLuckyWinAmount(0), 4000);
    } catch (e) {
      console.error("Claim Bag Error:", e);
    }
  };

  // استخدام localMicCount بدلاً من room.micCount للعرض الفوري
  const seatsCount = localMicCount;
  const currentSkin = micSkins[seatsCount] || undefined;
  const seats = Array.from({ length: seatsCount }).map((_, i) => localSpeakers.find(s => s.seatIndex === i) || null);

  const renderSeatsLayout = () => {
    const checkIsLocked = (i: number) => localMicsLocked || localLockedSeats.includes(i);
    
    if (seatsCount === 10) return (
      <div className="flex flex-col gap-y-9 items-center w-full max-w-sm mx-auto overflow-visible">
        <div className="flex justify-center gap-6 overflow-visible">{seats.slice(0, 2).map((s, i) => (<Seat key={i} index={i} speaker={s} isHost={s?.id === room.hostId} currentUser={currentUser} sizeClass="w-14 h-14" customSkin={currentSkin} isLocked={checkIsLocked(i)} onClick={() => handleSeatClick(i)} />))}</div>
        <div className="grid grid-cols-4 gap-4 w-full justify-items-center overflow-visible">{seats.slice(2, 6).map((s, i) => (<Seat key={i+2} index={i+2} speaker={s} isHost={s?.id === room.hostId} currentUser={currentUser} sizeClass="w-14 h-14" customSkin={currentSkin} isLocked={checkIsLocked(i+2)} onClick={() => handleSeatClick(i+2)} />))}</div>
        <div className="grid grid-cols-4 gap-4 w-full justify-items-center overflow-visible">{seats.slice(6, 10).map((s, i) => (<Seat key={i+6} index={i+6} speaker={s} isHost={s?.id === room.hostId} currentUser={currentUser} sizeClass="w-14 h-14" customSkin={currentSkin} isLocked={checkIsLocked(i+6)} onClick={() => handleSeatClick(i+6)} />))}</div>
      </div>
    );
    const gridCols = seatsCount === 20 ? 'grid-cols-5' : seatsCount === 15 ? 'grid-cols-5' : 'grid-cols-4';
    const sz = seatsCount === 20 ? 'w-11 h-11' : seatsCount === 15 ? 'w-[52px] h-[52px]' : 'w-[72px] h-[72px]';
    return (
      <div className={`grid ${gridCols} gap-x-4 gap-y-12 w-full max-w-sm mx-auto justify-items-center items-center overflow-visible`}>
        {seats.map((s, i) => (<Seat key={i} index={i} speaker={s} isHost={s?.id === room.hostId} currentUser={currentUser} sizeClass={sz} customSkin={currentSkin} isLocked={checkIsLocked(i)} onClick={() => handleSeatClick(i)} />))}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[150] flex flex-col bg-slate-950 font-cairo overflow-hidden text-right">
      <RoomBackground background={room.background} />
      <RoomHeader room={room} onLeave={onLeave} onMinimize={onMinimize} />
      
      <AnimatePresence>
        {luckyWinAmount > 0 && <WinStrip amount={luckyWinAmount} />}
        {activeBags.map(bag => (<LuckyBagActive key={bag.id} bag={bag as any} isClaimed={bag.claimedBy.includes(currentUser.id)} onClaim={() => handleClaimBag(bag)} />))}
        
        {/* نافذة خيارات الأدمن للمقعد */}
        {adminSeatMenuIndex !== null && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setAdminSeatMenuIndex(null)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
             <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative bg-[#0f172a] border border-white/10 rounded-[2.5rem] w-full max-w-[280px] p-6 shadow-2xl overflow-hidden">
                <div className="flex justify-between items-center mb-6">
                   <div className="flex items-center gap-2"><div className="w-8 h-8 bg-amber-500/20 rounded-lg flex items-center justify-center"><Mic size={16} className="text-amber-500" /></div><span className="text-sm font-black text-white">تحكم المقعد {adminSeatMenuIndex + 1}</span></div>
                   <button onClick={() => setAdminSeatMenuIndex(null)}><X size={18} className="text-slate-500" /></button>
                </div>
                <div className="space-y-2.5">
                   <button onClick={() => handleAdminSeatAction('join')} className="w-full py-3.5 bg-blue-600 rounded-2xl flex items-center justify-center gap-3 text-white font-black text-xs shadow-lg active:scale-95"><UserIcon size={16}/> الصعود للمقعد</button>
                   {localLockedSeats.includes(adminSeatMenuIndex) ? (
                     <button onClick={() => handleAdminSeatAction('unlock')} className="w-full py-3.5 bg-emerald-600/20 border border-emerald-500/30 rounded-2xl flex items-center justify-center gap-3 text-emerald-400 font-black text-xs active:scale-95"><Unlock size={16}/> فتح المايك</button>
                   ) : (
                     <button onClick={() => handleAdminSeatAction('lock')} className="w-full py-3.5 bg-red-600/20 border border-red-500/30 rounded-2xl flex items-center justify-center gap-3 text-red-400 font-black text-xs active:scale-95"><Lock size={16}/> غلق المايك</button>
                   )}
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="flex-1 relative flex flex-col overflow-hidden">
        <GiftAnimationLayer ref={giftAnimRef} roomId={room.id} speakers={localSpeakers} currentUserId={currentUser.id} />
        <div className="flex-1 flex flex-col justify-center items-center px-4 py-4 overflow-visible">{renderSeatsLayout()}</div>
        <div className="h-64 px-4 mb-4 overflow-hidden relative z-[60]" dir="rtl">
           <div ref={chatContainerRef} className="h-full overflow-y-auto scrollbar-hide space-y-4 flex flex-col pb-4 pointer-events-auto touch-pan-y">
              <div className="flex-1" />
              {messages.map((msg) => (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} key={msg.id} className="flex items-start gap-2">
                   <div className="flex flex-col items-start">
                      <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
                         <ChatLevelBadge level={msg.userWealthLevel || 1} type="wealth" /><ChatLevelBadge level={msg.userRechargeLevel || 1} type="recharge" />
                         <span className={`text-[12px] font-black drop-shadow-lg shrink-0 ${msg.userVip ? 'text-amber-400' : 'text-blue-300'}`}>{msg.userName}</span>
                      </div>
                      <div className={`relative min-h-[42px] w-fit max-w-[260px] px-7 py-3 flex items-center justify-center text-center shadow-2xl transition-all ${msg.isLuckyWin ? 'bg-gradient-to-r from-amber-600/40 to-yellow-500/40 border border-amber-500/50 rounded-2xl' : !msg.userBubble ? 'bg-black/50 backdrop-blur-md border border-white/10 rounded-2xl rounded-tr-none' : ''}`} style={msg.userBubble ? { backgroundImage: `url(${msg.userBubble})`, backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat', minWidth: '95px' } : {}}>
                         <p className={`text-[13px] font-black text-white leading-relaxed break-words drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)] ${msg.isLuckyWin ? 'text-yellow-200' : ''}`}>{msg.content}</p>
                      </div>
                   </div>
                </motion.div>
              ))}
              <div ref={messagesEndRef} />
           </div>
        </div>
        <AnimatePresence>{comboState && <ComboButton gift={comboState.gift} count={comboState.count} onHit={() => { setComboState(p => p ? { ...p, count: p.count + 1 } : null); executeGiftSendOptimistic(comboState.gift, 1, comboState.recipients, true); }} duration={5000} />}</AnimatePresence>
        <ControlBar isMuted={isMuted} onToggleMute={onToggleMute} onShowGifts={() => setShowGifts(true)} onShowGames={() => setShowGameCenter(true)} onShowRoomTools={() => setShowTools(true)} onSendMessage={handleSendMessage} onShowEmojis={() => setShowEmojis(true)} userCoins={Number(currentUser.coins)} />
      </div>
      <ReactionPicker isOpen={showEmojis} emojis={gameSettings.availableEmojis} onSelect={(emoji) => { handleSendEmoji(emoji); setShowEmojis(false); }} onClose={() => setShowEmojis(false)} />
      <GiftModal isOpen={showGifts} onClose={() => setShowGifts(false)} gifts={gifts} userCoins={Number(currentUser.coins)} speakers={localSpeakers} selectedRecipientIds={selectedRecipientIds} onSelectRecipient={setSelectedRecipientIds} onSend={handleSendGift} />
      <RoomToolsModal isOpen={showTools} onClose={() => setShowTools(false)} isAdmin={isAdmin} onAction={handleToolAction} roomMicsLocked={localMicsLocked} />
      {showSettings && <RoomSettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} room={room} onUpdate={onUpdateRoom} />}
      {showRank && <RoomRankModal isOpen={showRank} onClose={() => setShowRank(false)} roomId={room.id} roomTitle={room.title} />}
      {showLuckyBag && <LuckyBagModal isOpen={showLuckyBag} onClose={() => setShowLuckyBag(false)} userCoins={Number(currentUser.coins)} onSend={handleSendLuckyBag} />}
      <GameCenterModal isOpen={showGameCenter} onClose={() => setShowGameCenter(false)} onSelectGame={(game) => { setActiveGame(game); setShowGameCenter(false); }} />
      {showProfileSheet && selectedUserForProfile && (<UserProfileSheet user={selectedUserForProfile} onClose={() => setShowProfileSheet(false)} isCurrentUser={selectedUserForProfile.id === currentUser.id} onAction={(action) => { if (action === 'gift') setShowGifts(true); if (action === 'message') onOpenPrivateChat(selectedUserForProfile); if (action === 'resetUserCharm') { const updated = sanitizeSpeakers(localSpeakers.map(s => s.id === selectedUserForProfile.id ? { ...s, charm: 0 } : s)); setLocalSpeakers(updated); onUpdateRoom(room.id, { speakers: updated }); } }} currentUser={currentUser} allUsers={users} currentRoom={room} />)}
    </div>
  );
};
export default VoiceRoom;
