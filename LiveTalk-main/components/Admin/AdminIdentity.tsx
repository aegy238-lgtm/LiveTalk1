
import React, { useState, useEffect } from 'react';
import { Smartphone, Camera, Image as ImageIcon, Edit3, Save, Globe, Type } from 'lucide-react';

interface AdminIdentityProps {
  appLogo: string;
  appBanner: string;
  appName: string;
  appSubtitle: string;
  authBackground: string;
  onUpdateAppLogo: (url: string) => void;
  onUpdateAppBanner: (url: string) => void;
  onUpdateAppName: (name: string) => void;
  onUpdateAppSubtitle: (subtitle: string) => void;
  onUpdateAuthBackground: (url: string) => void;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>, callback: (url: string) => void, w: number, h: number) => void;
}

const AdminIdentity: React.FC<AdminIdentityProps> = ({ 
  appLogo, appBanner, appName, appSubtitle, authBackground, 
  onUpdateAppLogo, onUpdateAppBanner, onUpdateAppName, onUpdateAppSubtitle, onUpdateAuthBackground,
  handleFileUpload 
}) => {
  const [localAppName, setLocalAppName] = useState(appName);
  const [localAppSubtitle, setLocalAppSubtitle] = useState(appSubtitle);

  // تحديث القيم المحلية عند تغيرها من قاعدة البيانات
  useEffect(() => {
    setLocalAppName(appName);
    setLocalAppSubtitle(appSubtitle);
  }, [appName, appSubtitle]);

  const handleSaveAppName = () => {
    if (localAppName.trim()) {
      onUpdateAppName(localAppName);
      onUpdateAppSubtitle(localAppSubtitle);
      alert('تم تحديث هوية التطبيق بنجاح! ستظهر التغييرات فوراً للجميع. ✅');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-10 text-right font-cairo" dir="rtl">
      <div className="bg-slate-950/40 p-8 rounded-[2.5rem] border border-white/10 shadow-2xl">
         <h3 className="text-2xl font-black text-white flex items-center gap-3">
           <div className="p-2 bg-emerald-500 rounded-xl shadow-lg shadow-emerald-900/40"><Globe className="text-black" /></div>
           إدارة براند وهواية الموقع
         </h3>
         <p className="text-slate-500 text-xs font-bold mt-2 pr-1">تحكم في الأسماء والشعارات التي تظهر للمستخدمين في كافة الواجهات.</p>
      </div>

      {/* قسم تعديل نصوص التطبيق */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-950 p-8 rounded-[3rem] border border-blue-500/30 space-y-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
           <Edit3 size={120} />
        </div>
        
        <div className="flex items-center gap-3 border-b border-white/5 pb-4 mb-2 relative z-10">
           <Type size={20} className="text-blue-400" />
           <h4 className="text-lg font-black text-white">تخصيص الاسم والوصف الرئيسي</h4>
        </div>
        
        <div className="space-y-6 relative z-10">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-500 pr-2 uppercase tracking-widest flex items-center gap-1"><Edit3 size={10}/> اسم الموقع الرسمي</label>
                 <input 
                   type="text" 
                   value={localAppName}
                   onChange={(e) => setLocalAppName(e.target.value)}
                   placeholder="ادخل الاسم الجديد هنا..."
                   className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 px-6 text-white text-base font-black outline-none focus:border-blue-500 shadow-inner"
                 />
              </div>

              <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-500 pr-2 uppercase tracking-widest flex items-center gap-1"><Smartphone size={10}/> النص الفرعي (Tagline)</label>
                 <input 
                   type="text" 
                   value={localAppSubtitle}
                   onChange={(e) => setLocalAppSubtitle(e.target.value)}
                   placeholder="مثلاً: Real-time Voice Community"
                   className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 px-6 text-white text-xs font-bold outline-none focus:border-blue-500 shadow-inner"
                 />
              </div>
           </div>

           <button 
             onClick={handleSaveAppName}
             className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-[1.5rem] font-black text-sm flex items-center justify-center gap-3 shadow-xl shadow-blue-900/40 active:scale-95 transition-all"
           >
              <Save size={20} /> حفظ وتعميم الهوية الجديدة
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* شعار التطبيق */}
        <div className="bg-slate-950/60 p-8 rounded-[2.5rem] border border-white/10 space-y-4 text-center">
          <label className="text-xs font-black text-slate-500 uppercase block mb-2">شعار التطبيق (Logo)</label>
          <div className="relative aspect-square w-32 mx-auto rounded-3xl overflow-hidden border-2 border-dashed border-white/10 flex items-center justify-center bg-black/40 group">
            <img src={appLogo} className="w-full h-full object-cover group-hover:opacity-40" />
            <label className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer">
              <Camera size={24} className="text-white" />
              <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, onUpdateAppLogo, 400, 400)} />
            </label>
          </div>
        </div>

        {/* بنر الواجهة */}
        <div className="bg-slate-950/60 p-8 rounded-[2.5rem] border border-white/10 space-y-4 text-center">
          <label className="text-xs font-black text-slate-500 uppercase block mb-2">بنر الغرف (Banner)</label>
          <div className="relative h-32 w-full rounded-2xl overflow-hidden border-2 border-dashed border-white/10 flex items-center justify-center bg-black/40 group">
            <img src={appBanner} className="w-full h-full object-cover group-hover:opacity-40" />
            <label className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer">
              <ImageIcon size={24} className="text-white" />
              <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, onUpdateAppBanner, 800, 300)} />
            </label>
          </div>
        </div>

        {/* خلفية صفحة الدخول */}
        <div className="bg-slate-950/60 p-8 rounded-[2.5rem] border border-white/10 space-y-4 text-center md:col-span-2">
          <label className="text-xs font-black text-slate-500 uppercase block mb-2">خلفية صفحة الدخول الكاملة</label>
          <div className="relative h-44 w-full rounded-[2rem] overflow-hidden border-2 border-dashed border-white/10 flex items-center justify-center bg-black/40 group">
            {authBackground ? (
              <img src={authBackground} className="w-full h-full object-cover group-hover:opacity-40" />
            ) : (
              <div className="text-slate-700 font-black text-xs">لا توجد خلفية مخصصة</div>
            )}
            <label className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer">
              <Camera size={32} className="text-white" />
              <div className="bg-black/60 px-4 py-2 rounded-xl text-[10px] font-black text-white ml-2">تغيير الخلفية</div>
              <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, onUpdateAuthBackground, 1200, 800)} />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminIdentity;
