
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, ShieldCheck, Activity, Gift as GiftIcon, ShoppingBag, 
  Crown, Smartphone, Eraser, X, Medal, IdCard, Layout, Zap, Smile, Heart, Building
} from 'lucide-react';
import { doc, setDoc, deleteDoc, collection } from 'firebase/firestore';
import { db } from '../services/firebase';
import { User, Room, Gift, StoreItem, GameSettings, VIPPackage } from '../types';

import AdminUsers from './Admin/AdminUsers';
import AdminGames from './Admin/AdminGames';
import AdminGifts from './Admin/AdminGifts';
import AdminStore from './Admin/AdminStore';
import AdminVIP from './Admin/AdminVIP';
import AdminIdentity from './Admin/AdminIdentity';
import AdminMaintenance from './Admin/AdminMaintenance';
import AdminBadges from './Admin/AdminBadges';
import AdminIdBadges from './Admin/AdminIdBadges';
import AdminMicSkins from './Admin/AdminMicSkins';
import AdminAgency from './Admin/AdminAgency';
import AdminHostAgencies from './Admin/AdminHostAgencies';
import AdminEmojis from './Admin/AdminEmojis';
import AdminRelationships from './Admin/AdminRelationships';

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  users: User[];
  onUpdateUser: (userId: string, data: Partial<User>) => Promise<void>;
  rooms: Room[];
  setRooms: (rooms: Room[]) => void;
  onUpdateRoom: (roomId: string, data: Partial<Room>) => Promise<void>;
  gifts: Gift[];
  storeItems: StoreItem[];
  vipLevels: VIPPackage[];
  gameSettings: GameSettings;
  setGameSettings: (settings: GameSettings) => Promise<void>;
  appBanner: string;
  onUpdateAppBanner: (url: string) => void;
  appLogo: string;
  onUpdateAppLogo: (url: string) => void;
  appName: string;
  onUpdateAppName: (name: string) => void;
  appSubtitle: string;
  onUpdateAppSubtitle: (subtitle: string) => void;
  authBackground: string;
  onUpdateAuthBackground: (url: string) => void;
}

const ROOT_ADMIN_EMAIL = 'root-admin@livetalk.com';

const compressImage = (base64: string, maxWidth: number, maxHeight: number, quality: number = 0.3): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width; let height = img.height;
      if (width > height) { if (width > maxWidth) { height *= maxWidth / width; width = maxWidth; } }
      else { if (height > maxHeight) { width *= maxHeight / height; height = maxHeight; } }
      canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/webp', quality));
    };
  });
};

const AdminPanel: React.FC<AdminPanelProps> = (props) => {
  const [activeTab, setActiveTab] = useState<string>('users');

  const currentEmail = (props.currentUser as any).email?.toLowerCase() || '';
  const hasAccess = currentEmail === ROOT_ADMIN_EMAIL.toLowerCase();

  const handleUpdateGameSettings = async (updates: Partial<GameSettings>) => {
    await props.setGameSettings({ ...props.gameSettings, ...updates });
  };

  if (!props.isOpen || !hasAccess) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, callback: (url: string) => void, w: number, h: number) => {
    const file = e.target.files?.[0];
    if (file) {
      const limit = file.type === 'image/gif' ? 1024 * 1024 : 500 * 1024;
      if (file.size > limit) { alert('حجم الملف كبير جداً!'); return; }
      
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const result = ev.target?.result as string;
        if (file.type === 'image/gif' || file.name.toLowerCase().endsWith('.gif')) {
          callback(result);
        } else {
          const compressed = await compressImage(result, w, h, 0.5);
          callback(compressed);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const saveGift = async (gift: Gift, isDelete: boolean = false) => {
    const giftRef = doc(db, 'gifts', gift.id);
    if (isDelete) await deleteDoc(giftRef);
    else await setDoc(giftRef, gift);
  };

  const saveStoreItem = async (item: StoreItem, isDelete: boolean = false) => {
    const itemRef = doc(db, 'store', item.id);
    if (isDelete) await deleteDoc(itemRef);
    else await setDoc(itemRef, item);
  };

  const saveVipLevel = async (vip: VIPPackage, isDelete: boolean = false) => {
    const vipId = (vip as any).id || `vip_lvl_${vip.level}`;
    const vipRef = doc(db, 'vip', vipId);
    if (isDelete) await deleteDoc(vipRef);
    else await setDoc(vipRef, { ...vip, id: vipId });
  };

  const menuItems = [
    { id: 'users', label: 'الأعضاء', icon: Users, color: 'text-blue-400' },
    { id: 'badges', label: 'أوسمة الشرف', icon: Medal, color: 'text-yellow-500' },
    { id: 'id_badges', label: 'أوسمة الـ ID', icon: IdCard, color: 'text-blue-500' },
    { id: 'host_agency', label: 'وكالات المضيفين', icon: Building, color: 'text-emerald-400' },
    { id: 'mic_skins', label: 'أشكال المايكات', icon: Layout, color: 'text-indigo-500' },
    { id: 'emojis', label: 'الإيموشنات', icon: Smile, color: 'text-yellow-400' },
    { id: 'relationships', label: 'نظام الارتباط', icon: Heart, color: 'text-pink-500' },
    { id: 'agency', label: 'الوكالات (شحن)', icon: Zap, color: 'text-orange-500' },
    { id: 'games', label: 'مركز الحظ', icon: Activity, color: 'text-orange-400' },
    { id: 'gifts', label: 'الهدايا', icon: GiftIcon, color: 'text-pink-400' },
    { id: 'store', label: 'المتجر', icon: ShoppingBag, color: 'text-cyan-400' },
    { id: 'vip', label: 'الـ VIP', icon: Crown, color: 'text-amber-400' },
    { id: 'identity', label: 'الهوية', icon: Smartphone, color: 'text-emerald-400' },
    { id: 'maintenance', label: 'الصيانة', icon: Eraser, color: 'text-red-500' },
  ];

  return (
    <div className="fixed inset-0 z-[2000] bg-[#020617] flex flex-col md:flex-row font-cairo overflow-hidden text-right" dir="rtl">
      <div className="w-full md:w-64 bg-slate-950 border-l border-white/5 flex flex-col shrink-0 shadow-2xl z-10">
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3"><span className="font-black text-white">التحكم المطلق</span></div>
          <button onClick={props.onClose} className="text-slate-400 p-2"><X size={24}/></button>
        </div>
        <nav className="flex md:flex-col p-3 gap-1 overflow-x-auto md:overflow-y-auto custom-scrollbar">
          {menuItems.map(item => (
            <button key={item.id} onClick={() => setActiveTab(item.id)} className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all ${activeTab === item.id ? 'bg-white/10 text-white' : 'text-slate-500 hover:bg-white/5'}`}>
              <item.icon size={18} className={activeTab === item.id ? item.color : ''} />
              <span className="text-xs font-black">{item.label}</span>
            </button>
          ))}
        </nav>
      </div>

      <div className="flex-1 bg-slate-900/40 overflow-y-auto p-6 md:p-10 custom-scrollbar transition-all duration-100">
        {activeTab === 'users' && <AdminUsers users={props.users} vipLevels={props.vipLevels} onUpdateUser={props.onUpdateUser} />}
        {activeTab === 'badges' && <AdminBadges users={props.users} onUpdateUser={props.onUpdateUser} />}
        {activeTab === 'id_badges' && <AdminIdBadges users={props.users} onUpdateUser={props.onUpdateUser} />}
        {activeTab === 'host_agency' && <AdminHostAgencies users={props.users} onUpdateUser={props.onUpdateUser} />}
        {activeTab === 'mic_skins' && <AdminMicSkins handleFileUpload={handleFileUpload} />}
        {activeTab === 'agency' && <AdminAgency users={props.users} onUpdateUser={props.onUpdateUser} />}
        {activeTab === 'emojis' && <AdminEmojis gameSettings={props.gameSettings} onUpdateGameSettings={handleUpdateGameSettings} handleFileUpload={handleFileUpload} />}
        {activeTab === 'relationships' && <AdminRelationships gameSettings={props.gameSettings} onUpdateGameSettings={handleUpdateGameSettings} handleFileUpload={handleFileUpload} />}
        {activeTab === 'games' && <AdminGames gameSettings={props.gameSettings} onUpdateGameSettings={handleUpdateGameSettings} handleFileUpload={handleFileUpload} />}
        {activeTab === 'gifts' && <AdminGifts gifts={props.gifts} onSaveGift={saveGift} handleFileUpload={handleFileUpload} />}
        {activeTab === 'store' && <AdminStore storeItems={props.storeItems} onSaveItem={saveStoreItem} handleFileUpload={handleFileUpload} />}
        {activeTab === 'vip' && <AdminVIP vipLevels={props.vipLevels} onSaveVip={saveVipLevel} handleFileUpload={handleFileUpload} />}
        {activeTab === 'identity' && <AdminIdentity appLogo={props.appLogo} appBanner={props.appBanner} appName={props.appName} appSubtitle={props.appSubtitle} onUpdateAppSubtitle={props.onUpdateAppSubtitle} authBackground={props.authBackground} onUpdateAppLogo={props.onUpdateAppLogo} onUpdateAppBanner={props.onUpdateAppBanner} onUpdateAppName={props.onUpdateAppName} onUpdateAuthBackground={props.onUpdateAuthBackground} handleFileUpload={handleFileUpload} />}
        {activeTab === 'maintenance' && <AdminMaintenance currentUser={props.currentUser} />}
      </div>
    </div>
  );
};

export default AdminPanel;
